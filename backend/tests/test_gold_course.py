"""Эталонный курс должен соответствовать схемам, которые использует генерация"""
import json
from pathlib import Path

import pytest

from app.models import ClarifyingQuestion, CoursePassport, Lesson, Module, TestQuestion
from app.topic_icons import ICON_NAMES

GOLD = json.loads((Path(__file__).parents[1] / "app/examples/gold_course.json").read_text(encoding="utf-8"))
COURSE = GOLD["course"]
LESSONS = [lesson for module in COURSE["modules"] for lesson in module["lessons"]]


def test_passport_and_questions_match_schemas():
    CoursePassport(**COURSE["passport"])
    questions = [ClarifyingQuestion(**q) for q in GOLD["request"]["clarifying_questions"]]
    assert 2 <= len(questions) <= 4


def test_modules_match_schema():
    for module in COURSE["modules"]:
        Module(**{k: v for k, v in module.items() if k != "test"})


def test_every_module_has_a_valid_test():
    for module in COURSE["modules"]:
        tests = [TestQuestion(**q) for q in module["test"]["tests"]]
        assert len(tests) == 3
        assert all(len(q.options) == 4 for q in tests)


@pytest.mark.parametrize("key", ["sphere_icon", "subtopic_icon"])
def test_icons_are_allowed(key):
    assert GOLD["category"][key] in ICON_NAMES


def test_lessons_have_theory_and_practice():
    for lesson in LESSONS:
        Lesson(**lesson)
        assert "```js" in lesson["content"]["content"] or lesson["type"] == "case_study"
        assert lesson["practice_exercises"]


def test_videos_are_full_youtube_links():
    urls = [v["url"] for lesson in LESSONS for v in lesson["videos"]]
    assert urls and all(u.startswith("https://www.youtube.com/watch?v=") for u in urls)


def test_seed_creates_course_in_tree(db, test_user):
    from app.db_models import Course
    from scripts.seed_example_course import seed

    course = seed(db, test_user, GOLD)
    saved = db.query(Course).filter(Course.id == course.id).one()
    assert saved.category.label == "JavaScript"
    assert saved.category.parent.label == "Программирование"
    assert sum(len(m.lessons) for m in saved.modules) == len(LESSONS)

    lesson = json.loads(saved.modules[0].lessons[0].content)
    assert lesson["videos"] and lesson["practice_exercises"]

    with pytest.raises(ValueError):
        seed(db, test_user, GOLD)
