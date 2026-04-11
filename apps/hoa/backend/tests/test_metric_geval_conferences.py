"""GEval-based conference/speaking data quality evaluation.

Uses deepeval's GEval metric to assess four dimensions of conference data:
1. Speaking tier validity — tier is one of the recognized values
2. Talk completeness — each talk has event, title, and date
3. Talk typing — talks specify a recognized type
4. Notable moments specificity — moments describe specific standout events

Usage:
    pytest tests/test_metric_geval_conferences.py -v
    deepeval test run tests/test_metric_geval_conferences.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# -- 1. Speaking tier is a valid enum value ------------------------------------


@skip_no_key
def test_speaking_tier_valid(sample_conferences):
    """speaking_tier must be one of thought-leader/regular/occasional/rare."""
    test_case = LLMTestCase(
        input="Classify the speaking tier for Harrison Chase",
        actual_output=json.dumps(sample_conferences),
    )
    metric = GEval(
        name="Speaking Tier Validity",
        criteria=(
            "The 'speaking_tier' field must be exactly one of these four values: "
            "'thought-leader', 'regular', 'occasional', or 'rare'. "
            "Any other value, misspelling, or missing field scores 0.0. "
            "Score 1.0 if the tier is one of the four accepted values."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Speaking tier validity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 2. Each talk has event name, title, and date -----------------------------


@skip_no_key
def test_talks_have_events(sample_conferences):
    """Each talk must include an event name, a talk title, and a date."""
    test_case = LLMTestCase(
        input="List conference talks for Harrison Chase with event, title, and date",
        actual_output=json.dumps(sample_conferences.get("talks", [])),
    )
    metric = GEval(
        name="Talk Completeness",
        criteria=(
            "Every talk entry in the list must include three required fields: "
            "(1) 'event' — the name of the conference or event where the talk was given, "
            "(2) 'title' — the title of the talk or presentation, and "
            "(3) 'date' — when the talk took place, in a recognizable date format "
            "(e.g. YYYY-MM, YYYY-MM-DD, or YYYY). "
            "Score 1.0 if every talk has all three fields with non-empty values. "
            "Score 0.0 if any talk is missing any of these fields or has empty values."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Talk completeness score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 3. Talks specify a recognized type ---------------------------------------


@skip_no_key
def test_talks_typed(sample_conferences):
    """Each talk must specify a type: keynote, panel, workshop, or demo."""
    test_case = LLMTestCase(
        input="List conference talks for Harrison Chase with their presentation type",
        actual_output=json.dumps(sample_conferences.get("talks", [])),
    )
    metric = GEval(
        name="Talk Type Classification",
        criteria=(
            "Every talk entry must include a 'type' field whose value is one of: "
            "'keynote', 'panel', 'workshop', or 'demo'. "
            "Other values, missing fields, or empty strings score poorly. "
            "Score 1.0 if every talk has a valid type from the four accepted values. "
            "Score 0.0 if any talk is missing a type or uses an unrecognized value."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Talk type classification score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 4. Notable moments describe specific standout events ---------------------


@skip_no_key
def test_notable_moments_specific(sample_conferences):
    """notable_moments must describe specific, standout events rather than vague claims."""
    test_case = LLMTestCase(
        input="Describe notable conference moments for Harrison Chase",
        actual_output=json.dumps(sample_conferences.get("notable_moments", [])),
    )
    metric = GEval(
        name="Notable Moments Specificity",
        criteria=(
            "Each notable moment must describe a specific, memorable event at a "
            "named conference or public appearance. It should include concrete details "
            "such as the conference name, what happened, or why it was significant. "
            "Vague statements like 'gave a great talk' or 'impressed the audience' "
            "score poorly. Good examples reference a specific action, announcement, "
            "coinage of a term, product demo, or debate at a named event. "
            "Score 1.0 if every moment is specific and anchored to a real event. "
            "Score 0.0 if moments are generic or lack identifying details."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Notable moments specificity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
