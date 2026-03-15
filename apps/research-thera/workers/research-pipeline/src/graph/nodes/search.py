"""Node: search — Multi-source search with dedup and blacklist filtering."""

from __future__ import annotations

import asyncio
import re
from typing import Any

from db.d1_client import update_generation_job
from sources.crossref import search_crossref
from sources.pubmed import search_pubmed
from sources.semantic_scholar import get_recommendations, search_semantic_scholar
from sources.utils import dedup_candidates, filter_book_chapters
from graph.state import ResearchState

PER_QUERY = 50

# Static title blacklist
STATIC_BAD_TERMS = [
    "forensic", "witness", "court", "police", "legal",
    "pre-admission", "homework completion", "homework adherence",
    "homework refusal", "dating violence", "teen dating",
    "cybersex", "internet pornography", "weight control",
    "obesity intervention", "gang-affiliated", "delinquency",
    "marital therapy", "marriage therapy", "couples therapy",
]

DEFAULT_CROSSREF = [
    "behavioral intervention children school-age evidence-based",
    "CBT cognitive behavioral therapy children school",
    "anxiety disorder children behavioral treatment",
    "social skills intervention school-age children",
    "child behavioral therapy evidence-based outcomes",
]
DEFAULT_S2 = [
    "evidence-based behavioral intervention children",
    "CBT children anxiety school outcomes",
    "pediatric behavioral therapy effectiveness",
    "school-based mental health intervention children",
    "child psychology therapeutic techniques",
]
DEFAULT_PUBMED = [
    "behavioral intervention children[MeSH] school",
    "CBT anxiety children school-based treatment",
]


def _escape_re(s: str) -> str:
    return re.escape(s)


def make_search(settings: dict):
    async def search(state: ResearchState) -> dict[str, Any]:
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(settings, job_id, progress=40)
            except Exception:
                pass

        s2_key = settings.get("semantic_scholar_api_key", "")

        crossref_queries = (state.get("crossref_queries") or DEFAULT_CROSSREF)[:5]
        s2_queries = (state.get("semantic_scholar_queries") or DEFAULT_S2)[:5]
        pubmed_queries = (state.get("pubmed_queries") or DEFAULT_PUBMED)[:3]

        # Crossref — 500ms gap between queries
        crossref_all: list[dict] = []
        for q in crossref_queries:
            crossref_all.extend(await search_crossref(q, PER_QUERY))
            await asyncio.sleep(0.5)

        # PubMed — 1s gap (NCBI rate limit)
        pubmed_all: list[dict] = []
        for q in pubmed_queries:
            pubmed_all.extend(await search_pubmed(q, PER_QUERY))
            await asyncio.sleep(1.0)

        # Semantic Scholar — gap depends on API key
        s2_delay = 1.1 if s2_key else 0.2
        s2_all: list[dict] = []
        for q in s2_queries:
            s2_all.extend(await search_semantic_scholar(q, PER_QUERY, api_key=s2_key))
            await asyncio.sleep(s2_delay)

        # S2 recommendations from top-cited paper
        rec_results: list[dict] = []
        top_paper = None
        for p in sorted(
            (x for x in s2_all if x.get("s2PaperId") and (x.get("influentialCitationCount") or 0) > 0),
            key=lambda x: x.get("influentialCitationCount", 0),
            reverse=True,
        ):
            top_paper = p
            break
        if top_paper:
            rec_results = await get_recommendations(top_paper["s2PaperId"], 20, api_key=s2_key)
            await asyncio.sleep(s2_delay)

        combined = crossref_all + pubmed_all + s2_all + rec_results

        # Build blacklist regex including dynamic excludedTopics
        dynamic_bad = state.get("excluded_topics") or []
        all_bad = STATIC_BAD_TERMS + dynamic_bad
        bad_pattern = re.compile(
            r"\b(" + "|".join(_escape_re(t) for t in all_bad) + r")\b",
            re.IGNORECASE,
        )

        deduped = dedup_candidates(combined)
        title_filtered = [
            c for c in deduped if not bad_pattern.search(c.get("title", ""))
        ]
        filtered = filter_book_chapters(title_filtered)

        used_fallback = False

        # Fallback: if planned queries returned 0 results and we weren't
        # already using default queries, retry with defaults.
        if not filtered:
            used_planned = (
                state.get("crossref_queries")
                or state.get("semantic_scholar_queries")
                or state.get("pubmed_queries")
            )
            if used_planned:
                used_fallback = True
                fb_crossref: list[dict] = []
                for q in DEFAULT_CROSSREF:
                    fb_crossref.extend(await search_crossref(q, PER_QUERY))
                    await asyncio.sleep(0.5)

                fb_pubmed: list[dict] = []
                for q in DEFAULT_PUBMED:
                    fb_pubmed.extend(await search_pubmed(q, PER_QUERY))
                    await asyncio.sleep(1.0)

                fb_s2: list[dict] = []
                for q in DEFAULT_S2:
                    fb_s2.extend(await search_semantic_scholar(q, PER_QUERY, api_key=s2_key))
                    await asyncio.sleep(s2_delay)

                fb_combined = fb_crossref + fb_pubmed + fb_s2
                fb_deduped = dedup_candidates(fb_combined)
                fb_title_filtered = [
                    c for c in fb_deduped if not bad_pattern.search(c.get("title", ""))
                ]
                filtered = filter_book_chapters(fb_title_filtered)

        diagnostics = state.get("diagnostics") or {}
        diagnostics["searchCount"] = len(filtered)
        diagnostics["searchUsedFallback"] = used_fallback

        return {"candidates": filtered, "diagnostics": diagnostics}

    return search
