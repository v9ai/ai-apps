"""arXiv Papers StateGraph.

Flow:
    START → fetch_arxiv → parse_entries → filter_author → export_papers → END

Fetches papers from the arXiv API for a given author query, parses the
Atom feed, filters to the exact author by full name, and writes results
to personalities.ts + a JSON sidecar file.
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    export_papers_node,
    fetch_arxiv_node,
    filter_author_node,
    parse_entries_node,
)
from .state import ArxivPapersState


def build_arxiv_papers_graph():
    builder = StateGraph(ArxivPapersState)

    builder.add_node("fetch_arxiv", fetch_arxiv_node)
    builder.add_node("parse_entries", parse_entries_node)
    builder.add_node("filter_author", filter_author_node)
    builder.add_node("export_papers", export_papers_node)

    builder.add_edge(START, "fetch_arxiv")
    builder.add_edge("fetch_arxiv", "parse_entries")
    builder.add_edge("parse_entries", "filter_author")
    builder.add_edge("filter_author", "export_papers")
    builder.add_edge("export_papers", END)

    return builder.compile()
