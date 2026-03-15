"""Semantic Scholar API client."""

from __future__ import annotations

from http_client import AsyncClient

S2_FIELDS = (
    "paperId,title,abstract,year,authors,externalIds,journal,url,tldr,"
    "citationCount,influentialCitationCount,fieldsOfStudy,isOpenAccess,"
    "openAccessPdf,publicationTypes"
)


def _s2_headers(api_key: str = "") -> dict[str, str]:
    return {"x-api-key": api_key} if api_key else {}


def _map_s2_paper(paper: dict) -> dict:
    ext = paper.get("externalIds") or {}
    return {
        "title": paper.get("title", "Untitled"),
        "doi": ext.get("DOI"),
        "url": (
            paper.get("url")
            or (f"https://doi.org/{ext['DOI']}" if ext.get("DOI") else None)
            or (
                f"https://www.semanticscholar.org/paper/{paper['paperId']}"
                if paper.get("paperId")
                else None
            )
        ),
        "year": paper.get("year"),
        "source": "semantic_scholar",
        "authors": [a.get("name", "") for a in (paper.get("authors") or [])],
        "abstract": paper.get("abstract"),
        "journal": (paper.get("journal") or {}).get("name"),
        "publicationType": (paper.get("publicationTypes") or [None])[0],
        "tldr": (paper.get("tldr") or {}).get("text"),
        "citationCount": paper.get("citationCount"),
        "influentialCitationCount": paper.get("influentialCitationCount"),
        "fieldsOfStudy": paper.get("fieldsOfStudy"),
        "isOpenAccess": paper.get("isOpenAccess"),
        "openAccessPdfUrl": (paper.get("openAccessPdf") or {}).get("url"),
        "s2PaperId": paper.get("paperId"),
    }


async def search_semantic_scholar(
    query: str, limit: int = 50, api_key: str = ""
) -> list[dict]:
    """Search Semantic Scholar for papers."""
    try:
        async with AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={"query": query, "limit": str(limit), "fields": S2_FIELDS},
                headers=_s2_headers(api_key),
            )
            if resp.status_code != 200:
                return []
            return [_map_s2_paper(p) for p in resp.json().get("data", [])]
    except Exception:
        return []


async def get_recommendations(
    paper_id: str, limit: int = 20, api_key: str = ""
) -> list[dict]:
    """Fetch S2 paper recommendations."""
    try:
        async with AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}",
                params={"limit": str(limit), "fields": S2_FIELDS},
                headers=_s2_headers(api_key),
            )
            if resp.status_code != 200:
                return []
            return [_map_s2_paper(p) for p in resp.json().get("recommendedPapers", [])]
    except Exception:
        return []
