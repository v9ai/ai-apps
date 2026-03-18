"""State definitions for the arXiv papers pipeline."""

import operator
from typing import Annotated, TypedDict


class ArxivPaper(TypedDict):
    arxiv_id: str       # e.g. "2603.10031"
    title: str
    abstract: str
    date: str           # YYYY-MM-DD
    authors: list[str]
    categories: list[str]
    pdf_url: str


class ArxivPapersState(TypedDict):
    # Input
    author_query: str           # arXiv author query e.g. "Georgiou, A"
    author_full_name: str       # full name for filtering e.g. "Athos Georgiou"
    person_slug: str            # personality slug e.g. "athos-georgiou"
    category_filter: str        # arXiv category prefix e.g. "cs" (empty = all)
    max_results: int

    # After fetch
    raw_xml: str

    # After parse (all matches)
    all_papers: list[ArxivPaper]

    # After filter (only this author's papers)
    papers: list[ArxivPaper]

    # After export
    exported_count: int
    export_path: str
