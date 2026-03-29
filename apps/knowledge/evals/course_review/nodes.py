"""Node functions for the course review graph."""

import json
import re

from langchain_core.messages import HumanMessage, SystemMessage

from models import build_fast, build_reasoner
from course_review.prompts import (
    course_aggregator_prompt,
    course_ai_domain_relevance_prompt,
    course_community_health_prompt,
    course_content_depth_prompt,
    course_curriculum_fit_prompt,
    course_instructor_clarity_prompt,
    course_pedagogy_prompt,
    course_practical_application_prompt,
    course_prerequisites_prompt,
    course_technical_accuracy_prompt,
    course_value_proposition_prompt,
)
from course_review.state import CourseReviewState
from retry import with_retry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _course_info(state: CourseReviewState) -> str:
    """Format course metadata as a structured string for expert prompts."""
    free_label = "Free" if state["course_is_free"] else "Paid"
    return (
        f"Title: {state['course_title']}\n"
        f"Provider: {state['course_provider']}\n"
        f"URL: {state['course_url']}\n"
        f"Level: {state['course_level']}\n"
        f"Rating: {state['course_rating']:.1f}/5 ({state['course_review_count']:,} reviews)\n"
        f"Duration: ~{state['course_duration_hours']:.0f}h\n"
        f"Price: {free_label}\n"
        f"Description: {state['course_description'] or 'N/A'}"
    )


def _parse_expert_json(content: str) -> dict:
    """Strip markdown fences if present, then parse JSON."""
    content = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.MULTILINE)
    content = re.sub(r"\s*```$", "", content.strip(), flags=re.MULTILINE)
    return json.loads(content)


# ---------------------------------------------------------------------------
# Fan-out passthrough
# ---------------------------------------------------------------------------

def fan_entry_node(state: CourseReviewState) -> dict:
    """Passthrough node for fan-out to all expert reviewer nodes."""
    return {}


# ---------------------------------------------------------------------------
# Expert nodes (build_reasoner for pedagogy, technical_accuracy,
# ai_domain_relevance; build_fast for all others)
# ---------------------------------------------------------------------------

@with_retry()
def pedagogy_node(state: CourseReviewState) -> dict:
    """Evaluate teaching methodology and instructional design."""
    llm = build_reasoner()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_pedagogy_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"pedagogy_score": _parse_expert_json(response.content)}


@with_retry()
def technical_accuracy_node(state: CourseReviewState) -> dict:
    """Evaluate technical correctness and up-to-date content."""
    llm = build_reasoner()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_technical_accuracy_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"technical_accuracy_score": _parse_expert_json(response.content)}


@with_retry()
def content_depth_node(state: CourseReviewState) -> dict:
    """Evaluate depth and breadth of content coverage."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_content_depth_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"content_depth_score": _parse_expert_json(response.content)}


@with_retry()
def practical_application_node(state: CourseReviewState) -> dict:
    """Evaluate hands-on exercises, projects, and real-world applicability."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_practical_application_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"practical_application_score": _parse_expert_json(response.content)}


@with_retry()
def instructor_clarity_node(state: CourseReviewState) -> dict:
    """Evaluate instructor communication clarity and presentation quality."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_instructor_clarity_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"instructor_clarity_score": _parse_expert_json(response.content)}


@with_retry()
def curriculum_fit_node(state: CourseReviewState) -> dict:
    """Evaluate how well the curriculum fits a structured learning path."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_curriculum_fit_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"curriculum_fit_score": _parse_expert_json(response.content)}


@with_retry()
def prerequisites_node(state: CourseReviewState) -> dict:
    """Evaluate clarity and appropriateness of stated prerequisites."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_prerequisites_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"prerequisites_score": _parse_expert_json(response.content)}


@with_retry()
def ai_domain_relevance_node(state: CourseReviewState) -> dict:
    """Evaluate relevance and alignment with AI/ML domain knowledge."""
    llm = build_reasoner()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_ai_domain_relevance_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"ai_domain_relevance_score": _parse_expert_json(response.content)}


@with_retry()
def community_health_node(state: CourseReviewState) -> dict:
    """Evaluate community engagement, forums, and learner support."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_community_health_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"community_health_score": _parse_expert_json(response.content)}


@with_retry()
def value_proposition_node(state: CourseReviewState) -> dict:
    """Evaluate cost-to-value ratio relative to alternatives."""
    llm = build_fast()
    course_info = _course_info(state)
    messages = [
        SystemMessage(content=course_value_proposition_prompt(course_info)),
        HumanMessage(content=f"Review this course:\n\n{course_info}"),
    ]
    response = llm.invoke(messages)
    return {"value_proposition_score": _parse_expert_json(response.content)}


# ---------------------------------------------------------------------------
# Aggregator node
# ---------------------------------------------------------------------------

@with_retry()
def aggregator_node(state: CourseReviewState) -> dict:
    """Aggregate all expert scores into a final verdict and summary."""
    llm = build_reasoner()
    course_info = _course_info(state)

    def _fmt(key: str) -> str:
        score = state.get(key)
        if not score:
            return f"{key}: N/A"
        return (
            f"{key}:\n"
            f"  Score: {score['score']}/10\n"
            f"  Reasoning: {score['reasoning']}\n"
            f"  Strengths: {', '.join(score['strengths'])}\n"
            f"  Weaknesses: {', '.join(score['weaknesses'])}"
        )

    scores_summary = "\n\n".join([
        _fmt("pedagogy_score"),
        _fmt("technical_accuracy_score"),
        _fmt("content_depth_score"),
        _fmt("practical_application_score"),
        _fmt("instructor_clarity_score"),
        _fmt("curriculum_fit_score"),
        _fmt("prerequisites_score"),
        _fmt("ai_domain_relevance_score"),
        _fmt("community_health_score"),
        _fmt("value_proposition_score"),
    ])

    messages = [
        SystemMessage(content=course_aggregator_prompt(course_info, scores_summary)),
        HumanMessage(content=f"Aggregate these expert scores:\n\n{scores_summary}"),
    ]
    response = llm.invoke(messages)
    result = _parse_expert_json(response.content)
    return {
        "aggregate_score": result["aggregate_score"],
        "verdict": result["verdict"],
        "summary": result["summary"],
        "top_strengths": result["top_strengths"],
        "key_weaknesses": result["key_weaknesses"],
    }
