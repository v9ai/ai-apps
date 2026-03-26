"""Ingest Jobs StateGraph — fetch jobs from ATS APIs for stale sources.

Ported from workers/insert-jobs.ts (Cloudflare Worker cron + queue).

Flow:
    START -> fetch_stale_sources -> [conditional: ingest_batch or END]
    ingest_batch -> summarize -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import fetch_stale_sources_node, ingest_batch_node, route_after_fetch, summarize_node
from .state import IngestJobsState


def build_ingest_jobs_graph():
    """Build and compile the ingest-jobs StateGraph."""
    builder = StateGraph(IngestJobsState)

    builder.add_node("fetch_stale_sources", fetch_stale_sources_node)
    builder.add_node("ingest_batch", ingest_batch_node)
    builder.add_node("summarize", summarize_node)

    builder.add_edge(START, "fetch_stale_sources")
    builder.add_conditional_edges(
        "fetch_stale_sources",
        route_after_fetch,
        {"ingest_batch": "ingest_batch", "__end__": END},
    )
    builder.add_edge("ingest_batch", "summarize")
    builder.add_edge("summarize", END)

    return builder.compile()
