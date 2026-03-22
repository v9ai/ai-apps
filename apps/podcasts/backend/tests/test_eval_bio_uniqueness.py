"""DeepEval evaluation suite: Bio Uniqueness.

Tests that generated bios are unique and not templated across profiles.

1. test_bios_no_shared_sentences    - No sentence appears in 2+ different profiles
2. test_bios_no_template_phrases    - No bio contains common template filler phrases
3. test_bio_uniqueness_geval        - G-Eval judges whether random bio pairs are distinct

Usage:
    pytest tests/test_eval_bio_uniqueness.py -v
    pytest tests/test_eval_bio_uniqueness.py -k "template" -v
    pytest tests/test_eval_bio_uniqueness.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_uniqueness.py
"""

import json
import os
import random
import re
from collections import defaultdict
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

def _extract_sentences(text: str) -> list[str]:
    """Split text into sentences, normalize whitespace, drop very short fragments."""
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = []
    for s in raw:
        s = re.sub(r'\s+', ' ', s).strip()
        if len(s) >= 20:
            sentences.append(s)
    return sentences


def _pick_profile_pairs(
    profiles: list[dict[str, Any]], n: int = 3, seed: int = 42
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """Pick n random pairs of distinct profiles (deterministic seed)."""
    if len(profiles) < 2:
        return []
    rng = random.Random(seed)
    pairs: list[tuple[dict[str, Any], dict[str, Any]]] = []
    indices = list(range(len(profiles)))
    attempts = 0
    while len(pairs) < n and attempts < n * 10:
        i, j = rng.sample(indices, 2)
        pair = (profiles[i], profiles[j])
        if pair not in pairs and (profiles[j], profiles[i]) not in pairs:
            pairs.append(pair)
        attempts += 1
    return pairs


# ═══════════════════════════════════════════════════════════════════════════
# Template phrases
# ═══════════════════════════════════════════════════════════════════════════

TEMPLATE_PHRASES = [
    "is a contributor to",
    "is known for their work in",
    "has made significant contributions",
    "is widely recognized for",
    "has been instrumental in",
    "is a leading figure in",
    "has contributed to numerous",
    "plays a pivotal role in",
    "has played a key role in",
    "is at the forefront of",
]


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

class TestBioUniqueness:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run research_pipeline.py first")
        return p

    def test_bios_no_shared_sentences(self):
        """No sentence should appear verbatim in two or more different profiles."""
        profiles = self._profiles()
        if len(profiles) < 2:
            pytest.skip("Need at least 2 profiles to compare")

        sentence_to_slugs: dict[str, list[str]] = defaultdict(list)
        for p in profiles:
            bio = p.get("bio", "")
            slug = p["slug"]
            for sentence in _extract_sentences(bio):
                sentence_to_slugs[sentence].append(slug)

        shared = {
            sentence: slugs
            for sentence, slugs in sentence_to_slugs.items()
            if len(set(slugs)) >= 2
        }
        assert not shared, (
            f"Found {len(shared)} sentence(s) shared across profiles: "
            + "; ".join(
                f"'{s[:80]}...' in [{', '.join(sorted(set(slugs)))}]"
                for s, slugs in list(shared.items())[:5]
            )
        )

    def test_bios_no_template_phrases(self):
        """No bio should contain generic template filler phrases."""
        profiles = self._profiles()
        violations: list[str] = []
        for p in profiles:
            bio_lower = p.get("bio", "").lower()
            slug = p["slug"]
            for phrase in TEMPLATE_PHRASES:
                if phrase in bio_lower:
                    violations.append(f"{slug} contains '{phrase}'")

        assert not violations, (
            f"{len(violations)} template phrase(s) found: "
            + "; ".join(violations[:10])
        )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Bio Uniqueness (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

_pairs = _pick_profile_pairs(_load_profiles(), n=3, seed=42)


class TestBioUniquenessGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "pair",
        _pairs,
        ids=lambda pair: f"{pair[0].get('slug', '?')}_vs_{pair[1].get('slug', '?')}",
    )
    def test_bio_uniqueness_geval(self, pair):
        profile_a, profile_b = pair
        bio_a = profile_a.get("bio", "")
        bio_b = profile_b.get("bio", "")
        name_a = profile_a.get("name", profile_a["slug"])
        name_b = profile_b.get("name", profile_b["slug"])

        if len(bio_a) < 30 or len(bio_b) < 30:
            pytest.skip("One or both bios too short")

        combined = (
            f"Bio A ({name_a}):\n{bio_a}\n\n"
            f"Bio B ({name_b}):\n{bio_b}"
        )

        metric = GEval(
            name="Bio Uniqueness",
            criteria=(
                "Compare these two bios. Are they clearly about DIFFERENT people "
                "with distinct voices and facts? Or do they read like the same "
                "template with names swapped? "
                "Score 1.0 = clearly distinct people with unique details and voice. "
                "Score 0.0 = templated, interchangeable bios with only names changed."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Compare bios for {name_a} and {name_b}",
            actual_output=combined,
        )
        assert_test(tc, [metric])
