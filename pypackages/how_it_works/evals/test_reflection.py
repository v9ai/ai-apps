"""LLM-judged evaluations for the Analyst Agent's reflection loop.

Tests whether the critique → refine cycle actually improves analysis quality.
Run: uv run pytest evals/test_reflection.py -v -m eval
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
    comparative_accuracy_delta_metric,
    comparative_specificity_delta_metric,
    critique_actionability_metric,
    reflection_improvement_metric,
)
from fixtures import (
    SAMPLE_CRITIQUE_OF_WEAK,
    SAMPLE_FILES_TEXT,
    SAMPLE_REFINED_ANALYSIS,
    SAMPLE_WEAK_ANALYSIS,
)


@pytest.mark.eval
class TestReflectionImprovement:
    """Does the refined version meaningfully improve on the weak draft?"""

    def test_reflection_improves(self):
        test_case = LLMTestCase(
            input=SAMPLE_WEAK_ANALYSIS,
            actual_output=SAMPLE_REFINED_ANALYSIS,
        )
        assert_test(test_case, [reflection_improvement_metric])


@pytest.mark.eval
class TestCritiqueActionability:
    """Is the critique specific and actionable?"""

    def test_critique_is_actionable(self):
        test_case = LLMTestCase(
            input=SAMPLE_FILES_TEXT,
            actual_output=SAMPLE_CRITIQUE_OF_WEAK,
        )
        assert_test(test_case, [critique_actionability_metric])


@pytest.mark.eval
class TestSpecificityDelta:
    """Does the refined version have more code artefact references?"""

    def test_specificity_increases(self):
        test_case = LLMTestCase(
            input=SAMPLE_WEAK_ANALYSIS,
            actual_output=SAMPLE_REFINED_ANALYSIS,
        )
        assert_test(test_case, [comparative_specificity_delta_metric])


@pytest.mark.eval
class TestAccuracyDelta:
    """Is the refined version more accurate than the weak draft?"""

    def test_accuracy_improves(self):
        test_case = LLMTestCase(
            input=SAMPLE_WEAK_ANALYSIS,
            actual_output=SAMPLE_REFINED_ANALYSIS,
        )
        assert_test(test_case, [comparative_accuracy_delta_metric])
