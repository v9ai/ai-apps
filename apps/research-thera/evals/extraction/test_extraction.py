"""DeepEval tests for Qwen contact feedback issue extraction."""

import json

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    category_accuracy_metric,
    clinical_language_metric,
    issue_completeness_metric,
    severity_calibration_metric,
)
from generator import (
    REQUIRED_FIELDS,
    VALID_CATEGORIES,
    VALID_SEVERITIES,
    build_user_prompt,
)


def _make_test_case(case: dict, issues: list[dict]) -> LLMTestCase:
    return LLMTestCase(
        input=build_user_prompt(case),
        actual_output=json.dumps(issues, indent=2),
    )


# ---------------------------------------------------------------------------
# LLM-judged metrics (DeepEval GEval, judged by DeepSeek)
# ---------------------------------------------------------------------------


def test_issue_completeness(extraction_output):
    case, issues = extraction_output
    assert_test(_make_test_case(case, issues), [issue_completeness_metric])


def test_category_accuracy(extraction_output):
    case, issues = extraction_output
    assert_test(_make_test_case(case, issues), [category_accuracy_metric])


def test_severity_calibration(extraction_output):
    case, issues = extraction_output
    assert_test(_make_test_case(case, issues), [severity_calibration_metric])


def test_clinical_language(extraction_output):
    case, issues = extraction_output
    assert_test(_make_test_case(case, issues), [clinical_language_metric])


# ---------------------------------------------------------------------------
# Deterministic assertions (no LLM judge needed)
# ---------------------------------------------------------------------------


def test_minimum_issue_count(extraction_output):
    """Each case should extract at least the expected minimum number of issues."""
    case, issues = extraction_output
    min_count = case.get("expected_issue_count_min", 1)
    assert len(issues) >= min_count, (
        f"Expected at least {min_count} issues for '{case['id']}', got {len(issues)}"
    )


def test_required_fields_present(extraction_output):
    """Every issue must have all required fields: title, description, category, severity."""
    case, issues = extraction_output
    for i, issue in enumerate(issues):
        missing = REQUIRED_FIELDS - set(issue.keys())
        assert not missing, f"Issue {i} missing fields: {missing}"


def test_no_empty_fields(extraction_output):
    """No issue should have empty title or description."""
    case, issues = extraction_output
    for i, issue in enumerate(issues):
        assert issue.get("title", "").strip(), f"Issue {i} has empty title"
        assert issue.get("description", "").strip(), f"Issue {i} has empty description"


def test_valid_categories(extraction_output):
    """All categories must be from the valid set."""
    case, issues = extraction_output
    for i, issue in enumerate(issues):
        cat = issue.get("category", "")
        assert cat in VALID_CATEGORIES, (
            f"Issue {i} has invalid category '{cat}'. "
            f"Valid: {VALID_CATEGORIES}"
        )


def test_valid_severities(extraction_output):
    """All severities must be low, medium, or high."""
    case, issues = extraction_output
    for i, issue in enumerate(issues):
        sev = issue.get("severity", "")
        assert sev in VALID_SEVERITIES, (
            f"Issue {i} has invalid severity '{sev}'. "
            f"Valid: {VALID_SEVERITIES}"
        )


def test_expected_categories_present(extraction_output):
    """At least the expected categories should appear in the extraction."""
    case, issues = extraction_output
    expected = set(case.get("expected_categories", []))
    if not expected:
        pytest.skip("No expected_categories defined for this case")
    actual = {issue.get("category") for issue in issues}
    missing = expected - actual
    assert not missing, (
        f"Expected categories {missing} not found in extraction. "
        f"Got: {actual}"
    )


def test_no_duplicate_titles(extraction_output):
    """Issue titles should be unique within an extraction."""
    case, issues = extraction_output
    titles = [issue.get("title", "").lower().strip() for issue in issues]
    seen = set()
    for title in titles:
        assert title not in seen, f"Duplicate issue title: '{title}'"
        seen.add(title)


def test_title_length(extraction_output):
    """Titles should be concise (under 100 characters)."""
    case, issues = extraction_output
    for i, issue in enumerate(issues):
        title = issue.get("title", "")
        assert len(title) <= 100, (
            f"Issue {i} title too long ({len(title)} chars): '{title[:50]}...'"
        )
