"""DeepEval evaluation suite for social profile completeness.

Tests that every research profile has adequate social links, consistent
usernames, and broad platform diversity across the dataset.

Usage:
    pytest tests/test_eval_social_coverage.py -v
    pytest tests/test_eval_social_coverage.py -k "deepeval" -v
    deepeval test run tests/test_eval_social_coverage.py
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
# Social profile completeness
# ═══════════════════════════════════════════════════════════════════════════

class TestSocialCoverage:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run crew.py first")
        return p

    def test_every_profile_has_github(self):
        """Assert every profile's social dict has a 'github' key or a URL containing 'github.com'."""
        for p in self._profiles():
            social = p.get("social", {})
            has_github_key = "github" in social
            has_github_url = any(
                "github.com" in str(v) for v in social.values()
            )
            assert has_github_key or has_github_url, (
                f"{p['slug']} has no GitHub link in social: {social}"
            )

    def test_social_minimum_platforms(self):
        """Assert every profile has at least 1 social link."""
        for p in self._profiles():
            social = p.get("social", {})
            assert isinstance(social, dict) and len(social) >= 1, (
                f"{p['slug']} has no social links"
            )

    def test_social_batch_diversity(self):
        """Across all profiles, at least 3 different platform keys appear."""
        profiles = self._profiles()
        all_keys: set[str] = set()
        for p in profiles:
            social = p.get("social", {})
            if isinstance(social, dict):
                all_keys.update(social.keys())
        assert len(all_keys) >= 3, (
            f"Only {len(all_keys)} distinct platform keys across all profiles: {all_keys}. "
            f"Expected at least 3 (e.g. github, twitter, blog, linkedin, website)."
        )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Social username consistency (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestSocialConsistencyGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_social_consistency_with_name(self, profile):
        """G-Eval: do the social usernames/URLs plausibly belong to this person?"""
        name = profile.get("name", profile["slug"])
        social = profile.get("social", {})
        if not social:
            pytest.skip(f"No social links for {profile['slug']}")
        social_str = json.dumps(social, indent=2)
        metric = GEval(
            name="Social Username Consistency",
            criteria=(
                f"Given this person's name '{name}' and their social links {social_str}, "
                "do the usernames/URLs plausibly belong to this person? "
                "Score 1.0=consistent (usernames are recognizable variants of the name "
                "or known handles for this person), "
                "0.0=mismatched usernames (clearly belonging to someone else or nonsensical)."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Check social link consistency for {name}",
            actual_output=f"Name: {name}\nSocial links:\n{social_str}",
        )
        assert_test(tc, [metric])
