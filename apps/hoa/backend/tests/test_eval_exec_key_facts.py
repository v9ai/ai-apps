"""DeepEval evaluation suite for executive summary key facts.

Tests structural invariants (count, distinctness, length) and LLM-as-judge
quality of the `executive_summary.key_facts` field in research profiles.

Usage:
    pytest tests/test_eval_exec_key_facts.py -v
    pytest tests/test_eval_exec_key_facts.py -k "deepeval" -v
    deepeval test run tests/test_eval_exec_key_facts.py
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
    """Load research profiles that have executive_summary.key_facts."""
    profiles: list[dict[str, Any]] = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if not isinstance(data, dict) or "slug" not in data:
                continue
            es = data.get("executive_summary")
            if not isinstance(es, dict):
                continue
            if not isinstance(es.get("key_facts"), list):
                continue
            profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


def _get_key_facts(profile: dict[str, Any]) -> list[str]:
    return profile["executive_summary"]["key_facts"]


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

_profiles = _load_profiles()


class TestKeyFactsCount:
    def test_key_facts_count(self):
        """Assert key_facts is a list of 3-5 items."""
        if not _profiles:
            pytest.skip("No profiles with executive_summary.key_facts")
        for p in _profiles:
            facts = _get_key_facts(p)
            assert isinstance(facts, list), f"{p['slug']}: key_facts is not a list"
            assert 3 <= len(facts) <= 5, (
                f"{p['slug']}: expected 3-5 key_facts, got {len(facts)}"
            )


class TestKeyFactsDistinct:
    def test_key_facts_distinct(self):
        """Assert no two key facts are identical strings."""
        if not _profiles:
            pytest.skip("No profiles with executive_summary.key_facts")
        for p in _profiles:
            facts = _get_key_facts(p)
            seen: set[str] = set()
            for fact in facts:
                assert fact not in seen, (
                    f"{p['slug']}: duplicate key fact: {fact!r}"
                )
                seen.add(fact)


class TestKeyFactsNonempty:
    def test_key_facts_nonempty(self):
        """Assert each fact is >= 20 chars."""
        if not _profiles:
            pytest.skip("No profiles with executive_summary.key_facts")
        for p in _profiles:
            for i, fact in enumerate(_get_key_facts(p)):
                assert isinstance(fact, str) and len(fact) >= 20, (
                    f"{p['slug']}: key_fact[{i}] too short ({len(fact)} chars): {fact!r}"
                )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Key Facts Quality (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

_profiles_for_geval = _load_profiles()[:8]


class TestKeyFactsQualityGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _profiles_for_geval,
        ids=lambda p: p.get("slug", "?"),
    )
    def test_key_facts_quality_geval(self, profile):
        facts = _get_key_facts(profile)
        if not facts:
            pytest.skip(f"No key_facts for {profile['slug']}")
        name = profile.get("name", profile["slug"])
        facts_text = "\n".join(f"- {f}" for f in facts)
        actual_output = f"Key facts for {name}:\n{facts_text}"

        metric = GEval(
            name="Key Facts Quality",
            criteria=(
                "Are these 3 key facts DISTINCT, SPECIFIC, and IMPORTANT? "
                "Good facts include metrics, dates, or unique claims. "
                "Bad: vague restatements of each other. "
                "Score 1.0=three distinct, specific facts."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List 3 key facts about AI contributor: {name}",
            actual_output=actual_output,
        )
        assert_test(tc, [metric])
