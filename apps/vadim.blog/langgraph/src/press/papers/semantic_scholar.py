"""Semantic Scholar API client."""

from __future__ import annotations

import logging

import httpx

from press.papers import PaperSource, ResearchPaper, retry_async

logger = logging.getLogger(__name__)

BASE_URL = "https://api.semanticscholar.org/graph/v1"
SEARCH_FIELDS = "title,authors,year,citationCount,abstract,externalIds,openAccessPdf,s2FieldsOfStudy"


class SemanticScholarClient:
    def __init__(self, api_key: str | None = None):
        headers = {}
        if api_key:
            headers["x-api-key"] = api_key
        self.client = httpx.AsyncClient(
            base_url=BASE_URL, headers=headers, timeout=30.0
        )

    @retry_async(max_attempts=3, base_delay=1.0, fallback=list)
    async def search_bulk(
        self,
        query: str,
        fields: str = SEARCH_FIELDS,
        year: str | None = "2019-",
        min_citation_count: int | None = 3,
        sort: str | None = "citationCount:desc",
        limit: int = 15,
    ) -> list[ResearchPaper]:
        params: dict = {"query": query, "fields": fields, "limit": limit}
        if year:
            params["year"] = year
        if min_citation_count is not None:
            params["minCitationCount"] = min_citation_count
        if sort:
            params["sort"] = sort

        resp = await self.client.get("/paper/search/bulk", params=params)
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return [self._to_paper(p) for p in data]

    @staticmethod
    def _to_paper(raw: dict) -> ResearchPaper:
        authors = [a.get("name", "") for a in raw.get("authors", [])]
        return ResearchPaper(
            title=raw.get("title", ""),
            authors=authors,
            year=raw.get("year"),
            citation_count=raw.get("citationCount"),
            abstract_text=raw.get("abstract"),
            doi=(raw.get("externalIds") or {}).get("DOI"),
            url=f"https://www.semanticscholar.org/paper/{raw.get('paperId', '')}",
            pdf_url=(raw.get("openAccessPdf") or {}).get("url"),
            source=PaperSource.SEMANTIC_SCHOLAR,
            source_id=raw.get("paperId", ""),
            fields_of_study=[
                f.get("category", "")
                for f in (raw.get("s2FieldsOfStudy") or [])
            ],
        )
