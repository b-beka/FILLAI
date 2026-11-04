"""Таймаут и лимит частоты запросов к модели"""
import re
from pathlib import Path

import httpx
import openai

from app.agents.llm import make_llm
from app.main import coordinator


def test_make_llm_sets_timeout_and_retries(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    llm = make_llm("m", 0.1)
    assert llm.request_timeout == 60 and llm.max_retries == 1


def test_all_agents_share_one_rate_limiter(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    assert make_llm("a", 0.1).rate_limiter is make_llm("b", 0.2).rate_limiter


def test_no_agent_builds_chatopenai_directly():
    agents_dir = Path(__file__).resolve().parent.parent / "app" / "agents"
    offenders = [
        p.name
        for p in agents_dir.glob("*.py")
        if p.name != "llm.py" and re.search(r"\bChatOpenAI\(", p.read_text(encoding="utf-8"))
    ]
    assert offenders == []


def _post_generate(client, auth_headers):
    return client.post(
        "/api/courses/generate",
        headers=auth_headers,
        json={"settings": {"title": "T", "target_audience": "все"}},
    ).json()


def test_timeout_gives_friendly_error(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fail(*a, **k):
        raise openai.APITimeoutError(request=httpx.Request("POST", "http://x"))

    monkeypatch.setattr(coordinator, "_obj", type("C", (), {"generate_course": staticmethod(fail)})())
    data = _post_generate(client, auth_headers)
    assert data["success"] is False
    assert "модель не ответила" in data["error"].lower()


def test_builtin_timeout_gives_friendly_error(client, auth_headers, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fail(*a, **k):
        raise TimeoutError()

    monkeypatch.setattr(coordinator, "_obj", type("C", (), {"generate_course": staticmethod(fail)})())
    data = _post_generate(client, auth_headers)
    assert data["success"] is False
    assert "модель не ответила" in data["error"].lower()


def test_course_total_deadline_gives_friendly_error(client, auth_headers, monkeypatch):
    import asyncio
    import app.main as main_module

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(main_module, "COURSE_TIMEOUT_SECONDS", 0.05)

    async def slow(*a, **k):
        await asyncio.sleep(1)

    monkeypatch.setattr(coordinator, "_obj", type("C", (), {"generate_course": staticmethod(slow)})())
    data = _post_generate(client, auth_headers)
    assert data["success"] is False
    assert "модель не ответила" in data["error"].lower()


def _rate_limit_error(message):
    request = httpx.Request("POST", "http://x")
    return openai.RateLimitError(message, response=httpx.Response(429, request=request), body=None)


def _generate_with_error(client, auth_headers, monkeypatch, error):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fail(*a, **k):
        raise error

    monkeypatch.setattr(coordinator, "_obj", type("C", (), {"generate_course": staticmethod(fail)})())
    return _post_generate(client, auth_headers)


def test_daily_limit_gives_tomorrow_message(client, auth_headers, monkeypatch):
    err = _rate_limit_error("Rate limit exceeded: free-models-per-day")
    data = _generate_with_error(client, auth_headers, monkeypatch, err)
    assert data["success"] is False
    assert "дневной лимит" in data["error"].lower() and "завтра" in data["error"].lower()


def test_per_minute_limit_keeps_short_wait_message(client, auth_headers, monkeypatch):
    err = _rate_limit_error("Rate limit exceeded: free-models-per-min")
    data = _generate_with_error(client, auth_headers, monkeypatch, err)
    assert data["success"] is False
    assert "несколько минут" in data["error"].lower()
