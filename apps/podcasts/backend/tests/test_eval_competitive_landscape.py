"""DeepEval evaluation suite for the competitive_landscape section of profiles.

Tests structural correctness (market_position, competitors list, moats) and
uses G-Eval to verify that listed competitors are real companies/projects.

Usage:
    pytest tests/test_eval_competitive_landscape.py -v
    pytest tests/test_eval_competitive_landscape.py -k "deepeval" -v
    deepeval test run tests/test_eval_competitive_landscape.py
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


def _profiles_with_competitive() -> list[dict[str, Any]]:
    """Return only profiles that have a competitive_landscape dict."""
    return [
        p for p in _load_profiles()
        if isinstance(p.get("competitive_landscape"), dict)
    ]


def _known_project(profile: dict[str, Any]) -> str:
    """Extract a known project name from key_contributions or bio."""
    contribs = profile.get("key_contributions", [])
    if contribs and isinstance(contribs[0], dict):
        return contribs[0].get("title", profile.get("name", "unknown"))
    return profile.get("name", "unknown")


# ═══════════════════════════════════════════════════════════════════════════
# Structural: market_position exists
# ═══════════════════════════════════════════════════════════════════════════

class TestCompetitiveHasPosition:
    def _profiles(self):
        p = _profiles_with_competitive()
        if not p:
            pytest.skip("No profiles with competitive_landscape")
        return p

    def test_competitive_has_position(self):
        for p in self._profiles():
            cl = p["competitive_landscape"]
            assert "market_position" in cl, (
                f"{p['slug']} competitive_landscape missing 'market_position'"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Structural: competitors is a non-empty list
# ═══════════════════════════════════════════════════════════════════════════

class TestCompetitiveHasCompetitors:
    def _profiles(self):
        p = _profiles_with_competitive()
        if not p:
            pytest.skip("No profiles with competitive_landscape")
        return p

    def test_competitive_has_competitors(self):
        for p in self._profiles():
            cl = p["competitive_landscape"]
            competitors = cl.get("competitors")
            assert isinstance(competitors, list) and len(competitors) >= 1, (
                f"{p['slug']} competitive_landscape 'competitors' must be a list with >= 1 entry, "
                f"got {type(competitors).__name__}: {competitors!r}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# G-Eval: competitors are real companies/projects
# ═══════════════════════════════════════════════════════════════════════════

class TestCompetitiveAccuracyGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _profiles_with_competitive()[:5],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_competitive_accuracy_geval(self, profile):
        cl = profile["competitive_landscape"]
        competitors = cl.get("competitors", [])
        if not competitors:
            pytest.skip(f"No competitors listed for {profile['slug']}")

        known_project = _known_project(profile)
        competitor_text = json.dumps(competitors, indent=2)

        metric = GEval(
            name="Competitive Landscape Accuracy",
            criteria=(
                f"Given this person works on '{known_project}', are the listed "
                f"competitors REAL companies/projects that actually compete in "
                f"the same space? Score 1.0=all real competitors, 0.0=fabricated "
                f"or irrelevant companies."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List competitors for {profile.get('name', profile['slug'])} who works on {known_project}",
            actual_output=competitor_text,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# Structural: moats is a non-empty list when present
# ═══════════════════════════════════════════════════════════════════════════

class TestCompetitiveMoatsNonempty:
    def _profiles(self):
        p = _profiles_with_competitive()
        if not p:
            pytest.skip("No profiles with competitive_landscape")
        return p

    def test_competitive_moats_nonempty(self):
        for p in self._profiles():
            cl = p["competitive_landscape"]
            moats = cl.get("moats")
            if moats is None:
                continue  # moats key not present — skip this profile
            assert isinstance(moats, list) and len(moats) >= 1, (
                f"{p['slug']} competitive_landscape 'moats' present but empty or wrong type, "
                f"got {type(moats).__name__}: {moats!r}"
            )
