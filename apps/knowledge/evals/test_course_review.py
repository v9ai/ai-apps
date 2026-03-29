"""Integration tests for the 10-expert course review pipeline."""

import sys
from pathlib import Path
from typing import TypedDict

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from course_review import CourseReviewState, build_course_review_graph

EXPERT_SCORE_FIELDS = [
    "pedagogy_score",
    "technical_accuracy_score",
    "content_depth_score",
    "practical_application_score",
    "instructor_clarity_score",
    "curriculum_fit_score",
    "prerequisites_score",
    "ai_domain_relevance_score",
    "community_health_score",
    "value_proposition_score",
]

VALID_VERDICTS = {"excellent", "recommended", "average", "skip"}

SAMPLE_COURSE = {
    "course_id": "test-001",
    "course_title": "Practical Deep Learning for Coders (fast.ai)",
    "course_url": "https://course.fast.ai",
    "course_provider": "fast.ai",
    "course_description": (
        "A free course on deep learning with PyTorch, covering CNNs, NLP, "
        "tabular data, and diffusion models from a top-down, practical approach."
    ),
    "course_level": "Intermediate",
    "course_rating": 4.8,
    "course_review_count": 12000,
    "course_duration_hours": 20.0,
    "course_is_free": True,
}


@pytest.fixture(scope="module")
def graph():
    return build_course_review_graph()


@pytest.fixture(scope="module")
def review_state(graph) -> CourseReviewState:
    """Run the full course review pipeline once and cache the result."""
    return graph.invoke(SAMPLE_COURSE)


@pytest.mark.slow
def test_graph_runs_without_error(review_state: CourseReviewState):
    """The graph should complete and populate all 10 expert score fields."""
    for field in EXPERT_SCORE_FIELDS:
        assert field in review_state, f"missing field: {field}"
        assert review_state[field] is not None, f"{field} should not be None"


@pytest.mark.slow
def test_all_expert_scores_valid_range(review_state: CourseReviewState):
    """Each expert score should be an integer between 0 and 10 inclusive."""
    for field in EXPERT_SCORE_FIELDS:
        expert = review_state[field]
        score = expert["score"]
        assert 0 <= score <= 10, (
            f"{field} score {score} is outside valid range 0-10"
        )


@pytest.mark.slow
def test_aggregate_score_computed(review_state: CourseReviewState):
    """aggregate_score should be a float between 0 and 10."""
    aggregate = review_state["aggregate_score"]
    assert isinstance(aggregate, float), (
        f"aggregate_score should be float, got {type(aggregate)}"
    )
    assert 0.0 <= aggregate <= 10.0, (
        f"aggregate_score {aggregate} is outside valid range 0-10"
    )


@pytest.mark.slow
def test_verdict_valid(review_state: CourseReviewState):
    """verdict should be one of the four allowed values."""
    verdict = review_state["verdict"]
    assert verdict in VALID_VERDICTS, (
        f"verdict '{verdict}' is not one of {VALID_VERDICTS}"
    )


@pytest.mark.slow
def test_expert_scores_have_reasoning(review_state: CourseReviewState):
    """Each expert score dict should have non-empty reasoning, strengths, and weaknesses."""
    for field in EXPERT_SCORE_FIELDS:
        expert = review_state[field]
        assert expert.get("reasoning"), (
            f"{field} is missing non-empty 'reasoning'"
        )
        assert expert.get("strengths"), (
            f"{field} is missing non-empty 'strengths'"
        )
        assert expert.get("weaknesses"), (
            f"{field} is missing non-empty 'weaknesses'"
        )


@pytest.mark.slow
def test_summary_non_empty(review_state: CourseReviewState):
    """summary should be a non-empty string."""
    summary = review_state.get("summary", "")
    assert isinstance(summary, str) and summary.strip(), (
        "summary should be a non-empty string"
    )


@pytest.mark.slow
def test_strengths_and_weaknesses_lists(review_state: CourseReviewState):
    """top_strengths and key_weaknesses should be non-empty lists."""
    strengths = review_state.get("top_strengths", [])
    weaknesses = review_state.get("key_weaknesses", [])
    assert isinstance(strengths, list) and len(strengths) > 0, (
        "top_strengths should be a non-empty list"
    )
    assert isinstance(weaknesses, list) and len(weaknesses) > 0, (
        "key_weaknesses should be a non-empty list"
    )
