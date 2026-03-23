"""Contextual relevancy evaluation — checks if retrieved context is relevant to the input.

Uses deepeval's ContextualRelevancyMetric to verify that Phase 1 retrieval
context (web search, GitHub, arXiv) is relevant to the input query.
Higher score = more relevant context returned by the retrieval pipeline.

Usage:
    pytest tests/test_metric_contextual_relevancy.py -v
    deepeval test run tests/test_metric_contextual_relevancy.py
"""

import json
import os

import pytest
from deepeval.metrics import ContextualRelevancyMetric
from deepeval.test_case import LLMTestCase

from helpers import (
    MOCK_ARXIV_RESULT,
    MOCK_GITHUB_PROFILE,
    MOCK_WEB_SEARCH_RESULT,
    get_eval_model,
)

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

THRESHOLD = 0.5


def _contextual_relevancy_metric() -> ContextualRelevancyMetric:
    return ContextualRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())


# ── Test 1: Web search context relevant to research query ────────────────


@skip_no_key
def test_web_search_context_relevant():
    """Web search results about Harrison Chase should be relevant to researching him."""
    metric = _contextual_relevancy_metric()
    test_case = LLMTestCase(
        input="Research Harrison Chase CEO LangChain",
        actual_output="Harrison Chase is the CEO and co-founder of LangChain.",
        retrieval_context=[MOCK_WEB_SEARCH_RESULT],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Web search contextual relevancy {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 2: GitHub context relevant to activity analysis query ───────────


@skip_no_key
def test_github_context_relevant():
    """GitHub profile data should be relevant to analyzing GitHub activity."""
    metric = _contextual_relevancy_metric()
    test_case = LLMTestCase(
        input="Analyze GitHub activity of Harrison Chase",
        actual_output="Harrison Chase (hwchase17) has 50 public repos and 12000 followers.",
        retrieval_context=[MOCK_GITHUB_PROFILE],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"GitHub contextual relevancy {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 3: arXiv context relevant to academic paper query ───────────────


@skip_no_key
def test_arxiv_context_relevant():
    """arXiv search results should be relevant to finding academic papers."""
    metric = _contextual_relevancy_metric()
    test_case = LLMTestCase(
        input="Find academic papers by Harrison Chase",
        actual_output="Harrison Chase co-authored the SPADE paper on data quality assertions.",
        retrieval_context=[MOCK_ARXIV_RESULT],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"arXiv contextual relevancy {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 4: Irrelevant context should score low ──────────────────────────


IRRELEVANT_CONTEXT = [
    "The recipe for chocolate chip cookies requires 2 cups flour, 1 cup sugar, "
    "and 1 cup butter. Preheat oven to 375F and bake for 12 minutes.",
    "The 2024 Summer Olympics were held in Paris, France. Swimming events "
    "took place at the Paris La Defense Arena.",
]


@skip_no_key
def test_irrelevant_context_detected():
    """Completely unrelated context should score below threshold, validating the metric."""
    metric = _contextual_relevancy_metric()
    test_case = LLMTestCase(
        input="Research Harrison Chase CEO LangChain",
        actual_output="Harrison Chase is the CEO and co-founder of LangChain.",
        retrieval_context=IRRELEVANT_CONTEXT,
    )
    metric.measure(test_case)
    assert metric.score < THRESHOLD, (
        f"Irrelevant context scored {metric.score:.2f} >= {THRESHOLD} -- "
        f"metric failed to detect unrelated context. Reason: {metric.reason}"
    )
