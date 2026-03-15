"""LangGraph research agent — port of crates/research/src/bin/research_agent.rs (research flow).

Uses create_react_agent with DeepSeek Reasoner and two tools:
  - search_papers: multi-source academic search (OpenAlex / Crossref / Semantic Scholar)
  - get_paper_detail: fetch full abstract + TLDR for a specific paper
"""
from __future__ import annotations

import json
import re
from typing import Optional

from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from .d1 import (
    D1Client,
    CharacteristicTarget,
    FeedbackTarget,
    parse_path,
)
from .research_sources import (
    get_paper_detail_semantic_scholar,
    search_papers_with_fallback,
)
from .therapy_context import IssueData, TherapyContext


RESEARCH_PREAMBLE = """\
You are a clinical research specialist for a therapeutic platform supporting children and families.
You have access to academic paper search via search_papers and get_paper_detail.
The search tool uses OpenAlex and Crossref as primary sources (no rate limits), falling back to Semantic Scholar for rich metadata.

Research standards:
- Run exactly 3 search_papers calls with different query terms; set limit=10 on each call
- Select the TOP 10 most relevant papers — quality over quantity
- Call get_paper_detail on at most 2 papers for full abstracts
- Weight evidence level: meta-analysis > systematic review > RCT > cohort > case study
- Extract concrete therapeutic techniques from each paper
- Identify outcome measures and their effect sizes when available
- Report confidence honestly — say 'insufficient evidence' if the literature is sparse
- The final JSON block MUST contain exactly 10 papers (or fewer if not enough quality results)
- The final JSON block MUST be valid JSON that can be machine-parsed

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
        psychological, and clinical research. Returns titles, authors, citation counts, abstracts,
        and PDF links. Call multiple times with different query terms to cover the topic from
        different angles (e.g., 'CBT anxiety children', 'exposure therapy meta-analysis')."""
        results = await search_papers_with_fallback(query, limit, semantic_scholar_api_key)
        if not results:
            return f"No results found for query: {query}"
        lines = [f"Search results for: {query}\n"]
        for i, p in enumerate(results):
            authors_str = ", ".join(p.get("authors") or [])
            abstract = (p.get("abstract") or "")[:150]
            lines.append(
                f"[{i + 1}] {p.get('title', 'Unknown')} ({p.get('year', 'n.d.')})\n"
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

    return [search_papers, get_paper_detail]


def create_research_agent(
    api_key: str,
    semantic_scholar_api_key: Optional[str] = None,
):
    """Create a LangGraph ReAct agent using DeepSeek Reasoner."""
    llm = ChatOpenAI(
        model="deepseek-reasoner",
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
    """Fetch therapy context from Cloudflare D1 via a URL path."""
    target = parse_path(path)
    d1 = D1Client.from_env()
    try:
        if isinstance(target, CharacteristicTarget):
            char = await d1.fetch_characteristic(target.characteristic_id)
            return TherapyContext.from_characteristic_data(
                char.id,
                target.family_member_id,
                char.category,
                char.title,
                char.description,
                char.severity,
                char.impairment_domains,
            )
        else:  # FeedbackTarget
            feedback = await d1.fetch_contact_feedback(target.feedback_id)
            try:
                raw_issues = await d1.fetch_issues_for_feedback(target.feedback_id)
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
    finally:
        await d1.aclose()


async def persist_research_to_d1(
    context: TherapyContext,
    output: dict,
    path: str,
) -> tuple[int, int]:
    """Persist research output papers to D1. Returns (saved, failed) counts."""
    target = parse_path(path)
    d1 = D1Client.from_env()
    try:
        family_member_id = context.family_member_id

        if isinstance(target, CharacteristicTarget):
            characteristic_id = target.characteristic_id
            feedback_id_for_db = None
            goal_id = await d1.fetch_first_goal_id(family_member_id)
            if goal_id is None:
                raise ValueError(
                    f"No goals found for family_member_id={family_member_id}. Create a goal first."
                )
        else:  # FeedbackTarget
            characteristic_id = 0
            feedback_id_for_db = target.feedback_id
            try:
                goal_id = await d1.fetch_first_goal_id(family_member_id)
            except Exception:
                goal_id = None

        saved = 0
        failed = 0
        for paper in output.get("papers", [])[:10]:
            try:
                await d1.upsert_research_paper(
                    goal_id,
                    feedback_id_for_db,
                    characteristic_id,
                    output.get("therapeutic_goal_type", ""),
                    paper.get("title", ""),
                    json.dumps(paper.get("authors", [])),
                    paper.get("year"),
                    paper.get("doi"),
                    paper.get("url"),
                    json.dumps(paper.get("key_findings", [])),
                    json.dumps(paper.get("therapeutic_techniques", [])),
                    paper.get("evidence_level", ""),
                    float(paper.get("relevance_score", 0.0)),
                )
                saved += 1
            except Exception:
                failed += 1

        return saved, failed
    finally:
        await d1.aclose()
