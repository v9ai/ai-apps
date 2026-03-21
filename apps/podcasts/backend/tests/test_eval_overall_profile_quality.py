"""Holistic G-Eval tests for overall profile quality.

Tests whether generated profiles are useful as briefings and whether they
contain enough substance for investor-level due diligence.

Usage:
    pytest tests/test_eval_overall_profile_quality.py -v
    deepeval test run tests/test_eval_overall_profile_quality.py
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


def _format_full_profile(profile: dict[str, Any]) -> str:
    """Format a profile as readable text: bio + topics + top contributions."""
    sections = []
    sections.append(f"Name: {profile.get('name', profile.get('slug', 'Unknown'))}")
    sections.append(f"\nBio:\n{profile.get('bio', '(missing)')}")
    topics = profile.get("topics", [])
    if topics:
        sections.append(f"\nTopics: {', '.join(topics)}")
    contributions = profile.get("key_contributions", [])
    if contributions:
        sections.append("\nKey Contributions:")
        for c in contributions:
            title = c.get("title", "Untitled")
            desc = c.get("description", "")
            sections.append(f"  - {title}: {desc}")
    return "\n".join(sections)


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Profile Usefulness (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestProfileUsefulnessGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:8],
                             ids=lambda p: p.get("slug", "?"))
    def test_profile_would_be_useful_geval(self, profile):
        full_text = _format_full_profile(profile)
        if len(full_text) < 80:
            pytest.skip(f"Not enough content for {profile['slug']}")
        metric = GEval(
            name="Profile Usefulness",
            criteria=(
                "Would this profile be USEFUL for someone preparing to meet this AI contributor? "
                "Does it answer: Who are they? What did they build? Why do they matter? "
                "Score 1.0=fully useful briefing, 0.0=useless."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Provide a useful briefing profile for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=full_text,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Investor Readiness (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestProfileInvestorReadyGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:5],
                             ids=lambda p: p.get("slug", "?"))
    def test_profile_investor_ready_geval(self, profile):
        full_text = _format_full_profile(profile)
        if len(full_text) < 80:
            pytest.skip(f"Not enough content for {profile['slug']}")
        metric = GEval(
            name="Investor Readiness",
            criteria=(
                "Could an investor use this profile to evaluate this person's track record? "
                "Does it contain: specific projects, metrics of impact, funding history, "
                "competitive context? "
                "Score 1.0=investor-ready, 0.0=insufficient."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Evaluate the track record of AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=full_text,
        )
        assert_test(tc, [metric])
