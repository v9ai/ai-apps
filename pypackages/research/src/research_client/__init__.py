"""research-client — academic paper search, normalization, embeddings, and reranking.

Python mirror of crates/research/ — shared across all Python apps in the monorepo.
"""
from .types import Paper
from .search import search_papers, search_papers_all, ALL_SOURCES
from . import arxiv, biorxiv, crossref, europe_pmc, openalex, pubmed, semantic_scholar

__all__ = [
    "Paper",
    "search_papers",
    "search_papers_all",
    "ALL_SOURCES",
    "arxiv",
    "biorxiv",
    "crossref",
    "europe_pmc",
    "openalex",
    "pubmed",
    "semantic_scholar",
]
