"""Academic paper search clients — thin wrapper around pypackages/research (research-client).

Delegates all search, normalization, and retry logic to the shared research_client
package. Returns legacy 7-field dicts for backward compatibility with graph.py.

For the canonical implementation see: pypackages/research/src/research_client/
"""
from __future__ import annotations

from typing import Optional

from research_client import search_papers
from research_client import semantic_scholar as _s2


async def search_papers_with_fallback(
    query: str,
    limit: int = 10,
    semantic_scholar_api_key: Optional[str] = None,
) -> list[dict]:
    """Search papers: OpenAlex -> Crossref -> Semantic Scholar.

    Returns legacy 7-field dicts (title, authors, year, abstract, doi, url,
    citation_count) for backward compatibility with graph.py and reranker.py.
    """
    papers = await search_papers(
        query,
        limit=limit,
        semantic_scholar_api_key=semantic_scholar_api_key,
    )
    return [p.to_dict() for p in papers]


async def get_paper_detail_semantic_scholar(
    paper_id: str, api_key: Optional[str] = None
) -> Optional[dict]:
    """Fetch detailed paper metadata from Semantic Scholar.

    Returns the raw Semantic Scholar API response (with authors list,
    tldr dict, etc.) for compatibility with graph.py detail formatting.
    """
    import httpx

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
