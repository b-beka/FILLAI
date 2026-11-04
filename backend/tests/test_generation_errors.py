"""Ошибки провайдера при генерации курса не должны давать «успешный» пустой курс"""
import asyncio

import httpx
import openai
import pytest
from langchain_core.runnables import RunnableLambda

from app.agents.course_coordinator import CourseCoordinator
from app.agents.experience_agent import ExperienceAgent
from app.db_models import Course, User
from app.main import coordinator

PASSPORT = {
    "target_result": "r",
    "thinking_level": "t",
    "limitations": "l",
    "depth_score": 5,
}
STRUCTURE = {
    "modules": [
        {"title": "М1", "description": "", "lessons": [{"title": "У1", "content": "c", "type": "text"}]},
        {"title": "М2", "description": "", "lessons": [{"title": "У2", "content": "c", "type": "text"}]},
    ]
}


def _rate_limit(message="Rate limit exceeded: free-models-per-min"):
    request = httpx.Request("POST", "http://x")
    return openai.RateLimitError(message, response=httpx.Response(429, request=request), body=None)


class _Stub:
    def __init__(self, result):
        self._result = result

    async def generate_passport(self, *a, **k):
        return self._result

    async def generate_structure(self, *a, **k):
        return self._result

    async def find_materials_for_lesson(self, *a, **k):
        return {}


def _make_coordinator(monkeypatch, llm_error):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    c = CourseCoordinator()
    c.passport_agent = _Stub(PASSPORT)
    c.structure_agent = _Stub(STRUCTURE)
    c.material_agent = _Stub(None)

    def boom(_):
        raise llm_error

    c.experience_agent.llm = RunnableLambda(boom)
    return c


def _post_generate(client, auth_headers):
    return client.post(
        "/api/courses/generate",
        headers=auth_headers,
        json={"settings": {"title": "T", "target_audience": "все"}},
    ).json()


def test_experience_agent_reraises_rate_limit(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    agent = ExperienceAgent()
    agent.llm = RunnableLambda(lambda _: (_ for _ in ()).throw(_rate_limit()))
    with pytest.raises(openai.RateLimitError):
        asyncio.run(agent.generate_experience("text", {"title": "t"}))


def test_experience_agent_keeps_fallback_for_bad_json(monkeypatch):
    from langchain_core.messages import AIMessage

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    agent = ExperienceAgent()
    agent.llm = RunnableLambda(lambda _: AIMessage(content="не json"))
    result = asyncio.run(agent.generate_experience("text", {"title": "Урок", "summary": "s"}))
    assert result["error"] and "Урок" in result["raw_content"]


def test_rate_limit_during_lessons_saves_nothing(client, auth_headers, db, test_user, monkeypatch):
    c = _make_coordinator(monkeypatch, _rate_limit())
    monkeypatch.setattr(coordinator, "_obj", c)
    before = test_user.generations_count
    data = _post_generate(client, auth_headers)
    assert data["success"] is False
    assert "лимит" in data["error"].lower()
    assert db.query(Course).count() == 0
    db.expire_all()
    assert db.query(User).filter(User.id == test_user.id).one().generations_count == before


def test_failed_module_cancels_siblings(monkeypatch):
    c = _make_coordinator(monkeypatch, _rate_limit())
    cancelled = []

    async def slow(*a, **k):
        try:
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            cancelled.append(True)
            raise

    async def fail(*a, **k):
        raise _rate_limit()

    calls = iter([fail, slow])

    async def module(*a, **k):
        return await next(calls)()

    monkeypatch.setattr(c, "_generate_module_content", module)

    from app.models import CourseSettings

    async def run():
        with pytest.raises(openai.RateLimitError):
            await c.generate_course(CourseSettings(title="T", target_audience="все"))
        # к моменту выхода соседняя задача уже отменена, а не доживает до конца цикла
        return list(cancelled)

    assert asyncio.run(run()) == [True]
