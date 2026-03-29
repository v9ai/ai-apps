"""State for the 10-expert course review pipeline."""
from typing import TypedDict

class ExpertScore(TypedDict):
    score: int        # 0-10
    reasoning: str    # 2-3 sentence explanation
    strengths: list[str]  # 2-3 bullets
    weaknesses: list[str]  # 1-2 bullets

class CourseReviewState(TypedDict):
    # ── Input ────────────────────────────────────────────
    course_id: str
    course_title: str
    course_url: str
    course_provider: str
    course_description: str   # may be empty
    course_level: str         # "Beginner" | "Intermediate" | "Advanced"
    course_rating: float      # e.g. 4.5 (0-5 scale)
    course_review_count: int
    course_duration_hours: float
    course_is_free: bool
    # ── Expert Scores (set by parallel nodes) ────────────
    pedagogy_score: ExpertScore
    technical_accuracy_score: ExpertScore
    content_depth_score: ExpertScore
    practical_application_score: ExpertScore
    instructor_clarity_score: ExpertScore
    curriculum_fit_score: ExpertScore
    prerequisites_score: ExpertScore
    ai_domain_relevance_score: ExpertScore
    community_health_score: ExpertScore
    value_proposition_score: ExpertScore
    # ── Aggregated (set by aggregator_node) ──────────────
    aggregate_score: float    # weighted average 0-10
    verdict: str              # "excellent" | "recommended" | "average" | "skip"
    summary: str              # 2-3 sentence overall summary
    top_strengths: list[str]  # top 3 across all experts
    key_weaknesses: list[str] # top 2 across all experts
