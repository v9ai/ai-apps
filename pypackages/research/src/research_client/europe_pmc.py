"""Europe PMC API client — JSON search at ebi.ac.uk/europepmc."""
from __future__ import annotations

import asyncio
import logging
import random
import re
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

API_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0

_HTML_TAGS = re.compile(r"<[^>]+>")


def _strip_html(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    cleaned = _HTML_TAGS.sub("", text).strip()
    return cleaned or None


def normalize(item: dict) -> Paper:
    """Convert a Europe PMC result to a Paper."""
    authors_raw = item.get("authorString", "")
    authors = [a.strip() for a in authors_raw.split(",") if a.strip()] if authors_raw else []
    year_raw = item.get("pubYear")
    year: Optional[int] = None
    if year_raw:
        try:
            year = int(str(year_raw)[:4])
        except (ValueError, TypeError):
            year = None
    pmid = item.get("pmid")
    pmcid = item.get("pmcid")
    doi = item.get("doi")
    citation_count = item.get("citedByCount")
    fields = item.get("subsetList", {}).get("subset") if isinstance(item.get("subsetList"), dict) else None
    fos: Optional[list[str]] = None
    if isinstance(fields, list):
        fos = [f.get("name") for f in fields if isinstance(f, dict) and f.get("name")] or None

    url: Optional[str] = None
    pdf_url: Optional[str] = None
    full_text_list = item.get("fullTextUrlList", {})
    if isinstance(full_text_list, dict):
        for ft in full_text_list.get("fullTextUrl", []) or []:
            if not isinstance(ft, dict):
                continue
            href = ft.get("url")
            if not href:
                continue
            doc_style = ft.get("documentStyle", "").lower()
            if doc_style == "pdf" and not pdf_url:
                pdf_url = href
            elif not url:
                url = href

    return Paper(
        title=_strip_html(item.get("title")) or "",
        authors=authors,
        year=year,
        abstract_text=_strip_html(item.get("abstractText")),
        doi=doi,
        citation_count=citation_count if isinstance(citation_count, int) else None,
        url=url,
        pdf_url=pdf_url,
        source="europe_pmc",
        source_id=item.get("id") or pmid or pmcid,
        pubmed_id=pmid,
        fields_of_study=fos,
        published_date=str(year) if year else None,
        venue=item.get("journalTitle"),
    )


async def search(
    query: str,
    limit: int = 10,
    mailto: Optional[str] = None,  # accepted for signature parity
) -> list[Paper]:
    """Search Europe PMC for papers (JSON)."""
    params = {
        "query": query,
        "format": "json",
        "pageSize": min(limit, 100),
        "resultType": "core",
    }
    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(API_BASE, params=params)
                if resp.status_code == 200:
                    items = (resp.json().get("resultList") or {}).get("result", []) or []
                    return [normalize(r) for r in items if r.get("title")]
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    jitter = random.uniform(0, delay * 0.5)
                    logger.warning(
                        "EuropePMC %d, retry %d/%d in %.1fs",
                        resp.status_code,
                        attempt + 1,
                        MAX_RETRIES,
                        delay + jitter,
                    )
                    await asyncio.sleep(delay + jitter)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("EuropePMC returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("EuropePMC request failed")
                return []
    return []
