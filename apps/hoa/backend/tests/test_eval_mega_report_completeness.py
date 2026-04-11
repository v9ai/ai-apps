"""Mega-discovery.json report completeness evaluation.

Structural assertions on every top-level section, plus a G-Eval
judge on the report summary quality.

Usage:
    pytest tests/test_eval_mega_report_completeness.py -v
    deepeval test run tests/test_eval_mega_report_completeness.py
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
REPORTS_DIR = SCRIPT_DIR / "github-reports"


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

def _load_mega_report() -> dict[str, Any]:
    p = REPORTS_DIR / "mega-discovery.json"
    if p.exists():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


# ═══════════════════════════════════════════════════════════════════════════
# Report completeness
# ═══════════════════════════════════════════════════════════════════════════

REQUIRED_SECTIONS = {
    "generated_at", "category", "limit", "agents", "phases",
    "discovery", "roster", "profiles_generated", "quality", "report",
}


class TestMegaReportCompleteness:
    def _report(self):
        r = _load_mega_report()
        if not r:
            pytest.skip("No mega-discovery.json — run research_pipeline.py first")
        return r

    def test_report_has_all_sections(self):
        report = self._report()
        missing = REQUIRED_SECTIONS - set(report.keys())
        assert not missing, f"Missing top-level sections: {missing}"

    def test_report_agents_is_50(self):
        assert self._report().get("agents") == 50, (
            f"Expected agents == 50, got {self._report().get('agents')}"
        )

    def test_report_phases_is_6(self):
        assert self._report().get("phases") == 6, (
            f"Expected phases == 6, got {self._report().get('phases')}"
        )

    def test_report_discovery_8_categories(self):
        discovery = self._report().get("discovery", {})
        assert isinstance(discovery, dict), "discovery is not a dict"
        assert len(discovery) == 8, (
            f"Expected 8 discovery categories, got {len(discovery)}: {list(discovery.keys())}"
        )

    def test_report_roster_is_list(self):
        roster = self._report().get("roster")
        assert isinstance(roster, list), (
            f"Expected roster to be a list, got {type(roster).__name__}"
        )

    def test_report_quality_has_verdict(self):
        quality = self._report().get("quality")
        assert isinstance(quality, dict) and len(quality) > 0, (
            "Expected quality to be a non-empty dict"
        )

    def test_report_profiles_generated_positive(self):
        profiles_generated = self._report().get("profiles_generated", 0)
        assert isinstance(profiles_generated, (int, float)) and profiles_generated > 0, (
            f"Expected profiles_generated > 0, got {profiles_generated}"
        )

    @pytest.mark.deepeval
    def test_report_summary_geval(self):
        report = self._report()
        report_section = report.get("report", {})
        if not isinstance(report_section, dict):
            pytest.skip("report.report is not a dict")
        summary = report_section.get("summary", "")
        if not summary:
            pytest.skip("No report.report.summary present")

        metric = GEval(
            name="Discovery Report Summary",
            criteria=(
                "Is this discovery report summary informative? "
                "Does it describe: repos scanned, contributors found, "
                "notable discoveries, quality metrics? "
                "Score 1.0=comprehensive summary."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.3,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input="Evaluate the mega-discovery report summary",
            actual_output=summary,
        )
        assert_test(tc, [metric])
