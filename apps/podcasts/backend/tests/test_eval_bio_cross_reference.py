"""DeepEval: Bio cross-reference tests.

Verify that each profile's bio is consistent with its other sections
(key_contributions, topics, timeline).

Usage:
    pytest tests/test_eval_bio_cross_reference.py -v
    pytest tests/test_eval_bio_cross_reference.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_cross_reference.py
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
# Bio <-> Key Contributions cross-reference
# ═══════════════════════════════════════════════════════════════════════════

class TestBioMentionsContributionTitles:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_bio_mentions_contribution_titles(self):
        for profile in self._profiles():
            contributions = profile.get("key_contributions", [])
            if not contributions:
                continue
            bio_lower = profile.get("bio", "").lower()
            titles = [c.get("title", "") for c in contributions if c.get("title")]
            if not titles:
                continue
            matches = [t for t in titles if t.lower() in bio_lower]
            assert len(matches) >= 1, (
                f"{profile['slug']}: bio mentions none of the contribution titles. "
                f"Titles: {titles}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Bio <-> Topics cross-reference
# ═══════════════════════════════════════════════════════════════════════════

class TestBioMatchesTopics:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_bio_matches_topics(self):
        for profile in self._profiles():
            topics = profile.get("topics", [])
            if not topics:
                continue
            bio_lower = profile.get("bio", "").lower()
            matches = [t for t in topics if t.lower() in bio_lower]
            assert len(matches) >= 1, (
                f"{profile['slug']}: bio contains none of the topic keywords. "
                f"Topics: {topics}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Bio <-> Timeline consistency (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioTimelineAlignmentGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_timeline_alignment_geval(self, profile):
        bio = profile.get("bio", "")
        timeline = profile.get("timeline", [])
        if len(bio) < 30 or len(timeline) < 2:
            pytest.skip(f"Insufficient bio/timeline for {profile['slug']}")

        timeline_text = "\n".join(
            f"- {e.get('date', '?')}: {e.get('event', '?')}"
            for e in timeline
        )
        combined = f"Bio:\n{bio}\n\nTimeline events:\n{timeline_text}"

        metric = GEval(
            name="Bio-Timeline Alignment",
            criteria=(
                "Given this bio and timeline, do they describe the same person's career? "
                "Score 1.0=fully consistent, 0.5=mostly consistent, 0.0=contradictory."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Check bio-timeline consistency for {profile.get('name', profile['slug'])}",
            actual_output=combined,
        )
        assert_test(tc, [metric])
