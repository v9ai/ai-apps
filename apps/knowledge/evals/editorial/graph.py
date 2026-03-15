"""StateGraph assembly with fan-out, fan-in, and editor revision loop."""

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


def route_editor(state: JournalismState) -> str:
    """Route editor output: approve → END, revise → writer (max 2 rounds)."""
    if state["approved"] or state["revision_rounds"] >= 2:
        return END
    return "writer"


def build_journalism_graph():
    """Build and compile the journalism editorial StateGraph."""
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

    return graph.compile()
