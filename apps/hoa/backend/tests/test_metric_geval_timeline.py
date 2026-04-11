"""GEval-based timeline quality evaluation.

Uses deepeval's GEval metric to assess five dimensions of timeline quality:
chronological ordering, date formatting, event specificity, source URLs,
and lifecycle coverage.

Usage:
    pytest tests/test_metric_geval_timeline.py -v
    deepeval test run tests/test_metric_geval_timeline.py
"""

import json
import os

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

INPUT = "Build timeline for Harrison Chase"
THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# ── Test 1: Events are in chronological order ────────────────────────────


@skip_no_key
def test_timeline_chronological(sample_timeline):
    """Timeline events must be sorted in ascending chronological order."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_timeline),
    )
    metric = GEval(
        name="Chronological Order",
        criteria=(
            "The timeline events are listed in strict chronological order. "
            "Each event's date must be equal to or later than the previous event's date. "
            "Score 1.0 if perfectly ordered, 0.0 if any event appears out of sequence."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Chronological order score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 2: All dates use YYYY-MM format ─────────────────────────────────


@skip_no_key
def test_timeline_date_format(sample_timeline):
    """Every timeline entry must use YYYY-MM date format."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_timeline),
    )
    metric = GEval(
        name="Date Format Consistency",
        criteria=(
            "Every event in the timeline must have a 'date' field using the YYYY-MM format "
            "(four-digit year, hyphen, two-digit month, e.g. '2023-04'). "
            "Score 1.0 if all dates match this format exactly, 0.0 if any date deviates "
            "(e.g. full ISO dates, plain years, or missing dates)."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Date format score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 3: Events describe specific, verifiable milestones ──────────────


@skip_no_key
def test_timeline_event_specificity(sample_timeline):
    """Events must describe specific, verifiable milestones rather than vague statements."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_timeline),
    )
    metric = GEval(
        name="Event Specificity",
        criteria=(
            "Each timeline event must describe a specific, verifiable milestone — "
            "such as a product launch, funding round, paper publication, company founding, "
            "or public announcement — rather than vague or generic statements like "
            "'worked on AI' or 'gained experience'. Events should include concrete details "
            "such as names, amounts, or titles. "
            "Score 1.0 if every event is specific and verifiable, 0.0 if events are vague."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Event specificity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 4: Events include source URLs ───────────────────────────────────


@skip_no_key
def test_timeline_source_urls(sample_timeline):
    """Every timeline event must include a source URL."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_timeline),
    )
    metric = GEval(
        name="Source URLs Present",
        criteria=(
            "Each event in the timeline must include a 'url' field containing a valid "
            "HTTP or HTTPS URL that serves as a source reference for the event. "
            "Score 1.0 if every event has a non-empty URL starting with 'http://' or "
            "'https://'. Score 0.0 if any event is missing a URL or has an empty/invalid one."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Source URLs score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 5: Timeline covers education, career changes, launches, funding ─


@skip_no_key
def test_timeline_coverage(sample_timeline):
    """Timeline should cover major lifecycle categories: career changes, launches, funding."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_timeline),
    )
    metric = GEval(
        name="Lifecycle Coverage",
        criteria=(
            "The timeline should cover multiple categories of a person's professional "
            "lifecycle. Evaluate whether the events span at least three of the following "
            "categories: education or academic work, career changes or job roles, "
            "product or project launches, funding rounds or financial milestones, "
            "publications or research contributions. "
            "Score 1.0 if three or more categories are represented, "
            "score 0.5 if two categories are covered, "
            "score 0.0 if only one category or fewer is present."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Lifecycle coverage score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
