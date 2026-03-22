"""DeepEval evaluation suite for conference/speaking data accuracy.

Tests the quality and correctness of conference data in generated profiles:
1. Structure — conferences dict contains a "talks" list
2. Speaking tier — valid enum value when present
3. Conference names — G-Eval checks names are real AI/tech conferences
4. Talk dates — talks have a "date" field when present

Usage:
    pytest tests/test_eval_conference_accuracy.py -v
    pytest tests/test_eval_conference_accuracy.py -k "structure" -v
    pytest tests/test_eval_conference_accuracy.py -k "deepeval" -v
    deepeval test run tests/test_eval_conference_accuracy.py
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
# Data loader — only profiles that have conferences
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


def _profiles_with_conferences() -> list[dict[str, Any]]:
    """Return only profiles that have a non-empty 'conferences' dict."""
    return [
        p for p in _load_profiles()
        if isinstance(p.get("conferences"), dict) and p["conferences"]
    ]


VALID_SPEAKING_TIERS = {"thought-leader", "regular", "occasional", "rare"}


# ═══════════════════════════════════════════════════════════════════════════
# Test 1: Conference structure — dict with "talks" list
# ═══════════════════════════════════════════════════════════════════════════

class TestConferenceStructure:
    """For profiles with conferences, assert it is a dict containing a 'talks' list."""

    def _profiles(self):
        p = _profiles_with_conferences()
        if not p:
            pytest.skip("No profiles with conferences -- run research_pipeline.py first")
        return p

    def test_conference_structure(self):
        for p in self._profiles():
            conf = p["conferences"]
            assert isinstance(conf, dict), (
                f"{p['slug']} conferences is {type(conf).__name__}, expected dict"
            )
            assert "talks" in conf, (
                f"{p['slug']} conferences missing 'talks' key; "
                f"keys found: {list(conf.keys())}"
            )
            assert isinstance(conf["talks"], list), (
                f"{p['slug']} conferences['talks'] is {type(conf['talks']).__name__}, "
                f"expected list"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Test 2: Speaking tier — valid enum value
# ═══════════════════════════════════════════════════════════════════════════

class TestConferenceSpeakingTier:
    """Assert speaking_tier is one of the recognized values when present."""

    def _profiles(self):
        p = _profiles_with_conferences()
        if not p:
            pytest.skip("No profiles with conferences -- run research_pipeline.py first")
        return p

    def test_conference_speaking_tier(self):
        for p in self._profiles():
            conf = p["conferences"]
            tier = conf.get("speaking_tier")
            if tier is None:
                continue
            assert tier in VALID_SPEAKING_TIERS, (
                f"{p['slug']} speaking_tier '{tier}' not in "
                f"{VALID_SPEAKING_TIERS}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Test 3: G-Eval — conference names are real AI/tech conferences
# ═══════════════════════════════════════════════════════════════════════════

class TestConferenceNamesRealGEval:
    """G-Eval: verify conference/event names are real, known AI/tech events."""

    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _profiles_with_conferences()[:5],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_conference_names_real_geval(self, profile):
        conf = profile.get("conferences", {})
        talks = conf.get("talks", [])
        if not talks:
            pytest.skip(f"No talks for {profile['slug']}")

        event_names = [t.get("event", "") for t in talks if t.get("event")]
        if not event_names:
            pytest.skip(f"No event names for {profile['slug']}")

        metric = GEval(
            name="Conference Names Real",
            criteria=(
                "Are these conference/event names REAL AI/tech conferences? "
                "Known: NeurIPS, ICML, ICLR, CVPR, KDD, AI Engineer Summit, "
                "PyCon, PyData, Strange Loop, QCon, Google I/O, WWDC, AWS re:Invent, "
                "Microsoft Build, GTC, Web Summit, TechCrunch Disrupt, AAAI, IJCAI, "
                "ACL, EMNLP, NAACL, SIGMOD, VLDB, OSDI, SOSP, etc. "
                "Score 1.0=all real events, 0.0=fabricated event names."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List conference appearances for {profile.get('name', profile['slug'])}",
            actual_output=json.dumps(event_names),
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# Test 4: Talks have date fields
# ═══════════════════════════════════════════════════════════════════════════

class TestConferenceTalksHaveDates:
    """Assert talks have a 'date' field when present."""

    def _profiles(self):
        p = _profiles_with_conferences()
        if not p:
            pytest.skip("No profiles with conferences -- run research_pipeline.py first")
        return p

    def test_conference_talks_have_dates(self):
        for p in self._profiles():
            talks = p["conferences"].get("talks", [])
            for i, talk in enumerate(talks):
                assert "date" in talk, (
                    f"{p['slug']} talk[{i}] missing 'date' field; "
                    f"talk keys: {list(talk.keys())}"
                )
                assert talk["date"], (
                    f"{p['slug']} talk[{i}] has empty 'date' value"
                )
