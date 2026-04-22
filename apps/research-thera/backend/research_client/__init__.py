"""research-client — academic paper search, normalization, embeddings, and reranking.

Python mirror of crates/research/ — shared across all Python apps in the monorepo.
"""
from .types import Paper
from .search import search_papers
from . import openalex, crossref, semantic_scholar

__all__ = [
    "Paper",
    "search_papers",
    "openalex",
    "crossref",
    "semantic_scholar",
]
