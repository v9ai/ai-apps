"""bioRxiv / medRxiv client — Crossref-filtered keyword search + biorxiv API enrichment.

bioRxiv's own API is DOI-based and does not support keyword search. We use Crossref
with `filter=type:posted-content,member:246` (Cold Spring Harbor — bioRxiv & medRxiv)
to perform the keyword search, then enrich the top hits with biorxiv API metadata
(PDF URL, full-text URL, version).
"""
from __future__ import annotations

import asyncio
import logging
import random
import re
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

CROSSREF_BASE = "https://api.crossref.org/works"
BIORXIV_DETAIL = "https://api.biorxiv.org/details"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0
COLD_SPRING_HARBOR_MEMBER = "246"

_JATS_TAGS = re.compile(r"</?jats:[^>]+>")


def _server_for_doi(doi: str) -> str:
    """Map a DOI to the bioRxiv/medRxiv server prefix."""
    if "10.1101/" in doi:
        # medRxiv DOIs include a `.YY.MM.DD` date prefix; bioRxiv historical pattern same.
        # The biorxiv API path is /<server>/<doi>; we default to biorxiv first and
        # fall back to medrxiv on miss.
        return "biorxiv"
    return "biorxiv"


def _normalize_crossref_preprint(item: dict) -> Paper:
    authors = [
        f"{a.get('given', '')} {a.get('family', '')}".strip()
        for a in item.get("author", [])
        if a.get("family") or a.get("given")
    ]
    title_list = item.get("title", [])
    title = title_list[0] if title_list else ""
    pub = (item.get("posted") or item.get("published") or {}).get("date-parts", [[None]])[0]
    year = pub[0] if pub else None
    abstract_raw = item.get("abstract") or ""
    abstract = _JATS_TAGS.sub("", abstract_raw).strip() or None
    doi = item.get("DOI")
    venue = (item.get("institution") or [{}])[0].get("name") if item.get("institution") else None
    if not venue:
        venue = item.get("container-title", [None])[0] if item.get("container-title") else None
    return Paper(
        title=title,
        authors=authors,
        year=year,
        abstract_text=abstract,
        doi=doi,
        citation_count=item.get("is-referenced-by-count"),
        url=item.get("URL"),
        source="biorxiv",
        source_id=doi,
        published_date=f"{year}" if year else None,
        venue=venue or "bioRxiv/medRxiv",
    )


async def _enrich_pdf(papers: list[Paper]) -> list[Paper]:
    """Best-effort enrichment: pull PDF URL from biorxiv/medrxiv detail API."""
    if not papers:
        return papers

    async def _enrich_one(paper: Paper) -> Paper:
        if not paper.doi:
            return paper
        for server in ("biorxiv", "medrxiv"):
            url = f"{BIORXIV_DETAIL}/{server}/{paper.doi}"
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        continue
                    payload = resp.json()
                    collection = payload.get("collection") or []
                    if not collection:
                        continue
                    latest = collection[-1]
                    paper.pdf_url = (
                        f"https://www.{server}.org/content/{paper.doi}v{latest.get('version', 1)}.full.pdf"
                    )
                    paper.url = paper.url or f"https://www.{server}.org/content/{paper.doi}"
                    paper.venue = "medRxiv" if server == "medrxiv" else "bioRxiv"
                    return paper
                except Exception:
                    continue
        return paper

    return await asyncio.gather(*(_enrich_one(p) for p in papers))


async def search(
    query: str,
    limit: int = 10,
    mailto: Optional[str] = None,
) -> list[Paper]:
    """Search bioRxiv + medRxiv preprints via Crossref filter, then enrich."""
    params = {
        "query": query,
        "rows": min(limit, 50),
        "filter": f"type:posted-content,member:{COLD_SPRING_HARBOR_MEMBER}",
        "select": "title,author,posted,published,DOI,URL,abstract,is-referenced-by-count,container-title,institution",
    }
    headers = {
        "User-Agent": (
            f"research-client/0.1 (mailto:{mailto})"
            if mailto
            else "research-client/0.1 (mailto:research@example.com)"
        ),
    }

    delay = BASE_DELAY
    items: list[dict] = []
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(CROSSREF_BASE, params=params, headers=headers)
                if resp.status_code == 200:
                    items = (resp.json().get("message") or {}).get("items", []) or []
                    break
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    await asyncio.sleep(delay + random.uniform(0, delay * 0.5))
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("bioRxiv (via Crossref) returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("bioRxiv (via Crossref) request failed")
                return []

    papers = [_normalize_crossref_preprint(i) for i in items if i.get("title")]
    return await _enrich_pdf(papers)
