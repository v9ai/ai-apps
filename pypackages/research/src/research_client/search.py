"""Multi-source paper search with fallback — mirrors the Rust fallback chain."""
from __future__ import annotations

import logging
from typing import Optional

from . import crossref, openalex, semantic_scholar
from .types import Paper

logger = logging.getLogger(__name__)


async def search_papers(
    query: str,
    limit: int = 10,
    semantic_scholar_api_key: Optional[str] = None,
    mailto: Optional[str] = None,
) -> list[Paper]:
    """Search papers: OpenAlex -> Crossref -> Semantic Scholar.

    Returns results from the first source that returns non-empty results.
    Matches the fallback chain in research_sources.py and the Rust crate's
    search priority (OpenAlex first for no-rate-limit coverage).
    """
    results = await openalex.search(query, limit, mailto=mailto)
    if results:
        logger.info("OpenAlex returned %d papers", len(results))
        return results

    results = await crossref.search(query, limit, mailto=mailto)
    if results:
        logger.info("Crossref returned %d papers", len(results))
        return results

    results = await semantic_scholar.search(query, limit, api_key=semantic_scholar_api_key)
    logger.info("Semantic Scholar returned %d papers", len(results))
    return results
