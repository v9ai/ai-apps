"""DeepEval evaluation suite for the technical_philosophy section of profiles.

Tests structural correctness and evidence grounding of technical philosophy
entries using both assertions and LLM-as-judge (DeepEval G-Eval).

Usage:
    pytest tests/test_eval_philosophy_grounding.py -v
    pytest tests/test_eval_philosophy_grounding.py -k "geval" -v
    deepeval test run tests/test_eval_philosophy_grounding.py
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
    """Load research profiles that contain a technical_philosophy section."""
    profiles: list[dict[str, Any]] = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if (
                isinstance(data, dict)
                and "slug" in data
                and "bio" in data
                and isinstance(data.get("technical_philosophy"), dict)
            ):
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPhilosophyStructure:
    """technical_philosophy must be a dict with a 'core_thesis' string."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with technical_philosophy — run research_pipeline.py first")
        return p

    def test_philosophy_structure(self):
        for p in self._profiles():
            phil = p["technical_philosophy"]
            assert isinstance(phil, dict), (
                f"{p['slug']}: technical_philosophy is not a dict"
            )
            assert "core_thesis" in phil, (
                f"{p['slug']}: technical_philosophy missing 'core_thesis'"
            )
            assert isinstance(phil["core_thesis"], str), (
                f"{p['slug']}: core_thesis is not a string"
            )


class TestPhilosophyHasPositions:
    """When present, 'positions' must be a dict with at least 1 entry."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with technical_philosophy")
        return p

    def test_philosophy_has_positions(self):
        for p in self._profiles():
            phil = p["technical_philosophy"]
            positions = phil.get("positions")
            if positions is None:
                continue
            assert isinstance(positions, dict), (
                f"{p['slug']}: positions is not a dict"
            )
            assert len(positions) >= 1, (
                f"{p['slug']}: positions dict is empty"
            )


class TestPhilosophyCoreThesisSpecific:
    """core_thesis must be at least 20 characters when present."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with technical_philosophy")
        return p

    def test_philosophy_core_thesis_specific(self):
        for p in self._profiles():
            thesis = p["technical_philosophy"].get("core_thesis", "")
            if not thesis:
                continue
            assert len(thesis) >= 20, (
                f"{p['slug']}: core_thesis too short ({len(thesis)} chars): '{thesis}'"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Evidence Grounding (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestPhilosophyEvidenceGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _load_profiles()[:5],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_philosophy_evidence_geval(self, profile):
        phil = profile["technical_philosophy"]
        text = json.dumps(phil, indent=2)
        if len(text) < 30:
            pytest.skip(f"Philosophy section too short for {profile['slug']}")

        metric = GEval(
            name="Philosophy Evidence Grounding",
            criteria=(
                "Does this technical philosophy section cite EVIDENCE for its claims? "
                "Good: 'Advocates open source — LangChain is MIT licensed'. "
                "Bad: 'Believes in AI' with no evidence. "
                "Score 1.0=all positions cite evidence."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Evaluate evidence grounding of technical philosophy for: {profile.get('name', profile['slug'])}",
            actual_output=text,
        )
        assert_test(tc, [metric])
