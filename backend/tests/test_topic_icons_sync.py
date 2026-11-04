"""Набор иконок на фронтенде должен совпадать с ICON_NAMES бэкенда"""
import re
from pathlib import Path

from app.topic_icons import ICON_NAMES

ROOT = Path(__file__).resolve().parents[2]


def test_frontend_icons_match_backend():
    source = (ROOT / "frontend/src/lib/topicIcons.ts").read_text(encoding="utf-8")
    names = set(re.findall(r"'([a-z0-9-]+)':", source))
    assert names == set(ICON_NAMES)
