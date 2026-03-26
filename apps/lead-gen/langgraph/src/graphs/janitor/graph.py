"""Janitor StateGraph — sync ATS boards, purge spam, cleanup dead sources.

Ported from workers/janitor.ts (Cloudflare Worker cron).

Flow:
    START -> sync_boards -> purge_spam -> cleanup_dead -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import sync_boards_node, purge_spam_node, cleanup_dead_node
from .state import JanitorState


def build_janitor_graph():
    """Build and compile the janitor StateGraph."""
    builder = StateGraph(JanitorState)

    builder.add_node("sync_boards", sync_boards_node)
    builder.add_node("purge_spam", purge_spam_node)
    builder.add_node("cleanup_dead", cleanup_dead_node)

    builder.add_edge(START, "sync_boards")
    builder.add_edge("sync_boards", "purge_spam")
    builder.add_edge("purge_spam", "cleanup_dead")
    builder.add_edge("cleanup_dead", END)

    return builder.compile()
