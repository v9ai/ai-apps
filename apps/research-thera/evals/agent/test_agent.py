"""DeepEval tests for the Rust DeepSeek Reasoner research agent output.

Deterministic tests validate JSON structure and field constraints.
LLM-judged tests (GEval) evaluate output quality via DeepSeek-chat.
"""

import json

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    evidence_hierarchy_metric,
    research_coverage_metric,
    technique_specificity_metric,
    therapeutic_relevance_metric,
)
from generator import build_input_description

# Valid evidence levels from research_agent.rs preamble + observed variants
VALID_LEVELS = {
    "meta-analysis",
    "systematic_review",
    "rct",
    "cohort",
    "case_control",
    "case_series",
    "case_study",
    "expert_opinion",
    "pilot_study",
    "pilot study",  # variant produced by the agent
    "single-subject design",
}

# ---------------------------------------------------------------------------
# Deterministic tests
# ---------------------------------------------------------------------------


def test_json_parseable(agent_output):
    case, output = agent_output
    assert isinstance(output, dict), "Agent output must be a dict (parsed JSON)"


def test_required_top_level_fields(agent_output):
    case, output = agent_output
    for field in ("goal_id", "therapeutic_goal_type", "papers", "confidence_score"):
        assert field in output, f"Missing required top-level field: {field!r}"


def test_paper_count(agent_output):
    case, output = agent_output
    papers = output.get("papers", [])
    assert 1 <= len(papers) <= 10, (
        f"Expected 1–10 papers, got {len(papers)}"
    )


def test_required_paper_fields(agent_output):
    case, output = agent_output
    required = {"title", "authors", "evidence_level", "relevance_score", "key_findings"}
    for i, paper in enumerate(output.get("papers", [])):
        missing = required - set(paper.keys())
        assert not missing, f"Paper [{i}] missing fields: {missing}"


def test_evidence_level_valid(agent_output):
    case, output = agent_output
    for i, paper in enumerate(output.get("papers", [])):
        level = paper.get("evidence_level", "")
        assert level in VALID_LEVELS, (
            f"Paper [{i}] has invalid evidence_level {level!r}. "
            f"Valid: {sorted(VALID_LEVELS)}"
        )


def test_relevance_score_range(agent_output):
    case, output = agent_output
    for i, paper in enumerate(output.get("papers", [])):
        score = paper.get("relevance_score")
        assert score is not None, f"Paper [{i}] missing relevance_score"
        assert 0.0 <= float(score) <= 1.0, (
            f"Paper [{i}] relevance_score {score} out of [0, 1]"
        )


def test_confidence_score_range(agent_output):
    case, output = agent_output
    score = output.get("confidence_score")
    assert score is not None, "Missing confidence_score"
    assert 0.0 <= float(score) <= 1.0, f"confidence_score {score} out of [0, 1]"


def test_papers_have_doi_or_url(agent_output):
    case, output = agent_output
    for i, paper in enumerate(output.get("papers", [])):
        has_doi = bool(paper.get("doi"))
        has_url = bool(paper.get("url"))
        assert has_doi or has_url, (
            f"Paper [{i}] ({paper.get('title', '?')!r}) has neither doi nor url"
        )


def test_key_findings_non_empty(agent_output):
    case, output = agent_output
    for i, paper in enumerate(output.get("papers", [])):
        findings = paper.get("key_findings", [])
        assert len(findings) >= 1, (
            f"Paper [{i}] ({paper.get('title', '?')!r}) has no key_findings"
        )


def test_therapeutic_techniques_non_empty(agent_output):
    case, output = agent_output
    for i, paper in enumerate(output.get("papers", [])):
        techniques = paper.get("therapeutic_techniques", [])
        assert len(techniques) >= 1, (
            f"Paper [{i}] ({paper.get('title', '?')!r}) has no therapeutic_techniques"
        )


def test_has_high_quality_evidence(agent_output):
    case, output = agent_output
    high_quality = {"meta-analysis", "systematic_review", "rct"}
    levels = {p.get("evidence_level", "") for p in output.get("papers", [])}
    assert levels & high_quality, (
        f"No high-quality evidence (meta-analysis/systematic_review/rct) found. "
        f"Got levels: {levels}"
    )


def test_top_papers_relevance(agent_output):
    case, output = agent_output
    papers = output.get("papers", [])
    top = papers[:3]
    for i, paper in enumerate(top):
        score = float(paper.get("relevance_score", 0))
        assert score >= 0.7, (
            f"Top paper [{i}] ({paper.get('title', '?')!r}) has low relevance_score {score}"
        )


def test_expected_techniques_present(agent_output):
    case, output = agent_output
    keywords = [kw.lower() for kw in case.get("expected_technique_keywords", [])]
    if not keywords:
        pytest.skip("No expected_technique_keywords defined for this case")

    # Collect all technique text (aggregated + per-paper)
    all_technique_text = " ".join(
        t.get("technique", "").lower()
        for t in output.get("aggregated_techniques", [])
    )
    for paper in output.get("papers", []):
        all_technique_text += " " + " ".join(
            t.lower() for t in paper.get("therapeutic_techniques", [])
        )

    missing = [kw for kw in keywords if kw not in all_technique_text]
    assert not missing, (
        f"Expected technique keywords not found: {missing}. "
        f"Available techniques text (truncated): {all_technique_text[:300]}"
    )


# ---------------------------------------------------------------------------
# LLM-judged tests (GEval)
# ---------------------------------------------------------------------------


def _make_test_case(case: dict, output: dict) -> LLMTestCase:
    return LLMTestCase(
        input=build_input_description(case),
        actual_output=json.dumps(output, indent=2, ensure_ascii=False),
    )


def test_evidence_hierarchy(agent_output):
    case, output = agent_output
    assert_test(_make_test_case(case, output), [evidence_hierarchy_metric])


def test_therapeutic_relevance(agent_output):
    case, output = agent_output
    assert_test(_make_test_case(case, output), [therapeutic_relevance_metric])


def test_technique_specificity(agent_output):
    case, output = agent_output
    assert_test(_make_test_case(case, output), [technique_specificity_metric])


def test_research_coverage(agent_output):
    case, output = agent_output
    assert_test(_make_test_case(case, output), [research_coverage_metric])
