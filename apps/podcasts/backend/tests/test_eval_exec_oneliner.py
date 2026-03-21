"""DeepEval evaluation suite for executive summary one-liner quality.

Tests that the one_liner field inside executive_summary is present,
concise (20-200 chars), truly one sentence, and compelling/specific
as judged by G-Eval.

Usage:
    pytest tests/test_eval_exec_oneliner.py -v
    pytest tests/test_eval_exec_oneliner.py -k "deepeval" -v
    deepeval test run tests/test_eval_exec_oneliner.py
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


def _profiles_with_exec_summary() -> list[dict[str, Any]]:
    """Return only profiles that have a non-empty executive_summary dict."""
    return [
        p for p in _load_profiles()
        if isinstance(p.get("executive_summary"), dict) and p["executive_summary"]
    ]


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

class TestOneLinerStructure:
    def _profiles(self):
        p = _profiles_with_exec_summary()
        if not p:
            pytest.skip("No profiles with executive_summary — run crew.py first")
        return p

    def test_oneliner_exists(self):
        """For profiles with executive_summary, assert 'one_liner' key exists and is non-empty."""
        for p in self._profiles():
            es = p["executive_summary"]
            assert "one_liner" in es, f"{p['slug']} executive_summary missing 'one_liner' key"
            one_liner = es["one_liner"]
            assert isinstance(one_liner, str) and one_liner.strip(), (
                f"{p['slug']} one_liner is empty"
            )

    def test_oneliner_length(self):
        """Assert one-liner is 20-200 chars (truly one sentence)."""
        for p in self._profiles():
            one_liner = p["executive_summary"].get("one_liner", "")
            if not one_liner:
                continue
            length = len(one_liner)
            assert 20 <= length <= 200, (
                f"{p['slug']} one_liner length {length} not in 20-200: '{one_liner}'"
            )

    def test_oneliner_is_one_sentence(self):
        """Assert one-liner contains at most 1 period."""
        for p in self._profiles():
            one_liner = p["executive_summary"].get("one_liner", "")
            if not one_liner:
                continue
            period_count = one_liner.count(".")
            assert period_count <= 1, (
                f"{p['slug']} one_liner has {period_count} periods (expected at most 1): '{one_liner}'"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: One-Liner Quality (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestOneLinerGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _profiles_with_exec_summary()[:8],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_oneliner_quality_geval(self, profile):
        one_liner = profile.get("executive_summary", {}).get("one_liner", "")
        if not one_liner:
            pytest.skip(f"No one_liner for {profile['slug']}")
        metric = GEval(
            name="One-Liner Quality",
            criteria=(
                "Is this one-liner a compelling, specific summary of who this person is? "
                "Good: 'Creator of LangChain, the most adopted LLM orchestration framework'. "
                "Bad: 'An AI researcher'. "
                "Score 1.0=specific and memorable, 0.0=vague."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a one-liner summary for: {profile.get('name', profile['slug'])}",
            actual_output=one_liner,
        )
        assert_test(tc, [metric])
