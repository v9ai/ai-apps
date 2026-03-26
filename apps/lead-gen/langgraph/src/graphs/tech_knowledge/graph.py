"""StateGraph definition for the tech knowledge extraction pipeline."""

from langgraph.graph import END, START, StateGraph

from .state import TechKnowledgeState
from .nodes import (
    extract_technologies_node,
    fetch_source_node,
    generate_content_node,
    organize_hierarchy_node,
    persist_to_knowledge_node,
    route_to_technologies,
)


def build_tech_knowledge_graph():
    builder = StateGraph(TechKnowledgeState)

    builder.add_node("fetch_source", fetch_source_node)
    builder.add_node("extract_technologies", extract_technologies_node)
    builder.add_node("organize_hierarchy", organize_hierarchy_node)
    builder.add_node("generate_content", generate_content_node)
    builder.add_node("persist_to_knowledge", persist_to_knowledge_node)

    builder.add_edge(START, "fetch_source")
    builder.add_edge("fetch_source", "extract_technologies")
    builder.add_edge("extract_technologies", "organize_hierarchy")
    # Fan out — one parallel DeepSeek call per technology
    builder.add_conditional_edges(
        "organize_hierarchy",
        route_to_technologies,
        ["generate_content", "persist_to_knowledge"],
    )
    builder.add_edge("generate_content", "persist_to_knowledge")
    builder.add_edge("persist_to_knowledge", END)

    return builder.compile()
