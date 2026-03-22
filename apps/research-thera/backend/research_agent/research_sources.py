"""Academic paper search clients — port of the shared research crate's paper search tools.

Primary sources: OpenAlex, Crossref (no rate limits)
Fallback: Semantic Scholar (rich metadata, rate-limited)
"""
from __future__ import annotations

from typing import Optional

import httpx


async def search_openalex(query: str, limit: int = 10) -> list[dict]:
    params = {
        "search": query,
        "per-page": limit,
        "select": "id,title,authorships,publication_year,abstract_inverted_index,doi,primary_location,cited_by_count",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                "https://api.openalex.org/works",
                params=params,
                headers={"User-Agent": "research-thera/1.0 (mailto:research@example.com)"},
            )
            if resp.status_code == 200:
                return resp.json().get("results", [])
        except Exception:
            pass
    return []


async def search_crossref(query: str, limit: int = 10) -> list[dict]:
    params = {
        "query": query,
        "rows": limit,
        "select": "title,author,published,DOI,URL,abstract",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                "https://api.crossref.org/works",
                params=params,
                headers={"User-Agent": "research-thera/1.0 (mailto:research@example.com)"},
            )
            if resp.status_code == 200:
                return resp.json().get("message", {}).get("items", [])
        except Exception:
            pass
    return []


async def search_semantic_scholar(
    query: str, limit: int = 10, api_key: Optional[str] = None
) -> list[dict]:
    headers: dict[str, str] = {}
    if api_key:
        headers["x-api-key"] = api_key
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,authors,year,abstract,externalIds,citationCount,fieldsOfStudy,venue,openAccessPdf",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json().get("data", [])
        except Exception:
            pass
    return []


async def get_paper_detail_semantic_scholar(
    paper_id: str, api_key: Optional[str] = None
) -> Optional[dict]:
    headers: dict[str, str] = {}
    if api_key:
        headers["x-api-key"] = api_key
    params = {
        "fields": "title,authors,year,abstract,tldr,externalIds,citationCount,fieldsOfStudy,venue,openAccessPdf",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(
                f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}",
                params=params,
                headers=headers,
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
    return None


def _invert_abstract(index: Optional[dict]) -> Optional[str]:
    """Reconstruct plain text from OpenAlex inverted index."""
    if not index:
        return None
    words: dict[int, str] = {}
    for word, positions in index.items():
        for pos in positions:
            words[pos] = word
    if not words:
        return None
    return " ".join(words[i] for i in sorted(words))


def _normalize_openalex(item: dict) -> dict:
    authors = [
        a["author"]["display_name"]
        for a in item.get("authorships", [])[:3]
        if a.get("author")
    ]
    doi_raw = item.get("doi") or ""
    doi = doi_raw.replace("https://doi.org/", "") or None
    abstract = _invert_abstract(item.get("abstract_inverted_index"))
    loc = item.get("primary_location") or {}
    url = loc.get("landing_page_url")
    title_raw = item.get("title") or ""
    title = title_raw[0] if isinstance(title_raw, list) else title_raw
    return {
        "title": title,
        "authors": authors,
        "year": item.get("publication_year"),
        "abstract": abstract,
        "doi": doi,
        "url": url,
        "citation_count": item.get("cited_by_count"),
    }


def _normalize_crossref(item: dict) -> dict:
    authors = [
        f"{a.get('given', '')} {a.get('family', '')}".strip()
        for a in item.get("author", [])[:3]
    ]
    title_list = item.get("title", [])
    title = title_list[0] if title_list else ""
    pub = (item.get("published") or {}).get("date-parts", [[None]])[0]
    year = pub[0] if pub else None
    abstract = (item.get("abstract") or "").replace("<jats:p>", "").replace("</jats:p>", "") or None
    return {
        "title": title,
        "authors": authors,
        "year": year,
        "abstract": abstract,
        "doi": item.get("DOI"),
        "url": item.get("URL"),
        "citation_count": None,
    }


def _normalize_semantic_scholar(item: dict) -> dict:
    authors = [a["name"] for a in item.get("authors", [])[:3]]
    doi = (item.get("externalIds") or {}).get("DOI")
    url = (item.get("openAccessPdf") or {}).get("url")
    return {
        "title": item.get("title", ""),
        "authors": authors,
        "year": item.get("year"),
        "abstract": item.get("abstract"),
        "doi": doi,
        "url": url,
        "citation_count": item.get("citationCount"),
    }


async def search_papers_with_fallback(
    query: str,
    limit: int = 10,
    semantic_scholar_api_key: Optional[str] = None,
) -> list[dict]:
    """Search papers: OpenAlex → Crossref → Semantic Scholar."""
    results = await search_openalex(query, limit)
    if results:
        return [_normalize_openalex(r) for r in results]

    results = await search_crossref(query, limit)
    if results:
        return [_normalize_crossref(r) for r in results]

    results = await search_semantic_scholar(query, limit, semantic_scholar_api_key)
    return [_normalize_semantic_scholar(r) for r in results]
