"""Pydantic model validation eval — runs the production DeepAnalysisOutput model
against raw LLM output to catch type mismatches before they hit production.

This is the most direct regression test for the coverageGaps bug class:
if the LLM returns a string where list[str] is expected, Pydantic will reject it
(unless a coercion validator handles it).
"""

import json
import sys
from pathlib import Path

import pytest

# Add backend to path so we can import the production Pydantic models
_backend = Path(__file__).resolve().parent.parent.parent / "backend"
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from research_agent.deep_analysis_graph import (  # noqa: E402
    DeepAnalysisOutput,
    FamilySystemInsight,
    ParentAdviceItem,
    PatternCluster,
    PriorityRecommendation,
    ResearchRelevanceMapping,
    TimelineAnalysis,
    TimelinePhase,
)
from pydantic import ValidationError  # noqa: E402


# ---------------------------------------------------------------------------
# Validate full output against production model
# ---------------------------------------------------------------------------


def test_pydantic_full_model_validates(analysis_output):
    """Raw LLM output must pass DeepAnalysisOutput validation without errors.

    This is the exact same validation that runs in the production analyze() node.
    If this test fails, the production graph will crash with a Pydantic error.
    """
    _, output = analysis_output
    try:
        DeepAnalysisOutput.model_validate(output)
    except ValidationError as exc:
        error_lines = []
        for err in exc.errors():
            loc = " → ".join(str(x) for x in err["loc"])
            error_lines.append(f"  {loc}: {err['msg']} (type={err['type']}, input={err.get('input', '?')!r})")
        pytest.fail(
            f"DeepAnalysisOutput validation failed with {exc.error_count()} error(s):\n"
            + "\n".join(error_lines)
        )


# ---------------------------------------------------------------------------
# Validate individual sub-models (isolate which section fails)
# ---------------------------------------------------------------------------


def test_pydantic_pattern_clusters(analysis_output):
    """Each patternClusters entry must validate as PatternCluster."""
    _, output = analysis_output
    for i, cluster in enumerate(output.get("patternClusters", [])):
        try:
            PatternCluster.model_validate(cluster)
        except ValidationError as exc:
            pytest.fail(f"patternClusters[{i}] validation failed:\n{exc}")


def test_pydantic_timeline_analysis(analysis_output):
    """timelineAnalysis must validate as TimelineAnalysis."""
    _, output = analysis_output
    timeline = output.get("timelineAnalysis")
    if timeline is None:
        pytest.skip("No timelineAnalysis in output")
    try:
        TimelineAnalysis.model_validate(timeline)
    except ValidationError as exc:
        pytest.fail(f"timelineAnalysis validation failed:\n{exc}")


def test_pydantic_timeline_phases(analysis_output):
    """Each phase in timelineAnalysis.phases must validate as TimelinePhase."""
    _, output = analysis_output
    phases = (output.get("timelineAnalysis") or {}).get("phases", [])
    for i, phase in enumerate(phases):
        try:
            TimelinePhase.model_validate(phase)
        except ValidationError as exc:
            pytest.fail(f"timelineAnalysis.phases[{i}] validation failed:\n{exc}")


def test_pydantic_family_system_insights(analysis_output):
    """Each familySystemInsights entry must validate as FamilySystemInsight."""
    _, output = analysis_output
    for i, insight in enumerate(output.get("familySystemInsights", [])):
        try:
            FamilySystemInsight.model_validate(insight)
        except ValidationError as exc:
            pytest.fail(f"familySystemInsights[{i}] validation failed:\n{exc}")


def test_pydantic_priority_recommendations(analysis_output):
    """Each priorityRecommendations entry must validate as PriorityRecommendation."""
    _, output = analysis_output
    for i, rec in enumerate(output.get("priorityRecommendations", [])):
        try:
            PriorityRecommendation.model_validate(rec)
        except ValidationError as exc:
            pytest.fail(f"priorityRecommendations[{i}] validation failed:\n{exc}")


def test_pydantic_research_relevance(analysis_output):
    """Each researchRelevance entry must validate as ResearchRelevanceMapping.

    This is the specific regression test for the coverageGaps string-vs-list bug.
    """
    _, output = analysis_output
    for i, mapping in enumerate(output.get("researchRelevance", [])):
        try:
            ResearchRelevanceMapping.model_validate(mapping)
        except ValidationError as exc:
            pytest.fail(f"researchRelevance[{i}] validation failed:\n{exc}")


# ═══════════════════════════════════════════════════════════════════════════
# Coercion unit tests — one per list field, verifies bare value → [value]
# ═══════════════════════════════════════════════════════════════════════════

# --- PatternCluster ---

_PATTERN_CLUSTER_BASE = {
    "name": "test",
    "description": "test",
    "pattern": "recurring",
    "confidence": 0.8,
}


def test_coercion_pattern_cluster_issueIds_int():
    """PatternCluster.issueIds: bare int → [int]"""
    obj = PatternCluster.model_validate({**_PATTERN_CLUSTER_BASE, "issueIds": 42, "issueTitles": ["t"], "categories": ["c"]})
    assert obj.issueIds == [42]


def test_coercion_pattern_cluster_issueTitles_string():
    """PatternCluster.issueTitles: bare string → [string]"""
    obj = PatternCluster.model_validate({**_PATTERN_CLUSTER_BASE, "issueIds": [1], "issueTitles": "One title", "categories": ["c"]})
    assert obj.issueTitles == ["One title"]


def test_coercion_pattern_cluster_categories_string():
    """PatternCluster.categories: bare string → [string]"""
    obj = PatternCluster.model_validate({**_PATTERN_CLUSTER_BASE, "issueIds": [1], "issueTitles": ["t"], "categories": "behavioral"})
    assert obj.categories == ["behavioral"]


# --- TimelinePhase ---

_TIMELINE_PHASE_BASE = {"period": "March 2026", "description": "test"}


def test_coercion_timeline_phase_issueIds_int():
    """TimelinePhase.issueIds: bare int → [int]"""
    obj = TimelinePhase.model_validate({**_TIMELINE_PHASE_BASE, "issueIds": 7, "keyEvents": ["e"]})
    assert obj.issueIds == [7]


def test_coercion_timeline_phase_keyEvents_string():
    """TimelinePhase.keyEvents: bare string → [string]"""
    obj = TimelinePhase.model_validate({**_TIMELINE_PHASE_BASE, "issueIds": [1], "keyEvents": "Single event"})
    assert obj.keyEvents == ["Single event"]


# --- TimelineAnalysis ---


def test_coercion_timeline_analysis_criticalPeriods_string():
    """TimelineAnalysis.criticalPeriods: bare string → [string]"""
    obj = TimelineAnalysis.model_validate({"phases": [], "escalationTrend": "stable", "criticalPeriods": "Single period"})
    assert obj.criticalPeriods == ["Single period"]


# --- FamilySystemInsight ---

_INSIGHT_BASE = {"insight": "test", "systemicPattern": None, "actionable": True}


def test_coercion_insight_involvedMemberIds_int():
    """FamilySystemInsight.involvedMemberIds: bare int → [int]"""
    obj = FamilySystemInsight.model_validate({**_INSIGHT_BASE, "involvedMemberIds": 5, "involvedMemberNames": ["n"], "evidenceIssueIds": [1]})
    assert obj.involvedMemberIds == [5]


def test_coercion_insight_involvedMemberNames_string():
    """FamilySystemInsight.involvedMemberNames: bare string → [string]"""
    obj = FamilySystemInsight.model_validate({**_INSIGHT_BASE, "involvedMemberIds": [1], "involvedMemberNames": "Bogdan", "evidenceIssueIds": [1]})
    assert obj.involvedMemberNames == ["Bogdan"]


def test_coercion_insight_evidenceIssueIds_int():
    """FamilySystemInsight.evidenceIssueIds: bare int → [int]"""
    obj = FamilySystemInsight.model_validate({**_INSIGHT_BASE, "involvedMemberIds": [1], "involvedMemberNames": ["n"], "evidenceIssueIds": 99})
    assert obj.evidenceIssueIds == [99]


# --- PriorityRecommendation ---

_REC_BASE = {"rank": 1, "rationale": "test", "urgency": "immediate", "suggestedApproach": "test"}


def test_coercion_recommendation_relatedResearchIds_int():
    """PriorityRecommendation.relatedResearchIds: bare int → [int]"""
    obj = PriorityRecommendation.model_validate({**_REC_BASE, "relatedResearchIds": 3})
    assert obj.relatedResearchIds == [3]


def test_coercion_recommendation_relatedResearchIds_none():
    """PriorityRecommendation.relatedResearchIds: None stays None"""
    obj = PriorityRecommendation.model_validate({**_REC_BASE, "relatedResearchIds": None})
    assert obj.relatedResearchIds is None


# --- ResearchRelevanceMapping ---

_MAPPING_BASE = {"patternClusterName": "test"}


def test_coercion_mapping_relevantResearchIds_int():
    """ResearchRelevanceMapping.relevantResearchIds: bare int → [int]"""
    obj = ResearchRelevanceMapping.model_validate({**_MAPPING_BASE, "relevantResearchIds": 1, "relevantResearchTitles": ["t"], "coverageGaps": ["g"]})
    assert obj.relevantResearchIds == [1]


def test_coercion_mapping_relevantResearchTitles_string():
    """ResearchRelevanceMapping.relevantResearchTitles: bare string → [string]"""
    obj = ResearchRelevanceMapping.model_validate({**_MAPPING_BASE, "relevantResearchIds": [1], "relevantResearchTitles": "One title", "coverageGaps": ["g"]})
    assert obj.relevantResearchTitles == ["One title"]


def test_coercion_mapping_coverageGaps_string():
    """ResearchRelevanceMapping.coverageGaps: bare string → [string]"""
    obj = ResearchRelevanceMapping.model_validate({**_MAPPING_BASE, "relevantResearchIds": [1], "relevantResearchTitles": ["t"], "coverageGaps": "Single gap"})
    assert obj.coverageGaps == ["Single gap"]


# --- Normal list inputs still work ---


def test_normal_lists_pass_through():
    """Normal list inputs should pass through validators unchanged."""
    obj = PatternCluster.model_validate({
        **_PATTERN_CLUSTER_BASE,
        "issueIds": [1, 2, 3],
        "issueTitles": ["a", "b", "c"],
        "categories": ["behavioral", "social"],
    })
    assert obj.issueIds == [1, 2, 3]
    assert obj.issueTitles == ["a", "b", "c"]
    assert obj.categories == ["behavioral", "social"]


# ═══════════════════════════════════════════════════════════════════════════
# ParentAdviceItem — LLM output validation
# ═══════════════════════════════════════════════════════════════════════════


def test_pydantic_parent_advice(analysis_output):
    """Each parentAdvice entry must validate as ParentAdviceItem."""
    _, output = analysis_output
    for i, item in enumerate(output.get("parentAdvice", [])):
        try:
            ParentAdviceItem.model_validate(item)
        except ValidationError as exc:
            pytest.fail(f"parentAdvice[{i}] validation failed:\n{exc}")


def test_parent_advice_present(analysis_output):
    """parentAdvice must be present and non-empty."""
    _, output = analysis_output
    advice = output.get("parentAdvice", [])
    assert len(advice) >= 1, "parentAdvice must contain at least 1 item"


def test_parent_advice_references_issues(analysis_output):
    """Every parentAdvice item must reference at least one issue ID from the data."""
    case, output = analysis_output
    valid_ids = {i["id"] for i in case["issues"]}
    for i, item in enumerate(output.get("parentAdvice", [])):
        target_ids = item.get("targetIssueIds", [])
        if isinstance(target_ids, int):
            target_ids = [target_ids]
        assert len(target_ids) >= 1, f"parentAdvice[{i}] has no targetIssueIds"
        for tid in target_ids:
            assert tid in valid_ids, (
                f"parentAdvice[{i}] references issue ID {tid} not in input data {valid_ids}"
            )


def test_parent_advice_has_concrete_steps(analysis_output):
    """Every parentAdvice item must have at least one concrete step."""
    _, output = analysis_output
    for i, item in enumerate(output.get("parentAdvice", [])):
        steps = item.get("concreteSteps", [])
        if isinstance(steps, str):
            steps = [steps]
        assert len(steps) >= 1, f"parentAdvice[{i}] has no concreteSteps"


# --- ParentAdviceItem coercion ---

_ADVICE_BASE = {
    "title": "test",
    "advice": "test advice text",
    "ageAppropriate": True,
    "priority": "immediate",
}


def test_coercion_advice_targetIssueIds_int():
    """ParentAdviceItem.targetIssueIds: bare int -> [int]"""
    obj = ParentAdviceItem.model_validate({
        **_ADVICE_BASE, "targetIssueIds": 42, "targetIssueTitles": ["t"], "concreteSteps": ["s"]
    })
    assert obj.targetIssueIds == [42]


def test_coercion_advice_targetIssueTitles_string():
    """ParentAdviceItem.targetIssueTitles: bare string -> [string]"""
    obj = ParentAdviceItem.model_validate({
        **_ADVICE_BASE, "targetIssueIds": [1], "targetIssueTitles": "One title", "concreteSteps": ["s"]
    })
    assert obj.targetIssueTitles == ["One title"]


def test_coercion_advice_concreteSteps_string():
    """ParentAdviceItem.concreteSteps: bare string -> [string]"""
    obj = ParentAdviceItem.model_validate({
        **_ADVICE_BASE, "targetIssueIds": [1], "targetIssueTitles": ["t"], "concreteSteps": "Do this"
    })
    assert obj.concreteSteps == ["Do this"]


def test_coercion_advice_relatedResearchIds_int():
    """ParentAdviceItem.relatedResearchIds: bare int -> [int]"""
    obj = ParentAdviceItem.model_validate({
        **_ADVICE_BASE, "targetIssueIds": [1], "targetIssueTitles": ["t"],
        "concreteSteps": ["s"], "relatedResearchIds": 5
    })
    assert obj.relatedResearchIds == [5]


def test_coercion_advice_relatedResearchIds_none():
    """ParentAdviceItem.relatedResearchIds: None stays None"""
    obj = ParentAdviceItem.model_validate({
        **_ADVICE_BASE, "targetIssueIds": [1], "targetIssueTitles": ["t"],
        "concreteSteps": ["s"], "relatedResearchIds": None
    })
    assert obj.relatedResearchIds is None


def test_coercion_advice_relatedResearchTitles_string():
    """ParentAdviceItem.relatedResearchTitles: bare string -> [string]"""
    obj = ParentAdviceItem.model_validate({
        **_ADVICE_BASE, "targetIssueIds": [1], "targetIssueTitles": ["t"],
        "concreteSteps": ["s"], "relatedResearchTitles": "A study"
    })
    assert obj.relatedResearchTitles == ["A study"]
