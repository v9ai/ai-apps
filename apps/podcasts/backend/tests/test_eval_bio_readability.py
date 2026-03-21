"""DeepEval evaluation suite for bio readability.

Tests that generated bios are readable, free of encoding errors,
and avoid repetitive phrasing.

Usage:
    pytest tests/test_eval_bio_readability.py -v
    pytest tests/test_eval_bio_readability.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_readability.py
"""

import json
import os
import re
from collections import Counter
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
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _sentences(text: str) -> list[str]:
    """Split text into sentences on period/exclamation/question mark boundaries."""
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in raw if s]


def _word_count(text: str) -> int:
    return len(text.split())


def _extract_ngrams(text: str, n: int) -> list[str]:
    """Extract all word n-grams from text (lowercased)."""
    words = re.findall(r"[a-z0-9']+", text.lower())
    return [" ".join(words[i:i + n]) for i in range(len(words) - n + 1)]


# Common mojibake / broken-encoding character sequences
_MOJIBAKE_PATTERNS = [
    "\u00c3",      # Ã
    "\u00e2\u0080", # â€
    "\u00c2",      # Â
    "\\u00",       # literal \u00 escape left in text
    "\ufffd",      # replacement character
    "\u00ef\u00bf\u00bd",  # UTF-8 BOM fragments
]


# ═══════════════════════════════════════════════════════════════════════════
# Tests: Bio Readability
# ═══════════════════════════════════════════════════════════════════════════

class TestBioReadability:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run crew.py first")
        return p

    def test_bio_avg_sentence_length(self):
        """Assert average sentence length is 10-40 words (not too terse, not run-on)."""
        for p in self._profiles():
            bio = p.get("bio", "")
            sents = _sentences(bio)
            if not sents:
                pytest.fail(f"{p['slug']}: bio has no sentences")
            avg = sum(_word_count(s) for s in sents) / len(sents)
            assert 10 <= avg <= 40, (
                f"{p['slug']}: avg sentence length {avg:.1f} words "
                f"(expected 10-40, got {len(sents)} sentences)"
            )

    def test_bio_no_repeated_phrases(self):
        """Assert no phrase of 4+ words appears twice in the same bio."""
        for p in self._profiles():
            bio = p.get("bio", "")
            ngrams = _extract_ngrams(bio, 4)
            counts = Counter(ngrams)
            repeated = {phrase: cnt for phrase, cnt in counts.items() if cnt >= 2}
            assert not repeated, (
                f"{p['slug']}: repeated 4-word phrases: {repeated}"
            )

    def test_bio_no_broken_encoding(self):
        """Assert no mojibake characters (common encoding errors)."""
        for p in self._profiles():
            bio = p.get("bio", "")
            found = [pat for pat in _MOJIBAKE_PATTERNS if pat in bio]
            assert not found, (
                f"{p['slug']}: broken encoding detected: {found}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Bio Readability (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioReadabilityGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_readability_geval(self, profile):
        """G-Eval: rate bio readability for a tech-savvy audience."""
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")
        metric = GEval(
            name="Bio Readability",
            criteria=(
                "Rate the readability. Is this bio easy to understand for a tech-savvy reader? "
                "Score 1.0=clear and engaging, 0.5=readable but dry, "
                "0.0=confusing, jargon-heavy, or poorly structured."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a readable bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=bio,
        )
        assert_test(tc, [metric])
