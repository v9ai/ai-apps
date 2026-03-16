"""CORE API client."""

from __future__ import annotations

import logging

import httpx

from press.papers import PaperSource, ResearchPaper, retry_async

logger = logging.getLogger(__name__)

BASE_URL = "https://api.core.ac.uk/v3"


class CoreClient:
    def __init__(self, api_key: str | None = None):
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self.client = httpx.AsyncClient(
            base_url=BASE_URL, headers=headers, timeout=30.0
        )

    @retry_async(max_attempts=3, base_delay=1.0, fallback=list)
    async def search(
        self, query: str, limit: int = 10, offset: int = 0
    ) -> list[ResearchPaper]:
        params = {"q": query, "limit": limit, "offset": offset}
        resp = await self.client.get("/search/works", params=params)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        return [self._to_paper(r) for r in results]

    @staticmethod
    def _to_paper(raw: dict) -> ResearchPaper:
        authors = [a.get("name", "") for a in raw.get("authors", [])]
        url = raw.get("downloadUrl")
        if not url:
            fulltext_urls = raw.get("sourceFulltextUrls") or []
            url = fulltext_urls[0] if fulltext_urls else None
        return ResearchPaper(
            title=raw.get("title", ""),
            authors=authors,
            year=raw.get("yearPublished"),
            citation_count=raw.get("citationCount"),
            abstract_text=raw.get("abstract"),
            doi=raw.get("doi"),
            url=url,
            source=PaperSource.CORE,
            source_id=str(raw.get("id", "")),
        )
