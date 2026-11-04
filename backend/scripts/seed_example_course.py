"""Добавляет эталонный курс пользователю, без обращения к модели.

Запуск из папки backend:
    python -m scripts.seed_example_course --username Bekzhan
"""
import argparse
import json
import uuid
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.db_models import Course, CourseModule, Enrollment, Lesson, User
from app.services.topic_classifier import TopicPlacement, resolve_category

GOLD_PATH = Path(__file__).parents[1] / "app/examples/gold_course.json"


def lesson_content(lesson: dict) -> str:
    """Тот же формат, что сохраняет generate_course: JSON с видео и заданиями"""
    return json.dumps(
        {**lesson["content"], "videos": lesson["videos"], "practice_exercises": lesson["practice_exercises"]},
        ensure_ascii=False,
    )


def seed(db: Session, user: User, gold: dict) -> Course:
    course = gold["course"]
    existing = db.query(Course).filter(Course.created_by == user.id, Course.title == course["title"]).first()
    if existing:
        raise ValueError(f"У пользователя уже есть курс «{course['title']}»")

    category = resolve_category(db, TopicPlacement(**gold["category"]))
    db_course = Course(
        id=uuid.uuid4(),
        title=course["title"],
        description=course["description"],
        category_id=category.id,
        created_by=user.id,
        format="Онлайн",
        level=course["difficulty"],
        duration=f"{course['total_duration_hours']} hours",
        intensity="Средняя",
        goal=course["passport"]["target_result"],
        is_paid=False,
        is_public=True,
        is_private=False,
    )
    db.add(db_course)
    db.flush()

    for i, module in enumerate(course["modules"]):
        db_module = CourseModule(
            id=uuid.uuid4(), course_id=db_course.id, title=module["title"], description=module["description"], order=i
        )
        db.add(db_module)
        db.flush()
        for j, lesson in enumerate(module["lessons"]):
            db.add(
                Lesson(
                    id=uuid.uuid4(),
                    module_id=db_module.id,
                    title=lesson["title"],
                    content=lesson_content(lesson),
                    duration_minutes=lesson["duration_minutes"],
                    order=j,
                )
            )

    db.add(Enrollment(id=uuid.uuid4(), user_id=user.id, course_id=db_course.id, progress_percent=0))
    db.commit()
    return db_course


def main() -> None:
    parser = argparse.ArgumentParser(description="Добавить эталонный курс пользователю")
    parser.add_argument("--username", required=True)
    args = parser.parse_args()

    gold = json.loads(GOLD_PATH.read_text(encoding="utf-8"))
    db = SessionLocal()
    try:
        user = db.query(User).filter(func.lower(User.username) == args.username.lower()).first()
        if not user:
            raise SystemExit("Пользователь не найден")
        try:
            course = seed(db, user, gold)
        except ValueError as e:
            raise SystemExit(str(e))
        print(f"Готово: {course.title}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
