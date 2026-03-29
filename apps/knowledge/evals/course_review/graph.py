"""StateGraph assembly with true parallel fan-out (10 experts) and fan-in aggregator."""

import threading

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from course_review.nodes import (
    fan_entry_node,
    pedagogy_node,
    technical_accuracy_node,
    content_depth_node,
    practical_application_node,
    instructor_clarity_node,
    curriculum_fit_node,
    prerequisites_node,
    ai_domain_relevance_node,
    community_health_node,
    value_proposition_node,
    aggregator_node,
)
from course_review.state import CourseReviewState

# Compiled graphs — one stateless (evals/batch), one with checkpointer (production).
_graph = None
_graph_lock = threading.Lock()
_graph_checkpointed = None
_graph_checkpointed_lock = threading.Lock()


def _build_graph() -> StateGraph:
    """Assemble the course review StateGraph (uncompiled).

    Fan-out: fan_entry -> 10 expert nodes in parallel.
    Fan-in:  all 10 experts -> aggregator_node (LangGraph waits for all 10).
    """
    graph = StateGraph(CourseReviewState)

    graph.add_node("fan_entry", fan_entry_node)
    graph.add_node("pedagogy", pedagogy_node)
    graph.add_node("technical_accuracy", technical_accuracy_node)
    graph.add_node("content_depth", content_depth_node)
    graph.add_node("practical_application", practical_application_node)
    graph.add_node("instructor_clarity", instructor_clarity_node)
    graph.add_node("curriculum_fit", curriculum_fit_node)
    graph.add_node("prerequisites", prerequisites_node)
    graph.add_node("ai_domain_relevance", ai_domain_relevance_node)
    graph.add_node("community_health", community_health_node)
    graph.add_node("value_proposition", value_proposition_node)
    graph.add_node("aggregator", aggregator_node)

    graph.add_edge(START, "fan_entry")

    # True parallel fan-out: all 10 experts wait on fan_entry.
    graph.add_edge("fan_entry", "pedagogy")
    graph.add_edge("fan_entry", "technical_accuracy")
    graph.add_edge("fan_entry", "content_depth")
    graph.add_edge("fan_entry", "practical_application")
    graph.add_edge("fan_entry", "instructor_clarity")
    graph.add_edge("fan_entry", "curriculum_fit")
    graph.add_edge("fan_entry", "prerequisites")
    graph.add_edge("fan_entry", "ai_domain_relevance")
    graph.add_edge("fan_entry", "community_health")
    graph.add_edge("fan_entry", "value_proposition")

    # Fan-in: aggregator waits for all 10 experts.
    graph.add_edge("pedagogy", "aggregator")
    graph.add_edge("technical_accuracy", "aggregator")
    graph.add_edge("content_depth", "aggregator")
    graph.add_edge("practical_application", "aggregator")
    graph.add_edge("instructor_clarity", "aggregator")
    graph.add_edge("curriculum_fit", "aggregator")
    graph.add_edge("prerequisites", "aggregator")
    graph.add_edge("ai_domain_relevance", "aggregator")
    graph.add_edge("community_health", "aggregator")
    graph.add_edge("value_proposition", "aggregator")

    graph.add_edge("aggregator", END)

    return graph


def build_course_review_graph():
    """Return the cached stateless course review graph (for evals/batch)."""
    global _graph
    if _graph is None:
        with _graph_lock:
            if _graph is None:
                _graph = _build_graph().compile()
    return _graph


def build_course_review_graph_with_memory():
    """Return the cached course review graph with MemorySaver checkpointing.

    Pass a thread_id in the config to track review history:
        graph.invoke(state, config={"configurable": {"thread_id": "course-abc123"}})
    """
    global _graph_checkpointed
    if _graph_checkpointed is None:
        with _graph_checkpointed_lock:
            if _graph_checkpointed is None:
                _graph_checkpointed = _build_graph().compile(
                    checkpointer=MemorySaver(),
                )
    return _graph_checkpointed
