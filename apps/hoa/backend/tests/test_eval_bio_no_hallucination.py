"""DeepEval evaluation suite: detect hallucinated/fabricated content in bios.

Tests check for placeholder text, JSON artifacts, and LLM-judged fabrication
in generated contributor biographies.

Usage:
    pytest tests/test_eval_bio_no_hallucination.py -v
    pytest tests/test_eval_bio_no_hallucination.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_no_hallucination.py
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
# Placeholder / boilerplate detection
# ═══════════════════════════════════════════════════════════════════════════

class TestBioNoPlaceholderText:
    """Assert no TODO, N/A, unknown, placeholder, or lorem ipsum in bios."""

    PLACEHOLDER_PATTERNS = [
        re.compile(r"\bTODO\b", re.IGNORECASE),
        re.compile(r"\bN/A\b"),
        re.compile(r"\bunknown\b", re.IGNORECASE),
        re.compile(r"\bplaceholder\b", re.IGNORECASE),
        re.compile(r"lorem\s+ipsum", re.IGNORECASE),
    ]

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_bio_no_placeholder_text(self):
        for profile in self._profiles():
            bio = profile.get("bio", "")
            slug = profile.get("slug", "?")
            for pattern in self.PLACEHOLDER_PATTERNS:
                match = pattern.search(bio)
                assert match is None, (
                    f"{slug} bio contains placeholder text: '{match.group()}'"
                )


# ═══════════════════════════════════════════════════════════════════════════
# JSON / code artifact detection
# ═══════════════════════════════════════════════════════════════════════════

class TestBioNoJsonArtifacts:
    """Assert no JSON brackets, curly braces patterns, or markdown code fences in bios."""

    ARTIFACT_PATTERNS = [
        # JSON-like structures: {"key": "value"} or ["item"]
        (re.compile(r'\{\s*"[^"]+"\s*:'), "JSON object pattern"),
        (re.compile(r'\[\s*"[^"]*"\s*[,\]]'), "JSON array pattern"),
        # Markdown code fences
        (re.compile(r"```"), "markdown code fence"),
    ]

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run research_pipeline.py first")
        return p

    def test_bio_no_json_artifacts(self):
        for profile in self._profiles():
            bio = profile.get("bio", "")
            slug = profile.get("slug", "?")
            for pattern, description in self.ARTIFACT_PATTERNS:
                match = pattern.search(bio)
                assert match is None, (
                    f"{slug} bio contains {description}: '{match.group()}'"
                )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Hallucinated titles / fabricated claims (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioNoHallucinatedTitles:
    """G-Eval: check if biography makes claims that sound fabricated."""

    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_no_hallucinated_titles(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio No Hallucination",
            criteria=(
                "Check if this biography makes claims that sound fabricated: "
                "invented awards, non-existent companies, impossibly precise "
                "statistics without sources. Score 1.0 if all claims sound "
                "plausible. Score 0.0 if claims sound fabricated."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
