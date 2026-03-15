"""PubMed E-utilities client."""

from __future__ import annotations

from http_client import AsyncClient


async def search_pubmed(query: str, limit: int = 50) -> list[dict]:
    """Search PubMed via esearch + esummary."""
    try:
        # Step 1: search for PMIDs
        async with AsyncClient(timeout=30) as client:
            search_resp = await client.get(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
                params={
                    "db": "pubmed",
                    "term": query,
                    "retmax": str(limit),
                    "retmode": "json",
                },
            )
            if search_resp.status_code != 200:
                return []
            id_list = search_resp.json().get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return []

            # Step 2: fetch summaries
            summary_resp = await client.get(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
                params={
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "json",
                },
            )
            if summary_resp.status_code != 200:
                return []
            results_data = summary_resp.json().get("result", {})

        papers = []
        for pmid in id_list:
            paper = results_data.get(pmid)
            if not paper:
                continue
            doi = None
            elocation = paper.get("elocationid", "")
            if isinstance(elocation, str) and "doi:" in elocation:
                for part in elocation.split(" "):
                    if part.startswith("doi:"):
                        doi = part[4:]
                        break
            year = None
            pubdate = paper.get("pubdate", "")
            if pubdate:
                try:
                    year = int(pubdate.split(" ")[0])
                except (ValueError, IndexError):
                    pass
            papers.append({
                "title": paper.get("title", "Untitled"),
                "doi": doi,
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "year": year,
                "source": "pubmed",
                "authors": [a.get("name", "") for a in (paper.get("authors") or [])],
                "journal": paper.get("fulljournalname") or paper.get("source"),
            })
        return papers
    except Exception:
        return []
