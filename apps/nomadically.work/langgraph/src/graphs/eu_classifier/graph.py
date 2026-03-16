"""EU Classifier StateGraph.

START -> extract_signals -> heuristic_check
  heuristic_check -> [conditional: persist_and_end OR deepseek_classify]
  deepseek_classify -> persist_and_end -> END
"""

from langgraph.graph import StateGraph, END

from .state import EUClassifierState
from .nodes import (
    extract_signals_node,
    heuristic_check_node,
    deepseek_classify_node,
    route_after_heuristic,
    persist_and_end_node,
)


def build_eu_classifier_graph() -> StateGraph:
    """Build and compile the EU classifier StateGraph."""
    graph = StateGraph(EUClassifierState)

    # Add nodes
    graph.add_node("extract_signals", extract_signals_node)
    graph.add_node("heuristic_check", heuristic_check_node)
    graph.add_node("deepseek_classify", deepseek_classify_node)
    graph.add_node("persist_and_end", persist_and_end_node)

    # Edges
    graph.set_entry_point("extract_signals")
    graph.add_edge("extract_signals", "heuristic_check")
    graph.add_conditional_edges(
        "heuristic_check",
        route_after_heuristic,
        {
            "persist_and_end": "persist_and_end",
            "deepseek_classify": "deepseek_classify",
        },
    )
    graph.add_edge("deepseek_classify", "persist_and_end")
    graph.add_edge("persist_and_end", END)

    return graph.compile()
