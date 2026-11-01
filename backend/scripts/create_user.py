"""Создать пользователя напрямую в базе (без письма с подтверждением).

    python -m scripts.create_user --username Bekzhan --email bekzhan@fill.ai --name "Бекжан"

Пароль спрашивается в терминале (или --password). В базе хранится только bcrypt-хэш.
"""
import argparse
import getpass
import sys

from sqlalchemy import func, or_

from app.auth import get_password_hash
from app.database import IS_SQLITE, Base, SessionLocal, engine
from app.db_models import User


def main() -> int:
    parser = argparse.ArgumentParser(description="Создать пользователя FILL AI")
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default=None, help="Отображаемое имя")
    parser.add_argument("--password", default=None, help="Если не указан — спросит в терминале")
    args = parser.parse_args()

    password = args.password or getpass.getpass("Пароль: ")
    if len(password) < 8:
        print("Пароль должен быть не короче 8 символов", file=sys.stderr)
        return 1

    if IS_SQLITE:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        exists = db.query(User).filter(
            or_(func.lower(User.username) == args.username.lower(), func.lower(User.email) == args.email.lower())
        ).first()
        if exists:
            print(f"Пользователь {exists.username} уже существует", file=sys.stderr)
            return 1
        user = User(
            username=args.username,
            email=args.email,
            full_name=args.name,
            password_hash=get_password_hash(password),
            role="student",
            email_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"Создан пользователь {user.username} ({user.email})")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
