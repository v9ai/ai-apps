"""DeepEval tests for the research pipeline stages."""

import json

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    extraction_faithfulness_metric,
    feedback_integration_metric,
    normalization_accuracy_metric,
    query_planning_quality_metric,
    relevance_scoring_metric,
)
from generator import (
    SYNTHETIC_PAPERS,
    build_extract_input,
    build_normalize_input,
    build_plan_input,
)


def _normalize_test_case(case: dict, result: dict) -> LLMTestCase:
    return LLMTestCase(
        input=build_normalize_input(case),
        actual_output=json.dumps(result, indent=2),
    )


def _plan_test_case(case: dict, result: dict) -> LLMTestCase:
    return LLMTestCase(
        input=build_plan_input(case),
        actual_output=json.dumps(result, indent=2),
    )


def _extract_test_case(case: dict, result: dict) -> LLMTestCase:
    paper = SYNTHETIC_PAPERS.get(case["id"], {})
    return LLMTestCase(
        input=build_extract_input(case, paper),
        actual_output=json.dumps(result, indent=2),
        context=[paper.get("abstract", "")],
    )


# ---------------------------------------------------------------------------
# LLM-judged: Normalization
# ---------------------------------------------------------------------------


def test_normalization_accuracy(normalize_output):
    case, result = normalize_output
    assert_test(_normalize_test_case(case, result), [normalization_accuracy_metric])


def test_feedback_integration(normalize_output):
    case, result = normalize_output
    assert_test(_normalize_test_case(case, result), [feedback_integration_metric])


# ---------------------------------------------------------------------------
# LLM-judged: Query planning
# ---------------------------------------------------------------------------


def test_query_planning_quality(plan_output):
    case, result = plan_output
    assert_test(_plan_test_case(case, result), [query_planning_quality_metric])


# ---------------------------------------------------------------------------
# LLM-judged: Paper extraction
# ---------------------------------------------------------------------------


def test_extraction_faithfulness(extract_output):
    case, result = extract_output
    if not result:
        pytest.skip("No synthetic paper defined for this case")
    assert_test(_extract_test_case(case, result), [extraction_faithfulness_metric])


def test_relevance_scoring(extract_output):
    case, result = extract_output
    if not result:
        pytest.skip("No synthetic paper defined for this case")
    assert_test(_extract_test_case(case, result), [relevance_scoring_metric])


# ---------------------------------------------------------------------------
# Deterministic: Normalization
# ---------------------------------------------------------------------------


def test_normalization_has_required_fields(normalize_output):
    """Normalization must produce all required fields."""
    _, result = normalize_output
    required = {
        "translatedGoalTitle", "originalLanguage", "clinicalRestatement",
        "clinicalDomain", "behaviorDirection", "developmentalTier",
        "requiredKeywords", "excludedTopics",
    }
    missing = required - set(result.keys())
    assert not missing, f"Missing normalization fields: {missing}"


def test_normalization_clinical_domain_specific(normalize_output):
    """Clinical domain must NOT be the generic fallback."""
    _, result = normalize_output
    domain = result.get("clinicalDomain", "")
    assert domain != "behavioral_change", (
        f"Clinical domain is generic 'behavioral_change' — should be specific"
    )
    assert domain, "Clinical domain is empty"


def test_normalization_behavior_direction_valid(normalize_output):
    """Behavior direction must be one of the valid enum values."""
    _, result = normalize_output
    valid = {"INCREASE", "REDUCE", "MAINTAIN", "UNCLEAR"}
    direction = result.get("behaviorDirection", "")
    assert direction in valid, f"Invalid behavior direction: '{direction}'"


def test_normalization_has_keywords(normalize_output):
    """Must generate at least 3 required keywords."""
    _, result = normalize_output
    kw = result.get("requiredKeywords", [])
    assert len(kw) >= 3, f"Expected ≥3 required keywords, got {len(kw)}: {kw}"


def test_normalization_expected_direction(normalize_output):
    """Behavior direction should match the expected direction for the test case."""
    case, result = normalize_output
    expected = case.get("expected_behavior_direction")
    if not expected:
        pytest.skip("No expected_behavior_direction defined")
    actual = result.get("behaviorDirection", "")
    assert actual == expected, (
        f"Expected direction '{expected}', got '{actual}'"
    )


# ---------------------------------------------------------------------------
# Deterministic: Query planning
# ---------------------------------------------------------------------------


def test_plan_has_queries(plan_output):
    """Query plan must produce queries for all three sources."""
    _, result = plan_output
    s2 = result.get("semanticScholarQueries", [])
    cr = result.get("crossrefQueries", [])
    pm = result.get("pubmedQueries", [])
    assert len(s2) >= 2, f"Need ≥2 Semantic Scholar queries, got {len(s2)}"
    assert len(cr) >= 2, f"Need ≥2 Crossref queries, got {len(cr)}"
    assert len(pm) >= 1, f"Need ≥1 PubMed query, got {len(pm)}"


def test_plan_total_query_count(plan_output):
    """Should generate enough queries for good recall."""
    _, result = plan_output
    total = (
        len(result.get("semanticScholarQueries", []))
        + len(result.get("crossrefQueries", []))
        + len(result.get("pubmedQueries", []))
    )
    assert total >= 10, f"Expected ≥10 total queries, got {total}"


def test_plan_has_keywords(plan_output):
    """Plan must include core keywords."""
    _, result = plan_output
    kw = result.get("keywords", [])
    assert len(kw) >= 3, f"Expected ≥3 keywords, got {len(kw)}: {kw}"


def test_plan_contains_expected_keywords(plan_output):
    """At least some expected keywords should appear in the plan."""
    case, result = plan_output
    expected = case.get("expected_query_keywords", [])
    if not expected:
        pytest.skip("No expected_query_keywords defined")

    all_queries = " ".join(
        result.get("semanticScholarQueries", [])
        + result.get("crossrefQueries", [])
        + result.get("pubmedQueries", [])
        + result.get("keywords", [])
    ).lower()

    found = [kw for kw in expected if kw.lower() in all_queries]
    assert len(found) >= 1, (
        f"None of the expected keywords {expected} found in queries"
    )


# ---------------------------------------------------------------------------
# Deterministic: Extraction
# ---------------------------------------------------------------------------


def test_extraction_has_findings(extract_output):
    """Extraction must produce key findings."""
    case, result = extract_output
    if not result:
        pytest.skip("No synthetic paper")
    findings = result.get("keyFindings", [])
    assert len(findings) >= 1, f"Expected ≥1 key finding, got {len(findings)}"


def test_extraction_has_techniques(extract_output):
    """Extraction should identify therapeutic techniques."""
    case, result = extract_output
    if not result:
        pytest.skip("No synthetic paper")
    techniques = result.get("therapeuticTechniques", [])
    assert len(techniques) >= 1, (
        f"Expected ≥1 therapeutic technique, got {len(techniques)}"
    )


def test_extraction_relevance_score_range(extract_output):
    """Relevance score must be between 0 and 1."""
    _, result = extract_output
    if not result:
        pytest.skip("No synthetic paper")
    score = result.get("relevanceScore", -1)
    assert 0 <= score <= 1, f"Relevance score out of range: {score}"


def test_extraction_confidence_range(extract_output):
    """Extraction confidence must be between 0 and 1."""
    _, result = extract_output
    if not result:
        pytest.skip("No synthetic paper")
    score = result.get("extractionConfidence", -1)
    assert 0 <= score <= 1, f"Confidence out of range: {score}"


def test_extraction_high_relevance_for_matching_paper(extract_output):
    """Synthetic papers are designed to match — relevance should be ≥0.7."""
    _, result = extract_output
    if not result:
        pytest.skip("No synthetic paper")
    score = result.get("relevanceScore", 0)
    assert score >= 0.7, (
        f"Expected relevance ≥0.7 for a matching paper, got {score}"
    )
