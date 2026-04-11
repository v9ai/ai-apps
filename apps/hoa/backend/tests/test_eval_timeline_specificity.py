"""G-Eval tests for timeline event quality: specificity and milestone diversity.

Usage:
    pytest tests/test_eval_timeline_specificity.py -v
    deepeval test run tests/test_eval_timeline_specificity.py
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
# G-Eval: Timeline Event Specificity
# ═══════════════════════════════════════════════════════════════════════════

class TestTimelineEventsSpecificGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_timeline_events_specific_geval(self, profile):
        timeline = profile.get("timeline", [])
        if not timeline:
            pytest.skip(f"No timeline events for {profile['slug']}")
        numbered = "\n".join(
            f"{i}. [{e.get('date', 'N/A')}] {e.get('event', '')}"
            for i, e in enumerate(timeline, 1)
        )
        metric = GEval(
            name="Timeline Event Specificity",
            criteria=(
                "Are these timeline events specific and informative? "
                "Good events: 'Founded LangChain' or 'Raised $25M Series A led by Sequoia'. "
                "Bad events: 'Started working' or 'Did something'. "
                "Score 1.0=all events are specific with names/numbers, 0.0=vague events."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List timeline events for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=numbered,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# G-Eval: Timeline Milestone Diversity
# ═══════════════════════════════════════════════════════════════════════════

class TestTimelineMilestoneDiversityGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_timeline_milestone_diversity_geval(self, profile):
        timeline = profile.get("timeline", [])
        if not timeline:
            pytest.skip(f"No timeline events for {profile['slug']}")
        numbered = "\n".join(
            f"{i}. [{e.get('date', 'N/A')}] {e.get('event', '')}"
            for i, e in enumerate(timeline, 1)
        )
        metric = GEval(
            name="Timeline Milestone Diversity",
            criteria=(
                "Do these timeline events cover DIVERSE milestone types? "
                "Good: mix of career moves, product launches, funding, publications, talks. "
                "Bad: all same type. "
                "Score 1.0=diverse, 0.0=monotonous."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List timeline milestones for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=numbered,
        )
        assert_test(tc, [metric])
