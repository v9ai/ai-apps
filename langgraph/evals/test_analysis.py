"""LLM-judged evaluations for the analyze_node output.

These tests call DeepSeek to judge the quality of technical analyses.
Run: uv run pytest evals/test_analysis.py -v -m eval
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from conftest import (
    analysis_accuracy_metric,
    analysis_completeness_metric,
    analysis_data_flow_metric,
    analysis_no_filler_metric,
    analysis_specificity_metric,
)
from fixtures import SAMPLE_ANALYSIS, SAMPLE_FILES_TEXT


@pytest.mark.eval
class TestAnalysisCompleteness:
    """Does the analysis cover all 10 required dimensions?"""

    def test_completeness(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [analysis_completeness_metric])


@pytest.mark.eval
class TestAnalysisSpecificity:
    """Does the analysis name specific code artefacts?"""

    def test_specificity(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [analysis_specificity_metric])


@pytest.mark.eval
class TestAnalysisAccuracy:
    """Are all claims in the analysis supported by the source code?"""

    def test_accuracy(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [analysis_accuracy_metric])


@pytest.mark.eval
class TestAnalysisDataFlow:
    """Does the analysis clearly trace end-to-end data flow?"""

    def test_data_flow(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [analysis_data_flow_metric])


@pytest.mark.eval
class TestAnalysisNoFiller:
    """Does the analysis avoid generic advice and stay grounded?"""

    def test_no_filler(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_ANALYSIS,
        )
        assert_test(test_case, [analysis_no_filler_metric])
