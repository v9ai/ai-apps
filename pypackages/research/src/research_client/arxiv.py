"""arXiv API client — Atom feed search at export.arxiv.org."""
from __future__ import annotations

import asyncio
import logging
import random
import re
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

API_BASE = "http://export.arxiv.org/api/query"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0
MAX_LIMIT = 50

_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}
_ARXIV_ID_RE = re.compile(r"arxiv\.org/abs/([^v\s]+)(?:v\d+)?")


def _strip(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    cleaned = re.sub(r"\s+", " ", text).strip()
    return cleaned or None


def _parse_atom(xml_text: str) -> list[Paper]:
    """Parse arXiv Atom feed into Paper records."""
    from defusedxml import ElementTree as ET

    root = ET.fromstring(xml_text)
    papers: list[Paper] = []
    for entry in root.findall("atom:entry", _NS):
        title = _strip(_findtext(entry, "atom:title"))
        if not title:
            continue
        summary = _strip(_findtext(entry, "atom:summary"))
        published = _findtext(entry, "atom:published")
        year: Optional[int] = None
        if published and len(published) >= 4 and published[:4].isdigit():
            year = int(published[:4])

        authors: list[str] = []
        for a in entry.findall("atom:author", _NS):
            name = _findtext(a, "atom:name")
            if name:
                authors.append(name.strip())

        arxiv_id: Optional[str] = None
        url: Optional[str] = None
        pdf_url: Optional[str] = None
        for link in entry.findall("atom:link", _NS):
            rel = link.get("rel")
            href = link.get("href")
            ltype = link.get("type")
            if not href:
                continue
            if rel == "alternate" and ltype == "text/html":
                url = href
                m = _ARXIV_ID_RE.search(href)
                if m:
                    arxiv_id = m.group(1)
            elif link.get("title") == "pdf" or (ltype == "application/pdf"):
                pdf_url = href
        if not arxiv_id:
            id_text = _findtext(entry, "atom:id") or ""
            m = _ARXIV_ID_RE.search(id_text)
            if m:
                arxiv_id = m.group(1)

        doi_el = entry.find("arxiv:doi", _NS)
        doi = doi_el.text.strip() if doi_el is not None and doi_el.text else None

        categories = [
            c.get("term")
            for c in entry.findall("atom:category", _NS)
            if c.get("term")
        ]
        venue_el = entry.find("arxiv:journal_ref", _NS)
        venue = venue_el.text.strip() if venue_el is not None and venue_el.text else None

        papers.append(
            Paper(
                title=title,
                authors=authors,
                year=year,
                abstract_text=summary,
                doi=doi,
                url=url,
                pdf_url=pdf_url,
                source="arxiv",
                source_id=arxiv_id,
                arxiv_id=arxiv_id,
                fields_of_study=categories or None,
                published_date=published,
                venue=venue,
            )
        )
    return papers


def _findtext(element, path: str) -> Optional[str]:
    el = element.find(path, _NS)
    return el.text if el is not None else None


def normalize(item: dict) -> Paper:  # pragma: no cover - parity stub
    """Stub for parity; arXiv parsing happens in _parse_atom (XML, not dict)."""
    raise NotImplementedError("arxiv.normalize is not used; parsing happens in _parse_atom")


async def search(
    query: str,
    limit: int = 10,
    mailto: Optional[str] = None,
) -> list[Paper]:
    """Search arXiv for papers via the public Atom API.

    Returns papers sorted by relevance. Caps `limit` at 50 (arXiv soft limit).
    """
    capped = min(limit, MAX_LIMIT)
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": capped,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }
    headers = {
        "User-Agent": (
            f"research-client/0.1 (mailto:{mailto})"
            if mailto
            else "research-client/0.1 (mailto:research@example.com)"
        ),
    }

    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(API_BASE, params=params, headers=headers)
                if resp.status_code == 200:
                    return _parse_atom(resp.text)
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    jitter = random.uniform(0, delay * 0.5)
                    logger.warning(
                        "arXiv %d, retry %d/%d in %.1fs",
                        resp.status_code,
                        attempt + 1,
                        MAX_RETRIES,
                        delay + jitter,
                    )
                    await asyncio.sleep(delay + jitter)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("arXiv returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("arXiv request failed")
                return []
    return []
