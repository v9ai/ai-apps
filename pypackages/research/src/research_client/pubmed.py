"""PubMed (NCBI E-utilities) client — esearch + efetch."""
from __future__ import annotations

import asyncio
import logging
import os
import random
import re
from typing import Optional

import httpx

from .types import Paper

logger = logging.getLogger(__name__)

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
TIMEOUT = 30.0
MAX_RETRIES = 3
BASE_DELAY = 1.0
TOOL_NAME = "research-client"


def _polite_params() -> dict[str, str]:
    p: dict[str, str] = {"tool": TOOL_NAME}
    email = os.getenv("NCBI_EMAIL")
    if email:
        p["email"] = email
    api_key = os.getenv("NCBI_API_KEY")
    if api_key:
        p["api_key"] = api_key
    return p


async def _esearch(query: str, limit: int) -> list[str]:
    """Return a list of PubMed IDs for the given query."""
    params: dict[str, object] = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": min(limit, 100),
        "sort": "relevance",
        **_polite_params(),
    }
    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(ESEARCH_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("esearchresult", {}).get("idlist", []) or []
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    await asyncio.sleep(delay + random.uniform(0, delay * 0.5))
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("PubMed esearch returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("PubMed esearch failed")
                return []
    return []


async def _efetch(pmids: list[str]) -> list[Paper]:
    """Fetch full metadata for a batch of PubMed IDs (XML)."""
    if not pmids:
        return []
    params: dict[str, object] = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
        "rettype": "abstract",
        **_polite_params(),
    }
    delay = BASE_DELAY
    for attempt in range(MAX_RETRIES + 1):
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            try:
                resp = await client.get(EFETCH_URL, params=params)
                if resp.status_code == 200:
                    return _parse_pubmed_xml(resp.text)
                if resp.status_code in (429, 500, 502, 503, 504) and attempt < MAX_RETRIES:
                    await asyncio.sleep(delay + random.uniform(0, delay * 0.5))
                    delay = min(delay * 2, 30.0)
                    continue
                logger.warning("PubMed efetch returned %d", resp.status_code)
                return []
            except Exception:
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                logger.exception("PubMed efetch failed")
                return []
    return []


def _text_of(node) -> str:
    if node is None:
        return ""
    parts: list[str] = []
    if node.text:
        parts.append(node.text)
    for child in node:
        parts.append(_text_of(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts)


def _parse_pubmed_xml(xml_text: str) -> list[Paper]:
    """Parse the PubmedArticleSet XML payload into Paper records."""
    from defusedxml import ElementTree as ET

    root = ET.fromstring(xml_text)
    papers: list[Paper] = []
    for art in root.findall(".//PubmedArticle"):
        med = art.find("MedlineCitation")
        if med is None:
            continue
        pmid_el = med.find("PMID")
        pmid = pmid_el.text.strip() if pmid_el is not None and pmid_el.text else None
        article = med.find("Article")
        if article is None:
            continue

        title = _text_of(article.find("ArticleTitle")).strip()
        title = re.sub(r"\s+", " ", title) or ""
        if not title:
            continue

        abstract_chunks: list[str] = []
        for ab in article.findall(".//Abstract/AbstractText"):
            label = ab.get("Label")
            txt = _text_of(ab).strip()
            if not txt:
                continue
            abstract_chunks.append(f"{label}: {txt}" if label else txt)
        abstract = "\n".join(abstract_chunks) or None

        year_el = article.find(".//JournalIssue/PubDate/Year")
        year: Optional[int] = None
        if year_el is not None and year_el.text and year_el.text.isdigit():
            year = int(year_el.text)
        else:
            medline_date = article.find(".//JournalIssue/PubDate/MedlineDate")
            if medline_date is not None and medline_date.text:
                m = re.search(r"\d{4}", medline_date.text)
                if m:
                    year = int(m.group(0))

        authors: list[str] = []
        for au in article.findall(".//AuthorList/Author"):
            last = (au.findtext("LastName") or "").strip()
            fore = (au.findtext("ForeName") or au.findtext("Initials") or "").strip()
            name = " ".join(p for p in [fore, last] if p)
            if not name:
                name = (au.findtext("CollectiveName") or "").strip()
            if name:
                authors.append(name)

        venue = (article.findtext(".//Journal/Title") or "").strip() or None

        doi: Optional[str] = None
        for aid in art.findall(".//ArticleIdList/ArticleId"):
            if aid.get("IdType") == "doi" and aid.text:
                doi = aid.text.strip()
                break

        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else None
        papers.append(
            Paper(
                title=title,
                authors=authors,
                year=year,
                abstract_text=abstract,
                doi=doi,
                url=url,
                source="pubmed",
                source_id=pmid,
                pubmed_id=pmid,
                published_date=str(year) if year else None,
                venue=venue,
            )
        )
    return papers


def normalize(item: dict) -> Paper:  # pragma: no cover - parity stub
    raise NotImplementedError("pubmed.normalize is not used; parsing happens in _parse_pubmed_xml")


async def search(
    query: str,
    limit: int = 10,
    mailto: Optional[str] = None,  # accepted for signature parity
) -> list[Paper]:
    """Search PubMed: esearch -> efetch."""
    pmids = await _esearch(query, limit)
    if not pmids:
        return []
    return await _efetch(pmids)
