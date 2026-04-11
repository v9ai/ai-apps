"""DeepEval evaluation suite for contribution description impact metrics.

Tests that contribution descriptions contain quantitative impact signals,
explain WHY each project matters, and meet minimum length requirements.

Usage:
    pytest tests/test_eval_contrib_impact_metrics.py -v
    pytest tests/test_eval_contrib_impact_metrics.py -k "geval" -v
    deepeval test run tests/test_eval_contrib_impact_metrics.py
"""

import json
import os
import re
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
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and "bio" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Contribution impact metrics
# ═══════════════════════════════════════════════════════════════════════════

class TestContribImpactMetrics:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_contrib_descriptions_have_numbers(self):
        """Assert at least 50% of contribution descriptions contain a number."""
        profiles = self._profiles()
        total = 0
        with_number = 0
        for p in profiles:
            for c in p.get("key_contributions", []):
                desc = c.get("description", "")
                if not desc:
                    continue
                total += 1
                if re.search(r"\d+", desc):
                    with_number += 1
        if total == 0:
            pytest.skip("No contribution descriptions found")
        ratio = with_number / total
        assert ratio >= 0.5, (
            f"Only {with_number}/{total} ({ratio:.0%}) contribution descriptions "
            f"contain a number — expected >= 50%"
        )

    def test_contrib_min_description_length(self):
        """Assert every contribution description is >= 30 chars."""
        profiles = self._profiles()
        short = []
        for p in profiles:
            for c in p.get("key_contributions", []):
                desc = c.get("description", "")
                if len(desc) < 30:
                    short.append(
                        f"{p['slug']}: \"{c.get('title', '?')}\" — {len(desc)} chars"
                    )
        assert not short, (
            f"{len(short)} contribution description(s) shorter than 30 chars:\n"
            + "\n".join(short)
        )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Contribution Impact Clarity (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestContribImpactGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_contrib_impact_clarity_geval(self, profile):
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"No contributions for {profile['slug']}")
        descriptions = "\n".join(
            f"- {c.get('title', '?')}: {c.get('description', '')}"
            for c in contribs
        )
        if len(descriptions) < 30:
            pytest.skip(f"Contribution text too short for {profile['slug']}")
        metric = GEval(
            name="Contribution Impact Clarity",
            criteria=(
                "Do these contribution descriptions explain WHY each project matters? "
                "Good: mentions users, stars, citations, industry impact. "
                "Bad: just describes what it is without impact. "
                "Score 1.0=clear impact for each, 0.0=no impact mentioned."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Describe contributions and their impact for: {profile.get('name', profile['slug'])}",
            actual_output=descriptions,
        )
        assert_test(tc, [metric])
