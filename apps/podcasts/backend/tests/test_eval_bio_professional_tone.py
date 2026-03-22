"""DeepEval evaluation suite for bio tone and style.

Tests that generated bios use third-person voice, avoid excessive superlatives,
and maintain a professional encyclopedic tone (not promotional or casual).

Usage:
    pytest tests/test_eval_bio_professional_tone.py -v
    pytest tests/test_eval_bio_professional_tone.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_professional_tone.py
"""

import json
import os
import re
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
# First-person detection
# ═══════════════════════════════════════════════════════════════════════════

# Word-boundary patterns for first-person pronouns
_FIRST_PERSON_RE = re.compile(
    r"\b(I|my|mine|myself|we|our|ours|ourselves)\b", re.IGNORECASE
)


class TestBioNoFirstPerson:
    """Assert bios are written in third person -- no I, my, we, etc."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run research_pipeline.py first")
        return p

    def test_bio_no_first_person(self):
        for p in self._profiles():
            bio = p.get("bio", "")
            matches = _FIRST_PERSON_RE.findall(bio)
            assert not matches, (
                f"{p['slug']} bio uses first-person pronouns: {matches}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Superlative detection
# ═══════════════════════════════════════════════════════════════════════════

_SUPERLATIVES = [
    "the best",
    "the greatest",
    "world-renowned",
    "legendary",
    "unparalleled",
    "unmatched",
    "unrivaled",
    "groundbreaking",
    "revolutionary",
    "visionary",
    "trailblazing",
    "iconic",
]

_SUPERLATIVE_RE = re.compile(
    "|".join(re.escape(s) for s in _SUPERLATIVES), re.IGNORECASE
)

MAX_SUPERLATIVES = 2


class TestBioNoSuperlatives:
    """Assert bios do not contain excessive superlatives (more than 2)."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run research_pipeline.py first")
        return p

    def test_bio_no_superlatives(self):
        for p in self._profiles():
            bio = p.get("bio", "")
            found = _SUPERLATIVE_RE.findall(bio)
            assert len(found) <= MAX_SUPERLATIVES, (
                f"{p['slug']} bio has {len(found)} superlatives "
                f"(max {MAX_SUPERLATIVES}): {found}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Professional Tone (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioProfessionalToneGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_professional_tone_geval(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Professional Tone",
            criteria=(
                "Evaluate tone: professional and neutral (like a Wikipedia entry), "
                "not promotional (like marketing copy) or casual (like a tweet). "
                "Score 1.0=encyclopedic, 0.5=slightly promotional, "
                "0.0=marketing copy or informal."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a professional bio for: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
