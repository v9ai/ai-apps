"""DeepEval tests for therapeutic audio script generation."""

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    developmental_appropriateness_metric,
    evidence_grounding_metric,
    safety_compliance_metric,
    therapeutic_structure_metric,
    tts_suitability_metric,
)
from generator import build_prompt


def _make_test_case(case: dict, script: str) -> LLMTestCase:
    return LLMTestCase(
        input=build_prompt(case),
        actual_output=script,
    )


def test_therapeutic_structure(script_output):
    case, script = script_output
    assert_test(_make_test_case(case, script), [therapeutic_structure_metric])


def test_evidence_grounding(script_output):
    case, script = script_output
    assert_test(_make_test_case(case, script), [evidence_grounding_metric])


def test_developmental_appropriateness(script_output):
    case, script = script_output
    assert_test(_make_test_case(case, script), [developmental_appropriateness_metric])


def test_tts_suitability(script_output):
    case, script = script_output
    assert_test(_make_test_case(case, script), [tts_suitability_metric])


def test_safety_compliance(script_output):
    case, script = script_output
    assert_test(_make_test_case(case, script), [safety_compliance_metric])
