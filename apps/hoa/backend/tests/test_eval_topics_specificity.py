"""G-Eval tests for topic specificity in AI contributor profiles.

Validates that profile topics are specific AI/ML sub-domains rather than
generic single-word terms like "AI", "ML", "software", etc.

Usage:
    pytest tests/test_eval_topics_specificity.py -v
    pytest tests/test_eval_topics_specificity.py -k "deepeval" -v
    deepeval test run tests/test_eval_topics_specificity.py
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
# Banned generic single-word topics
# ═══════════════════════════════════════════════════════════════════════════

BANNED_GENERIC = {"ai", "ml", "software", "coding", "data"}


# ═══════════════════════════════════════════════════════════════════════════
# Topic specificity tests
# ═══════════════════════════════════════════════════════════════════════════

class TestTopicsSpecificity:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run research_pipeline.py first")
        return p

    def test_topics_not_too_broad(self):
        """Assert no topic is a single generic word: AI, ML, software, coding, data."""
        for p in self._profiles():
            topics = p.get("topics", [])
            for topic in topics:
                stripped = topic.strip()
                assert stripped.lower() not in BANNED_GENERIC, (
                    f"{p['slug']} has banned generic topic: '{stripped}' "
                    f"(must be multi-word or specific)"
                )

    def test_topics_min_word_count(self):
        """Assert average topic length is >= 2 words across each profile."""
        for p in self._profiles():
            topics = p.get("topics", [])
            if not topics:
                continue
            word_counts = [len(t.strip().split()) for t in topics]
            avg = sum(word_counts) / len(word_counts)
            assert avg >= 2, (
                f"{p['slug']} average topic word count is {avg:.1f} "
                f"(need >= 2.0); topics: {topics}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Topic AI Domain Specificity (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestTopicsAIDomainGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_topics_ai_domain_geval(self, profile):
        """G-Eval: Are these topics specific AI/ML sub-domains rather than generic terms?"""
        topics = profile.get("topics", [])
        if not topics:
            pytest.skip(f"No topics for {profile['slug']}")
        topics_text = "\n".join(f"- {t}" for t in topics)
        metric = GEval(
            name="Topic AI Domain Specificity",
            criteria=(
                "Are these topics specific AI/ML sub-domains rather than generic terms? "
                "Good: 'transformer inference optimization', 'RAG pipeline architecture'. "
                "Bad: 'AI', 'technology', 'coding'. "
                "Score 1.0=all specific, 0.0=all generic."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List specific AI/ML topics for contributor: {profile.get('name', profile['slug'])}",
            actual_output=topics_text,
        )
        assert_test(tc, [metric])
