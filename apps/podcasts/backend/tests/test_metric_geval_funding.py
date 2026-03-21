"""GEval-based funding analysis quality evaluation.

Tests five dimensions of funding data quality from LangGraph research output:
1. Structured rounds — each round has date, amount, and investors
2. Total raised format — total_raised is a formatted dollar amount
3. Valuation present — latest_valuation is provided when funding exists
4. Dated milestones — business milestones have dates and event descriptions
5. Revenue signals — revenue_signals provides useful business intelligence

Usage:
    pytest tests/test_metric_geval_funding.py -v
    deepeval test run tests/test_metric_geval_funding.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# -- Test 1: Funding rounds have date, amount, and investors ----------------


@skip_no_key
def test_funding_rounds_structured(sample_funding):
    """Each funding round must include a date, amount, and list of investors."""
    test_case = LLMTestCase(
        input="Research funding history for Harrison Chase",
        actual_output=json.dumps(sample_funding),
    )
    metric = GEval(
        name="Funding Rounds Structured",
        criteria=(
            "The 'funding_rounds' array must contain objects where each entry has "
            "three required fields: (1) a 'date' field with a recognizable date string "
            "(e.g. '2023-04' or '2023-04-15'), (2) an 'amount' field specifying the "
            "dollar value raised (e.g. '$25M', '$10 million'), and (3) an 'investors' "
            "field that is a non-empty list naming at least one investor or firm. "
            "Score 1.0 if every round has all three fields populated with meaningful "
            "values. Score 0.0 if any round is missing a field or has empty values."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Funding rounds structured score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 2: Total raised is a formatted dollar amount ---------------------


@skip_no_key
def test_total_raised_format(sample_funding):
    """total_raised must be a formatted dollar amount like '$35M' or '$35 million'."""
    test_case = LLMTestCase(
        input="Summarize total funding raised for Harrison Chase",
        actual_output=json.dumps(sample_funding),
    )
    metric = GEval(
        name="Total Raised Format",
        criteria=(
            "The 'total_raised' field must contain a clearly formatted US dollar amount. "
            "Acceptable formats include '$35M', '$35 million', '$35,000,000', or similar "
            "conventions that unambiguously convey a monetary value in USD. The value must "
            "start with a dollar sign '$' and include a numeric component. "
            "Score 1.0 if the format is correct and unambiguous. "
            "Score 0.0 if total_raised is missing, empty, uses a different currency "
            "without a dollar sign, or is a bare number without currency formatting."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Total raised format score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 3: Latest valuation is provided when funding exists ---------------


@skip_no_key
def test_valuation_present(sample_funding):
    """latest_valuation should be provided when funding rounds exist."""
    test_case = LLMTestCase(
        input="Determine the latest valuation for Harrison Chase's company",
        actual_output=json.dumps(sample_funding),
    )
    metric = GEval(
        name="Valuation Present",
        criteria=(
            "When 'funding_rounds' is a non-empty array (indicating the person or company "
            "has raised capital), the 'latest_valuation' field must be present and contain "
            "a meaningful valuation figure formatted as a dollar amount (e.g. '$200M', "
            "'$1.5 billion'). The valuation should be logically consistent with the funding "
            "history — it should be greater than or equal to the total amount raised. "
            "Score 1.0 if latest_valuation is present with a plausible dollar amount. "
            "Score 0.0 if it is missing, empty, null, or says 'unknown' despite funding "
            "rounds being present."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Valuation present score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 4: Business milestones have dates and event descriptions ----------


@skip_no_key
def test_business_milestones_dated(sample_funding):
    """Each business milestone must have a date and a descriptive event string."""
    test_case = LLMTestCase(
        input="List business milestones with dates for Harrison Chase's company",
        actual_output=json.dumps(sample_funding),
    )
    metric = GEval(
        name="Business Milestones Dated",
        criteria=(
            "The 'business_milestones' array must contain objects where each entry has "
            "(1) a 'date' field with a recognizable date string (e.g. '2023-01', "
            "'2023-01-15', or 'January 2023'), and (2) an 'event' field containing a "
            "descriptive string that explains what happened — such as incorporation, "
            "product launch, partnership announcement, or hiring milestone. "
            "The event description should be specific enough to understand the milestone "
            "without additional context. "
            "Score 1.0 if every milestone has both a date and a meaningful event description. "
            "Score 0.0 if any milestone is missing a date, has an empty event, or uses "
            "vague descriptions like 'milestone reached' without specifics."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Business milestones dated score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 5: Revenue signals provide useful business intelligence -----------


@skip_no_key
def test_revenue_signals_informative(sample_funding):
    """revenue_signals must provide actionable business intelligence, not generic filler."""
    test_case = LLMTestCase(
        input="Identify revenue signals and business model insights for Harrison Chase's company",
        actual_output=json.dumps(sample_funding),
    )
    metric = GEval(
        name="Revenue Signals Informative",
        criteria=(
            "The 'revenue_signals' field must provide useful, specific business intelligence "
            "about how the company generates or is expected to generate revenue. Acceptable "
            "content includes mentions of enterprise customers, pricing models, ARR figures, "
            "revenue growth indicators, monetization strategies, customer segments, or "
            "partnerships that imply revenue. The information should help a reader understand "
            "the business model and commercial traction. "
            "Score 1.0 if revenue_signals contains specific, actionable business intelligence. "
            "Score 0.5 if it provides some useful context but lacks specificity. "
            "Score 0.0 if revenue_signals is missing, empty, or contains only generic "
            "statements like 'the company makes money' without any concrete details."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Revenue signals informative score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
