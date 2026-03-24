"""LangGraph content generation pipeline for knowledge articles.

Uses deepseek-client from pypackages/deepseek for LLM calls.
Graph: research -> outline -> draft -> review -> quality_check -> save
                                 ^                    |
                                 └── (revise) ────────┘
"""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END

from graph.nodes import (
    research,
    outline,
    draft,
    review,
    quality_check,
    route_after_quality,
    revise,
    save,
)
from graph.state import ContentState

# Re-exports for backward compatibility with cli.py and tests
from graph.state import (  # noqa: F401
    CONTENT_DIR,
    MAX_REVISIONS,
    get_lesson_slugs,
    get_categories,
    get_category,
    get_related_topics,
    get_existing_articles,
    get_missing_slugs,
    get_style_sample,
    check_article_quality,
)
from graph.client import get_client, close_client, ConfigError, GenerationError  # noqa: F401


# ── Graph ─────────────────────────────────────────────────────────────

def _add_core_nodes(graph: StateGraph) -> None:
    graph.add_node("research", research)
    graph.add_node("outline", outline)
    graph.add_node("draft", draft)
    graph.add_node("review", review)
    graph.add_node("quality_check", quality_check)
    graph.add_node("revise", revise)

    graph.add_edge(START, "research")
    graph.add_edge("research", "outline")
    graph.add_edge("outline", "draft")
    graph.add_edge("draft", "review")
    graph.add_edge("review", "quality_check")
    graph.add_edge("revise", "quality_check")


def build_graph(checkpointer=None):
    """Build the full content generation graph (with save).

    Args:
        checkpointer: Optional LangGraph checkpointer for pause/resume.
                      Pass MemorySaver() for in-memory checkpointing.
    """
    graph = StateGraph(ContentState)
    _add_core_nodes(graph)
    graph.add_node("save", save)
    graph.add_conditional_edges("quality_check", route_after_quality, {
        "save": "save",
        "revise": "revise",
    })
    graph.add_edge("save", END)
    return graph.compile(checkpointer=checkpointer)


def build_dry_graph():
    """Build graph without save node (for --dry-run)."""
    graph = StateGraph(ContentState)
    _add_core_nodes(graph)
    graph.add_conditional_edges("quality_check", route_after_quality, {
        "save": END,
        "revise": "revise",
    })
    return graph.compile()
