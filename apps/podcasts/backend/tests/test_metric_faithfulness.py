"""Faithfulness evaluation — checks if LangGraph outputs are grounded in retrieval context.

Uses deepeval's FaithfulnessMetric to verify that Phase 2 outputs
(bio, timeline, contributions, executive summary, quotes) are faithful
to the Phase 1 retrieval context (web search, GitHub, arXiv, news).

Usage:
    pytest tests/test_metric_faithfulness.py -v
    deepeval test run tests/test_metric_faithfulness.py
"""

import json
import os

import pytest
from deepeval.metrics import FaithfulnessMetric
from deepeval.test_case import LLMTestCase

from helpers import (
    MOCK_ARXIV_RESULT,
    MOCK_GITHUB_PROFILE,
    MOCK_NEWS_RESULT,
    MOCK_SEMANTIC_SCHOLAR_RESULT,
    MOCK_WEB_SEARCH_RESULT,
    make_test_case_input,
)

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

# ── Shared retrieval context (simulates Phase 1 outputs) ─────────────────

RETRIEVAL_CONTEXT = [
    MOCK_WEB_SEARCH_RESULT,
    MOCK_GITHUB_PROFILE,
    MOCK_ARXIV_RESULT,
    MOCK_NEWS_RESULT,
    MOCK_SEMANTIC_SCHOLAR_RESULT,
]

PERSON = {
    "name": "Harrison Chase",
    "role": "CEO",
    "org": "LangChain",
    "github": "hwchase17",
}

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


def _faithfulness_metric() -> FaithfulnessMetric:
    return FaithfulnessMetric(threshold=THRESHOLD, model=MODEL)


# ── Test 1: Bio faithful to web search + GitHub data ─────────────────────


@skip_no_key
def test_bio_faithful_to_sources(sample_bio):
    """Bio text must be grounded in the web search results and GitHub profile."""
    metric = _faithfulness_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        retrieval_context=[MOCK_WEB_SEARCH_RESULT, MOCK_GITHUB_PROFILE],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Bio faithfulness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 2: Timeline events grounded in context ─────────────────────────


@skip_no_key
def test_timeline_faithful(sample_timeline):
    """Timeline events must be traceable to retrieval context."""
    timeline_str = json.dumps(sample_timeline, indent=2)
    metric = _faithfulness_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Build a chronological timeline of key events"),
        actual_output=timeline_str,
        retrieval_context=RETRIEVAL_CONTEXT,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Timeline faithfulness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 3: Contributions grounded in search results ────────────────────


@skip_no_key
def test_contributions_faithful(sample_contributions):
    """Key contributions must be supported by retrieval context."""
    contributions_str = json.dumps(sample_contributions, indent=2)
    metric = _faithfulness_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Identify key technical contributions"),
        actual_output=contributions_str,
        retrieval_context=[MOCK_WEB_SEARCH_RESULT, MOCK_GITHUB_PROFILE, MOCK_ARXIV_RESULT],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Contributions faithfulness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 4: Executive summary faithful to underlying data ───────────────


@skip_no_key
def test_executive_faithful(sample_executive):
    """Executive summary claims must be grounded in retrieval context."""
    executive_str = json.dumps(sample_executive, indent=2)
    metric = _faithfulness_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write an executive summary with key facts and career arc"),
        actual_output=executive_str,
        retrieval_context=RETRIEVAL_CONTEXT,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Executive summary faithfulness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 5: Quotes faithful to source context ───────────────────────────


@skip_no_key
def test_quotes_faithful(sample_quotes):
    """Attributed quotes must be traceable to source context."""
    quotes_str = json.dumps(sample_quotes, indent=2)
    metric = _faithfulness_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Collect notable quotes with attribution"),
        actual_output=quotes_str,
        retrieval_context=[MOCK_WEB_SEARCH_RESULT, MOCK_NEWS_RESULT],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Quotes faithfulness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
