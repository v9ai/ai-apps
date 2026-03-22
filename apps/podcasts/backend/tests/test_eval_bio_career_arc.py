"""DeepEval evaluation suite for career arc narrative quality in bios.

Tests whether generated bios tell a coherent career story — where the person
started, what they built/discovered, and where they are now.

Usage:
    pytest tests/test_eval_bio_career_arc.py -v
    pytest tests/test_eval_bio_career_arc.py -k "sentence_count" -v
    pytest tests/test_eval_bio_career_arc.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_career_arc.py
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
# Bio sentence count (structural)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioSentenceCount:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_bio_sentence_count(self):
        for p in self._profiles():
            bio = p.get("bio", "")
            sentences = [s.strip() for s in bio.split(". ") if s.strip()]
            count = len(sentences)
            assert 3 <= count <= 8, (
                f"{p['slug']} bio has {count} sentences (expected 3-8)"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Career Arc Narrative (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioCareerArcGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_career_arc_geval(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Career Arc Narrative",
            criteria=(
                "Does this bio tell a career story? A good bio has: where they started, "
                "what they built/discovered, where they are now. "
                "Score 1.0=clear career arc, 0.5=partial arc, 0.0=disconnected facts."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a career bio for: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Current Focus (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioCurrentFocusGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_current_focus(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Current Focus",
            criteria=(
                "Does this bio mention what the person is CURRENTLY working on "
                "(not just past achievements)? "
                "Score 1.0=clear current focus, 0.0=only historical."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a bio for: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
