"""Dedicated research-paper LangGraph node.

Given a topic + optional context terms, this graph runs a deterministic 6-node
pipeline that fans out across all 7 academic-paper sources (OpenAlex, Crossref,
Semantic Scholar, arXiv, PubMed, Europe PMC, bioRxiv/medRxiv), dedupes the
union by DOI / source_id / title, reranks via cross-encoder against the topic,
enriches the top hits with Semantic Scholar TLDR + open-access PDF URL, and
persists the result into ``research_papers`` + ``research_paper_links``.

Pipeline (6 nodes):
  1. expand_queries  — DeepSeek JSON: 3-5 query variants from topic + context
  2. search_sources  — research_client.search_papers_all per query (sequential,
                       per the lead-gen LangGraph fan-out rule); each call fans
                       7 sources internally with asyncio.gather.
  3. dedupe          — collapse on DOI -> arxiv_id -> pubmed_id -> S2 id ->
                       title-hash. Source priority on tie:
                       pubmed > semantic_scholar > openalex > crossref >
                       europe_pmc > arxiv > biorxiv.
  4. rerank          — research_client.reranker.rerank against the topic.
  5. enrich_tldr     — best-effort S2 detail fetch for the top N papers.
  6. persist         — UPSERT research_papers + insert research_paper_links.

Triggered on-demand only via the ``generateProtocolResearch`` mutation.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, TypedDict

import httpx
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy

from research_client import (
    Paper,
    search_papers_all,
    semantic_scholar,
)
from research_client.reranker import rerank as rerank_papers

from research_agent import neon

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------
DEFAULT_LIMIT = 20             # final papers retained after rerank
DEFAULT_PER_SOURCE_LIMIT = 25  # per-source raw fetch cap
DEFAULT_TLDR_TOP_N = 10        # S2 detail fetches for TLDR enrichment
DEFAULT_QUERY_VARIANTS = 4     # query-expansion targets
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

# Tie-break ordering when the same DOI appears from multiple sources.
SOURCE_PRIORITY = {
    "pubmed": 0,
    "semantic_scholar": 1,
    "openalex": 2,
    "crossref": 3,
    "europe_pmc": 4,
    "arxiv": 5,
    "biorxiv": 6,
}

VALID_OWNER_KINDS = frozenset({"protocol", "condition", "medication", "ad_hoc"})


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class PapersResearchState(TypedDict, total=False):
    # Inputs
    topic: str
    context_terms: list[str]
    limit: int
    per_source_limit: int
    min_year: int
    sources: list[str]
    owner_kind: str
    owner_id: str
    user_email: str

    # Internals
    _expanded_queries: list[str]
    _raw_papers: list[dict]
    _deduped: list[dict]
    _ranked: list[dict]
    _enriched: list[dict]

    # Outputs
    paper_ids: list[str]
    counts: dict
    success: bool
    error: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _paper_to_dict(paper: Paper) -> dict[str, Any]:
    return {
        "title": paper.title,
        "authors": paper.authors,
        "year": paper.year,
        "abstract": paper.abstract_text,
        "doi": paper.doi,
        "url": paper.url,
        "pdf_url": paper.pdf_url,
        "source": paper.source,
        "source_id": paper.source_id,
        "arxiv_id": paper.arxiv_id,
        "pubmed_id": paper.pubmed_id,
        "fields_of_study": paper.fields_of_study,
        "published_date": paper.published_date,
        "venue": paper.venue,
        "tldr": paper.tldr,
        "citation_count": paper.citation_count,
    }


def _normalize_doi(doi: Optional[str]) -> Optional[str]:
    if not doi:
        return None
    d = doi.strip().lower()
    d = re.sub(r"^https?://(dx\.)?doi\.org/", "", d)
    return d or None


def _title_hash(title: Optional[str]) -> Optional[str]:
    if not title:
        return None
    norm = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
    if not norm:
        return None
    return hashlib.sha1(norm.encode("utf-8")).hexdigest()


def _dedup_key(p: dict) -> Optional[str]:
    """Return the strongest-available stable identifier for a paper."""
    doi = _normalize_doi(p.get("doi"))
    if doi:
        return f"doi:{doi}"
    if p.get("arxiv_id"):
        return f"arxiv:{p['arxiv_id']}"
    if p.get("pubmed_id"):
        return f"pmid:{p['pubmed_id']}"
    if p.get("source") == "semantic_scholar" and p.get("source_id"):
        return f"s2:{p['source_id']}"
    th = _title_hash(p.get("title"))
    if th:
        return f"title:{th}"
    return None


async def _deepseek_json(
    user_prompt: str,
    system_prompt: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 1024,
    timeout: float = 60.0,
) -> Optional[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        logger.warning("[papers_research] DEEPSEEK_API_KEY not set; skipping query expansion")
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                DEEPSEEK_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False,
                },
            )
        if resp.status_code != 200:
            logger.warning("[papers_research] DeepSeek HTTP %s: %s", resp.status_code, resp.text[:200])
            return None
        body = resp.json()
        content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        return json.loads(content)
    except Exception:
        logger.exception("[papers_research] DeepSeek call failed")
        return None


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------
async def expand_queries(state: PapersResearchState) -> dict:
    topic = (state.get("topic") or "").strip()
    if not topic:
        return {"_expanded_queries": [], "error": "topic is required", "success": False}

    context_terms = [t for t in (state.get("context_terms") or []) if t and isinstance(t, str)]
    target_count = DEFAULT_QUERY_VARIANTS

    system = (
        "You are a research-librarian assistant. Given a primary research topic plus "
        "optional context terms, produce a set of distinct search queries that together "
        "give broad coverage across academic databases. Each query MUST stand alone as a "
        "useful keyword query — no boolean operators, no quotes, no source-specific syntax. "
        "Mix mechanism-level, outcome-level, and population-level phrasings. "
        f"Return STRICT JSON: {{\"queries\": [string, …]}} with at most {target_count} entries. "
        "ALWAYS include the original topic as the first query verbatim."
    )
    user = json.dumps(
        {"topic": topic, "context_terms": context_terms, "max_queries": target_count}
    )
    payload = await _deepseek_json(user, system, temperature=0.3, max_tokens=512)

    queries: list[str] = []
    if isinstance(payload, dict):
        raw = payload.get("queries")
        if isinstance(raw, list):
            for q in raw:
                if isinstance(q, str) and q.strip():
                    queries.append(q.strip())

    # Always guarantee the literal topic is present (LLM-free fallback).
    if not queries or queries[0].lower() != topic.lower():
        queries = [topic, *(q for q in queries if q.lower() != topic.lower())]

    queries = queries[:target_count]
    logger.info("[papers_research] expanded %d -> %d queries", 1, len(queries))
    return {"_expanded_queries": queries}


async def search_sources(state: PapersResearchState) -> dict:
    queries = state.get("_expanded_queries") or []
    per_source_limit = state.get("per_source_limit") or DEFAULT_PER_SOURCE_LIMIT
    sources = state.get("sources")  # None = all 7
    s2_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    mailto = os.environ.get("RESEARCH_MAILTO") or os.environ.get("NCBI_EMAIL")

    raw: list[dict] = []
    # Sequential across queries (single langgraph dev worker dislikes parallel HTTP at
    # graph layer); each search_papers_all() call still fans 7 sources internally.
    for q in queries:
        try:
            papers = await search_papers_all(
                q,
                limit=per_source_limit,
                semantic_scholar_api_key=s2_key,
                mailto=mailto,
                sources=sources,
            )
        except Exception:
            logger.exception("[papers_research] search_papers_all failed for query %r", q)
            continue
        for p in papers:
            raw.append(_paper_to_dict(p))

    logger.info("[papers_research] fetched %d raw papers across %d queries", len(raw), len(queries))
    return {"_raw_papers": raw}


async def dedupe(state: PapersResearchState) -> dict:
    raw = state.get("_raw_papers") or []
    min_year = state.get("min_year")

    bucket: dict[str, dict] = {}
    fallback_idx = 0
    for p in raw:
        if min_year and p.get("year") and int(p["year"]) < min_year:
            continue
        key = _dedup_key(p)
        if not key:
            key = f"_idx:{fallback_idx}"
            fallback_idx += 1

        existing = bucket.get(key)
        if existing is None:
            bucket[key] = dict(p)
            continue

        # Merge: keep the higher-priority source's metadata, but inherit any missing
        # fields (especially pdf_url + tldr) from the lower-priority entry.
        existing_pri = SOURCE_PRIORITY.get(existing.get("source") or "", 99)
        new_pri = SOURCE_PRIORITY.get(p.get("source") or "", 99)
        if new_pri < existing_pri:
            merged = dict(p)
            for k, v in existing.items():
                if merged.get(k) in (None, "", []):
                    merged[k] = v
            bucket[key] = merged
        else:
            for k, v in p.items():
                if existing.get(k) in (None, "", []) and v not in (None, "", []):
                    existing[k] = v

    deduped = list(bucket.values())
    logger.info("[papers_research] dedupe %d -> %d", len(raw), len(deduped))
    return {"_deduped": deduped}


async def rerank(state: PapersResearchState) -> dict:
    deduped = state.get("_deduped") or []
    if not deduped:
        return {"_ranked": []}

    topic = state.get("topic") or ""
    limit = state.get("limit") or DEFAULT_LIMIT

    papers = [
        Paper(
            title=p.get("title") or "",
            authors=p.get("authors") or [],
            year=p.get("year"),
            abstract_text=p.get("abstract"),
            doi=p.get("doi"),
            citation_count=p.get("citation_count"),
            url=p.get("url"),
            pdf_url=p.get("pdf_url"),
            source=p.get("source"),
            source_id=p.get("source_id"),
            fields_of_study=p.get("fields_of_study"),
            published_date=p.get("published_date"),
            venue=p.get("venue"),
            tldr=p.get("tldr"),
            arxiv_id=p.get("arxiv_id"),
            pubmed_id=p.get("pubmed_id"),
        )
        for p in deduped
    ]

    try:
        ranked = await rerank_papers(topic, papers, top_k=limit)
    except Exception:
        logger.exception("[papers_research] reranker failed; falling back to citation-count sort")
        ranked = []
        sorted_papers = sorted(
            zip(papers, deduped),
            key=lambda pair: (pair[0].citation_count or 0),
            reverse=True,
        )[:limit]
        for paper_obj, original in sorted_papers:
            ranked.append(type("RP", (), {"paper": paper_obj, "score": 0.0})())

    out: list[dict] = []
    for rp in ranked:
        # Find the source dict by identity-of-fields (faster than re-keying for small N).
        match_key = _dedup_key(_paper_to_dict(rp.paper))
        original = next(
            (p for p in deduped if _dedup_key(p) == match_key),
            _paper_to_dict(rp.paper),
        )
        merged = dict(original)
        merged["rerank_score"] = float(rp.score)
        out.append(merged)

    logger.info("[papers_research] reranked -> %d papers", len(out))
    return {"_ranked": out}


async def enrich_tldr(state: PapersResearchState) -> dict:
    ranked = state.get("_ranked") or []
    if not ranked:
        return {"_enriched": []}

    s2_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    enrich_n = min(DEFAULT_TLDR_TOP_N, len(ranked))

    async def _enrich(p: dict) -> dict:
        if p.get("tldr"):
            return p
        s2_id = p.get("source_id") if p.get("source") == "semantic_scholar" else None
        if not s2_id and p.get("doi"):
            s2_id = f"DOI:{p['doi']}"
        if not s2_id:
            return p
        try:
            detail = await semantic_scholar.get_paper_detail(s2_id, api_key=s2_key)
        except Exception:
            return p
        if detail is None:
            return p
        merged = dict(p)
        if detail.tldr and not merged.get("tldr"):
            merged["tldr"] = detail.tldr
        if detail.pdf_url and not merged.get("pdf_url"):
            merged["pdf_url"] = detail.pdf_url
        if detail.fields_of_study and not merged.get("fields_of_study"):
            merged["fields_of_study"] = detail.fields_of_study
        return merged

    head = await asyncio.gather(*(_enrich(p) for p in ranked[:enrich_n]))
    enriched = list(head) + ranked[enrich_n:]
    logger.info("[papers_research] enriched top %d", enrich_n)
    return {"_enriched": enriched}


async def persist(state: PapersResearchState) -> dict:
    enriched = state.get("_enriched") or []
    raw_count = len(state.get("_raw_papers") or [])
    deduped_count = len(state.get("_deduped") or [])
    ranked_count = len(state.get("_ranked") or [])

    owner_kind = (state.get("owner_kind") or "ad_hoc").strip()
    owner_id = (state.get("owner_id") or "").strip()
    if owner_kind not in VALID_OWNER_KINDS:
        return {
            "success": False,
            "error": f"invalid owner_kind: {owner_kind!r} (allowed: {sorted(VALID_OWNER_KINDS)})",
            "counts": {"fetched": raw_count, "deduped": deduped_count, "ranked": ranked_count, "persisted": 0},
        }
    if owner_kind != "ad_hoc" and not owner_id:
        return {
            "success": False,
            "error": "owner_id is required when owner_kind != 'ad_hoc'",
            "counts": {"fetched": raw_count, "deduped": deduped_count, "ranked": ranked_count, "persisted": 0},
        }

    if not enriched:
        return {
            "success": True,
            "paper_ids": [],
            "counts": {"fetched": raw_count, "deduped": deduped_count, "ranked": ranked_count, "persisted": 0},
            "message": "No papers found",
        }

    paper_ids: list[str] = []
    async with neon._conn_ctx() as conn:
        async with conn.cursor() as cur:
            for p in enriched:
                doi = _normalize_doi(p.get("doi"))
                source = p.get("source") or "unknown"
                source_id = p.get("source_id") or doi or _title_hash(p.get("title")) or ""
                if not source_id:
                    continue
                authors_json = json.dumps(p.get("authors") or [])
                fos_json = json.dumps(p.get("fields_of_study") or [])
                rerank_score = p.get("rerank_score")

                await cur.execute(
                    """
                    INSERT INTO research_papers (
                      doi, source, source_id, title, authors, year, abstract, tldr,
                      url, pdf_url, citation_count, fields_of_study, venue, rerank_score,
                      created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, now(), now())
                    ON CONFLICT (source, source_id) DO UPDATE SET
                      doi = COALESCE(EXCLUDED.doi, research_papers.doi),
                      title = EXCLUDED.title,
                      authors = EXCLUDED.authors,
                      year = COALESCE(EXCLUDED.year, research_papers.year),
                      abstract = COALESCE(EXCLUDED.abstract, research_papers.abstract),
                      tldr = COALESCE(EXCLUDED.tldr, research_papers.tldr),
                      url = COALESCE(EXCLUDED.url, research_papers.url),
                      pdf_url = COALESCE(EXCLUDED.pdf_url, research_papers.pdf_url),
                      citation_count = COALESCE(EXCLUDED.citation_count, research_papers.citation_count),
                      fields_of_study = COALESCE(EXCLUDED.fields_of_study, research_papers.fields_of_study),
                      venue = COALESCE(EXCLUDED.venue, research_papers.venue),
                      rerank_score = GREATEST(COALESCE(EXCLUDED.rerank_score, 0), COALESCE(research_papers.rerank_score, 0)),
                      updated_at = now()
                    RETURNING id
                    """,
                    (
                        doi,
                        source,
                        source_id,
                        p.get("title") or "",
                        authors_json,
                        p.get("year"),
                        p.get("abstract"),
                        p.get("tldr"),
                        p.get("url"),
                        p.get("pdf_url"),
                        p.get("citation_count"),
                        fos_json,
                        p.get("venue"),
                        rerank_score,
                    ),
                )
                row = await cur.fetchone()
                if not row:
                    continue
                paper_id = str(row[0])
                paper_ids.append(paper_id)

                if owner_kind != "ad_hoc":
                    await cur.execute(
                        """
                        INSERT INTO research_paper_links (paper_id, owner_kind, owner_id, rerank_score, created_at)
                        VALUES (%s, %s, %s, %s, now())
                        ON CONFLICT (paper_id, owner_kind, owner_id) DO UPDATE SET
                          rerank_score = GREATEST(
                            COALESCE(EXCLUDED.rerank_score, 0),
                            COALESCE(research_paper_links.rerank_score, 0)
                          )
                        """,
                        (paper_id, owner_kind, owner_id, rerank_score),
                    )

    return {
        "success": True,
        "paper_ids": paper_ids,
        "counts": {
            "fetched": raw_count,
            "deduped": deduped_count,
            "ranked": ranked_count,
            "persisted": len(paper_ids),
        },
        "message": f"Persisted {len(paper_ids)} papers for {owner_kind}={owner_id or 'ad_hoc'}",
    }


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def build_graph(checkpointer: Any = None):
    builder = StateGraph(PapersResearchState)
    retry = RetryPolicy(max_attempts=2)
    builder.add_node("expand_queries", expand_queries, retry=retry)
    builder.add_node("search_sources", search_sources, retry=retry)
    builder.add_node("dedupe", dedupe)
    builder.add_node("rerank", rerank)
    builder.add_node("enrich_tldr", enrich_tldr)
    builder.add_node("persist", persist, retry=retry)

    builder.add_edge(START, "expand_queries")
    builder.add_edge("expand_queries", "search_sources")
    builder.add_edge("search_sources", "dedupe")
    builder.add_edge("dedupe", "rerank")
    builder.add_edge("rerank", "enrich_tldr")
    builder.add_edge("enrich_tldr", "persist")
    builder.add_edge("persist", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
