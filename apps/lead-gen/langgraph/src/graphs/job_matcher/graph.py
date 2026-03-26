"""Job matcher LangGraph StateGraph.

Linear pipeline:
  START -> fetch_candidates -> score_titles_llm -> compute_composite -> rank_and_return -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    compute_composite_node,
    fetch_candidates_node,
    rank_and_return_node,
    score_titles_llm_node,
)
from .state import JobMatcherState


def build_job_matcher_graph() -> StateGraph:
    """Build and compile the job matcher graph."""
    graph = StateGraph(JobMatcherState)

    graph.add_node("fetch_candidates", fetch_candidates_node)
    graph.add_node("score_titles_llm", score_titles_llm_node)
    graph.add_node("compute_composite", compute_composite_node)
    graph.add_node("rank_and_return", rank_and_return_node)

    graph.add_edge(START, "fetch_candidates")
    graph.add_edge("fetch_candidates", "score_titles_llm")
    graph.add_edge("score_titles_llm", "compute_composite")
    graph.add_edge("compute_composite", "rank_and_return")
    graph.add_edge("rank_and_return", END)

    return graph.compile()
