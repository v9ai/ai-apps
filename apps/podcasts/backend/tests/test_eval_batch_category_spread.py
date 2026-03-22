"""DeepEval evaluation suite for category distribution across profiles.

Tests that the batch of AI contributor profiles covers a diverse spread of
topics and does not collapse into a single niche.

Usage:
    pytest tests/test_eval_batch_category_spread.py -v
    pytest tests/test_eval_batch_category_spread.py -k "deepeval" -v
    deepeval test run tests/test_eval_batch_category_spread.py
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
# Category spread tests
# ═══════════════════════════════════════════════════════════════════════════

class TestBatchCategorySpread:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run research_pipeline.py first")
        return p

    def test_topic_diversity(self):
        """Collect all unique topics across all profiles; assert at least 10 distinct topics exist."""
        profiles = self._profiles()
        all_topics: set[str] = set()
        for p in profiles:
            for t in p.get("topics", []):
                all_topics.add(t.strip().lower())
        assert len(all_topics) >= 10, (
            f"Only {len(all_topics)} distinct topics across {len(profiles)} profiles; "
            f"expected at least 10. Topics found: {sorted(all_topics)}"
        )

    def test_no_topic_monoculture(self):
        """Assert no single topic appears in more than 80% of profiles."""
        profiles = self._profiles()
        n = len(profiles)
        topic_counts: dict[str, int] = {}
        for p in profiles:
            for t in p.get("topics", []):
                key = t.strip().lower()
                topic_counts[key] = topic_counts.get(key, 0) + 1
        threshold = 0.8 * n
        over = {t: c for t, c in topic_counts.items() if c > threshold}
        assert not over, (
            f"Topic monoculture detected -- these topics appear in >{80}% of {n} profiles: "
            f"{over}"
        )

    @pytest.mark.deepeval
    def test_category_coverage_geval(self):
        """G-Eval: batch-level diversity across AI sub-domains."""
        profiles = self._profiles()
        n = len(profiles)

        # Build a summary of all profiles' topics
        lines = []
        for p in profiles:
            topics = ", ".join(p.get("topics", []))
            lines.append(f"- {p.get('name', p['slug'])}: {topics}")
        summary = "\n".join(lines)

        metric = GEval(
            name="Category Coverage",
            criteria=(
                f"Given these topic lists from {n} AI contributor profiles, is there good "
                "DIVERSITY across AI sub-domains? "
                "Good: mix of ML frameworks, LLM tools, inference, MLOps, research, dev tools. "
                "Bad: all profiles about the same niche. "
                "Score 1.0=excellent spread."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Evaluate topic diversity across {n} AI contributor profiles",
            actual_output=summary,
        )
        assert_test(tc, [metric])
