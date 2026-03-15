"""Crossref API client."""

from __future__ import annotations

from http_client import AsyncClient


async def search_crossref(query: str, limit: int = 50) -> list[dict]:
    """Search Crossref for papers."""
    try:
        url = "https://api.crossref.org/works"
        params = {
            "query": query,
            "rows": str(limit),
            "select": "DOI,title,author,published,container-title,abstract,URL,type",
        }
        async with AsyncClient(timeout=30) as client:
            resp = await client.get(
                url,
                params=params,
                headers={
                    "User-Agent": "AI-Therapist/1.0 (mailto:research@example.com)"
                },
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            items = data.get("message", {}).get("items", [])

        results = []
        for item in items:
            title_raw = item.get("title", [])
            title = title_raw[0] if isinstance(title_raw, list) and title_raw else (title_raw or "Untitled")
            doi = item.get("DOI")
            authors = []
            for a in (item.get("author") or []):
                name = f"{a.get('given', '')} {a.get('family', '')}".strip()
                if name:
                    authors.append(name)
            container = item.get("container-title", [])
            journal = container[0] if isinstance(container, list) and container else container

            results.append({
                "title": title,
                "doi": doi,
                "url": item.get("URL") or (f"https://doi.org/{doi}" if doi else None),
                "year": (item.get("published") or {}).get("date-parts", [[None]])[0][0],
                "source": "crossref",
                "authors": authors,
                "abstract": item.get("abstract"),
                "journal": journal,
                "publicationType": item.get("type"),
            })
        return results
    except Exception:
        return []
