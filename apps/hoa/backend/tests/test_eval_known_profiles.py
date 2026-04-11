"""Regression tests using the known-good Harrison Chase profile from conftest.

Validates that SAMPLE_RESEARCH passes all structural checks and a G-Eval
bio specificity test with a higher bar (threshold=0.7) since this is
curated, known-good data.

Usage:
    pytest tests/test_eval_known_profiles.py -v
    pytest tests/test_eval_known_profiles.py -k "deepeval" -v
    deepeval test run tests/test_eval_known_profiles.py
"""

import os
import sys
from pathlib import Path

import httpx
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

# Ensure the tests/ directory is on sys.path so conftest is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))
from conftest import SAMPLE_RESEARCH


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
# Required fields for schema validation
# ═══════════════════════════════════════════════════════════════════════════

REQUIRED_FIELDS = {
    "slug", "name", "generated_at", "bio", "topics",
    "timeline", "key_contributions", "quotes", "social", "sources",
}


# ═══════════════════════════════════════════════════════════════════════════
# Regression tests against the known-good Harrison Chase profile
# ═══════════════════════════════════════════════════════════════════════════

class TestKnownProfile:
    def test_sample_has_all_fields(self):
        """Assert SAMPLE_RESEARCH has all required fields."""
        missing = REQUIRED_FIELDS - set(SAMPLE_RESEARCH.keys())
        assert not missing, f"SAMPLE_RESEARCH missing required fields: {missing}"

    def test_sample_bio_quality(self):
        """Assert sample bio >= 100 chars and mentions 'LangChain'."""
        bio = SAMPLE_RESEARCH.get("bio", "")
        assert len(bio) >= 100, f"Bio too short: {len(bio)} chars (need >= 100)"
        assert "LangChain" in bio, "Bio does not mention 'LangChain'"

    def test_sample_timeline_count(self):
        """Assert sample has >= 3 timeline events."""
        timeline = SAMPLE_RESEARCH.get("timeline", [])
        assert len(timeline) >= 3, f"Too few timeline events: {len(timeline)} (need >= 3)"

    def test_sample_contributions_count(self):
        """Assert sample has >= 2 contributions."""
        contributions = SAMPLE_RESEARCH.get("key_contributions", [])
        assert len(contributions) >= 2, f"Too few contributions: {len(contributions)} (need >= 2)"

    def test_sample_social_has_github(self):
        """Assert sample social has 'github' key."""
        social = SAMPLE_RESEARCH.get("social", {})
        assert "github" in social, f"Social missing 'github' key. Keys present: {list(social.keys())}"

    def test_sample_executive_summary_complete(self):
        """Assert sample executive_summary has one_liner, key_facts, career_arc."""
        exec_summary = SAMPLE_RESEARCH.get("executive_summary", {})
        assert isinstance(exec_summary, dict), "executive_summary is not a dict"
        for field in ("one_liner", "key_facts", "career_arc"):
            assert field in exec_summary, f"executive_summary missing '{field}'"

    def test_sample_passes_schema(self):
        """Assert sample passes all required field checks."""
        # Required fields present
        missing = REQUIRED_FIELDS - set(SAMPLE_RESEARCH.keys())
        assert not missing, f"Missing fields: {missing}"
        # bio is a non-empty string
        assert isinstance(SAMPLE_RESEARCH["bio"], str) and len(SAMPLE_RESEARCH["bio"]) >= 50
        # topics is a list with items
        assert isinstance(SAMPLE_RESEARCH["topics"], list) and len(SAMPLE_RESEARCH["topics"]) >= 2
        # timeline entries have date and event
        for entry in SAMPLE_RESEARCH["timeline"]:
            assert isinstance(entry, dict), "Timeline entry is not a dict"
            assert "date" in entry and "event" in entry, f"Timeline entry missing date/event: {entry}"
        # contributions have title
        for contrib in SAMPLE_RESEARCH["key_contributions"]:
            assert isinstance(contrib, dict) and "title" in contrib, f"Bad contribution: {contrib}"
        # social is a dict
        assert isinstance(SAMPLE_RESEARCH["social"], dict)


# ═══════════════════════════════════════════════════════════════════════════
# G-Eval: Bio specificity (higher bar for known-good data)
# ═══════════════════════════════════════════════════════════════════════════

class TestKnownProfileGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", [SAMPLE_RESEARCH],
                             ids=[SAMPLE_RESEARCH["slug"]])
    def test_sample_bio_geval(self, profile):
        """G-Eval: Score the sample bio for specificity. threshold=0.7."""
        bio = profile.get("bio", "")
        metric = GEval(
            name="Bio Specificity",
            criteria=(
                "Evaluate whether the biography contains specific, verifiable facts about the person. "
                "A good bio names actual projects, frameworks, companies, roles, metrics. "
                "A bad bio uses vague language like 'contributed to various projects'."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.7,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
