"""DeepEval evaluation suite for quote authenticity in research profiles.

Tests structural integrity of quote entries and uses LLM-as-judge (G-Eval)
to assess whether quotes sound like real statements from tech people.

Usage:
    pytest tests/test_eval_quote_authenticity.py -v
    pytest tests/test_eval_quote_authenticity.py -k "geval" -v
    deepeval test run tests/test_eval_quote_authenticity.py
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
    """Load research profiles that have a non-empty quotes list."""
    profiles: list[dict[str, Any]] = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and data.get("quotes"):
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests for quotes
# ═══════════════════════════════════════════════════════════════════════════

class TestQuoteStructure:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with quotes — run crew.py first")
        return p

    def test_quotes_are_list(self):
        """Assert quotes is a list when present."""
        for p in self._profiles():
            assert isinstance(p["quotes"], list), (
                f"{p['slug']}: quotes should be a list, got {type(p['quotes']).__name__}"
            )

    def test_quote_entries_have_text_and_source(self):
        """Assert each quote has 'text' and 'source' fields."""
        for p in self._profiles():
            for i, q in enumerate(p["quotes"]):
                assert isinstance(q, dict), (
                    f"{p['slug']} quote[{i}]: expected dict, got {type(q).__name__}"
                )
                assert "text" in q, f"{p['slug']} quote[{i}]: missing 'text' field"
                assert "source" in q, f"{p['slug']} quote[{i}]: missing 'source' field"

    def test_quote_text_min_length(self):
        """Assert each quote text is >= 10 chars."""
        for p in self._profiles():
            for i, q in enumerate(p["quotes"]):
                text = q.get("text", "")
                assert isinstance(text, str) and len(text) >= 10, (
                    f"{p['slug']} quote[{i}]: text too short ({len(text)} chars): {text!r}"
                )

    def test_quote_not_bio_copy(self):
        """Assert no quote text is identical to the bio (preventing copy-paste)."""
        for p in self._profiles():
            bio = p.get("bio", "")
            for i, q in enumerate(p["quotes"]):
                text = q.get("text", "")
                assert text != bio, (
                    f"{p['slug']} quote[{i}]: quote text is identical to bio"
                )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Quote Authenticity (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestQuoteAuthenticityGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _load_profiles()[:8],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_quote_authenticity_geval(self, profile):
        quotes = profile.get("quotes", [])
        if not quotes:
            pytest.skip(f"No quotes for {profile['slug']}")

        name = profile.get("name", profile["slug"])
        formatted_quotes = "\n".join(
            f'- "{q.get("text", "")}" (source: {q.get("source", "unknown")})'
            for q in quotes
        )
        actual_output = f"Quotes attributed to {name}:\n{formatted_quotes}"

        metric = GEval(
            name="Quote Authenticity",
            criteria=(
                "Do these quotes sound like something a REAL tech person would say in an interview? "
                "Good: specific opinions about technology, product decisions, industry trends. "
                "Bad: generic motivational quotes, obviously fabricated statements. "
                "Score 1.0=authentic-sounding, 0.0=clearly fabricated."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Provide real interview quotes from {name}",
            actual_output=actual_output,
        )
        assert_test(tc, [metric])
