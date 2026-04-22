"""OpenAlex API client — mirrors crates/research/src/openalex/client.rs."""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

API_BASE = "https://api.openalex.org/works"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0


def _invert_abstract(index: Optional[dict]) -> Optional[str]:
    """Reconstruct plain text from OpenAlex inverted abstract index."""
    if not index:
        return None
    words: dict[int, str] = {}
    for word, positions in index.items():
        for pos in positions:
            words[pos] = word
    if not words:
        return None
    return " ".join(words[i] for i in sorted(words))


def normalize(item: dict) -> Paper:
    """Convert an OpenAlex Work to a Paper."""
    authors = [
        a["author"]["display_name"]
        for a in item.get("authorships", [])
        if a.get("author")
    ]
    doi_raw = item.get("doi") or ""
    doi = doi_raw.replace("https://doi.org/", "") or None
    abstract = _invert_abstract(item.get("abstract_inverted_index"))
    loc = item.get("primary_location") or {}
    url = loc.get("landing_page_url")
    source_info = loc.get("source") or {}
    title_raw = item.get("title") or ""
    title = title_raw[0] if isinstance(title_raw, list) else title_raw

    return Paper(
        title=title,
        authors=authors,
        year=item.get("publication_year"),
        abstract_text=abstract,
        doi=doi,
        citation_count=item.get("cited_by_count"),
        url=url,
        source="openalex",
        source_id=item.get("id"),
        venue=source_info.get("display_name"),
        published_date=str(item.get("publication_year", "")) or None,
    )


async def search(
    query: str,
    limit: int = 10,
    mailto: Optional[str] = None,
) -> list[Paper]:
    """Search OpenAlex for academic papers.

    Uses exponential backoff on 429/5xx (max 3 retries), matching
    the retry strategy in crates/research/src/openalex/client.rs.
    """
    params = {
        "search": query,
        "per-page": limit,
        "select": "id,title,authorships,publication_year,abstract_inverted_index,doi,primary_location,cited_by_count",
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
                    results = resp.json().get("results", [])
                    return [normalize(r) for r in results]
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    jitter = random.uniform(0, delay * 0.5)
                    logger.warning("OpenAlex %d, retry %d/%d in %.1fs", resp.status_code, attempt + 1, MAX_RETRIES, delay + jitter)
                    await asyncio.sleep(delay + jitter)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("OpenAlex returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("OpenAlex request failed")
                return []
    return []
