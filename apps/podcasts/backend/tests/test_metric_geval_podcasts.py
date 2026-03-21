"""Podcast appearances data quality evaluation using deepeval's GEval metric.

Tests four dimensions of podcast appearance quality from LangGraph research output:
1. Show names — each appearance has a recognized podcast/show name
2. Dates — each appearance has a date in YYYY-MM format
3. Topics — each appearance lists discussion topics
4. URLs — each appearance has a URL

Usage:
    pytest tests/test_metric_geval_podcasts.py -v
    deepeval test run tests/test_metric_geval_podcasts.py
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


# -- Test 1: Podcast appearances have show names -----------------------------


@skip_no_key
def test_podcasts_have_show_names(sample_podcasts):
    """Each podcast appearance must have a recognized show name."""
    test_case = LLMTestCase(
        input="Collect podcast appearances with show names for Harrison Chase",
        actual_output=json.dumps(sample_podcasts),
    )
    metric = GEval(
        name="Podcast Show Names",
        criteria=(
            "Every podcast appearance in the output must include a 'show' field "
            "that names a specific, recognizable podcast or show (e.g., 'Lex Fridman "
            "Podcast', 'This Week in Startups'). Generic labels like 'unknown', "
            "'podcast', or empty strings are not acceptable. The show name should "
            "sound like a real podcast title."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Podcast show name score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 2: Podcast appearances have dates ----------------------------------


@skip_no_key
def test_podcasts_have_dates(sample_podcasts):
    """Each podcast appearance must have a date in YYYY-MM format."""
    test_case = LLMTestCase(
        input="Collect podcast appearances with dates for Harrison Chase",
        actual_output=json.dumps(sample_podcasts),
    )
    metric = GEval(
        name="Podcast Dates",
        criteria=(
            "Every podcast appearance in the output must include a 'date' field "
            "containing a date in YYYY-MM format (e.g., '2025-06', '2024-11'). "
            "The date must have exactly four digits for the year, a hyphen, and "
            "two digits for the month. Missing dates, empty strings, or dates in "
            "other formats (e.g., 'June 2025', '2025') are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Podcast date score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 3: Podcast appearances have topics ---------------------------------


@skip_no_key
def test_podcasts_have_topics(sample_podcasts):
    """Each podcast appearance must list discussion topics."""
    test_case = LLMTestCase(
        input="Collect podcast appearances with discussion topics for Harrison Chase",
        actual_output=json.dumps(sample_podcasts),
    )
    metric = GEval(
        name="Podcast Topics",
        criteria=(
            "Every podcast appearance in the output must include a 'topics' field "
            "containing a non-empty list of discussion topics. Each topic should be "
            "a concise, meaningful label describing what was discussed in the episode "
            "(e.g., 'context engineering', 'RAG pipelines', 'developer tools'). "
            "Empty lists, missing topics fields, or lists with only generic filler "
            "like 'technology' or 'AI' are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Podcast topics score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 4: Podcast appearances have URLs -----------------------------------


@skip_no_key
def test_podcasts_have_urls(sample_podcasts):
    """Each podcast appearance must have a URL pointing to the episode."""
    test_case = LLMTestCase(
        input="Collect podcast appearances with episode URLs for Harrison Chase",
        actual_output=json.dumps(sample_podcasts),
    )
    metric = GEval(
        name="Podcast URLs",
        criteria=(
            "Every podcast appearance in the output must include a 'url' field "
            "containing a valid-looking URL (starting with http:// or https://) "
            "that points to the podcast episode. Missing or empty URLs are not "
            "acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Podcast URL score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
