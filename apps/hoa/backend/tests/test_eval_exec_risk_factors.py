"""DeepEval evaluation suite for executive_summary risk factors and confidence.

Tests structural correctness of risk_factors and confidence_level fields,
plus LLM-as-judge honesty evaluation via G-Eval.

Usage:
    pytest tests/test_eval_exec_risk_factors.py -v
    pytest tests/test_eval_exec_risk_factors.py -k "deepeval" -v
    deepeval test run tests/test_eval_exec_risk_factors.py
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
# Data loader — only profiles with executive_summary
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
            if (isinstance(data, dict)
                    and "slug" in data
                    and isinstance(data.get("executive_summary"), dict)):
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ═══════════════════════════════════════════════════════════════════════════
# Structural tests: risk_factors and confidence_level
# ═══════════════════════════════════════════════════════════════════════════

class TestRiskFactorsStructure:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles with executive_summary — run research_pipeline.py first")
        return p

    def test_risk_factors_are_list(self):
        """Assert risk_factors is a list when present."""
        for p in self._profiles():
            es = p["executive_summary"]
            if "risk_factors" not in es:
                continue
            assert isinstance(es["risk_factors"], list), (
                f"{p['slug']}: risk_factors is {type(es['risk_factors']).__name__}, expected list"
            )

    def test_risk_factors_nonempty_strings(self):
        """Assert each risk factor is a string with >= 10 characters."""
        for p in self._profiles():
            es = p["executive_summary"]
            risk_factors = es.get("risk_factors", [])
            if not risk_factors:
                continue
            for i, rf in enumerate(risk_factors):
                assert isinstance(rf, str), (
                    f"{p['slug']}: risk_factors[{i}] is {type(rf).__name__}, expected str"
                )
                assert len(rf) >= 10, (
                    f"{p['slug']}: risk_factors[{i}] too short ({len(rf)} chars): '{rf}'"
                )

    def test_confidence_level_valid(self):
        """Assert confidence_level is one of: 'high', 'medium', 'low' (or contains one)."""
        valid = {"high", "medium", "low"}
        for p in self._profiles():
            es = p["executive_summary"]
            cl = es.get("confidence_level")
            if cl is None:
                continue
            assert isinstance(cl, str), (
                f"{p['slug']}: confidence_level is {type(cl).__name__}, expected str"
            )
            assert any(v in cl.lower() for v in valid), (
                f"{p['slug']}: confidence_level '{cl}' does not contain high/medium/low"
            )


# ═══════════════════════════════════════════════════════════════════════════
# LLM-as-judge: Risk factor honesty (G-Eval)
# ═══════════════════════════════════════════════════════════════════════════

def _build_risk_params() -> list[dict[str, Any]]:
    """Build parametrize list: one entry per profile that has risk_factors."""
    params = []
    for p in _load_profiles():
        rf = p.get("executive_summary", {}).get("risk_factors", [])
        if rf:
            params.append({
                "slug": p["slug"],
                "name": p.get("name", p["slug"]),
                "risk_factors": rf[:5],
            })
    return params


class TestRiskFactorsHonestyGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "risk_param",
        _build_risk_params(),
        ids=lambda rp: rp["slug"],
    )
    def test_risk_factors_honest_geval(self, risk_param):
        """G-Eval: are risk factors honest and specific rather than boilerplate?"""
        risk_text = "\n".join(f"- {rf}" for rf in risk_param["risk_factors"])
        metric = GEval(
            name="Risk Factor Honesty",
            criteria=(
                "Are these risk factors HONEST and SPECIFIC rather than boilerplate? "
                "Good: 'Intense competition from LlamaIndex and Semantic Kernel'. "
                "Bad: 'Market risks exist'. "
                "Score 1.0=specific honest risks, 0.0=generic boilerplate."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=f"List risk factors for AI contributor: {risk_param['name']}",
            actual_output=risk_text,
        )
        assert_test(tc, [metric])
