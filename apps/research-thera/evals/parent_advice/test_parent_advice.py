"""DeepEval tests for parent advice — research grounding, age consistency,
technique traceability, deep analysis integration, and practical quality.

Deterministic tests validate structural properties of the advice.
LLM-judged tests (GEval) evaluate semantic quality via DeepSeek-chat.
"""

import json
import re

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    age_appropriateness_metric,
    deep_analysis_integration_metric,
    practical_quality_metric,
    research_grounding_metric,
    technique_traceability_metric,
)
from generator import build_input_description


def _make_test_case(case: dict, output: dict) -> LLMTestCase:
    advice_text = output.get("advice", "")
    return LLMTestCase(
        input=build_input_description(case),
        actual_output=advice_text,
    )


# ---------------------------------------------------------------------------
# LLM-judged: research grounding
# ---------------------------------------------------------------------------


def test_research_grounding(advice_output):
    """Advice must be grounded in the provided research papers."""
    case, output = advice_output
    assert_test(_make_test_case(case, output), [research_grounding_metric])


def test_technique_traceability(advice_output):
    """Every technique in the advice must trace to a research paper."""
    case, output = advice_output
    assert_test(_make_test_case(case, output), [technique_traceability_metric])


# ---------------------------------------------------------------------------
# LLM-judged: deep analysis integration
# ---------------------------------------------------------------------------


def test_deep_analysis_integration(advice_output):
    """When deep analysis is provided, advice must incorporate its findings."""
    case, output = advice_output
    if not case.get("deep_analysis"):
        pytest.skip("No deep analysis for this case")
    assert_test(_make_test_case(case, output), [deep_analysis_integration_metric])


# ---------------------------------------------------------------------------
# LLM-judged: age appropriateness
# ---------------------------------------------------------------------------


def test_age_appropriateness(advice_output):
    """Advice must be appropriate for the child's actual age."""
    case, output = advice_output
    assert_test(_make_test_case(case, output), [age_appropriateness_metric])


# ---------------------------------------------------------------------------
# LLM-judged: practical quality
# ---------------------------------------------------------------------------


def test_practical_quality(advice_output):
    """Advice must be practical, actionable, and well-structured."""
    case, output = advice_output
    assert_test(_make_test_case(case, output), [practical_quality_metric])


# ---------------------------------------------------------------------------
# Deterministic: advice exists and has content
# ---------------------------------------------------------------------------


def test_advice_field_exists(advice_output):
    """Output must contain an 'advice' field with text."""
    _, output = advice_output
    advice = output.get("advice", "")
    assert isinstance(advice, str), f"advice should be str, got {type(advice).__name__}"
    assert len(advice) >= 100, f"Advice too short ({len(advice)} chars)"


def test_advice_word_count(advice_output):
    """Advice should be 400-2000 words (target 800-1500 with some margin)."""
    _, output = advice_output
    advice = output.get("advice", "")
    word_count = len(advice.split())
    assert word_count >= 400, f"Advice too short: {word_count} words (need ≥400)"
    assert word_count <= 2000, f"Advice too long: {word_count} words (need ≤2000)"


# ---------------------------------------------------------------------------
# Deterministic: research paper references
# ---------------------------------------------------------------------------


def test_advice_references_paper_authors(advice_output):
    """Advice must reference at least one author surname from the research papers."""
    case, output = advice_output
    advice = (output.get("advice") or "").lower()
    expected_refs = case.get("expected_paper_refs", [])
    if not expected_refs:
        pytest.skip("No expected_paper_refs defined")

    found = [ref for ref in expected_refs if ref.lower() in advice]
    assert found, (
        f"None of the expected paper references {expected_refs} found in advice. "
        f"Advice excerpt: {advice[:300]}"
    )


def test_advice_references_majority_of_papers(advice_output):
    """Advice should reference a majority of provided paper authors."""
    case, output = advice_output
    advice = (output.get("advice") or "").lower()
    expected_refs = case.get("expected_paper_refs", [])
    if not expected_refs:
        pytest.skip("No expected_paper_refs defined")

    found = [ref for ref in expected_refs if ref.lower() in advice]
    ratio = len(found) / len(expected_refs)
    assert ratio >= 0.5, (
        f"Only {len(found)}/{len(expected_refs)} paper authors referenced: "
        f"found={found}, missing={[r for r in expected_refs if r.lower() not in advice]}"
    )


# ---------------------------------------------------------------------------
# Deterministic: technique keywords from research
# ---------------------------------------------------------------------------


def test_advice_contains_expected_techniques(advice_output):
    """Advice must mention at least half the expected therapeutic techniques."""
    case, output = advice_output
    advice = (output.get("advice") or "").lower()
    expected = case.get("expected_technique_keywords", [])
    if not expected:
        pytest.skip("No expected_technique_keywords defined")

    found = [kw for kw in expected if kw.lower() in advice]
    ratio = len(found) / len(expected)
    assert ratio >= 0.5, (
        f"Only {len(found)}/{len(expected)} expected techniques found: "
        f"found={found}, missing={[k for k in expected if k.lower() not in advice]}"
    )


def test_advice_no_hallucinated_techniques(advice_output):
    """Advice must not contain well-known techniques that are NOT in the research papers."""
    case, output = advice_output
    advice = (output.get("advice") or "").lower()

    # Collect all techniques from the provided research
    all_techniques = set()
    for paper in case["research_papers"]:
        for t in paper["therapeutic_techniques"]:
            all_techniques.add(t.lower())

    # Well-known techniques that would be hallucinated if not in the papers
    # Use word-boundary regex to avoid false positives (e.g. "ect" in "expect")
    import re as _re
    hallucination_candidates = [
        ("emdr", r"\bemdr\b"),
        ("eye movement desensitization", r"eye movement desensitization"),
        ("dialectical behavior therapy", r"dialectical behavio"),
        ("dbt", r"\bdbt\b"),
        ("electroconvulsive therapy", r"electroconvulsive"),
        ("hypnotherapy", r"hypnotherapy"),
        ("biofeedback", r"\bbiofeedback\b"),
        ("art therapy", r"\bart therapy\b"),
        ("music therapy", r"\bmusic therapy\b"),
        ("applied behavior analysis", r"applied behavio.+ analysis"),
        ("aba", r"\baba\b"),
    ]

    # Only flag if the technique is NOT in the provided research
    hallucinated = [
        name for name, pattern in hallucination_candidates
        if _re.search(pattern, advice, _re.IGNORECASE) and not any(name in tech for tech in all_techniques)
    ]
    assert not hallucinated, (
        f"Advice contains techniques not in the provided research: {hallucinated}"
    )


# ---------------------------------------------------------------------------
# Deterministic: age-appropriate language
# ---------------------------------------------------------------------------


def test_advice_no_wrong_age_interventions(advice_output):
    """Advice must not suggest interventions for the wrong age group."""
    case, output = advice_output
    advice = (output.get("advice") or "").lower()
    age = case["child_age"]

    if age <= 5:
        wrong_age = ["cbt worksheet", "journaling exercise", "self-monitoring diary", "thought record"]
        found = [t for t in wrong_age if t in advice]
        assert not found, f"Age {age}: advice suggests interventions for older children: {found}"

    if age >= 12:
        wrong_age = ["tummy time", "baby sign language", "infant massage", "peek-a-boo"]
        found = [t for t in wrong_age if t in advice]
        assert not found, f"Age {age}: advice suggests infant interventions: {found}"


def test_advice_mentions_child_name(advice_output):
    """Advice should reference the child by name."""
    case, output = advice_output
    advice = output.get("advice", "")
    name = case["child_name"]
    assert name.lower() in advice.lower(), (
        f"Advice does not mention child name '{name}'"
    )


def test_advice_mentions_correct_age(advice_output):
    """Advice should mention the child's correct age."""
    case, output = advice_output
    advice = output.get("advice", "")
    age = case["child_age"]

    age_patterns = [
        rf"\b{age}\s*[-‐]?\s*year",
        rf"\bage[d]?\s*{age}\b",
        rf"\b{age}\s*ani\b",
    ]
    # For toddlers, also accept months (e.g. "24-month-old" for age 2)
    if age <= 3:
        months = age * 12
        age_patterns.append(rf"\b{months}\s*[-‐]?\s*month")
    found = any(re.search(p, advice, re.IGNORECASE) for p in age_patterns)
    assert found, (
        f"Advice does not mention age {age}. Excerpt: {advice[:300]}"
    )


# ---------------------------------------------------------------------------
# Deterministic: deep analysis integration (when present)
# ---------------------------------------------------------------------------


def test_advice_reflects_deep_analysis_recommendations(advice_output):
    """When deep analysis has priority recommendations, advice should address them."""
    case, output = advice_output
    da = case.get("deep_analysis")
    if not da:
        pytest.skip("No deep analysis for this case")

    advice = (output.get("advice") or "").lower()
    recs = da.get("priority_recommendations", [])
    if not recs:
        pytest.skip("No priority recommendations in deep analysis")

    # The top recommendation's approach keywords should appear in the advice
    top_rec = recs[0]
    approach_words = [w.lower() for w in top_rec["approach"].split() if len(w) > 4][:5]
    found = [w for w in approach_words if w in advice]
    assert len(found) >= 2, (
        f"Top deep analysis recommendation approach not reflected in advice. "
        f"Approach: '{top_rec['approach']}', words checked: {approach_words}, found: {found}"
    )


def test_advice_reflects_pattern_root_causes(advice_output):
    """When deep analysis has pattern clusters with root causes, advice should address them."""
    case, output = advice_output
    da = case.get("deep_analysis")
    if not da:
        pytest.skip("No deep analysis for this case")

    advice = (output.get("advice") or "").lower()
    clusters = da.get("pattern_clusters", [])
    root_causes = [c.get("root_cause", "") for c in clusters if c.get("root_cause")]
    if not root_causes:
        pytest.skip("No root causes in deep analysis")

    # At least one root cause concept should appear in the advice
    found_any = False
    for rc in root_causes:
        rc_words = [w.lower() for w in rc.split() if len(w) > 4][:4]
        if sum(1 for w in rc_words if w in advice) >= 2:
            found_any = True
            break

    assert found_any, (
        f"Root causes from deep analysis not reflected in advice. Root causes: {root_causes}"
    )
