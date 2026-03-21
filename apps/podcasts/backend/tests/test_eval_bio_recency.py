"""DeepEval evaluation suite for recency of information in generated bios.

Tests that bios reference recent years, that generated_at timestamps are fresh,
and uses G-Eval to judge whether bios mention recent events/projects.

Usage:
    pytest tests/test_eval_bio_recency.py -v
    pytest tests/test_eval_bio_recency.py -k "deepeval" -v
    deepeval test run tests/test_eval_bio_recency.py
"""

import json
import os
import re
from datetime import datetime, timedelta, timezone
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
# Bio recency — structural assertions
# ═══════════════════════════════════════════════════════════════════════════

class TestBioRecency:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles — run crew.py first")
        return p

    def test_bio_mentions_recent_year(self):
        """Assert bio or topics mention a year >= 2024."""
        for p in self._profiles():
            combined = f"{p.get('bio', '')} {' '.join(p.get('topics', []))}"
            years = [int(y) for y in re.findall(r"\b((?:19|20)\d{2})\b", combined)]
            recent = [y for y in years if y >= 2024]
            assert recent, (
                f"{p['slug']} bio/topics contain no year >= 2024 "
                f"(found years: {sorted(set(years)) or 'none'})"
            )

    def test_bio_not_stale(self):
        """Assert generated_at field is within the last 30 days."""
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(days=30)
        for p in self._profiles():
            raw = p.get("generated_at", "")
            assert raw, f"{p['slug']} has no generated_at field"
            # Parse ISO datetime — handle with or without timezone
            try:
                dt = datetime.fromisoformat(raw)
            except ValueError:
                pytest.fail(f"{p['slug']} generated_at is not valid ISO datetime: {raw!r}")
            # Make timezone-aware if naive
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            assert dt >= threshold, (
                f"{p['slug']} generated_at is stale: {raw} "
                f"(older than 30 days from {now.isoformat()})"
            )


# ═══════════════════════════════════════════════════════════════════════════
# Bio recency — LLM-as-judge (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioRecentContextGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_recent_context_geval(self, profile):
        """G-Eval: does this bio reference events, projects, or developments from 2024-2026?"""
        bio = profile.get("bio", "")
        topics = ", ".join(profile.get("topics", []))
        full = f"Bio: {bio}\nTopics: {topics}"
        if len(full) < 50:
            pytest.skip(f"Not enough content for {profile['slug']}")
        metric = GEval(
            name="Bio Recency",
            criteria=(
                "Does this bio reference events, projects, or developments from 2024-2026? "
                "Score 1.0 = mentions recent work, launches, funding, papers, or roles from 2024-2026. "
                "Score 0.5 = somewhat recent, references work that could be from 2023-2024 but is not clearly dated. "
                "Score 0.0 = only mentions pre-2023 work with no indication of current activity."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Write a current bio for AI contributor: {profile.get('name', profile['slug'])}",
            actual_output=full,
        )
        assert_test(tc, [metric])
