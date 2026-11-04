import json

import pytest

from app.services.topic_classifier import classify_topic, parse_placement


def test_unknown_icon_replaced_by_fallback():
    p = parse_placement('{"sphere":"Языки","sphere_icon":"nope","subtopic":"Казахский","subtopic_icon":"languages"}', "Казахский")
    assert p.sphere_icon == "book" and p.subtopic_icon == "languages"


def test_json_inside_text_is_found():
    assert parse_placement('Вот: {"sphere":"Языки","sphere_icon":"globe","subtopic":"Английский","subtopic_icon":"book"} конец', "x").sphere == "Языки"


def test_subtopic_equal_to_sphere_uses_title():
    assert parse_placement('{"sphere":"Языки","sphere_icon":"globe","subtopic":" языки ","subtopic_icon":"book"}', "Английский язык").subtopic == "Английский язык"


def test_empty_subtopic_uses_title():
    assert parse_placement('{"sphere":"Языки","sphere_icon":"globe","subtopic":"","subtopic_icon":"book"}', "Казахский").subtopic == "Казахский"


def test_labels_cut_to_60_chars():
    raw = json.dumps({"sphere": "С" * 90, "sphere_icon": "globe", "subtopic": "П" * 90, "subtopic_icon": "book"})
    p = parse_placement(raw, "x")
    assert len(p.sphere) == 60 and len(p.subtopic) == 60


def test_bad_json_raises_value_error():
    with pytest.raises(ValueError):
        parse_placement("не json", "x")


@pytest.mark.asyncio
async def test_model_failure_goes_to_general():
    async def boom(_): raise RuntimeError("429")
    p = await classify_topic("Основы Git", {}, complete=boom)
    assert (p.sphere, p.subtopic, p.sphere_icon) == ("Общее", "Основы Git", "book")


@pytest.mark.asyncio
async def test_known_spheres_reach_the_prompt():
    seen = {}
    async def fake(prompt):
        seen["p"] = prompt
        return '{"sphere":"Языки","sphere_icon":"globe","subtopic":"Казахский","subtopic_icon":"book"}'
    await classify_topic("Казахский", {"Языки": ["Английский"]}, complete=fake)
    assert "Языки" in seen["p"] and "Английский" in seen["p"]


@pytest.mark.asyncio
async def test_sphere_mapped_to_existing_key():
    async def fake(_):
        return '{"sphere":" ЯЗЫКИ ","sphere_icon":"globe","subtopic":"Казахский","subtopic_icon":"book"}'
    p = await classify_topic("Казахский", {"Языки": []}, complete=fake)
    assert p.sphere == "Языки"
