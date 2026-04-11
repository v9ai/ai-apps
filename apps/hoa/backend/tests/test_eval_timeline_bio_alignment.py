"""G-Eval tests for consistency between timeline and bio.

Checks that timeline events align with biographical claims and that
timeline URLs are well-formed.

Usage:
    pytest tests/test_eval_timeline_bio_alignment.py -v
    deepeval test run tests/test_eval_timeline_bio_alignment.py
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
# Timeline / Bio alignment (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestTimelineBioAlignment:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_timeline_bio_consistency_geval(self, profile):
        bio = profile.get("bio", "")
        timeline = profile.get("timeline", [])
        if len(bio) < 30 or len(timeline) < 1:
            pytest.skip(f"Insufficient data for {profile['slug']}")

        numbered_events = "\n".join(
            f"{i+1}. [{e.get('date', 'N/A')}] {e.get('event', '')}"
            for i, e in enumerate(timeline)
        )
        actual_output = f"BIO:\n{bio}\n\nTIMELINE:\n{numbered_events}"

        metric = GEval(
            name="Timeline-Bio Consistency",
            criteria=(
                "Given this person's bio and their timeline events, are they consistent? "
                "Do key claims in the bio appear in the timeline? "
                "Score 1.0=fully consistent, 0.5=mostly, 0.0=contradictory."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Check bio-timeline consistency for {profile.get('name', profile['slug'])}",
            actual_output=actual_output,
        )
        assert_test(tc, [metric])

    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_timeline_url_format(self, profile):
        timeline = profile.get("timeline", [])
        if not timeline:
            pytest.skip(f"No timeline for {profile['slug']}")
        for i, event in enumerate(timeline):
            url = event.get("url", "")
            assert url == "" or url.startswith("http"), (
                f"{profile['slug']} timeline[{i}] bad URL: {url!r}"
            )
