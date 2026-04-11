"""DeepEval evaluation suite for news section quality.

Tests structural correctness and source credibility of the news entries
in generated contributor profiles.

Usage:
    pytest tests/test_eval_news_quality.py -v
    pytest tests/test_eval_news_quality.py -k "deepeval" -v
    deepeval test run tests/test_eval_news_quality.py
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
    """Load research profiles that contain a non-empty news list."""
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and isinstance(data.get("news"), list) and len(data["news"]) > 0:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Structural assertions
# ═══════════════════════════════════════════════════════════════════════════

class TestNewsStructure:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with news — run research_pipeline.py first")
        return p

    def test_news_are_list(self):
        """Assert news is a list when present."""
        for p in self._profiles():
            assert isinstance(p.get("news"), list), (
                f"{p['slug']}: news should be a list, got {type(p.get('news')).__name__}"
            )

    def test_news_entries_have_headline(self):
        """Assert each news entry has 'headline' and 'source' fields."""
        for p in self._profiles():
            for i, entry in enumerate(p.get("news", [])):
                assert isinstance(entry, dict), (
                    f"{p['slug']} news[{i}]: entry is not a dict"
                )
                assert "headline" in entry, (
                    f"{p['slug']} news[{i}]: missing 'headline'"
                )
                assert "source" in entry, (
                    f"{p['slug']} news[{i}]: missing 'source'"
                )

    def test_news_dates_format(self):
        """Assert news dates match YYYY-MM-DD when present."""
        date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        for p in self._profiles():
            for i, entry in enumerate(p.get("news", [])):
                date = entry.get("date")
                if date is not None:
                    assert isinstance(date, str) and date_re.match(date), (
                        f"{p['slug']} news[{i}]: date '{date}' does not match YYYY-MM-DD"
                    )

    def test_news_headlines_nonempty(self):
        """Assert each headline is at least 10 characters."""
        for p in self._profiles():
            for i, entry in enumerate(p.get("news", [])):
                headline = entry.get("headline", "")
                assert isinstance(headline, str) and len(headline) >= 10, (
                    f"{p['slug']} news[{i}]: headline too short ({len(headline)} chars): '{headline}'"
                )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: News Source Credibility (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestNewsSourcesGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:5],
                             ids=lambda p: p.get("slug", "?"))
    def test_news_sources_real_geval(self, profile):
        """G-Eval: are the news sources real, known publications?"""
        news = profile.get("news", [])
        if not news:
            pytest.skip(f"No news for {profile['slug']}")
        sources_text = "\n".join(
            f"- {entry.get('headline', '(no headline)')} [source: {entry.get('source', '(none)')}]"
            for entry in news
        )
        metric = GEval(
            name="News Source Credibility",
            criteria=(
                "Are these news sources REAL publications? "
                "Known tech outlets: TechCrunch, The Verge, Wired, VentureBeat, "
                "The Information, Bloomberg, Ars Technica, MIT Tech Review. "
                "Score 1.0=all real outlets."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List news coverage for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=sources_text,
        )
        assert_test(tc, [metric])
