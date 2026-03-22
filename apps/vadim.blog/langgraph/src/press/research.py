"""Research phase — paper search, dedup, DeepSeek synthesis."""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime

from langchain_openai import ChatOpenAI

from press import prompts
from press.agents import Agent
from press.papers import ResearchPaper
from press.papers.core_api import CoreClient
from press.papers.crossref import CrossrefClient
from press.papers.editorial import search_editorial
from press.papers.openalex import OpenAlexClient
from press.papers.semantic_scholar import SemanticScholarClient

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year


@dataclass
class ResearchConfig:
    enable_paper_search: bool = True
    enable_editorial_search: bool = True


@dataclass
class ResearchOutput:
    notes: str
    paper_count: int
    papers: list[ResearchPaper] = field(default_factory=list)


def _score_paper(paper: ResearchPaper) -> float:
    """Score a paper combining citations and recency.

    Recency boost: papers from the last 2 years get up to +50 points,
    papers from 3-5 years ago get a smaller boost.
    """
    citations = paper.citation_count or 0
    recency_boost = 0.0
    if paper.year:
        age = CURRENT_YEAR - paper.year
        if age <= 1:
            recency_boost = 50.0
        elif age <= 2:
            recency_boost = 30.0
        elif age <= 3:
            recency_boost = 15.0
        elif age <= 5:
            recency_boost = 5.0
    return citations + recency_boost


def deduplicate_and_rank(
    papers: list[ResearchPaper], limit: int
) -> list[ResearchPaper]:
    """Deduplicate papers by normalized title + DOI, sort by score, truncate."""
    seen_titles: set[str] = set()
    seen_dois: set[str] = set()
    unique: list[ResearchPaper] = []
    for p in papers:
        title_key = p.title.strip().lower()
        if not title_key:
            continue
        # DOI-based dedup (catches same paper with slightly different titles)
        doi_key = p.doi.strip().lower() if p.doi else ""
        if doi_key and doi_key in seen_dois:
            continue
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        if doi_key:
            seen_dois.add(doi_key)
        unique.append(p)
    unique.sort(key=_score_paper, reverse=True)
    return unique[:limit]


def format_paper_digest(papers: list[ResearchPaper]) -> str:
    """Format a list of papers into a readable markdown digest."""
    if not papers:
        return ""

    lines = ["## Academic Papers Found\n"]
    for i, p in enumerate(papers, 1):
        authors = ", ".join(p.authors) if p.authors else "Unknown"
        year = str(p.year) if p.year else "n/a"
        cites = p.citation_count or 0
        url = p.url or ""
        title_link = f"[{p.title}]({url})" if url else p.title
        source_link = f"[{p.source.value}]({url})" if url else p.source.value
        lines.append(
            f"### {i}. {title_link} ({year}) — {source_link}\n"
            f"**Authors:** {authors}\n"
            f"**Citations:** {cites}"
        )
        if p.abstract_text:
            abstract = p.abstract_text
            if len(abstract) > 300:
                end = 300
                while end > 0 and not abstract[end - 1].isascii():
                    end -= 1
                abstract = abstract[:end] + "…"
            lines.append(f"**Abstract:** {abstract}")
        lines.append("")

    return "\n".join(lines)


def format_editorial_digest(articles: list[ResearchPaper]) -> str:
    """Format editorial articles into a readable markdown digest."""
    if not articles:
        return ""

    lines = ["## Editorial Sources Found\n"]
    for i, a in enumerate(articles, 1):
        authors = ", ".join(a.authors) if a.authors else "Staff"
        year = str(a.year) if a.year else "n/a"
        url = a.url or ""
        source_link = f"[{a.source.value}]({url})" if url else a.source.value
        lines.append(
            f"### {i}. [{a.title}]({url}) ({year}) — {source_link}\n"
            f"**Author(s):** {authors}"
        )
        if a.abstract_text:
            abstract = a.abstract_text
            if len(abstract) > 300:
                abstract = abstract[:300] + "\u2026"
            lines.append(f"**Summary:** {abstract}")
        lines.append("")

    return "\n".join(lines)


def _expand_query(query: str) -> list[str]:
    """Generate query variants for broader coverage.

    Returns the original query plus a shorter keyword-focused variant
    (if the original is long enough to benefit from expansion).
    """
    queries = [query]
    words = query.split()
    if len(words) > 4:
        # Shorter variant: keep first 4 meaningful words
        short = " ".join(words[:4])
        queries.append(short)
    return queries


async def _search_single_query(
    query: str,
    scholar: SemanticScholarClient,
    openalex: OpenAlexClient,
    crossref: CrossrefClient,
    core: CoreClient,
) -> list[ResearchPaper]:
    """Search all 4 databases for a single query in parallel."""
    scholar_res, openalex_res, crossref_res, core_res = await asyncio.gather(
        scholar.search_bulk(query, limit=15),
        openalex.search(query, per_page=10),
        crossref.search(query, rows=10),
        core.search(query, limit=10),
    )

    logger.info(
        "Paper counts [%s] — Scholar: %d, OpenAlex: %d, Crossref: %d, CORE: %d",
        query[:40],
        len(scholar_res), len(openalex_res), len(crossref_res), len(core_res),
    )

    return scholar_res + openalex_res + crossref_res + core_res


async def search_papers(query: str) -> tuple[list[ResearchPaper], str]:
    """Search 4 databases with query expansion, dedup and rank results."""
    scholar = SemanticScholarClient(os.environ.get("SEMANTIC_SCHOLAR_API_KEY"))
    openalex = OpenAlexClient(os.environ.get("OPENALEX_MAILTO"))
    crossref = CrossrefClient(os.environ.get("CROSSREF_MAILTO"))
    core = CoreClient(os.environ.get("CORE_API_KEY"))

    queries = _expand_query(query)
    query_results = await asyncio.gather(
        *[
            _search_single_query(q, scholar, openalex, crossref, core)
            for q in queries
        ]
    )

    all_papers: list[ResearchPaper] = []
    for batch in query_results:
        all_papers.extend(batch)

    all_papers = deduplicate_and_rank(all_papers, 10)
    logger.info("Paper search: %d unique papers after dedup", len(all_papers))

    if not all_papers:
        return [], ""

    digest = format_paper_digest(all_papers)
    return all_papers, digest


async def _empty_papers() -> tuple[list[ResearchPaper], str]:
    return [], ""


async def _empty_editorial() -> list[ResearchPaper]:
    return []


async def research_phase(
    topic: str,
    angle: str,
    niche: str,
    config: ResearchConfig,
    model: ChatOpenAI,
) -> ResearchOutput:
    """Full research phase: paper search + editorial search + LLM synthesis."""
    brief = f"Topic: {topic}\nAngle: {angle}\n"

    # Stage A — parallel: paper search + editorial search
    paper_coro = search_papers(topic) if config.enable_paper_search else _empty_papers()
    editorial_coro = (
        search_editorial(topic) if config.enable_editorial_search
        else _empty_editorial()
    )

    logger.info("Research phase: searching papers + editorial for '%s'", topic)
    (papers, paper_digest), editorial_articles = await asyncio.gather(
        paper_coro, editorial_coro,
    )
    paper_count = len(papers)
    editorial_digest = format_editorial_digest(editorial_articles)

    # Stage B — synthesis with all available sources
    combined_digest = ""
    if paper_digest:
        combined_digest += paper_digest
    if editorial_digest:
        if combined_digest:
            combined_digest += "\n\n"
        combined_digest += editorial_digest

    if combined_digest:
        system = prompts.researcher_with_sources(niche)
        user_input = f"{brief}\n{combined_digest}"
    else:
        system = prompts.researcher(niche)
        user_input = brief

    agent = Agent("researcher", system, model)
    notes = await agent.run(user_input)

    return ResearchOutput(notes=notes, paper_count=paper_count, papers=papers)
