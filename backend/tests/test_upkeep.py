"""Поддержка: резервная копия и восстановление, /health, сообщение о лимите"""
import uuid

import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.db_models import Course, User
from app.main import app, coordinator
from scripts.backup_db import backup
from scripts.restore_db import restore


def _make_engine(path):
    engine = create_engine(f"sqlite:///{path}")

    @event.listens_for(engine, "connect")
    def _lower(conn, _rec):
        conn.create_function("lower", 1, lambda v: v.lower() if isinstance(v, str) else v, deterministic=True)

    Base.metadata.create_all(bind=engine)
    return engine


def _seed(engine):
    Session = sessionmaker(bind=engine)
    with Session() as s:
        user = User(email="a@b.c", username="alice", password_hash="x", full_name="Алиса", role="student")
        s.add(user)
        s.flush()
        s.add(Course(title="Курс", created_by=user.id))
        s.commit()
        return user.id


def test_backup_and_restore_roundtrip(tmp_path):
    src = _make_engine(tmp_path / "src.db")
    user_id = _seed(src)
    path = backup(src, tmp_path / "out")
    assert path.exists() and path.suffix == ".gz"

    dst = _make_engine(tmp_path / "dst.db")
    counts = restore(dst, path)
    assert counts["users"] == 1 and counts["courses"] == 1

    with dst.connect() as conn:
        row = conn.execute(select(User.__table__)).mappings().one()
        assert row["id"] == user_id and isinstance(row["id"], uuid.UUID)
        assert row["full_name"] == "Алиса"
        assert row["created_at"] is not None
        assert conn.execute(select(func.count()).select_from(Course.__table__)).scalar() == 1


def test_restore_refuses_non_empty_database(tmp_path):
    src = _make_engine(tmp_path / "src.db")
    _seed(src)
    path = backup(src, tmp_path / "out")

    dst = _make_engine(tmp_path / "dst.db")
    _seed(dst)
    with pytest.raises(ValueError):
        restore(dst, path)
    with dst.connect() as conn:
        assert conn.execute(select(func.count()).select_from(User.__table__)).scalar() == 1


def _seed_spheres(engine, with_child=False):
    from app.db_models import Category

    with sessionmaker(bind=engine)() as s:
        spheres = [Category(label=f"Сфера {i}") for i in range(7)]
        s.add_all(spheres)
        s.flush()
        if with_child:
            s.add(Category(label="Подтема", parent_id=spheres[0].id))
        s.commit()


def test_restore_into_migrated_db_replaces_seeded_spheres(tmp_path):
    from app.db_models import Category

    src = _make_engine(tmp_path / "src.db")
    _seed(src)
    path = backup(src, tmp_path / "out")

    dst = _make_engine(tmp_path / "dst.db")
    _seed_spheres(dst)
    counts = restore(dst, path)
    assert counts["users"] == 1
    with dst.connect() as conn:
        assert conn.execute(select(func.count()).select_from(Category.__table__)).scalar() == 0


def test_restore_refuses_when_subtopics_exist(tmp_path):
    from app.db_models import Category

    src = _make_engine(tmp_path / "src.db")
    _seed(src)
    path = backup(src, tmp_path / "out")

    dst = _make_engine(tmp_path / "dst.db")
    _seed_spheres(dst, with_child=True)
    with pytest.raises(ValueError):
        restore(dst, path)
    with dst.connect() as conn:
        assert conn.execute(select(func.count()).select_from(Category.__table__)).scalar() == 8


def test_health_reports_db(client):
    data = client.get("/health").json()
    assert data["db"] is True
    assert data["status"] == "healthy"


def test_health_degraded_when_db_fails(client, db, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("postgresql://user:secret@host/db")

    monkeypatch.setattr(db, "execute", boom)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["db"] is False and data["status"] == "degraded"
    assert "secret" not in resp.text


def test_rate_limit_message_is_friendly(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fail(*a, **k):
        raise RuntimeError("Error code: 429 - rate limit exceeded")

    monkeypatch.setattr(coordinator, "_obj", type("C", (), {"generate_course": staticmethod(fail)})())
    resp = client.post(
        "/api/courses/generate",
        headers=auth_headers,
        json={"settings": {"title": "T", "target_audience": "все"}},
    )
    data = resp.json()
    assert data["success"] is False
    assert "лимит" in data["error"].lower()
