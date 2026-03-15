"""OpenAlex abstract enrichment — reconstruct abstracts from inverted index."""

from __future__ import annotations

from http_client import AsyncClient


def _reconstruct_abstract(inv: dict[str, list[int]] | None) -> str:
    if not inv:
        return ""
    positions: list[tuple[int, str]] = []
    for word, idxs in inv.items():
        for i in idxs:
            positions.append((i, word))
    positions.sort(key=lambda x: x[0])
    return " ".join(w for _, w in positions).strip()


async def fetch_abstract_by_doi(doi: str) -> dict:
    """Fetch abstract + metadata from OpenAlex by DOI."""
    try:
        import re
        clean = re.sub(r"^doi:\s*", "", doi.strip().lower(), flags=re.IGNORECASE)
        url = f"https://api.openalex.org/works/doi:{clean}"

        async with AsyncClient(timeout=20) as client:
            resp = await client.get(
                url,
                headers={
                    "accept": "application/json",
                    "user-agent": "AI-Therapist/1.0 (mailto:research@example.com)",
                },
            )
            if resp.status_code != 200:
                return {}
            data = resp.json()

        abstract = _reconstruct_abstract(data.get("abstract_inverted_index"))
        authorships = data.get("authorships") or []
        authors = [
            a.get("author", {}).get("display_name")
            for a in authorships
            if a.get("author", {}).get("display_name")
        ]
        return {
            "abstract": abstract or None,
            "venue": (data.get("host_venue") or {}).get("display_name"),
            "year": data.get("publication_year"),
            "authors": authors,
        }
    except Exception:
        return {}
