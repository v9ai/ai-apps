"""DeepEval evaluation suite for podcast_appearances verification.

Tests structural correctness and factual accuracy of podcast appearance data
in generated research profiles.

Usage:
    pytest tests/test_eval_podcast_verification.py -v
    pytest tests/test_eval_podcast_verification.py -k "geval" -v
    deepeval test run tests/test_eval_podcast_verification.py
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
# Data loader — skip profiles without podcast_appearances
# ═══════════════════════════════════════════════════════════════════════════

def _load_profiles() -> list[dict[str, Any]]:
    """Load research profiles that have a podcast_appearances section."""
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if (isinstance(data, dict)
                    and "slug" in data
                    and "podcast_appearances" in data
                    and data["podcast_appearances"]):
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Structural: podcast_appearances is a list
# ═══════════════════════════════════════════════════════════════════════════

class TestPodcastStructure:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with podcast_appearances — run research_pipeline.py first")
        return p

    def test_podcasts_are_list(self):
        """Assert podcast_appearances is a list when present."""
        for p in self._profiles():
            pa = p["podcast_appearances"]
            assert isinstance(pa, list), (
                f"{p['slug']}: podcast_appearances is {type(pa).__name__}, expected list"
            )

    def test_podcast_entries_have_show(self):
        """Assert each podcast entry has a 'show' field."""
        for p in self._profiles():
            for i, entry in enumerate(p["podcast_appearances"]):
                assert isinstance(entry, dict), (
                    f"{p['slug']}[{i}]: entry is {type(entry).__name__}, expected dict"
                )
                assert "show" in entry, (
                    f"{p['slug']}[{i}]: podcast entry missing 'show' field — keys: {list(entry.keys())}"
                )
                assert isinstance(entry["show"], str) and entry["show"].strip(), (
                    f"{p['slug']}[{i}]: 'show' is empty or not a string"
                )

    def test_podcast_dates_format(self):
        """Assert podcast dates match YYYY-MM when present."""
        date_re = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
        for p in self._profiles():
            for i, entry in enumerate(p["podcast_appearances"]):
                date = entry.get("date")
                if date is None:
                    continue
                assert isinstance(date, str) and date_re.match(date), (
                    f"{p['slug']}[{i}]: date '{date}' does not match YYYY-MM format"
                )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Podcast Show Names Authenticity (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

def _profiles_with_podcasts_top5() -> list[dict[str, Any]]:
    """Return profiles trimmed to at most 5 podcast appearances for parametrize."""
    profiles = _load_profiles()
    trimmed = []
    for p in profiles:
        copy = dict(p)
        copy["podcast_appearances"] = p["podcast_appearances"][:5]
        trimmed.append(copy)
    return trimmed


class TestPodcastShowsGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _profiles_with_podcasts_top5(),
        ids=lambda p: p.get("slug", "?"),
    )
    def test_podcast_shows_real_geval(self, profile):
        """G-Eval: verify podcast show names are real, not fabricated."""
        shows = [entry.get("show", "") for entry in profile["podcast_appearances"]]
        shows_text = "\n".join(f"- {s}" for s in shows if s)
        if not shows_text:
            pytest.skip(f"No show names for {profile['slug']}")

        metric = GEval(
            name="Podcast Show Authenticity",
            criteria=(
                "Are these podcast show names REAL shows? "
                "Known AI podcasts: Lex Fridman, Dwarkesh Podcast, No Priors, "
                "Latent Space, All-In, This Week in Startups, Gradient Dissent, "
                "TWIML, Practical AI. "
                "Score 1.0=all real shows, 0.0=fabricated names."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List real podcast shows where {profile.get('name', profile['slug'])} appeared",
            actual_output=shows_text,
        )
        assert_test(tc, [metric])
