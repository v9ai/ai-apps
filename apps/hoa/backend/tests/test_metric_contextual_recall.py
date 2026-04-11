"""Contextual Recall evaluation — checks if retrieval context supports the expected output.

Uses deepeval's ContextualRecallMetric to verify that the retrieval context
gathered in Phase 1 (web search, GitHub, arXiv, news, Semantic Scholar)
contains enough information to support the expected bio / profile output.

ContextualRecallMetric measures whether every claim in the expected_output
can be attributed to at least one item in retrieval_context.

Usage:
    pytest tests/test_metric_contextual_recall.py -v
    deepeval test run tests/test_metric_contextual_recall.py
"""

import json
import os

import pytest
from deepeval.metrics import ContextualRecallMetric
from deepeval.test_case import LLMTestCase

from helpers import (
    MOCK_ARXIV_RESULT,
    MOCK_GITHUB_PROFILE,
    MOCK_NEWS_RESULT,
    MOCK_SEMANTIC_SCHOLAR_RESULT,
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

EXPECTED_BIO = (
    "Harrison Chase is the CEO and co-founder of LangChain, the dominant open-source "
    "LLM orchestration framework with 100k+ GitHub stars. He coined the term 'context "
    "engineering' and published SPADE and PROMPTEVALS papers on data quality assertions "
    "for LLM pipelines. Before LangChain, he worked at Robust Intelligence and Kensho."
)


def _contextual_recall_metric() -> ContextualRecallMetric:
    return ContextualRecallMetric(threshold=THRESHOLD, model=get_eval_model())


# -- Test 1: Sufficient context from web search + GitHub supports the bio ------


@skip_no_key
def test_sufficient_context_for_bio(sample_bio):
    """Web search + GitHub context should contain enough information to support the expected bio."""
    metric = _contextual_recall_metric()
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        expected_output=EXPECTED_BIO,
        retrieval_context=[MOCK_WEB_SEARCH_RESULT, MOCK_GITHUB_PROFILE],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Contextual recall {metric.score:.2f} < {THRESHOLD} — web search + GitHub "
        f"context insufficient to support bio. Reason: {metric.reason}"
    )


# -- Test 2: Minimal / irrelevant context fails to support detailed output -----


@skip_no_key
def test_insufficient_context_detected(sample_bio):
    """Irrelevant or minimal context should produce low recall against a detailed expected bio."""
    metric = _contextual_recall_metric()
    irrelevant_context = [
        "The weather in San Francisco is sunny today.",
        "Python 3.12 was released with performance improvements.",
    ]
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        expected_output=EXPECTED_BIO,
        retrieval_context=irrelevant_context,
    )
    metric.measure(test_case)
    assert metric.score < THRESHOLD, (
        f"Contextual recall {metric.score:.2f} >= {THRESHOLD} with irrelevant context — "
        f"metric failed to detect insufficient retrieval. Reason: {metric.reason}"
    )


# -- Test 3: Rich multi-source context produces high recall --------------------


@skip_no_key
def test_rich_context_high_recall(sample_bio):
    """Multiple relevant context sources (web, GitHub, arXiv, news, scholar) should yield high recall."""
    metric = _contextual_recall_metric()
    rich_context = [
        MOCK_WEB_SEARCH_RESULT,
        MOCK_GITHUB_PROFILE,
        MOCK_ARXIV_RESULT,
        MOCK_NEWS_RESULT,
        MOCK_SEMANTIC_SCHOLAR_RESULT,
    ]
    test_case = LLMTestCase(
        input=make_test_case_input(PERSON, "Write a comprehensive biography"),
        actual_output=sample_bio,
        expected_output=EXPECTED_BIO,
        retrieval_context=rich_context,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Contextual recall {metric.score:.2f} < {THRESHOLD} with rich context — "
        f"expected high recall from 5 relevant sources. Reason: {metric.reason}"
    )
