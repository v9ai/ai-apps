"""G-Eval tests for topic granularity and diversity.

Tests whether generated topics are at the right level of specificity
and cover different aspects of each contributor's work.

Usage:
    pytest tests/test_eval_topics_granularity.py -v
    deepeval test run tests/test_eval_topics_granularity.py
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
# G-Eval: Topic Granularity
# ═══════════════════════════════════════════════════════════════════════════

class TestTopicsGranularity:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_topics_right_granularity_geval(self, profile):
        topics = profile.get("topics", [])
        if len(topics) < 2:
            pytest.skip(f"Too few topics for {profile['slug']}")
        topics_text = ", ".join(topics)
        metric = GEval(
            name="Topic Granularity",
            criteria=(
                "Are these topics at the RIGHT level of specificity for describing "
                "an AI contributor's expertise? Too broad: 'machine learning'. "
                "Too narrow: 'PyTorch 2.0 torch.compile JIT fusion pass'. "
                "Just right: 'distributed model training', 'attention mechanism optimization'. "
                "Score 1.0=well-calibrated."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List expertise topics for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=topics_text,
        )
        assert_test(tc, [metric])

    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_topics_cover_different_aspects_geval(self, profile):
        topics = profile.get("topics", [])
        if len(topics) < 2:
            pytest.skip(f"Too few topics for {profile['slug']}")
        topics_text = ", ".join(topics)
        metric = GEval(
            name="Topic Diversity",
            criteria=(
                "Do these topics cover DIFFERENT aspects of the person's work (breadth), "
                "or are they all variations of the same thing? "
                "Score 1.0=diverse coverage, 0.0=all synonyms."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List expertise topics for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=topics_text,
        )
        assert_test(tc, [metric])
