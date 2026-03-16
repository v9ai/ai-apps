"""Crossref API client."""

from __future__ import annotations

import logging

import httpx

from agentic_press.papers import PaperSource, ResearchPaper, retry_async

logger = logging.getLogger(__name__)

BASE_URL = "https://api.crossref.org"


class CrossrefClient:
    def __init__(self, mailto: str | None = None):
        headers = {}
        if mailto:
            headers["User-Agent"] = f"agentic_press/0.1 (mailto:{mailto})"
        self.client = httpx.AsyncClient(
            base_url=BASE_URL, headers=headers, timeout=30.0
        )

    @retry_async(max_attempts=3, base_delay=1.0, fallback=list)
    async def search(
        self, query: str, rows: int = 10, offset: int = 0
    ) -> list[ResearchPaper]:
        params = {
            "query": query,
            "rows": rows,
            "offset": offset,
            "sort": "is-referenced-by-count",
            "order": "desc",
        }
        resp = await self.client.get("/works", params=params)
        resp.raise_for_status()
        items = resp.json().get("message", {}).get("items", [])
        return [self._to_paper(item) for item in items]

    @staticmethod
    def _to_paper(raw: dict) -> ResearchPaper:
        authors = []
        for a in raw.get("author", []):
            given = a.get("given", "")
            family = a.get("family", "")
            authors.append(f"{given} {family}".strip())

        title_list = raw.get("title", [])
        title = title_list[0] if title_list else ""

        year = None
        date_parts = raw.get("published-print", raw.get("published-online", {}))
        parts = date_parts.get("date-parts", [[]])
        if parts and parts[0]:
            year = parts[0][0]

        return ResearchPaper(
            title=title,
            authors=authors,
            year=year,
            citation_count=raw.get("is-referenced-by-count"),
            abstract_text=raw.get("abstract"),
            doi=raw.get("DOI"),
            url=raw.get("URL"),
            source=PaperSource.CROSSREF,
            source_id=raw.get("DOI", ""),
        )
