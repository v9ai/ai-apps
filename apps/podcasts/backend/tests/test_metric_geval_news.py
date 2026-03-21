"""News data quality evaluation using deepeval's GEval metric.

Tests four dimensions of news quality from LangGraph research output:
1. Headlines — each news item has a descriptive headline
2. Sources — each news item names a publication source
3. Dates — dates are in YYYY-MM-DD format
4. Categories — each item has a category (Product/Funding/Partnership/etc)

Usage:
    pytest tests/test_metric_geval_news.py -v
    deepeval test run tests/test_metric_geval_news.py
"""

import json
import os

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# -- Test 1: News items have descriptive headlines ---------------------------


@skip_no_key
def test_news_have_headlines(sample_news):
    """Each news item must have a descriptive headline summarizing the story."""
    test_case = LLMTestCase(
        input="Collect recent news items with descriptive headlines for Harrison Chase",
        actual_output=json.dumps(sample_news),
    )
    metric = GEval(
        name="News Headlines",
        criteria=(
            "Every news item in the output must include a 'headline' field that "
            "contains a clear, descriptive headline summarizing the news story. "
            "The headline should be concise yet informative, conveying the key "
            "event or announcement. Empty strings, generic placeholders, or "
            "missing headlines are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"News headline score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 2: News items name a publication source ---------------------------


@skip_no_key
def test_news_have_sources(sample_news):
    """Each news item must name a publication or media source."""
    test_case = LLMTestCase(
        input="Collect recent news items with publication sources for Harrison Chase",
        actual_output=json.dumps(sample_news),
    )
    metric = GEval(
        name="News Sources",
        criteria=(
            "Every news item in the output must include a 'source' field that "
            "names a specific publication, media outlet, or news organization "
            "(e.g., TechCrunch, The Verge, Bloomberg). Generic labels like "
            "'unknown', 'web', or empty strings are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"News source score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 3: News dates are in YYYY-MM-DD format ----------------------------


@skip_no_key
def test_news_have_dates(sample_news):
    """Each news item must have a date in YYYY-MM-DD format."""
    test_case = LLMTestCase(
        input="Collect recent news items with precise dates for Harrison Chase",
        actual_output=json.dumps(sample_news),
    )
    metric = GEval(
        name="News Date Format",
        criteria=(
            "Every news item in the output must include a 'date' field with a "
            "value in strict YYYY-MM-DD format (e.g., 2023-04-15). The date "
            "must be a complete calendar date with four-digit year, two-digit "
            "month, and two-digit day separated by hyphens. Partial dates like "
            "'2023-04', relative dates like 'last week', or missing dates are "
            "not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"News date format score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 4: News items are categorized -------------------------------------


@skip_no_key
def test_news_categorized(sample_news):
    """Each news item must have a category such as Product, Funding, or Partnership."""
    test_case = LLMTestCase(
        input="Collect recent news items with categories for Harrison Chase",
        actual_output=json.dumps(sample_news),
    )
    metric = GEval(
        name="News Categorization",
        criteria=(
            "Every news item in the output must include a 'category' field with "
            "a meaningful label classifying the type of news. Acceptable categories "
            "include but are not limited to: Product, Funding, Partnership, "
            "Acquisition, Launch, Hire, Research, Regulation, and Award. "
            "The category must be specific and relevant to the news story. "
            "Empty strings, 'other', 'misc', or missing categories are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"News categorization score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
