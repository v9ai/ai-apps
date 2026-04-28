"""Tests for the two-pass email composition graph.

Patches `ainvoke_json_with_telemetry` at the module level on
`leadgen_agent.email_compose_graph` so the test never hits the network.
Covers:
  - happy path: refine strips an AI-marker phrase that the draft contained
  - fallback: refine fails twice → graph falls back to the draft and sets
    graph_meta.refine_status = "fallback"
"""

from __future__ import annotations

from typing import Any

import pytest

from leadgen_agent import email_compose_graph as ecg


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    """make_llm() returns an opaque sentinel — the patched ainvoke_json_with_telemetry
    ignores it, so the LLM construction path stays untested but doesn't crash."""

    monkeypatch.setattr(ecg, "make_llm", lambda **_: object())


def _telemetry_for(model: str = "deepseek-v4-pro", in_tok: int = 100, out_tok: int = 50) -> dict[str, Any]:
    return {
        "model": model,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "total_tokens": in_tok + out_tok,
        "cost_usd": 0.001,
        "latency_ms": 500,
        "calls": 1,
    }


@pytest.mark.asyncio
async def test_refine_strips_ai_marker(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    """Happy path: draft contains a banned AI-marker, refine rewrites the opening."""
    calls: list[str] = []

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> tuple[Any, dict[str, Any]]:
        system = messages[0]["content"]
        if "B2B sales writer" in system:
            calls.append("draft")
            return (
                {
                    "subject": "Following up on your post",
                    "body": (
                        "Hey {{name}},\n\nI hope this finds you well. I saw your post about RAG eval.\n\n"
                        "I'd love to chat about how my experience could help.\n\nThanks,\nVadim"
                    ),
                },
                _telemetry_for(),
            )
        # refine
        calls.append("refine")
        return (
            {
                "subject": "Quick note on your RAG post",
                "body": (
                    "Hey {{name}},\n\nYour RAG eval post hit on something I've been deep in. "
                    "I've shipped two RAG pipelines this year — happy to compare notes.\n\n"
                    "Open to a quick chat?\n\nThanks,\nVadim"
                ),
            },
            _telemetry_for(in_tok=80, out_tok=60),
        )

    monkeypatch.setattr(ecg, "ainvoke_json_with_telemetry", fake_ainvoke)

    state = await ecg.graph.ainvoke(
        {
            "recipient_name": "Alex",
            "company_name": "Acme",
            "instructions": "Cold intro about RAG eval",
            "linkedin_post_content": "Just shipped our RAG eval framework",
        }
    )

    assert calls == ["draft", "refine"]
    assert state["subject"] == "Quick note on your RAG post"
    assert "I hope this finds you well" not in state["body"]
    assert state["draft_subject"] == "Following up on your post"
    assert "I hope this finds you well" in state["draft_body"]
    assert state["prompt_version"] == ecg.PROMPT_VERSION
    assert state["prompt_tokens"] == 100 + 80
    assert state["completion_tokens"] == 50 + 60
    assert state["graph_meta"]["refine_status"] == "ok"


@pytest.mark.asyncio
async def test_refine_falls_back_to_draft(monkeypatch: pytest.MonkeyPatch, fake_llm: None) -> None:
    """When refine returns a body that still contains an AI-marker on both
    attempts, the graph falls back to the draft and flags refine_status."""

    async def fake_ainvoke(_llm: Any, messages: list[dict[str, str]], **_kw: Any) -> tuple[Any, dict[str, Any]]:
        system = messages[0]["content"]
        if "B2B sales writer" in system:
            return (
                {
                    "subject": "Hello there",
                    "body": (
                        "Hey {{name}},\n\nClean opening that the draft already nailed. "
                        "Concrete second sentence.\n\nQuick CTA?\n\nThanks,\nVadim"
                    ),
                },
                _telemetry_for(),
            )
        # Refine keeps re-introducing a banned marker — both attempts fail.
        return (
            {
                "subject": "Touching base",
                "body": (
                    "Hey {{name}},\n\nI hope this finds you well. Refine is being stubborn here.\n\n"
                    "Thanks,\nVadim"
                ),
            },
            _telemetry_for(in_tok=80, out_tok=60),
        )

    monkeypatch.setattr(ecg, "ainvoke_json_with_telemetry", fake_ainvoke)

    state = await ecg.graph.ainvoke(
        {
            "recipient_name": "Alex",
            "company_name": "Acme",
            "instructions": "Cold intro",
            "linkedin_post_content": "Some post",
        }
    )

    assert state["subject"] == "Hello there"
    assert "Clean opening" in state["body"]
    assert state["graph_meta"]["refine_status"] == "fallback"
    # Both refine attempts ran (telemetry summed).
    assert state["prompt_tokens"] == 100 + 2 * 80
    assert state["completion_tokens"] == 50 + 2 * 60
