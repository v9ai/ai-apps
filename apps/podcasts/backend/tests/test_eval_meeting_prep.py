"""DeepEval evaluation suite for executive_summary.meeting_prep quality.

Tests that meeting_prep items are well-formed (count, length, uniqueness)
and that they are actionable and specific to the person (G-Eval).

Usage:
    pytest tests/test_eval_meeting_prep.py -v
    pytest tests/test_eval_meeting_prep.py -k "geval" -v
    deepeval test run tests/test_eval_meeting_prep.py
"""

import json
import os
from pathlib import Path
from typing import Any

import httpx
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


# ═══════════════════════════════════════════════════════════════════════════
# DeepSeek model for DeepEval
# ═══════════════════════════════════════════════════════════════════════════

class DeepSeekEvalModel(DeepEvalBaseLLM):
    def __init__(self):
        self._api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self._base_url = "https://api.deepseek.com/v1"
        self._model_name = "deepseek-chat"
        super().__init__(model=self._model_name)

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_api(self, prompt: str) -> str:
        if not self._api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not set")
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                json={"model": self._model_name, "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.0, "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_api(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        import asyncio
        return await asyncio.to_thread(self._call_api, prompt)


_eval_model = None


def _get_eval_model() -> DeepSeekEvalModel:
    global _eval_model
    if _eval_model is None:
        _eval_model = DeepSeekEvalModel()
    return _eval_model


# ═══════════════════════════════════════════════════════════════════════════
# Data loader
# ═══════════════════════════════════════════════════════════════════════════

def _load_profiles() -> list[dict[str, Any]]:
    """Load research profiles that have executive_summary.meeting_prep."""
    profiles: list[dict[str, Any]] = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(data, dict) or "slug" not in data:
            continue
        exec_summary = data.get("executive_summary")
        if not isinstance(exec_summary, dict):
            continue
        meeting_prep = exec_summary.get("meeting_prep")
        if not isinstance(meeting_prep, list) or not meeting_prep:
            continue
        profiles.append(data)
    return profiles


_PROFILES = _load_profiles()


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

class TestMeetingPrepStructure:
    def _profiles(self):
        if not _PROFILES:
            pytest.skip("No profiles with executive_summary.meeting_prep — run crew.py first")
        return _PROFILES

    def test_meeting_prep_count(self):
        """Assert meeting_prep is a list of exactly 3 items."""
        for p in self._profiles():
            items = p["executive_summary"]["meeting_prep"]
            assert isinstance(items, list) and len(items) == 3, (
                f"{p['slug']}: expected 3 meeting_prep items, got {len(items)}"
            )

    def test_meeting_prep_length(self):
        """Assert each item is 20-200 chars."""
        for p in self._profiles():
            for i, item in enumerate(p["executive_summary"]["meeting_prep"]):
                length = len(item)
                assert 20 <= length <= 200, (
                    f"{p['slug']} item[{i}]: length {length} not in 20-200 — {item!r}"
                )

    def test_meeting_prep_distinct(self):
        """Assert all 3 items are different strings."""
        for p in self._profiles():
            items = p["executive_summary"]["meeting_prep"]
            assert len(set(items)) == len(items), (
                f"{p['slug']}: duplicate meeting_prep items found"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Actionable & Specific (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestMeetingPrepActionableGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _PROFILES[:5],
                             ids=lambda p: p.get("slug", "?"))
    def test_meeting_prep_actionable_geval(self, profile):
        """G-Eval: are the 3 conversation starters actionable and specific?"""
        name = profile.get("name", profile["slug"])
        items = profile["executive_summary"]["meeting_prep"]
        formatted = "\n".join(f"- {item}" for item in items)
        actual_output = f"Person: {name}\n\nMeeting prep conversation starters:\n{formatted}"

        metric = GEval(
            name="Meeting Prep Actionability",
            criteria=(
                "Are these 3 conversation starters ACTIONABLE and SPECIFIC to this person? "
                "Good: 'Ask about their approach to multi-agent coordination in LangGraph'. "
                "Bad: 'Ask about AI'. "
                "Score 1.0=specific to this person, 0.0=generic."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Generate 3 actionable meeting prep conversation starters for {name}",
            actual_output=actual_output,
        )
        assert_test(tc, [metric])
