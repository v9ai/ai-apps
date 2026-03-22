"""DeepEval tests for deep analysis output schema and structural validity.

Validates that the LLM output conforms to the DeepAnalysisOutput Pydantic model
used in production. Catches type mismatches (e.g. string where list expected),
missing required fields, and constraint violations.
"""

import json

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import model
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams
from generator import build_input_description


# ---------------------------------------------------------------------------
# GEval metric — overall output structural quality
# ---------------------------------------------------------------------------

schema_compliance_metric = GEval(
    name="Schema Compliance Quality",
    criteria=(
        "Evaluate whether the deep analysis output follows the requested JSON schema precisely. "
        "The expected top-level fields are: summary, patternClusters, timelineAnalysis, "
        "familySystemInsights, priorityRecommendations, researchRelevance, and developmentalContext. "
        "Check that: "
        "(1) all expected top-level fields exist, "
        "(2) array fields contain arrays (not strings), "
        "(3) issueIds are integers referencing valid issue IDs from the input, "
        "(4) confidence values are between 0 and 1, "
        "(5) enum-like fields use the specified values (e.g. urgency: immediate|short_term|long_term), "
        "(6) timelineAnalysis is an object (not an array) containing phases, escalationTrend, criticalPeriods. "
        "Penalize heavily for type mismatches (string where array expected, etc). "
        "Do NOT penalize for familySystemInsights, researchRelevance, or developmentalContext — these are expected fields."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.7,
)


def _make_test_case(case: dict, output: dict) -> LLMTestCase:
    return LLMTestCase(
        input=build_input_description(case),
        actual_output=json.dumps(output, indent=2, ensure_ascii=False),
    )


# ---------------------------------------------------------------------------
# LLM-judged: schema compliance
# ---------------------------------------------------------------------------


def test_schema_compliance(analysis_output):
    """LLM judges overall schema compliance of the output."""
    case, output = analysis_output
    assert_test(_make_test_case(case, output), [schema_compliance_metric])


# ---------------------------------------------------------------------------
# Deterministic: top-level structure
# ---------------------------------------------------------------------------


def test_has_required_top_level_fields(analysis_output):
    """Output must contain all required top-level sections."""
    _, output = analysis_output
    required = {"summary", "patternClusters", "timelineAnalysis", "priorityRecommendations"}
    missing = required - set(output.keys())
    assert not missing, f"Missing top-level fields: {missing}"


def test_summary_is_string(analysis_output):
    """Summary must be a string, not a list or dict."""
    _, output = analysis_output
    summary = output.get("summary")
    assert isinstance(summary, str), f"summary should be str, got {type(summary).__name__}"
    assert len(summary) >= 50, f"summary too short ({len(summary)} chars)"


# ---------------------------------------------------------------------------
# Deterministic: patternClusters
# ---------------------------------------------------------------------------


def test_pattern_clusters_is_list(analysis_output):
    """patternClusters must be a list."""
    _, output = analysis_output
    clusters = output.get("patternClusters")
    assert isinstance(clusters, list), (
        f"patternClusters should be list, got {type(clusters).__name__}"
    )


def test_pattern_cluster_fields(analysis_output):
    """Each pattern cluster must have required fields with correct types."""
    _, output = analysis_output
    for i, cluster in enumerate(output.get("patternClusters", [])):
        assert isinstance(cluster.get("name"), str), f"Cluster [{i}] name must be str"
        assert isinstance(cluster.get("description"), str), f"Cluster [{i}] description must be str"

        issue_ids = cluster.get("issueIds")
        assert isinstance(issue_ids, list), (
            f"Cluster [{i}] issueIds should be list, got {type(issue_ids).__name__}: {issue_ids!r}"
        )
        for j, iid in enumerate(issue_ids):
            assert isinstance(iid, int), f"Cluster [{i}] issueIds[{j}] should be int, got {type(iid).__name__}"

        titles = cluster.get("issueTitles")
        assert isinstance(titles, list), (
            f"Cluster [{i}] issueTitles should be list, got {type(titles).__name__}: {titles!r}"
        )

        categories = cluster.get("categories")
        assert isinstance(categories, list), (
            f"Cluster [{i}] categories should be list, got {type(categories).__name__}: {categories!r}"
        )

        confidence = cluster.get("confidence")
        if confidence is not None:
            assert 0 <= float(confidence) <= 1, f"Cluster [{i}] confidence {confidence} out of [0, 1]"

        pattern = cluster.get("pattern", "")
        valid_patterns = {"recurring", "escalating", "co-occurring", "co_occurring", "seasonal", "triggered"}
        assert pattern in valid_patterns, (
            f"Cluster [{i}] pattern '{pattern}' not in {sorted(valid_patterns)}"
        )


def test_pattern_cluster_issue_ids_valid(analysis_output):
    """issueIds in clusters must reference issue IDs from the input."""
    case, output = analysis_output
    valid_ids = {issue["id"] for issue in case["issues"]}
    for i, cluster in enumerate(output.get("patternClusters", [])):
        for iid in cluster.get("issueIds", []):
            assert iid in valid_ids, (
                f"Cluster [{i}] references issueId {iid} not in input issues {sorted(valid_ids)}"
            )


# ---------------------------------------------------------------------------
# Deterministic: timelineAnalysis
# ---------------------------------------------------------------------------


def test_timeline_analysis_structure(analysis_output):
    """timelineAnalysis must be a dict with required fields."""
    _, output = analysis_output
    timeline = output.get("timelineAnalysis")
    assert isinstance(timeline, dict), (
        f"timelineAnalysis should be dict, got {type(timeline).__name__}"
    )

    trend = timeline.get("escalationTrend", "")
    valid_trends = {"improving", "worsening", "stable", "cyclical"}
    assert trend in valid_trends, (
        f"escalationTrend '{trend}' not in {sorted(valid_trends)}"
    )

    periods = timeline.get("criticalPeriods")
    assert isinstance(periods, list), (
        f"criticalPeriods should be list, got {type(periods).__name__}: {periods!r}"
    )
    for j, p in enumerate(periods):
        assert isinstance(p, str), (
            f"criticalPeriods[{j}] should be str, got {type(p).__name__}"
        )


# ---------------------------------------------------------------------------
# Deterministic: priorityRecommendations
# ---------------------------------------------------------------------------


def test_recommendations_is_list(analysis_output):
    """priorityRecommendations must be a list."""
    _, output = analysis_output
    recs = output.get("priorityRecommendations")
    assert isinstance(recs, list), (
        f"priorityRecommendations should be list, got {type(recs).__name__}"
    )
    assert len(recs) >= 1, "Need at least 1 recommendation"


def test_recommendation_fields(analysis_output):
    """Each recommendation must have required fields with correct types."""
    _, output = analysis_output
    valid_urgency = {"immediate", "short_term", "long_term"}
    for i, rec in enumerate(output.get("priorityRecommendations", [])):
        assert isinstance(rec.get("rank"), int), f"Rec [{i}] rank must be int"
        assert isinstance(rec.get("rationale"), str), f"Rec [{i}] rationale must be str"
        assert isinstance(rec.get("suggestedApproach"), str), f"Rec [{i}] suggestedApproach must be str"

        urgency = rec.get("urgency", "")
        assert urgency in valid_urgency, (
            f"Rec [{i}] urgency '{urgency}' not in {sorted(valid_urgency)}"
        )


def test_recommendation_issue_ids_valid(analysis_output):
    """issueId in recommendations must reference a valid input issue."""
    case, output = analysis_output
    valid_ids = {issue["id"] for issue in case["issues"]}
    for i, rec in enumerate(output.get("priorityRecommendations", [])):
        iid = rec.get("issueId")
        if iid is not None:
            assert iid in valid_ids, (
                f"Rec [{i}] references issueId {iid} not in input issues {sorted(valid_ids)}"
            )


# ---------------------------------------------------------------------------
# Deterministic: list-field type safety (regression for coverageGaps bug)
# ---------------------------------------------------------------------------


def _check_all_list_fields(obj, path=""):
    """Recursively check that fields expected to be lists are not bare strings."""
    LIST_FIELD_NAMES = {
        "issueIds", "issueTitles", "categories", "keyEvents",
        "criticalPeriods", "involvedMemberIds", "involvedMemberNames",
        "evidenceIssueIds", "relatedResearchIds", "relevantResearchIds",
        "relevantResearchTitles", "coverageGaps", "flags",
    }
    errors = []
    if isinstance(obj, dict):
        for key, val in obj.items():
            full_path = f"{path}.{key}" if path else key
            if key in LIST_FIELD_NAMES and isinstance(val, str):
                errors.append(f"{full_path}: expected list, got string '{val[:80]}'")
            errors.extend(_check_all_list_fields(val, full_path))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            errors.extend(_check_all_list_fields(item, f"{path}[{i}]"))
    return errors


def test_no_string_where_list_expected(analysis_output):
    """Regression: LLM must not return a bare string for any list-typed field."""
    _, output = analysis_output
    errors = _check_all_list_fields(output)
    assert not errors, (
        f"Found {len(errors)} field(s) where string was returned instead of list:\n"
        + "\n".join(f"  - {e}" for e in errors)
    )
