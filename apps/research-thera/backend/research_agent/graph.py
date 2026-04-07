"""LangGraph research agent — port of crates/research/src/bin/research_agent.rs (research flow).

Uses create_react_agent with DeepSeek Reasoner and two tools:
  - search_papers: multi-source academic search (OpenAlex / Crossref / Semantic Scholar)
  - get_paper_detail: fetch full abstract + TLDR for a specific paper
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

# Load .env from langgraph directory before anything reads env vars
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .d1 import (
    CharacteristicTarget,
    FeedbackTarget,
    parse_path,
)
from .neon import (
    fetch_contact_feedback,
    fetch_first_goal_id,
    fetch_issues_for_feedback,
    upsert_research_paper,
)
from .reranker import rerank
from .research_sources import (
    get_paper_detail_semantic_scholar,
    search_papers_with_fallback,
)
from .therapy_context import IssueData, TherapyContext


RESEARCH_PREAMBLE = """\
You are a clinical research specialist for a therapeutic platform supporting children and families.
You have access to academic paper search via search_papers and get_paper_detail.
The search tool uses OpenAlex and Crossref as primary sources (no rate limits), falling back to Semantic Scholar for rich metadata.

CRITICAL WORKFLOW — follow this exact order:
1. Run exactly 3 search_papers calls with different query terms; set limit=10 on each call
2. Call get_paper_detail on at most 2 papers for full abstracts
3. Select the TOP 10 most relevant papers — quality over quantity
4. IMMEDIATELY call save_research_papers with the curated papers JSON — do this BEFORE writing any summary
5. After save_research_papers succeeds, write a brief summary (under 500 words)

IMPORTANT RULES:
- You MUST call save_research_papers. Do NOT skip this step or just describe what you would save.
- Do NOT write a long narrative before calling save_research_papers — the tool call must come first.
- The goal_id, feedback_id, issue_id, or journal_entry_id will be provided in the user message — include whichever is given in the save_research_papers call.
- Weight evidence level: meta-analysis > systematic review > RCT > cohort > case study
- Extract concrete therapeutic techniques from each paper
- Identify outcome measures and their effect sizes when available
- Report confidence honestly — say 'insufficient evidence' if the literature is sparse

Evidence levels:
- meta-analysis: pooled analysis of multiple studies
- systematic_review: structured review of literature
- rct: randomized controlled trial
- cohort: prospective observational study
- case_control: retrospective comparison
- case_series: multiple case reports
- case_study: single case report
- expert_opinion: clinical consensus without empirical data"""


def _make_tools(semantic_scholar_api_key: Optional[str] = None) -> list:
    """Build LangGraph tools for academic paper search."""

    @tool
    async def search_papers(query: str, limit: int = 10) -> str:
        """Search 214M+ academic papers on OpenAlex, Crossref, and Semantic Scholar for therapeutic,
        psychological, and clinical research. Results are reranked by a cross-encoder model for
        semantic relevance. Returns titles, authors, citation counts, abstracts, relevance scores,
        and PDF links. Call multiple times with different query terms to cover the topic from
        different angles (e.g., 'CBT anxiety children', 'exposure therapy meta-analysis')."""
        results = await search_papers_with_fallback(query, limit * 3, semantic_scholar_api_key)
        if not results:
            return f"No results found for query: {query}"

        # Cross-encoder rerank: fetch 3x, rerank, return top limit
        ranked = await rerank(query, results, top_k=limit)

        lines = [f"Search results for: {query} (reranked by semantic relevance)\n"]
        for i, r in enumerate(ranked):
            p = r.paper
            authors_str = ", ".join(p.get("authors") or [])
            abstract = (p.get("abstract") or "")[:150]
            lines.append(
                f"[{i + 1}] {p.get('title', 'Unknown')} ({p.get('year', 'n.d.')}) "
                f"[relevance: {r.score:.3f}]\n"
                f"  Authors: {authors_str}\n"
                f"  Abstract: {abstract}...\n"
                f"  DOI: {p.get('doi', '')}\n"
            )
        return "\n".join(lines)

    @tool
    async def get_paper_detail(doi_or_title: str) -> str:
        """Get full details for a specific paper: complete abstract, AI-generated TLDR summary,
        all authors, venue, citation context, and PDF link. Use this on the most relevant papers
        from search_papers to extract therapeutic techniques, outcome measures, and evidence
        level before writing your final report."""
        # Try Semantic Scholar by DOI
        if doi_or_title.startswith("10."):
            detail = await get_paper_detail_semantic_scholar(
                f"DOI:{doi_or_title}", semantic_scholar_api_key
            )
            if detail:
                authors_str = ", ".join(a["name"] for a in detail.get("authors", []))
                tldr = (detail.get("tldr") or {}).get("text", "")
                return (
                    f"Title: {detail.get('title', '')}\n"
                    f"Authors: {authors_str}\n"
                    f"Year: {detail.get('year', 'n.d.')}\n"
                    f"Abstract: {detail.get('abstract', '')}\n"
                    f"TLDR: {tldr}\n"
                    f"Citations: {detail.get('citationCount', 0)}\n"
                )
        # Fall back to title search
        results = await search_papers_with_fallback(doi_or_title, 1, semantic_scholar_api_key)
        if results:
            p = results[0]
            return (
                f"Title: {p.get('title', '')}\n"
                f"Authors: {', '.join(p.get('authors') or [])}\n"
                f"Year: {p.get('year', 'n.d.')}\n"
                f"Abstract: {p.get('abstract', 'No abstract available')}\n"
                f"DOI: {p.get('doi', '')}\n"
            )
        return f"No details found for: {doi_or_title}"

    @tool
    async def save_research_papers(papers_json: str) -> str:
        """Save the final curated research papers to the database. Call this ONCE at the end
        with a JSON string containing: {"goal_id": <int> OR "feedback_id": <int> OR "issue_id": <int> OR "journal_entry_id": <int>,
        "therapeutic_goal_type": "<string>",
        "papers": [{"title": "...", "authors": ["..."], "year": 2024, "doi": "10.xxx",
        "url": "...", "abstract": "...", "key_findings": ["..."], "therapeutic_techniques": ["..."],
        "evidence_level": "rct", "relevance_score": 0.85}]}. This persists the papers so the
        therapist can review them later. Use goal_id when research was triggered for a goal,
        issue_id for an issue, feedback_id for feedback, journal_entry_id for a journal entry."""
        try:
            data = json.loads(papers_json)
        except json.JSONDecodeError as e:
            return f"Invalid JSON: {e}"

        feedback_id = data.get("feedback_id")
        issue_id = data.get("issue_id")
        goal_id = data.get("goal_id")
        journal_entry_id = data.get("journal_entry_id")
        if not feedback_id and not issue_id and not goal_id and not journal_entry_id:
            return "Error: one of goal_id, feedback_id, issue_id, or journal_entry_id is required"

        therapeutic_goal_type = data.get("therapeutic_goal_type", "")
        papers = data.get("papers", [])
        if not papers:
            return "No papers to save"

        saved = 0
        skipped = 0
        failed = 0
        for paper in papers[:10]:
            abstract = (paper.get("abstract") or "").strip()
            if not abstract or abstract.lower() in ("none", "...", "n/a", "no abstract available") or len(abstract) < 50:
                skipped += 1
                continue
            try:
                await upsert_research_paper(
                    therapeutic_goal_type=therapeutic_goal_type,
                    title=paper.get("title", ""),
                    authors=paper.get("authors", []),
                    year=paper.get("year"),
                    doi=paper.get("doi"),
                    url=paper.get("url"),
                    abstract=paper.get("abstract"),
                    key_findings=paper.get("key_findings", []),
                    therapeutic_techniques=paper.get("therapeutic_techniques", []),
                    evidence_level=paper.get("evidence_level"),
                    relevance_score=float(paper.get("relevance_score", 0)),
                    feedback_id=feedback_id,
                    issue_id=issue_id,
                    goal_id=goal_id,
                    journal_entry_id=journal_entry_id,
                )
                saved += 1
            except Exception as e:
                failed += 1
                print(f"[save_research_papers] Error saving paper: {e}")

        parts = [f"Saved {saved} papers to database"]
        if skipped:
            parts.append(f"{skipped} skipped (no abstract)")
        if failed:
            parts.append(f"{failed} failed")
        return ", ".join(parts)

    return [search_papers, get_paper_detail, save_research_papers]


def create_research_agent(
    api_key: Optional[str] = None,
    semantic_scholar_api_key: Optional[str] = None,
):
    """Create a LangGraph ReAct agent using DeepSeek Reasoner.

    When called with no args (by LangGraph server), reads from env vars.
    """
    api_key = api_key or os.environ.get("DEEPSEEK_API_KEY", "")
    semantic_scholar_api_key = semantic_scholar_api_key or os.environ.get(
        "SEMANTIC_SCHOLAR_API_KEY"
    )
    llm = ChatOpenAI(
        model="deepseek-chat",
        api_key=api_key,
        base_url="https://api.deepseek.com/v1",
        temperature=0,
    )
    return create_react_agent(
        model=llm,
        tools=_make_tools(semantic_scholar_api_key),
        prompt=RESEARCH_PREAMBLE,
    )


async def run_research(
    context: TherapyContext,
    api_key: str,
    semantic_scholar_api_key: Optional[str] = None,
) -> str:
    """Run the research agent and return the full markdown output."""
    agent = create_research_agent(api_key, semantic_scholar_api_key)
    prompt = context.build_agent_prompt()
    result = await agent.ainvoke({"messages": [{"role": "user", "content": prompt}]})
    messages = result.get("messages", [])
    for msg in reversed(messages):
        content = getattr(msg, "content", None)
        if content and isinstance(content, str):
            return content
    return ""


def extract_research_json(text: str) -> Optional[str]:
    """Extract JSON from the ## Recommended JSON Output section."""
    for marker in ("## Recommended JSON Output", "## Recommended Optimizer Grid"):
        if marker in text:
            after = text[text.index(marker):]
            m = re.search(r"```json\s*(.*?)```", after, re.DOTALL)
            if m:
                return m.group(1).strip()
    return None


async def load_context_from_url(path: str) -> TherapyContext:
    """Fetch therapy context from Neon via a URL path."""
    target = parse_path(path)
    if isinstance(target, CharacteristicTarget):
        raise ValueError("CharacteristicTarget paths are not supported in the Neon pipeline")
    # FeedbackTarget
    feedback = await fetch_contact_feedback(target.feedback_id)
    try:
        raw_issues = await fetch_issues_for_feedback(target.feedback_id)
    except Exception:
        raw_issues = []
    issues = [
        IssueData(
            title=i.title,
            description=i.description,
            category=i.category,
            severity=i.severity,
            recommendations=json.loads(i.recommendations or "[]") if i.recommendations else [],
        )
        for i in raw_issues
    ]
    return TherapyContext.from_feedback_data(
        feedback.id,
        feedback.family_member_id,
        feedback.subject,
        feedback.content,
        feedback.tags,
        issues,
    )


async def persist_research(
    context: TherapyContext,
    output: dict,
    path: str,
) -> tuple[int, int]:
    """Persist research output papers to Neon. Returns (saved, failed) counts."""
    target = parse_path(path)
    family_member_id = context.family_member_id

    if isinstance(target, FeedbackTarget):
        feedback_id_for_db = target.feedback_id
        try:
            goal_id = await fetch_first_goal_id(family_member_id)
        except Exception:
            goal_id = None
    else:
        feedback_id_for_db = None
        goal_id = await fetch_first_goal_id(family_member_id)
        if goal_id is None:
            raise ValueError(
                f"No goals found for family_member_id={family_member_id}. Create a goal first."
            )

    saved = 0
    failed = 0
    for paper in output.get("papers", [])[:10]:
        try:
            await upsert_research_paper(
                therapeutic_goal_type=output.get("therapeutic_goal_type", ""),
                title=paper.get("title", ""),
                authors=paper.get("authors", []),
                year=paper.get("year"),
                doi=paper.get("doi"),
                url=paper.get("url"),
                abstract=paper.get("abstract"),
                key_findings=paper.get("key_findings", []),
                therapeutic_techniques=paper.get("therapeutic_techniques", []),
                evidence_level=paper.get("evidence_level"),
                relevance_score=float(paper.get("relevance_score", 0.0)),
                feedback_id=feedback_id_for_db,
                goal_id=goal_id,
            )
            saved += 1
        except Exception:
            failed += 1

    return saved, failed


# Module-level graph instance for LangGraph server (reads keys from env)
graph = create_research_agent()
