"""Fast unit tests for jury wiring — no LLM calls.

Asserts that:
- _judge_sampling_for produces distinct (temperature, seed) per juror.
- _jury_judge actually calls the underlying client with the per-juror
  temperature/seed (i.e. judges aren't all hitting the same parameters).
- _parse_judge_model_spec accepts both single and comma-separated forms.

These tests exist because earlier the jury was a pointer-aliased list of
N copies of one client with a fixed temperature, and there was no
verification that diversity was actually reaching the wire.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from regen_questions import (  # noqa: E402
    _judge_sampling_for,
    _jury_judge,
    _parse_judge_model_spec,
)


# ── _judge_sampling_for ──────────────────────────────────────────────────


def test_sampling_single_juror_uses_base():
    temp, seed = _judge_sampling_for(0, 1)
    assert temp == pytest.approx(0.3)
    assert seed == 17


def test_sampling_multi_juror_temps_are_distinct_and_sorted():
    temps = [_judge_sampling_for(i, 5)[0] for i in range(5)]
    assert len(set(temps)) == 5, f"expected 5 distinct temperatures, got {temps}"
    assert temps == sorted(temps), "temperatures should increase with juror index"


def test_sampling_temperature_capped_at_max():
    # Spread should never exceed the configured ceiling.
    temps = [_judge_sampling_for(i, 20)[0] for i in range(20)]
    assert max(temps) <= 0.9 + 1e-9


def test_sampling_seeds_are_distinct():
    seeds = [_judge_sampling_for(i, 4)[1] for i in range(4)]
    assert len(set(seeds)) == 4


# ── _parse_judge_model_spec ──────────────────────────────────────────────


def test_parse_single():
    assert _parse_judge_model_spec("hf") == ["hf"]


def test_parse_comma_list_preserves_order_and_duplicates():
    assert _parse_judge_model_spec("hf,mlx,hf") == ["hf", "mlx", "hf"]


def test_parse_strips_whitespace_and_lowercases():
    assert _parse_judge_model_spec(" HF , Mlx ") == ["hf", "mlx"]


def test_parse_none_returns_empty():
    assert _parse_judge_model_spec(None) == []


def test_parse_rejects_unknown_kind():
    with pytest.raises(ValueError):
        _parse_judge_model_spec("hf,gpt")


# ── _jury_judge plumbing (mocked clients, no LLM) ────────────────────────


class _RecordingClient:
    """Mock client that records every call's kwargs."""

    def __init__(self, name: str):
        self.name = name
        self.calls: list[dict] = []

    async def chat(self, messages, **kwargs):
        self.calls.append({"messages": messages, **kwargs})

        class _Choice:
            def __init__(self):
                self.message = type("M", (), {
                    "content": '{"questions":[],"overall_score":0.5,"overall_reason":"mock"}',
                    "tool_calls": None,
                })()
        return type("R", (), {"choices": [_Choice()]})()


def test_jury_judge_passes_distinct_temperatures_per_juror():
    judges = [_RecordingClient(f"j{i}") for i in range(3)]

    asyncio.run(_jury_judge(
        judges=judges,
        questions_json="[]",
        critique="(none)",
        all_context="(empty)",
        research={"name": "Test"},
        num_questions=0,
        categories={"origin": "x"},
        is_final=True,
    ))

    temps = [c.calls[0]["temperature"] for c in judges]
    seeds = [c.calls[0]["seed"] for c in judges]

    assert len(set(temps)) == 3, f"expected 3 distinct temperatures on the wire, got {temps}"
    assert len(set(seeds)) == 3, f"expected 3 distinct seeds on the wire, got {seeds}"


def test_jury_judge_single_juror_uses_base_temperature():
    judge = _RecordingClient("solo")
    asyncio.run(_jury_judge(
        judges=[judge],
        questions_json="[]",
        critique="(none)",
        all_context="(empty)",
        research={"name": "Test"},
        num_questions=0,
        categories={"origin": "x"},
        is_final=True,
    ))
    assert judge.calls[0]["temperature"] == pytest.approx(0.3)
    assert judge.calls[0]["seed"] == 17


def test_jury_judge_injects_distinct_juror_label_into_prompt():
    judges = [_RecordingClient(f"j{i}") for i in range(3)]
    asyncio.run(_jury_judge(
        judges=judges,
        questions_json="[]",
        critique="(none)",
        all_context="(empty)",
        research={"name": "Test"},
        num_questions=0,
        categories={"origin": "x"},
        is_final=True,
    ))
    # Each juror's user message must contain its unique label.
    for idx, c in enumerate(judges, start=1):
        user_msg = c.calls[0]["messages"][1].content
        assert f"JUROR-{idx}-OF-3" in user_msg, (
            f"juror {idx} prompt missing its label; got: {user_msg[:200]}"
        )
