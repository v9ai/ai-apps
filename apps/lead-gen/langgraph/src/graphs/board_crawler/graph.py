"""Board Crawler StateGraph — discover ATS boards from Common Crawl.

Ported from workers/ashby-crawler (Rust/WASM).

Flow:
    START -> detect_index -> crawl_pages -> deduplicate -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import crawl_pages_node, deduplicate_node, detect_index_node
from .state import BoardCrawlerState


def build_board_crawler_graph():
    """Build and compile the board crawler StateGraph."""
    builder = StateGraph(BoardCrawlerState)

    builder.add_node("detect_index", detect_index_node)
    builder.add_node("crawl_pages", crawl_pages_node)
    builder.add_node("deduplicate", deduplicate_node)

    builder.add_edge(START, "detect_index")
    builder.add_edge("detect_index", "crawl_pages")
    builder.add_edge("crawl_pages", "deduplicate")
    builder.add_edge("deduplicate", END)

    return builder.compile()
