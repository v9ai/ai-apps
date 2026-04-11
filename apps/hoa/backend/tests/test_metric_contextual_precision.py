"""Contextual Precision evaluation — checks if relevant context is ranked higher than irrelevant.

Uses deepeval's ContextualPrecisionMetric to verify that Phase 1 retrieval
results place relevant context items (web search, GitHub profile) above
irrelevant filler, ensuring the downstream synthesis agents receive
well-prioritized information.

ContextualPrecisionMetric requires: input, actual_output, expected_output,
and retrieval_context. It evaluates whether nodes in retrieval_context that
are relevant to the expected_output are ranked higher than irrelevant ones.

Usage:
    pytest tests/test_metric_contextual_precision.py -v
    deepeval test run tests/test_metric_contextual_precision.py
"""

import json
import os

import pytest
from deepeval.metrics import ContextualPrecisionMetric
from deepeval.test_case import LLMTestCase

from helpers import (
    MOCK_GITHUB_PROFILE,
    MOCK_WEB_SEARCH_RESULT,
    get_eval_model,
    make_test_case_input,
)

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

PERSON = {
    "name": "Harrison Chase",
    "role": "CEO",
    "org": "LangChain",
    "github": "hwchase17",
}

THRESHOLD = 0.5

# ── Irrelevant context items (noise) ──────────────────────────────────────

IRRELEVANT_WEATHER = (
    "The weather forecast for London on March 15 calls for partly cloudy "
    "skies with a high of 12C and intermittent rain showers in the afternoon."
)

IRRELEVANT_RECIPE = (
    "To make a classic French omelette, beat 3 eggs with a pinch of salt, "
    "melt butter in a non-stick pan over medium heat, pour in the eggs, and "
    "gently stir with a spatula until just set."
)

IRRELEVANT_SPORTS = (
    "The 2024 Champions League final was held in London, with Real Madrid "
    "defeating Borussia Dortmund 2-0 thanks to goals from Carvajal and Vinicius Jr."
)


def _contextual_precision_metric() -> ContextualPrecisionMetric:
    return ContextualPrecisionMetric(threshold=THRESHOLD, model=get_eval_model())


# ── Test 1: Relevant context ranked first beats irrelevant ────────────────


@skip_no_key
def test_relevant_context_ranked_first(sample_bio):
    """When relevant Harrison Chase context is ranked higher than irrelevant
    items, contextual precision should be high."""
    metric = _contextual_precision_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        expected_output=sample_bio,
        retrieval_context=[
            MOCK_WEB_SEARCH_RESULT,
            MOCK_GITHUB_PROFILE,
            IRRELEVANT_WEATHER,
            IRRELEVANT_RECIPE,
            IRRELEVANT_SPORTS,
        ],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Contextual precision {metric.score:.2f} < {THRESHOLD} when relevant "
        f"context is ranked first. Reason: {metric.reason}"
    )


# ── Test 2: All relevant context yields high precision ────────────────────


@skip_no_key
def test_all_relevant_context(sample_bio):
    """When every retrieval context item is relevant, precision should be high."""
    metric = _contextual_precision_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        expected_output=sample_bio,
        retrieval_context=[
            MOCK_WEB_SEARCH_RESULT,
            MOCK_GITHUB_PROFILE,
        ],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Contextual precision {metric.score:.2f} < {THRESHOLD} with all "
        f"relevant context. Reason: {metric.reason}"
    )


# ── Test 3: Mixed relevant and irrelevant context ────────────────────────


@skip_no_key
def test_mixed_context_precision(sample_bio):
    """A mix of relevant and irrelevant context interleaved should still
    achieve acceptable precision when relevant items are present."""
    metric = _contextual_precision_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        expected_output=sample_bio,
        retrieval_context=[
            IRRELEVANT_WEATHER,
            MOCK_WEB_SEARCH_RESULT,
            IRRELEVANT_RECIPE,
            MOCK_GITHUB_PROFILE,
            IRRELEVANT_SPORTS,
        ],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Mixed-context precision {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
