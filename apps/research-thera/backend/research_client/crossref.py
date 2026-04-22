"""Crossref API client — mirrors crates/research/src/crossref/client.rs."""
from __future__ import annotations

import logging
import re
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

API_BASE = "https://api.crossref.org/works"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0

_JATS_TAGS = re.compile(r"</?jats:[^>]+>")


def normalize(item: dict) -> Paper:
    """Convert a Crossref Work to a Paper."""
    authors = [
        f"{a.get('given', '')} {a.get('family', '')}".strip()
        for a in item.get("author", [])
    ]
    title_list = item.get("title", [])
    title = title_list[0] if title_list else ""
    pub = (item.get("published") or {}).get("date-parts", [[None]])[0]
    year = pub[0] if pub else None
    abstract_raw = item.get("abstract") or ""
    abstract = _JATS_TAGS.sub("", abstract_raw).strip() or None

    return Paper(
        title=title,
        authors=authors,
        year=year,
        abstract_text=abstract,
        doi=item.get("DOI"),
        citation_count=item.get("is-referenced-by-count"),
        url=item.get("URL"),
        source="crossref",
        source_id=item.get("DOI"),
        published_date=f"{year}" if year else None,
    )


async def search(
    query: str,
    limit: int = 10,
    mailto: Optional[str] = None,
) -> list[Paper]:
    """Search Crossref for academic papers.

    Uses exponential backoff on 429/5xx (max 3 retries), matching
    the retry strategy in crates/research/src/crossref/client.rs.
    """
    params = {
        "query": query,
        "rows": limit,
        "select": "title,author,published,DOI,URL,abstract,is-referenced-by-count",
    }
    headers: dict[str, str] = {}
    if mailto:
        headers["User-Agent"] = f"research-client/0.1 (mailto:{mailto})"
    else:
        headers["User-Agent"] = "research-client/0.1 (mailto:research@example.com)"

    import asyncio
    import random

    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(API_BASE, params=params, headers=headers)
                if resp.status_code == 200:
                    items = resp.json().get("message", {}).get("items", [])
                    return [normalize(r) for r in items]
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    jitter = random.uniform(0, delay * 0.5)
                    logger.warning("Crossref %d, retry %d/%d in %.1fs", resp.status_code, attempt + 1, MAX_RETRIES, delay + jitter)
                    await asyncio.sleep(delay + jitter)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("Crossref returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("Crossref request failed")
                return []
    return []
