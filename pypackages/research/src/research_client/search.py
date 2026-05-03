"""Multi-source paper search.

Two entry points:

- ``search_papers``: original *fallback* chain — first non-empty source wins.
  Preserved for backwards compatibility with ``research_sources.py``.
- ``search_papers_all``: *union* fan-out across all 7 sources concurrently,
  used by deep-research pipelines that dedupe + rerank downstream.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from . import arxiv, biorxiv, crossref, europe_pmc, openalex, pubmed, semantic_scholar
from .types import Paper

logger = logging.getLogger(__name__)

ALL_SOURCES = (
    "openalex",
    "crossref",
    "semantic_scholar",
    "arxiv",
    "pubmed",
    "europe_pmc",
    "biorxiv",
)

# Per-source timeout (seconds) — generous because PubMed efetch can be slow.
PER_SOURCE_TIMEOUT = 35.0


async def search_papers(
    query: str,
    limit: int = 10,
    semantic_scholar_api_key: Optional[str] = None,
    mailto: Optional[str] = None,
) -> list[Paper]:
    """Search papers: OpenAlex -> Crossref -> Semantic Scholar (fallback chain).

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


async def _run(name: str, coro) -> tuple[str, list[Paper]]:
    try:
        results = await asyncio.wait_for(coro, timeout=PER_SOURCE_TIMEOUT)
        logger.info("%s returned %d papers", name, len(results))
        return name, results
    except asyncio.TimeoutError:
        logger.warning("%s timed out after %.0fs", name, PER_SOURCE_TIMEOUT)
        return name, []
    except Exception:
        logger.exception("%s search failed", name)
        return name, []


async def search_papers_all(
    query: str,
    limit: int = 10,
    semantic_scholar_api_key: Optional[str] = None,
    mailto: Optional[str] = None,
    sources: Optional[list[str]] = None,
) -> list[Paper]:
    """Fan all configured sources concurrently and return the union.

    Args:
        query: free-text query string.
        limit: per-source limit (each source returns up to ``limit`` papers).
        semantic_scholar_api_key: optional S2 API key.
        mailto: optional email for polite-pool User-Agent strings.
        sources: optional subset of ``ALL_SOURCES`` (e.g. for testing). Defaults to all.

    Returns:
        Combined list of papers; callers MUST dedupe (by DOI / source_id / title).
    """
    enabled = sources or list(ALL_SOURCES)

    coros: list[tuple[str, object]] = []
    if "openalex" in enabled:
        coros.append(("openalex", openalex.search(query, limit, mailto=mailto)))
    if "crossref" in enabled:
        coros.append(("crossref", crossref.search(query, limit, mailto=mailto)))
    if "semantic_scholar" in enabled:
        coros.append(("semantic_scholar", semantic_scholar.search(query, limit, api_key=semantic_scholar_api_key)))
    if "arxiv" in enabled:
        coros.append(("arxiv", arxiv.search(query, limit, mailto=mailto)))
    if "pubmed" in enabled:
        coros.append(("pubmed", pubmed.search(query, limit, mailto=mailto)))
    if "europe_pmc" in enabled:
        coros.append(("europe_pmc", europe_pmc.search(query, limit, mailto=mailto)))
    if "biorxiv" in enabled:
        coros.append(("biorxiv", biorxiv.search(query, limit, mailto=mailto)))

    results = await asyncio.gather(*(_run(n, c) for n, c in coros))
    combined: list[Paper] = []
    for _, papers in results:
        combined.extend(papers)
    return combined
