"""Node: enrich_abstracts — OpenAlex concurrent abstract enrichment."""

from __future__ import annotations

from typing import Any

from db.d1_client import update_generation_job
from sources.openalex import fetch_abstract_by_doi
from sources.utils import map_limit
from graph.state import ResearchState

ENRICH_CANDIDATES_LIMIT = 50
ENRICH_CONCURRENCY = 10
ABSTRACT_MIN_LENGTH = 300
FEEDBACK_ABSTRACT_MIN_LENGTH = 150


def make_enrich_abstracts(settings: dict):
    async def enrich_abstracts(state: ResearchState) -> dict[str, Any]:
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(settings, job_id, progress=60)
            except Exception:
                pass

        candidates = state.get("candidates", [])
        to_enrich = candidates[:ENRICH_CANDIDATES_LIMIT]
        rest = candidates[ENRICH_CANDIDATES_LIMIT:]

        async def enrich_one(c: dict, idx: int) -> dict:
            doi = (c.get("doi") or "").strip()
            if not doi or c.get("abstract"):
                return c
            try:
                oa = await fetch_abstract_by_doi(doi)
                return {
                    **c,
                    "_enrichedAbstract": oa.get("abstract"),
                    "_enrichedYear": oa.get("year"),
                    "_enrichedVenue": oa.get("venue"),
                    "_enrichedAuthors": oa.get("authors"),
                }
            except Exception:
                return c

        enriched = await map_limit(to_enrich, ENRICH_CONCURRENCY, enrich_one)

        # Feedback-based research uses a relaxed abstract minimum
        is_feedback = state.get("feedback_id") is not None and state.get("goal_id") is None
        min_abstract = FEEDBACK_ABSTRACT_MIN_LENGTH if is_feedback else ABSTRACT_MIN_LENGTH

        before_count = len(enriched)
        with_abstracts = [
            c
            for c in enriched
            if len(c.get("abstract") or c.get("_enrichedAbstract") or "") >= min_abstract
        ]
        dropped = before_count - len(with_abstracts)

        diagnostics = state.get("diagnostics") or {}
        diagnostics["enrichedCount"] = len(with_abstracts) + len(rest)
        diagnostics["enrichedDropped"] = dropped

        return {"candidates": with_abstracts + rest, "diagnostics": diagnostics}

    return enrich_abstracts
