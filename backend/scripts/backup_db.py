"""Резервная копия всей базы в один сжатый файл (gzip + JSON).

    python -m scripts.backup_db

Файл попадает в backend/backups/ (папка в .gitignore). В нём данные пользователей:
не коммитьте его и не выкладывайте. Читает DATABASE_URL из backend/.env.
"""
import datetime as dt
import decimal
import gzip
import json
import sys
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.engine import Engine

from app.database import Base, engine as default_engine
from app import db_models  # noqa: F401 — регистрирует модели в Base.metadata

FORMAT_VERSION = 1
DEFAULT_DIR = Path(__file__).resolve().parent.parent / "backups"


def _to_json(value):
    """UUID и даты пишем строками, остальное оставляем как есть"""
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return str(value)
    return value


def backup(engine: Engine, out_dir: Path) -> Path:
    """Сохранить все таблицы в out_dir, вернуть путь к файлу"""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tables: dict[str, list[dict]] = {}
    with engine.connect() as conn:
        # sorted_tables: родители раньше потомков, чтобы файл можно было вставлять подряд
        for table in Base.metadata.sorted_tables:
            rows = conn.execute(select(table)).mappings().all()
            tables[table.name] = [{k: _to_json(v) for k, v in row.items()} for row in rows]

    now = dt.datetime.now(dt.timezone.utc)
    payload = {"version": FORMAT_VERSION, "created_at": now.isoformat(), "tables": tables}
    path = out_dir / f"fillai-backup-{now.strftime('%Y%m%d-%H%M%S')}.json.gz"
    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    return path


def main() -> int:
    path = backup(default_engine, DEFAULT_DIR)
    print(f"Копия сохранена: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
