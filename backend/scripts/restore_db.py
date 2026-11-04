"""Восстановить базу из копии, сделанной scripts.backup_db.

    python -m scripts.restore_db backups/<файл>.json.gz --yes

Работает только с ПУСТОЙ базой (таблицы уже созданы миграциями, строк нет; засеянные
миграциями сферы без курсов и подтем не считаются, их копия заменяет):
существующие данные не перезаписываются. Флаг --yes обязателен.
"""
import argparse
import datetime as dt
import gzip
import json
import sys
import uuid
from pathlib import Path

from sqlalchemy import Date, DateTime, Uuid, func, select
from sqlalchemy.engine import Engine

from app.database import Base, engine as default_engine
from app import db_models  # noqa: F401 — регистрирует модели в Base.metadata


def _from_json(column, value):
    """Вернуть строкам их типы: UUID и даты"""
    if value is None:
        return None
    if isinstance(column.type, Uuid):
        return uuid.UUID(value)
    if isinstance(column.type, DateTime):
        return dt.datetime.fromisoformat(value)
    if isinstance(column.type, Date):
        return dt.date.fromisoformat(value)
    return value


def _parents_first(table, rows):
    """Строки со ссылкой на свою же таблицу (категории): родитель раньше потомка"""
    self_cols = [c.name for fk in table.foreign_keys if fk.column.table is table for c in [fk.parent]]
    if not self_cols:
        return rows
    pk = next(iter(table.primary_key.columns)).name
    pending, done, ordered = list(rows), set(), []
    while pending:
        rest = []
        for row in pending:
            if all(row[c] is None or row[c] in done for c in self_cols):
                ordered.append(row)
                done.add(row[pk])
            else:
                rest.append(row)
        if len(rest) == len(pending):  # цикл или потерянный родитель — вставим как есть
            ordered.extend(rest)
            break
        pending = rest
    return ordered


def restore(engine: Engine, path: Path) -> dict[str, int]:
    """Загрузить копию в пустую базу, вернуть {таблица: число строк}"""
    with gzip.open(Path(path), "rt", encoding="utf-8") as f:
        payload = json.load(f)
    if payload.get("version") != 1:
        raise ValueError(f"Неизвестная версия копии: {payload.get('version')}")

    counts: dict[str, int] = {}
    # Одна транзакция: при любой ошибке в базе не остаётся половины данных
    with engine.begin() as conn:
        categories = Base.metadata.tables["categories"]
        for table in Base.metadata.sorted_tables:
            if table is categories:
                continue
            if conn.execute(select(func.count()).select_from(table)).scalar():
                raise ValueError(f"База не пуста: в таблице {table.name} есть строки")

        # Миграции засевают сферы (категории без родителя). Если кроме них ничего нет
        # (курсов нет - проверено выше), убираем их, иначе копия задвоит сферы. Подтемы - данные пользователя.
        has_children = conn.execute(
            select(func.count()).select_from(categories).where(categories.c.parent_id.is_not(None))
        ).scalar()
        if has_children:
            raise ValueError("База не пуста: в таблице categories есть подтемы")
        conn.execute(categories.delete())

        for table in Base.metadata.sorted_tables:
            rows = payload["tables"].get(table.name, [])
            rows = [{c.name: _from_json(c, row.get(c.name)) for c in table.columns if c.name in row} for row in rows]
            rows = _parents_first(table, rows)
            if rows:
                conn.execute(table.insert(), rows)
            counts[table.name] = len(rows)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Восстановить базу FILL AI из копии")
    parser.add_argument("file", type=Path)
    parser.add_argument("--yes", action="store_true", help="Подтверждение: загрузить копию в текущую базу")
    args = parser.parse_args()
    if not args.yes:
        print("Добавьте --yes: копия будет загружена в базу из DATABASE_URL", file=sys.stderr)
        return 1
    try:
        counts = restore(default_engine, args.file)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1
    for name, n in counts.items():
        print(f"{name}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
