"""Build the discovery pipeline LangGraph."""

from langgraph.graph import END, START, StateGraph

from .models import DiscoveryState
from .nodes import (
    deduplicate_node,
    generate_queries_node,
    persist_node,
    research_and_classify_node,
    route_to_research,
    route_to_search,
    search_web_node,
)


def build_discovery_graph():
    builder = StateGraph(DiscoveryState)

    builder.add_node("generate_queries", generate_queries_node)
    builder.add_node("search_web", search_web_node)
    builder.add_node("deduplicate", deduplicate_node)
    builder.add_node("research_and_classify", research_and_classify_node)
    builder.add_node("persist", persist_node)

    # START → generate_queries → (Send) search_web → deduplicate
    builder.add_edge(START, "generate_queries")
    builder.add_conditional_edges(
        "generate_queries",
        route_to_search,
        ["search_web", "deduplicate"],
    )
    builder.add_edge("search_web", "deduplicate")

    # deduplicate → (Send) research_and_classify → persist → END
    builder.add_conditional_edges(
        "deduplicate",
        route_to_research,
        ["research_and_classify", "persist"],
    )
    builder.add_edge("research_and_classify", "persist")
    builder.add_edge("persist", END)

    return builder.compile()
