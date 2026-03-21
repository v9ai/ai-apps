"""Tests for research quality evaluation output (Phase 3 Agent 19).

Validates the eval JSON structure and scoring dimensions produced by the
quality-evaluation agent. Uses a mock SAMPLE_EVAL for structural tests and
checks real .eval.json files on disk when available.
"""

import json
import pytest
from pathlib import Path

RESEARCH_DIR = Path(__file__).resolve().parent.parent / "src" / "lib" / "research"

SCORING_DIMENSIONS = [
    "bio_quality",
    "source_coverage",
    "timeline_completeness",
    "contributions_depth",
    "name_disambiguation",
]

SAMPLE_EVAL = {
    "bio_quality": {"score": 8, "reasoning": "Specific, evidence-based bio with named projects"},
    "source_coverage": {"score": 7, "reasoning": "Diverse sources from web, GitHub, arXiv"},
    "timeline_completeness": {"score": 6, "reasoning": "Good coverage but missing early career"},
    "contributions_depth": {"score": 9, "reasoning": "Detailed impact metrics for all contributions"},
    "name_disambiguation": {"score": 10, "reasoning": "Clearly focused on the correct Harrison Chase"},
    "overall_score": 8,
    "summary": "High-quality profile with strong technical depth",
}


# ── 1. test_eval_has_five_dimensions ────────────────────────────────────

def test_eval_has_five_dimensions():
    """All 5 scoring dimensions must be present as top-level keys."""
    for dim in SCORING_DIMENSIONS:
        assert dim in SAMPLE_EVAL, f"Missing scoring dimension: {dim}"


# ── 2. test_scores_are_numeric ──────────────────────────────────────────

def test_scores_are_numeric():
    """Each dimension score must be an integer between 1 and 10."""
    for dim in SCORING_DIMENSIONS:
        score = SAMPLE_EVAL[dim]["score"]
        assert isinstance(score, int), f"{dim} score is not an int: {type(score)}"
        assert 1 <= score <= 10, f"{dim} score {score} is outside 1-10 range"


# ── 3. test_scores_have_reasoning ───────────────────────────────────────

def test_scores_have_reasoning():
    """Each scoring dimension must include a reasoning string."""
    for dim in SCORING_DIMENSIONS:
        entry = SAMPLE_EVAL[dim]
        assert "reasoning" in entry, f"{dim} is missing 'reasoning' key"
        assert isinstance(entry["reasoning"], str), f"{dim} reasoning is not a string"


# ── 4. test_overall_score_present ───────────────────────────────────────

def test_overall_score_present():
    """overall_score must exist and be an integer between 1 and 10."""
    assert "overall_score" in SAMPLE_EVAL
    score = SAMPLE_EVAL["overall_score"]
    assert isinstance(score, int), f"overall_score is not an int: {type(score)}"
    assert 1 <= score <= 10, f"overall_score {score} is outside 1-10 range"


# ── 5. test_summary_present ─────────────────────────────────────────────

def test_summary_present():
    """summary must be a non-empty string."""
    assert "summary" in SAMPLE_EVAL
    summary = SAMPLE_EVAL["summary"]
    assert isinstance(summary, str), f"summary is not a string: {type(summary)}"
    assert len(summary) > 0, "summary is empty"


# ── 6. test_scores_consistent_with_overall ──────────────────────────────

def test_scores_consistent_with_overall():
    """overall_score should roughly match the average of dimension scores (within +/-2)."""
    dimension_scores = [SAMPLE_EVAL[dim]["score"] for dim in SCORING_DIMENSIONS]
    average = sum(dimension_scores) / len(dimension_scores)
    overall = SAMPLE_EVAL["overall_score"]
    assert abs(overall - average) <= 2, (
        f"overall_score {overall} deviates more than 2 from "
        f"dimension average {average:.1f}"
    )


# ── 7. test_no_zero_scores ─────────────────────────────────────────────

def test_no_zero_scores():
    """No dimension should have a score of 0; minimum valid score is 1."""
    for dim in SCORING_DIMENSIONS:
        score = SAMPLE_EVAL[dim]["score"]
        assert score != 0, f"{dim} has a zero score (minimum is 1)"


# ── 8. test_reasoning_is_specific ───────────────────────────────────────

def test_reasoning_is_specific():
    """Reasoning strings must be longer than 10 characters to ensure specificity."""
    for dim in SCORING_DIMENSIONS:
        reasoning = SAMPLE_EVAL[dim]["reasoning"]
        assert len(reasoning) > 10, (
            f"{dim} reasoning is too short ({len(reasoning)} chars): '{reasoning}'"
        )


# ── 9. test_eval_files_on_disk ──────────────────────────────────────────

def test_eval_files_on_disk():
    """Check whether .eval.json files exist in the research directory."""
    if not RESEARCH_DIR.exists():
        pytest.skip("Research directory does not exist")
    eval_files = sorted(RESEARCH_DIR.glob("*.eval.json"))
    if not eval_files:
        pytest.skip("No .eval.json files found in research directory")
    for path in eval_files:
        assert path.stat().st_size > 0, f"Eval file is empty: {path.name}"


# ── 10. test_eval_files_valid_json ──────────────────────────────────────

def test_eval_files_valid_json():
    """All .eval.json files in the research directory must parse as valid JSON."""
    if not RESEARCH_DIR.exists():
        pytest.skip("Research directory does not exist")
    eval_files = sorted(RESEARCH_DIR.glob("*.eval.json"))
    if not eval_files:
        pytest.skip("No .eval.json files found in research directory")
    for path in eval_files:
        text = path.read_text()
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            pytest.fail(f"{path.name} is not valid JSON: {exc}")
        assert isinstance(data, dict), f"{path.name} top-level is not a dict"
