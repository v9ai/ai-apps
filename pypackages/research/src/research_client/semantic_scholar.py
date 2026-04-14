"""Semantic Scholar API client — mirrors crates/research/src/scholar/client.rs."""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

API_BASE = "https://api.semanticscholar.org/graph/v1/paper"
SEARCH_FIELDS = "title,authors,year,abstract,externalIds,citationCount,fieldsOfStudy,venue,openAccessPdf"
DETAIL_FIELDS = "title,authors,year,abstract,tldr,externalIds,citationCount,fieldsOfStudy,venue,openAccessPdf"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0


def normalize(item: dict) -> Paper:
    """Convert a Semantic Scholar Paper to a Paper."""
    authors = [a["name"] for a in item.get("authors", []) if a.get("name")]
    ext_ids = item.get("externalIds") or {}
    oa_pdf = item.get("openAccessPdf") or {}

    return Paper(
        title=item.get("title", ""),
        authors=authors,
        year=item.get("year"),
        abstract_text=item.get("abstract"),
        doi=ext_ids.get("DOI"),
        citation_count=item.get("citationCount"),
        url=oa_pdf.get("url"),
        pdf_url=oa_pdf.get("url"),
        source="semantic_scholar",
        source_id=item.get("paperId"),
        fields_of_study=item.get("fieldsOfStudy"),
        venue=item.get("venue") or None,
    )


async def search(
    query: str,
    limit: int = 10,
    api_key: Optional[str] = None,
) -> list[Paper]:
    """Search Semantic Scholar for academic papers.

    Uses exponential backoff on 429 (max 3 retries), matching
    the retry strategy in crates/research/src/scholar/client.rs.
    """
    headers: dict[str, str] = {}
    if api_key:
        headers["x-api-key"] = api_key
    params = {
        "query": query,
        "limit": limit,
        "fields": SEARCH_FIELDS,
    }

    import asyncio
    import random

    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(f"{API_BASE}/search", params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    return [normalize(r) for r in data]
                if resp.status_code == 429 and attempt < MAX_RETRIES:
                    jitter = random.uniform(0, delay * 0.5)
                    logger.warning("S2 429, retry %d/%d in %.1fs", attempt + 1, MAX_RETRIES, delay + jitter)
                    await asyncio.sleep(delay + jitter)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("Semantic Scholar returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("Semantic Scholar request failed")
                return []
    return []


async def get_paper_detail(
    paper_id: str,
    api_key: Optional[str] = None,
) -> Optional[Paper]:
    """Fetch detailed metadata for a single paper by Semantic Scholar ID."""
    headers: dict[str, str] = {}
    if api_key:
        headers["x-api-key"] = api_key
    params = {"fields": DETAIL_FIELDS}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(f"{API_BASE}/{paper_id}", params=params, headers=headers)
            if resp.status_code == 200:
                return normalize(resp.json())
        except Exception:
            logger.exception("S2 paper detail failed for %s", paper_id)
    return None
