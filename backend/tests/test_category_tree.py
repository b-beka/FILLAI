"""Тесты дерева категорий: сфера -> подтема"""
import uuid

import pytest
from fastapi import status
from sqlalchemy.exc import IntegrityError

from app.db_models import Category, Course
from app.services import topic_classifier
from app.services.topic_classifier import TopicPlacement, known_tree, resolve_category


def test_same_sphere_any_case_reused(db):
    a = resolve_category(db, TopicPlacement("Языки", "globe", "Английский", "book"))
    b = resolve_category(db, TopicPlacement(" ЯЗЫКИ ", "globe", "Казахский", "book"))
    assert a.parent_id == b.parent_id
    assert db.query(Category).filter(Category.parent_id.is_(None)).count() == 1


def test_resolve_twice_returns_same_row(db):
    p = TopicPlacement("Языки", "globe", "Английский", "book")
    assert resolve_category(db, p).id == resolve_category(db, p).id


def test_duplicate_sphere_insert_is_rejected(db):
    db.add_all([Category(label="Языки"), Category(label="языки")])
    with pytest.raises(IntegrityError):
        db.commit()


def test_resolve_recovers_from_concurrent_insert(db, monkeypatch):
    # Первый поиск не находит запись, вставка ловит IntegrityError, повторный поиск её возвращает
    existing = Category(label="Языки", icon="globe")
    db.add(existing)
    db.commit()
    existing_id = existing.id

    real_find = topic_classifier._find_child
    calls = {"n": 0}

    def flaky_find(session, parent_id, label):
        calls["n"] += 1
        if calls["n"] == 1:
            return None  # параллельный запрос ещё не успел закоммитить
        return real_find(session, parent_id, label)

    monkeypatch.setattr(topic_classifier, "_find_child", flaky_find)
    sub = resolve_category(db, TopicPlacement("Языки", "globe", "Английский", "book"))
    assert sub.parent_id == existing_id
    assert db.query(Category).filter(Category.parent_id.is_(None)).count() == 1


def test_known_tree(db):
    resolve_category(db, TopicPlacement("Языки", "globe", "Английский", "book"))
    assert known_tree(db) == {"Языки": ["Английский"]}


def test_course_response_has_category_parent(client, auth_headers, test_user, db):
    sub = resolve_category(db, TopicPlacement("Языки", "globe", "Английский", "book"))
    db.add(Course(id=uuid.uuid4(), title="English A1", category_id=sub.id,
                  created_by=test_user.id, is_public=True))
    db.commit()

    response = client.get("/api/courses/my", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    cat = response.json()[0]["category"]
    assert cat["label"] == "Английский"
    assert cat["parent"]["label"] == "Языки"
    assert cat["parent"]["icon"] == "globe"
    assert cat["parent"]["parent"] is None


def test_course_without_category_has_null(client, auth_headers, test_user, db):
    db.add(Course(id=uuid.uuid4(), title="No cat", created_by=test_user.id, is_public=True))
    db.commit()
    response = client.get("/api/courses/my", headers=auth_headers)
    assert response.json()[0]["category"] is None


def test_place_course_falls_back_to_general_on_failure(db, monkeypatch):
    import asyncio

    def boom(_db):
        raise RuntimeError("сбой")

    monkeypatch.setattr(topic_classifier, "known_tree", boom)
    category = asyncio.run(topic_classifier.place_course(db, "Что угодно"))
    assert category.label == "Общее"
    assert category.parent_id is None
