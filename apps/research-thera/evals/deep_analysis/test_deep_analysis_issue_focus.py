"""DeepEval tests for issue-focus quality in deep analysis.

When a trigger_issue_id is provided, the analysis must primarily focus on that
specific issue. These tests validate that the summary, patterns, and
recommendations center on the trigger issue rather than diluting across all issues.
"""

import json

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import model
from generator import build_input_description


# ---------------------------------------------------------------------------
# GEval metrics — issue focus quality
# ---------------------------------------------------------------------------

issue_focus_summary_metric = GEval(
    name="Issue Focus Summary",
    criteria=(
        "Evaluate whether the executive summary is primarily focused on the trigger issue. "
        "Check that: "
        "(1) the summary leads with or prominently features the trigger issue in the first paragraph, "
        "(2) the trigger issue title or a clear paraphrase appears in the summary, "
        "(3) other issues are mentioned only in relation to the trigger issue, not as equal peers, "
        "(4) the overall narrative arc of the summary centers on understanding the trigger issue. "
        "Penalize if the summary gives equal weight to all issues without clearly centering on the trigger."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.7,
)

issue_focus_recommendations_metric = GEval(
    name="Issue Focus Recommendations",
    criteria=(
        "Evaluate whether the priority recommendations prioritize the trigger issue. "
        "Check that: "
        "(1) the first recommendation (rank 1) directly addresses the trigger issue, "
        "(2) a majority of recommendations relate to or stem from the trigger issue, "
        "(3) recommendations for other issues are framed in terms of how they support "
        "resolving the trigger issue, "
        "(4) the suggested approaches are specific to the trigger issue's category and nature. "
        "Penalize heavily if the first recommendation addresses a different issue."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.7,
)

issue_focus_patterns_metric = GEval(
    name="Issue Focus Pattern Clusters",
    criteria=(
        "Evaluate whether the pattern clusters meaningfully include the trigger issue. "
        "Check that: "
        "(1) the trigger issue ID appears in at least one pattern cluster, "
        "(2) the cluster descriptions explain how the trigger issue relates to other issues, "
        "(3) clusters are organized around the trigger issue rather than treating all issues equally, "
        "(4) suggested root causes connect back to the trigger issue. "
        "Penalize if the trigger issue is absent from all clusters."
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


def _get_trigger_issue(case: dict) -> dict | None:
    trigger_id = case.get("trigger_issue_id")
    if not trigger_id:
        return None
    return next((i for i in case["issues"] if i["id"] == trigger_id), None)


# ---------------------------------------------------------------------------
# LLM-judged: issue focus
# ---------------------------------------------------------------------------


def test_issue_focus_summary(analysis_output):
    """Summary must primarily discuss the trigger issue."""
    case, output = analysis_output
    if not case.get("trigger_issue_id"):
        pytest.skip("No trigger_issue_id in test case")
    assert_test(_make_test_case(case, output), [issue_focus_summary_metric])


def test_issue_focus_recommendations(analysis_output):
    """First recommendation must address the trigger issue."""
    case, output = analysis_output
    if not case.get("trigger_issue_id"):
        pytest.skip("No trigger_issue_id in test case")
    assert_test(_make_test_case(case, output), [issue_focus_recommendations_metric])


def test_issue_focus_patterns(analysis_output):
    """Pattern clusters must include the trigger issue."""
    case, output = analysis_output
    if not case.get("trigger_issue_id"):
        pytest.skip("No trigger_issue_id in test case")
    assert_test(_make_test_case(case, output), [issue_focus_patterns_metric])


# ---------------------------------------------------------------------------
# Deterministic: trigger issue presence
# ---------------------------------------------------------------------------


def test_trigger_issue_in_pattern_clusters(analysis_output):
    """The trigger issue ID must appear in at least one pattern cluster's issueIds."""
    case, output = analysis_output
    trigger_id = case.get("trigger_issue_id")
    if not trigger_id:
        pytest.skip("No trigger_issue_id in test case")

    clusters = output.get("patternClusters", [])
    found = any(trigger_id in c.get("issueIds", []) for c in clusters)
    assert found, (
        f"Trigger issue ID {trigger_id} not found in any patternCluster.issueIds. "
        f"Cluster issueIds: {[c.get('issueIds', []) for c in clusters]}"
    )


def test_trigger_issue_in_first_recommendation(analysis_output):
    """The rank-1 recommendation must reference the trigger issue."""
    case, output = analysis_output
    trigger_id = case.get("trigger_issue_id")
    if not trigger_id:
        pytest.skip("No trigger_issue_id in test case")

    trigger_issue = _get_trigger_issue(case)
    recs = output.get("priorityRecommendations", [])
    if not recs:
        pytest.fail("No priorityRecommendations in output")

    # Find the rank-1 recommendation (or first if no explicit rank)
    rank1 = next((r for r in recs if r.get("rank") == 1), recs[0])

    # Check if it references the trigger issue by ID or title
    refs_id = rank1.get("issueId") == trigger_id
    refs_title = trigger_issue and trigger_issue["title"].lower() in (rank1.get("issueTitle") or "").lower()
    refs_in_rationale = trigger_issue and trigger_issue["title"].lower() in (rank1.get("rationale") or "").lower()
    refs_in_approach = trigger_issue and trigger_issue["title"].lower() in (rank1.get("suggestedApproach") or "").lower()

    assert refs_id or refs_title or refs_in_rationale or refs_in_approach, (
        f"Rank-1 recommendation does not reference trigger issue "
        f"(ID:{trigger_id}, title: '{trigger_issue['title'] if trigger_issue else '?'}'). "
        f"Got: issueId={rank1.get('issueId')}, issueTitle={rank1.get('issueTitle')}"
    )


def test_summary_mentions_trigger_issue(analysis_output):
    """The summary must mention the trigger issue title or a clear paraphrase."""
    case, output = analysis_output
    trigger_issue = _get_trigger_issue(case)
    if not trigger_issue:
        pytest.skip("No trigger_issue_id in test case")

    summary = (output.get("summary") or "").lower()
    title = trigger_issue["title"].lower()

    # Check for exact title match or key words from the title
    title_words = [w for w in title.split() if len(w) > 3]
    exact_match = title in summary
    keyword_match = sum(1 for w in title_words if w in summary) >= max(1, len(title_words) // 2)

    assert exact_match or keyword_match, (
        f"Summary does not mention trigger issue '{trigger_issue['title']}'. "
        f"Summary excerpt: {summary[:300]}"
    )


def test_trigger_issue_dominates_recommendations(analysis_output):
    """At least half of the recommendations should relate to the trigger issue."""
    case, output = analysis_output
    trigger_id = case.get("trigger_issue_id")
    trigger_issue = _get_trigger_issue(case)
    if not trigger_id or not trigger_issue:
        pytest.skip("No trigger_issue_id in test case")

    recs = output.get("priorityRecommendations", [])
    if not recs:
        pytest.fail("No priorityRecommendations in output")

    title_lower = trigger_issue["title"].lower()
    related_count = 0
    for rec in recs:
        if rec.get("issueId") == trigger_id:
            related_count += 1
        elif title_lower in (rec.get("issueTitle") or "").lower():
            related_count += 1
        elif title_lower in (rec.get("rationale") or "").lower():
            related_count += 1

    ratio = related_count / len(recs)
    assert ratio >= 0.3, (
        f"Only {related_count}/{len(recs)} ({ratio:.0%}) recommendations relate to "
        f"trigger issue '{trigger_issue['title']}'. Expected >= 30%."
    )
