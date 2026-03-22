"""DeepEval evaluation suite for funding data plausibility.

Tests that funding information in generated profiles is structurally valid
and plausible for AI companies (round names, amounts, investors, valuations).

Usage:
    pytest tests/test_eval_funding_plausibility.py -v
    pytest tests/test_eval_funding_plausibility.py -k "deepeval" -v
    deepeval test run tests/test_eval_funding_plausibility.py
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


def _profiles_with_funding() -> list[dict[str, Any]]:
    """Return only profiles that have a non-empty funding dict."""
    return [p for p in _load_profiles() if p.get("funding")]


def _parse_dollar_amount(s: str) -> float | None:
    """Parse strings like '$25M', '$1.5B', '$100K' into a numeric dollar value.

    Returns None if the string cannot be parsed.
    """
    m = re.match(r"^\$?([\d,.]+)\s*([KMBTkmbt])?$", s.strip().lstrip("$"))
    if not m:
        return None
    number = float(m.group(1).replace(",", ""))
    suffix = (m.group(2) or "").upper()
    multipliers = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000, "T": 1_000_000_000_000}
    return number * multipliers.get(suffix, 1)


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests
# ═══════════════════════════════════════════════════════════════════════════

class TestFundingStructure:
    """Validate that funding data has the expected shape."""

    def _funded(self):
        p = _profiles_with_funding()
        if not p:
            pytest.skip("No profiles with funding data — run research_pipeline.py first")
        return p

    def test_funding_structure(self):
        """For profiles with funding, assert it is a dict."""
        for p in self._funded():
            funding = p["funding"]
            assert isinstance(funding, dict), (
                f"{p['slug']}: funding should be a dict, got {type(funding).__name__}"
            )

    def test_funding_rounds_are_list(self):
        """Assert 'funding_rounds' is a list when present."""
        for p in self._funded():
            funding = p["funding"]
            if "funding_rounds" not in funding:
                continue
            rounds = funding["funding_rounds"]
            assert isinstance(rounds, list), (
                f"{p['slug']}: funding_rounds should be a list, got {type(rounds).__name__}"
            )

    def test_funding_amounts_plausible(self):
        """If funding amounts are present (strings like '$25M'), assert they
        parse to reasonable numbers in the $100K - $100B range."""
        for p in self._funded():
            funding = p["funding"]
            amounts: list[str] = []

            # Collect amounts from funding_rounds
            for r in funding.get("funding_rounds", []):
                if "amount" in r and r["amount"]:
                    amounts.append(r["amount"])

            # Collect total_raised
            if funding.get("total_raised"):
                amounts.append(funding["total_raised"])

            # Collect latest_valuation
            if funding.get("latest_valuation"):
                amounts.append(funding["latest_valuation"])

            for raw in amounts:
                value = _parse_dollar_amount(raw)
                assert value is not None, (
                    f"{p['slug']}: could not parse funding amount '{raw}'"
                )
                assert 100_000 <= value <= 100_000_000_000, (
                    f"{p['slug']}: funding amount '{raw}' -> ${value:,.0f} "
                    f"outside plausible range ($100K - $100B)"
                )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Funding Plausibility (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

class TestFundingPlausibilityGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _profiles_with_funding()[:5],
                             ids=lambda p: p.get("slug", "?"))
    def test_funding_plausibility_geval(self, profile):
        funding = profile.get("funding", {})
        if not funding:
            pytest.skip(f"No funding data for {profile['slug']}")
        text = (
            f"Person: {profile.get('name', profile['slug'])}\n"
            f"Funding data:\n{json.dumps(funding, indent=2)}"
        )
        metric = GEval(
            name="Funding Plausibility",
            criteria=(
                "Are these funding details plausible for an AI company? Check: "
                "round names (Seed/A/B/C/D), amounts, investor names (are they real VCs?), "
                "valuations. Score 1.0=all plausible, 0.0=fabricated."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.4, model=_get_eval_model(), async_mode=False,
        )
        tc = LLMTestCase(
            input=f"Evaluate funding plausibility for AI company: {profile.get('name', profile['slug'])}",
            actual_output=text,
        )
        assert_test(tc, [metric])
