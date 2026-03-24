"""StateGraph assembly with fan-out, fan-in, and editor revision loop."""

import threading

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from editorial.nodes import (
    editor_node,
    intro_strategist_node,
    research_entry_node,
    researcher_node,
    seo_node,
    writer_node,
)
from editorial.state import JournalismState

# Compiled graphs — one stateless (evals), one with checkpointer (production).
_graph = None
_graph_lock = threading.Lock()
_graph_checkpointed = None
_graph_checkpointed_lock = threading.Lock()


def route_editor(state: JournalismState) -> str:
    """Route editor output: approve -> END, revise -> writer (max 2 rounds)."""
    if state["approved"] or state["revision_rounds"] >= 2:
        return END
    return "writer"


def _build_graph() -> StateGraph:
    """Assemble the journalism editorial StateGraph (uncompiled)."""
    graph = StateGraph(JournalismState)

    graph.add_node("research_entry", research_entry_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("seo", seo_node)
    graph.add_node("intro_strategist", intro_strategist_node)
    graph.add_node("writer", writer_node)
    graph.add_node("editor", editor_node)

    graph.add_edge(START, "research_entry")
    graph.add_edge("research_entry", "researcher")        # parallel fan-out
    graph.add_edge("research_entry", "seo")              # parallel fan-out
    graph.add_edge("research_entry", "intro_strategist") # parallel fan-out
    graph.add_edge("researcher", "writer")                # fan-in (waits for all 3)
    graph.add_edge("seo", "writer")                       # fan-in
    graph.add_edge("intro_strategist", "writer")          # fan-in
    graph.add_edge("writer", "editor")
    graph.add_conditional_edges(
        "editor",
        route_editor,
        {"writer": "writer", END: END},
    )

    return graph


def build_journalism_graph():
    """Return the cached stateless journalism graph (for evals)."""
    global _graph
    if _graph is None:
        with _graph_lock:
            if _graph is None:
                _graph = _build_graph().compile()
    return _graph


def build_journalism_graph_with_memory():
    """Return the cached journalism graph with MemorySaver checkpointing.

    Pass a thread_id in the config to track revision history:
        graph.invoke(state, config={"configurable": {"thread_id": "article-123"}})
    """
    global _graph_checkpointed
    if _graph_checkpointed is None:
        with _graph_checkpointed_lock:
            if _graph_checkpointed is None:
                _graph_checkpointed = _build_graph().compile(
                    checkpointer=MemorySaver(),
                )
    return _graph_checkpointed
