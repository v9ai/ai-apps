"""OpenAlex API client."""

from __future__ import annotations

import logging

import httpx

from press.papers import PaperSource, ResearchPaper, retry_async

logger = logging.getLogger(__name__)

BASE_URL = "https://api.openalex.org"


class OpenAlexClient:
    def __init__(self, mailto: str | None = None):
        params = {}
        if mailto:
            params["mailto"] = mailto
        self.client = httpx.AsyncClient(
            base_url=BASE_URL, params=params, timeout=30.0
        )

    @retry_async(max_attempts=3, base_delay=1.0, fallback=list)
    async def search(
        self, query: str, page: int = 1, per_page: int = 10
    ) -> list[ResearchPaper]:
        params = {
            "search": query,
            "page": page,
            "per_page": per_page,
            "sort": "cited_by_count:desc",
        }
        resp = await self.client.get("/works", params=params)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        return [self._to_paper(r) for r in results]

    @staticmethod
    def _to_paper(raw: dict) -> ResearchPaper:
        authorships = raw.get("authorships", [])
        authors = [
            a.get("author", {}).get("display_name", "")
            for a in authorships
        ]
        abstract_index = raw.get("abstract_inverted_index")
        abstract_text = None
        if abstract_index:
            words: list[tuple[str, int]] = []
            for word, positions in abstract_index.items():
                for pos in positions:
                    words.append((word, pos))
            words.sort(key=lambda x: x[1])
            abstract_text = " ".join(w for w, _ in words)

        return ResearchPaper(
            title=raw.get("title", ""),
            authors=authors,
            year=raw.get("publication_year"),
            citation_count=raw.get("cited_by_count"),
            abstract_text=abstract_text,
            doi=raw.get("doi"),
            url=raw.get("id"),
            source=PaperSource.OPENALEX,
            source_id=raw.get("id", ""),
        )
