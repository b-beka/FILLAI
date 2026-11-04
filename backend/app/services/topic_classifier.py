"""Определение сферы и подтемы курса по его названию"""
import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

from app.topic_icons import FALLBACK_ICON, ICON_NAMES

logger = logging.getLogger(__name__)

GENERAL_SPHERE = "Общее"
MAX_LABEL_LEN = 60
MODEL_TIMEOUT = 30


@dataclass
class TopicPlacement:
    sphere: str
    sphere_icon: str
    subtopic: str
    subtopic_icon: str


def normalize_label(label: str) -> str:
    """Нижний регистр и схлопнутые пробелы — для сравнения названий"""
    return " ".join((label or "").split()).lower()


def _clean_label(value) -> str:
    return " ".join(str(value or "").split())[:MAX_LABEL_LEN]


def _icon(value) -> str:
    name = str(value or "").strip().lower()
    return name if name in ICON_NAMES else FALLBACK_ICON


def parse_placement(raw: str, title: str) -> TopicPlacement:
    """Разбирает ответ модели; бросает ValueError, если JSON не найден или плох"""
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("В ответе модели нет JSON")
    try:
        data = json.loads(raw[start:end + 1])
    except json.JSONDecodeError as e:
        raise ValueError(f"Плохой JSON: {e}") from e
    if not isinstance(data, dict):
        raise ValueError("JSON не является объектом")

    sphere = _clean_label(data.get("sphere")) or GENERAL_SPHERE
    subtopic = _clean_label(data.get("subtopic"))
    # Подтема не должна дублировать сферу — тогда берём название курса
    if not subtopic or normalize_label(subtopic) == normalize_label(sphere):
        subtopic = _clean_label(title)
    return TopicPlacement(
        sphere=sphere,
        sphere_icon=_icon(data.get("sphere_icon")),
        subtopic=subtopic,
        subtopic_icon=_icon(data.get("subtopic_icon")),
    )


def _build_prompt(title: str, known: dict[str, list[str]]) -> str:
    if known:
        lines = [f"- {s}: {', '.join(subs) if subs else '(пока нет подтем)'}" for s, subs in known.items()]
        known_block = "Уже существующие сферы и их подтемы:\n" + "\n".join(lines)
    else:
        known_block = "Существующих сфер пока нет."
    return (
        "Ты раскладываешь учебные курсы по дереву: сфера -> подтема.\n"
        f"Название курса: {title}\n\n"
        f"{known_block}\n\n"
        "Если курс подходит к существующей сфере, обязательно выбери её (название точно как в списке). "
        "Подтему тоже бери существующую, если она подходит; иначе придумай короткую новую. "
        "Подтема не должна совпадать со сферой. Названия до 60 символов, на языке названия курса.\n"
        f"Иконки выбирай только из списка: {', '.join(sorted(ICON_NAMES))}\n\n"
        'Ответь только JSON: {"sphere": "...", "sphere_icon": "...", "subtopic": "...", "subtopic_icon": "..."}'
    )


async def _default_complete(prompt: str) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL") or None,
        timeout=MODEL_TIMEOUT,
    )
    # response_format не используем: бесплатная модель может его не поддерживать
    response = await asyncio.wait_for(
        client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        ),
        timeout=MODEL_TIMEOUT,
    )
    return response.choices[0].message.content or ""


async def classify_topic(
    title: str,
    known: dict[str, list[str]],
    complete: Optional[Callable[[str], Awaitable[str]]] = None,
) -> TopicPlacement:
    """Определяет сферу и подтему курса; при любой ошибке — сфера «Общее»"""
    try:
        raw = await (complete or _default_complete)(_build_prompt(title, known))
        return parse_placement(raw, title)
    except Exception:
        logger.exception("Не удалось определить сферу курса %r", title)
        return TopicPlacement(GENERAL_SPHERE, FALLBACK_ICON, title[:MAX_LABEL_LEN], FALLBACK_ICON)
