"""Tests for extract_stack_graph.

Patches ``ainvoke_json`` and ``make_llm`` at the module level so the test
never hits DeepSeek. Covers:
  - happy multi-section JD: required + nice-to-have both surface, sorted
  - hyphenated phrases ("Node.js", "machine learning") canonicalize correctly
  - empty JD short-circuits to no skills
  - phrases outside the taxonomy are dropped (no hallucinated tags)
  - section-language conflict ("would be a plus" inside required) is
    downgraded to nice_to_have when the score node says so
"""

from __future__ import annotations

from typing import Any

import pytest

from leadgen_agent import extract_stack_graph as esg


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(esg, "make_llm", lambda **_: object())


def _route(messages: list[dict[str, str]], routes: dict[str, Any]) -> Any:
    """Pick the first route whose marker substring appears in the system prompt."""
    system = messages[0]["content"]
    for marker, payload in routes.items():
        if marker in system:
            return payload
    raise AssertionError(f"unexpected system prompt: {system!r}")


@pytest.mark.asyncio
async def test_happy_path_required_and_nice(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    routes = {
        "segment a job description": {
            "required": "Strong Python and PostgreSQL experience required.",
            "nice_to_have": "React is a plus.",
            "responsibilities": "Build APIs.",
            "other": "",
        },
        "Extract every concrete tech": {
            "mentions": [
                {"phrase": "Python", "sentence": "Strong Python and PostgreSQL experience required.", "section": "required"},
                {"phrase": "PostgreSQL", "sentence": "Strong Python and PostgreSQL experience required.", "section": "required"},
                {"phrase": "React", "sentence": "React is a plus.", "section": "nice_to_have"},
            ]
        },
        "assign a level and confidence": {
            "items": [
                {"tag": "python", "level": "required", "confidence": 0.95},
                {"tag": "postgresql", "level": "required", "confidence": 0.9},
                {"tag": "react", "level": "nice_to_have", "confidence": 0.7},
            ]
        },
    }

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> Any:
        return _route(messages, routes)

    monkeypatch.setattr(esg, "ainvoke_json", fake_ainvoke)

    state = await esg.graph.ainvoke({"raw_jd": "Strong Python and PostgreSQL. React is a plus.", "title": "Senior Engineer"})

    skills = state["skills"]
    tags = [s["tag"] for s in skills]
    levels = {s["tag"]: s["level"] for s in skills}
    assert tags[:2] == ["python", "postgresql"], "required skills must sort first"
    assert "react" in tags
    assert levels["python"] == "required"
    assert levels["react"] == "nice_to_have"
    assert state["model"]
    assert state["graph_meta"]["counts"]["required"] == 2
    assert state["graph_meta"]["counts"]["nice_to_have"] == 1
    assert "Python" in state["summary"] or "python" in state["summary"].lower()
    # Every evidence is a non-empty string from the JD
    assert all(isinstance(s["evidence"], str) and s["evidence"] for s in skills)


@pytest.mark.asyncio
async def test_hyphenated_and_dotted_phrases(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    routes = {
        "segment a job description": {
            "required": "We need machine learning and Node.js.",
            "nice_to_have": "",
            "responsibilities": "",
            "other": "",
        },
        "Extract every concrete tech": {
            "mentions": [
                {"phrase": "machine learning", "sentence": "We need machine learning and Node.js.", "section": "required"},
                {"phrase": "Node.js", "sentence": "We need machine learning and Node.js.", "section": "required"},
            ]
        },
        "assign a level and confidence": {
            "items": [
                {"tag": "machine-learning", "level": "required", "confidence": 0.9},
                {"tag": "nodejs", "level": "required", "confidence": 0.9},
            ]
        },
    }

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> Any:
        return _route(messages, routes)

    monkeypatch.setattr(esg, "ainvoke_json", fake_ainvoke)

    state = await esg.graph.ainvoke({"raw_jd": "We need machine learning and Node.js."})
    tags = sorted(s["tag"] for s in state["skills"])
    assert tags == ["machine-learning", "nodejs"], "local taxonomy must canonicalize both phrases without LLM tiebreak"


@pytest.mark.asyncio
async def test_empty_jd_returns_no_skills(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    """Empty input must short-circuit cleanly — no skills, zero confidence."""

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> Any:
        # Should never be called for a truly empty JD because segment_jd
        # short-circuits and downstream nodes see empty inputs.
        raise AssertionError("ainvoke_json should not be called on empty JD")

    monkeypatch.setattr(esg, "ainvoke_json", fake_ainvoke)

    state = await esg.graph.ainvoke({"raw_jd": ""})
    assert state["skills"] == []
    assert state["confidence"] == 0.0
    assert state["summary"]


@pytest.mark.asyncio
async def test_unmapped_phrase_is_dropped(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    """A niche tool absent from the taxonomy must be dropped, not invented."""
    routes = {
        "segment a job description": {
            "required": "Experience with FizzBuzzCoreXYZ is required.",
            "nice_to_have": "",
            "responsibilities": "",
            "other": "",
        },
        "Extract every concrete tech": {
            "mentions": [
                {"phrase": "FizzBuzzCoreXYZ", "sentence": "Experience with FizzBuzzCoreXYZ is required.", "section": "required"},
            ]
        },
        "Map each input phrase": {
            # LLM tiebreak returns null — must be respected
            "matches": [{"phrase": "FizzBuzzCoreXYZ", "tag": None}],
        },
    }
    score_called = False

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> Any:
        nonlocal score_called
        if "assign a level and confidence" in messages[0]["content"]:
            score_called = True
            return {"items": []}
        return _route(messages, routes)

    monkeypatch.setattr(esg, "ainvoke_json", fake_ainvoke)

    state = await esg.graph.ainvoke({"raw_jd": "Experience with FizzBuzzCoreXYZ is required."})
    assert state["skills"] == []
    assert score_called is False, "score node must short-circuit when there are no canonical skills"


@pytest.mark.asyncio
async def test_score_can_downgrade_level(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    """When wording contradicts the section header, the LLM may downgrade."""
    routes = {
        "segment a job description": {
            "required": "Python required. Rust would be a plus.",
            "nice_to_have": "",
            "responsibilities": "",
            "other": "",
        },
        "Extract every concrete tech": {
            "mentions": [
                {"phrase": "Python", "sentence": "Python required.", "section": "required"},
                {"phrase": "Rust", "sentence": "Rust would be a plus.", "section": "required"},
            ]
        },
        "assign a level and confidence": {
            "items": [
                {"tag": "python", "level": "required", "confidence": 0.95},
                {"tag": "rust", "level": "nice_to_have", "confidence": 0.6},
            ]
        },
    }

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> Any:
        return _route(messages, routes)

    monkeypatch.setattr(esg, "ainvoke_json", fake_ainvoke)

    state = await esg.graph.ainvoke({"raw_jd": "Python required. Rust would be a plus."})
    levels = {s["tag"]: s["level"] for s in state["skills"]}
    assert levels["python"] == "required"
    assert levels["rust"] == "nice_to_have", "score node should respect language-based downgrade"
