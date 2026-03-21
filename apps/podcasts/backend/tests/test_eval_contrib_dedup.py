"""DeepEval evaluation suite for contribution deduplication.

Tests that generated contributor profiles do not contain duplicate or
redundant contributions, and that contributions stay within reasonable
bounds and remain AI-relevant.

Usage:
    pytest tests/test_eval_contrib_dedup.py -v
    pytest tests/test_eval_contrib_dedup.py -k "deepeval" -v
    deepeval test run tests/test_eval_contrib_dedup.py
"""

import json
import os
from collections import Counter
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
# Contribution deduplication tests
# ═══════════════════════════════════════════════════════════════════════════

class TestContribDedup:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_no_duplicate_contribs_within_profile(self):
        """Assert no profile lists the same contribution title twice (case-insensitive)."""
        for p in self._profiles():
            titles = [c.get("title", "").strip().lower()
                      for c in p.get("key_contributions", [])
                      if c.get("title", "").strip()]
            counts = Counter(titles)
            dupes = {t: n for t, n in counts.items() if n > 1}
            assert not dupes, (
                f"{p['slug']} has duplicate contribution titles: {dupes}"
            )

    def test_contrib_descriptions_unique(self):
        """Assert no two contributions in the same profile have identical descriptions."""
        for p in self._profiles():
            descriptions = [c.get("description", "").strip().lower()
                            for c in p.get("key_contributions", [])
                            if c.get("description", "").strip()]
            counts = Counter(descriptions)
            dupes = {d[:80]: n for d, n in counts.items() if n > 1}
            assert not dupes, (
                f"{p['slug']} has duplicate contribution descriptions: {dupes}"
            )

    def test_contrib_count_range(self):
        """Assert each profile has 0-10 contributions (not unreasonably many)."""
        for p in self._profiles():
            count = len(p.get("key_contributions", []))
            assert 0 <= count <= 10, (
                f"{p['slug']} has {count} contributions, expected 0-10"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Contribution AI Relevance (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestContribAIRelevanceGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_contrib_ai_relevance(self, profile):
        titles = [c.get("title", "") for c in profile.get("key_contributions", [])
                  if c.get("title", "")]
        if not titles:
            pytest.skip(f"No contributions for {profile['slug']}")
        joined = "; ".join(titles)
        metric = GEval(
            name="Contribution AI Relevance",
            criteria=(
                "Are ALL these contributions related to AI/ML/software? "
                "Score 1.0=all AI-related, 0.5=some non-AI, 0.0=mostly not AI."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List AI/ML/software contributions for: {profile.get('name', profile['slug'])}",
            actual_output=joined,
        )
        assert_test(tc, [metric])
