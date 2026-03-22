"""DeepEval tests for DOB/age consistency in deep issue analysis.

Deterministic tests validate that age and DOB fields are correct.
LLM-judged tests (GEval) evaluate age-appropriateness of analysis content.
"""

import json
import re

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    dob_developmental_context_metric,
    dob_recommendations_age_metric,
    dob_summary_consistency_metric,
)
from generator import build_input_description


def _make_test_case(case: dict, output: dict) -> LLMTestCase:
    return LLMTestCase(
        input=build_input_description(case),
        actual_output=json.dumps(output, indent=2, ensure_ascii=False),
    )


# ---------------------------------------------------------------------------
# LLM-judged: DOB consistency
# ---------------------------------------------------------------------------


def test_dob_summary_consistency(analysis_output):
    """Summary must correctly reference the child's age and developmental stage."""
    case, output = analysis_output
    assert_test(_make_test_case(case, output), [dob_summary_consistency_metric])


def test_dob_recommendations_age_appropriate(analysis_output):
    """Recommendations must be appropriate for the child's actual age."""
    case, output = analysis_output
    assert_test(_make_test_case(case, output), [dob_recommendations_age_metric])


def test_dob_developmental_context_accurate(analysis_output):
    """Developmental context section must match the input age and DOB year."""
    case, output = analysis_output
    assert_test(_make_test_case(case, output), [dob_developmental_context_metric])


# ---------------------------------------------------------------------------
# Deterministic: DOB field validation
# ---------------------------------------------------------------------------

# Age-to-tier mapping
_AGE_TIER_MAP = {
    (0, 2): {"infant", "toddler", "infant_toddler", "early_development", "infancy", "early_childhood"},
    (3, 5): {"early_childhood", "preschool", "pre_school", "pre-school"},
    (6, 11): {"school_age", "school-age", "middle_childhood", "elementary", "school_aged"},
    (12, 17): {"adolescent", "adolescence", "teen", "teenager", "young_adolescent", "mid-adolescence", "mid_adolescence", "early_adolescence", "late_adolescence"},
    (18, 25): {"young_adult", "young-adult", "emerging_adult"},
    (26, 120): {"adult", "mature_adult"},
}


def _expected_tiers_for_age(age: int) -> set[str]:
    for (low, high), tiers in _AGE_TIER_MAP.items():
        if low <= age <= high:
            return tiers
    return set()


def test_developmental_context_exists(analysis_output):
    """Output must include a developmentalContext section."""
    _, output = analysis_output
    ctx = output.get("developmentalContext")
    assert ctx, "Missing developmentalContext in analysis output"


def test_stated_age_matches_input(analysis_output):
    """The statedAge in developmentalContext must match the input age."""
    case, output = analysis_output
    ctx = output.get("developmentalContext", {})
    stated_age = ctx.get("statedAge")
    if stated_age is None:
        pytest.skip("No statedAge field in developmentalContext")

    expected_age = case["family_member_age"]
    assert int(stated_age) == expected_age, (
        f"statedAge is {stated_age}, expected {expected_age}"
    )


def test_dob_year_matches_input(analysis_output):
    """The dobYear in developmentalContext must match the input DOB year."""
    case, output = analysis_output
    ctx = output.get("developmentalContext", {})
    dob_year = ctx.get("dobYear")
    if dob_year is None:
        pytest.skip("No dobYear field in developmentalContext")

    expected_year = case["date_of_birth_year"]
    assert int(dob_year) == expected_year, (
        f"dobYear is {dob_year}, expected {expected_year}"
    )


def test_developmental_stage_matches_age(analysis_output):
    """The developmentalStage must be appropriate for the stated age."""
    case, output = analysis_output
    ctx = output.get("developmentalContext", {})
    stage = (ctx.get("developmentalStage") or "").lower().strip().replace(" ", "_")
    if not stage:
        pytest.skip("No developmentalStage in developmentalContext")

    # Strip parenthetical annotations e.g. "toddler_(early_childhood)" → "toddler"
    stage = re.sub(r"_?\(.*\)", "", stage).strip("_")

    age = case["family_member_age"]
    expected = _expected_tiers_for_age(age)
    # Also check if any expected tier is a prefix of the stage
    exact = stage in expected
    prefix = any(stage.startswith(t) for t in expected)
    assert exact or prefix, (
        f"Age {age} expects stage in {sorted(expected)}, got '{stage}'"
    )


def test_summary_mentions_correct_age(analysis_output):
    """The summary must mention the correct age somewhere."""
    case, output = analysis_output
    summary = output.get("summary", "")
    age = case["family_member_age"]
    name = case["family_member_name"]

    # Check for age mention (e.g. "4 years old", "4-year-old", "age 4", "aged 4")
    age_patterns = [
        rf"\b{age}\s*[-‐]?\s*year",
        rf"\bage[d]?\s*{age}\b",
        rf"\b{age}\s*ani\b",  # Romanian: "4 ani"
    ]
    found = any(re.search(p, summary, re.IGNORECASE) for p in age_patterns)

    assert found, (
        f"Summary for {name} (age {age}) does not mention the correct age. "
        f"Summary excerpt: {summary[:300]}"
    )


def test_summary_no_wrong_age_group(analysis_output):
    """Summary must not describe the child using a contradictory age group label."""
    case, output = analysis_output
    summary = (output.get("summary") or "").lower()
    age = case["family_member_age"]

    # Define contradictory terms per age range
    if age <= 5:
        # Toddler/preschooler should not be called adolescent/teen/school-age
        contradictory = ["adolescent", "teenager", "teen-age", "middle school", "high school"]
    elif age <= 11:
        # School-age should not be called toddler/infant or adolescent
        contradictory = ["toddler", "infant", "baby", "adolescent", "teenager", "high school"]
    elif age <= 17:
        # Adolescent should not be called toddler/infant/preschool
        contradictory = ["toddler", "infant", "baby", "preschool", "pre-school", "daycare"]
    else:
        contradictory = ["toddler", "infant", "baby", "preschool"]

    found = [t for t in contradictory if t in summary]
    assert not found, (
        f"Age {age}: summary contains contradictory age-group terms: {found}"
    )


def test_recommendations_exist(analysis_output):
    """Must have at least one priority recommendation."""
    _, output = analysis_output
    recs = output.get("priorityRecommendations", [])
    assert len(recs) >= 1, "No priorityRecommendations in output"


def test_recommendations_no_age_mismatch_keywords(analysis_output):
    """Recommendations must not suggest interventions clearly for the wrong age group."""
    case, output = analysis_output
    age = case["family_member_age"]
    recs = output.get("priorityRecommendations", [])
    all_approaches = " ".join(
        (r.get("suggestedApproach") or "") for r in recs
    ).lower()

    if age <= 5:
        # Toddlers/preschoolers should not get CBT, journaling, etc.
        wrong_age = ["cognitive behavioral therapy", "cbt", "journaling", "self-monitoring diary"]
        found = [t for t in wrong_age if t in all_approaches]
        assert not found, (
            f"Age {age}: recommendations contain interventions for older children: {found}"
        )

    if age >= 12:
        # Teens should not get infant-focused interventions
        wrong_age = ["tummy time", "baby sign language", "infant massage"]
        found = [t for t in wrong_age if t in all_approaches]
        assert not found, (
            f"Age {age}: recommendations contain infant-focused interventions: {found}"
        )
