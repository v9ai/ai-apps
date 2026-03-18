"""Person Research StateGraph.

Flow:
    START → generate_queries → [search_web ×N] → check_urls → fetch_github → synthesize → export → END

Generates search queries via DeepSeek, fans out to DuckDuckGo for parallel
web searches, fetches full page content from top URLs, fetches GitHub profile
data, then synthesizes everything into a structured research profile via DeepSeek.
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    check_urls_node,
    export_node,
    fetch_github_node,
    generate_queries_node,
    route_to_search,
    search_web_node,
    synthesize_node,
)
from .state import PersonResearchState


def build_person_research_graph():
    builder = StateGraph(PersonResearchState)

    builder.add_node("generate_queries", generate_queries_node)
    builder.add_node("search_web", search_web_node)
    builder.add_node("check_urls", check_urls_node)
    builder.add_node("fetch_github", fetch_github_node)
    builder.add_node("synthesize", synthesize_node)
    builder.add_node("export", export_node)

    # START → generate_queries → fan-out to search_web
    builder.add_edge(START, "generate_queries")
    builder.add_conditional_edges(
        "generate_queries",
        route_to_search,
        ["search_web", "fetch_github"],
    )

    # All search_web results converge → check_urls → fetch_github
    builder.add_edge("search_web", "check_urls")
    builder.add_edge("check_urls", "fetch_github")

    # fetch_github → synthesize → export → END
    builder.add_edge("fetch_github", "synthesize")
    builder.add_edge("synthesize", "export")
    builder.add_edge("export", END)

    return builder.compile()
