"""Cleanup Jobs StateGraph — marks old jobs as stale in batches."""

from langgraph.graph import END, START, StateGraph

from .nodes import batch_cleanup_node, find_stale_jobs_node, route_after_find
from .state import CleanupState


def build_cleanup_graph() -> StateGraph:
    """Build and compile the cleanup jobs graph.

    Flow:
        START -> find_stale_jobs -> [conditional: END or batch_cleanup]
        batch_cleanup -> END
    """
    graph = StateGraph(CleanupState)

    graph.add_node("find_stale_jobs", find_stale_jobs_node)
    graph.add_node("batch_cleanup", batch_cleanup_node)

    graph.add_edge(START, "find_stale_jobs")
    graph.add_conditional_edges(
        "find_stale_jobs",
        route_after_find,
        {"batch_cleanup": "batch_cleanup", "__end__": END},
    )
    graph.add_edge("batch_cleanup", END)

    return graph.compile()
