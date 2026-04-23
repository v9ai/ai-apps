"""LangGraph research agent — port of crates/research/src/bin/research_agent.rs (research flow).

Uses create_react_agent with DeepSeek Chat and three tools:
  - search_papers: multi-source academic search (OpenAlex / Crossref / Semantic Scholar)
  - get_paper_detail: fetch full abstract + TLDR for a specific paper
  - save_research_papers: persist curated papers to Neon PostgreSQL
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Optional, TypedDict

import httpx
import psycopg
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent

# Load .env from langgraph directory before anything reads env vars
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .d1 import (
    CharacteristicTarget,
    FeedbackTarget,
    parse_path,
)
from .neon import (
    _get_conn_str,
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

QUERY DESIGN:
- If the user message contains a **Subject Profile** section (with Priority Concerns, Known Issues, Teacher Observations, Behavior Observations, Journal Entries, or Prior Clinical Analyses), USE those concrete behaviors and observations to shape your 3 queries — not just the goal title. The profile is the clinical picture you are searching for evidence about.
- For parent-regulation goals, one query should target the parent skill (e.g. "parent emotion regulation", "parental burnout mindfulness"), one the child presentation surfaced by the profile (e.g. "oppositional defiant disorder child intervention", "collaborative problem solving Greene"), and one the dyadic interaction (e.g. "parent-child coregulation training RCT").
- The 3 queries must be complementary, not redundant.

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
    """Create a LangGraph ReAct agent using DeepSeek Chat.

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


# ---------------------------------------------------------------------------
# Job-tracking + eval wrapper (parity with the retired TS Mastra workflow)
# ---------------------------------------------------------------------------
#
# The GraphQL `generateResearch` resolver creates a `generation_jobs` row and
# fires-and-forgets the graph call, passing `jobId`, `userEmail`, context ids,
# `hasRelatedMember`, `evalPromptContext`, and `plannedQueries` in the input.
# The graph is responsible for transitioning that row to SUCCEEDED (with
# `{count, output, evals}` JSON) or FAILED (with `{message, code}` JSON).
#
# The frontend polls `generationJob.status / progress / result.count` — if the
# graph never updates the row, UIs stall. This section ports that lifecycle
# from the retired `src/workflows/research.workflow.ts`.

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

EVIDENCE_WEIGHTS: dict[str, float] = {
    "meta-analysis": 1.0,
    "meta_analysis": 1.0,
    "systematic_review": 0.9,
    "systematic-review": 0.9,
    "rct": 0.8,
    "cohort": 0.6,
    "case_control": 0.5,
    "case-control": 0.5,
    "case_series": 0.35,
    "case-series": 0.35,
    "case_study": 0.2,
    "case-study": 0.2,
    "expert_opinion": 0.1,
}


class ResearchPipelineState(TypedDict, total=False):
    # Inputs (mirror TS inputSchema)
    messages: list[dict]
    jobId: Optional[str]
    userEmail: Optional[str]
    goalId: Optional[int]
    issueId: Optional[int]
    feedbackId: Optional[int]
    journalEntryId: Optional[int]
    hasRelatedMember: Optional[bool]
    evalPromptContext: Optional[str]
    plannedQueries: Optional[list[str]]
    # Internal
    _agent_output: str
    _saved_count: int
    _summary: str
    _evals: Optional[dict]
    _error: Optional[dict]


def _clamp01(v: Any) -> float:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0.0
    if n != n:  # NaN
        return 0.0
    return max(0.0, min(1.0, n))


def _round2(n: float) -> float:
    return round(n * 100) / 100


def _parse_json_field(value: Any) -> list:
    if not value:
        return []
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


async def _deepseek_json(prompt: str, system_prompt: Optional[str] = None, timeout: float = 20.0) -> Optional[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[deepseek_json] DEEPSEEK_API_KEY not set")
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
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system_prompt or "Respond with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                    "stream": False,
                },
            )
            if resp.status_code != 200:
                print(f"[deepseek_json] HTTP {resp.status_code}: {resp.text[:200]}")
                return None
            body = resp.json()
            content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                print(f"[deepseek_json] JSON parse failed: {content[:200]}")
                return None
    except Exception as exc:
        print(f"[deepseek_json] fetch error: {exc}")
        return None


async def _run_research_evals(
    *,
    goal_id: Optional[int],
    issue_id: Optional[int],
    feedback_id: Optional[int],
    journal_entry_id: Optional[int],
    prompt_context: str,
    has_related_member: bool,
) -> dict:
    """Evaluate saved papers against the clinical context using DeepSeek JSON.

    Mirrors `runResearchEvals` in research.workflow.ts.
    """
    if journal_entry_id is not None:
        where, val = "journal_entry_id = %s", journal_entry_id
    elif issue_id is not None:
        where, val = "issue_id = %s", issue_id
    elif feedback_id is not None:
        where, val = "feedback_id = %s", feedback_id
    elif goal_id is not None:
        where, val = "goal_id = %s", goal_id
    else:
        return {
            "relevance": 0,
            "actionability": 0,
            "evidenceQuality": 0,
            "overall": 0,
            "rationale": "no papers found",
            "paperCount": 0,
            "error": "no ids provided",
        }

    rows: list[tuple] = []
    try:
        async with await psycopg.AsyncConnection.connect(_get_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level "
                    f"FROM therapy_research WHERE {where} "
                    f"ORDER BY relevance_score DESC LIMIT 10",
                    (val,),
                )
                rows = await cur.fetchall()
    except Exception as exc:
        print(f"[run_research_evals] query failed: {exc}")
        return {
            "relevance": 0,
            "actionability": 0,
            "evidenceQuality": 0,
            "overall": 0,
            "rationale": f"query failed: {exc}",
            "paperCount": 0,
            "error": str(exc),
        }

    if not rows:
        return {
            "relevance": 0,
            "actionability": 0,
            "evidenceQuality": 0,
            "overall": 0,
            "rationale": "no papers found",
            "paperCount": 0,
            "error": "no papers found",
        }

    evidence_quality = sum(
        EVIDENCE_WEIGHTS.get(r[4] or "", 0.3) for r in rows
    ) / len(rows)

    def _format_paper(i: int, row: tuple) -> str:
        title, abstract, key_findings, techniques, _ev = row
        kf = "; ".join(_parse_json_field(key_findings)[:3])
        tt = "; ".join(_parse_json_field(techniques)[:3])
        abs_snip = (abstract or "")[:200]
        return f"[{i + 1}] {title}\nAbstract: {abs_snip}\nKey findings: {kf}\nTechniques: {tt}"

    papers_text = "\n\n".join(_format_paper(i, r) for i, r in enumerate(rows))

    family_line = (
        "- familyDynamicsCoverage: how well papers address family and relational "
        "dynamics (important: a related family member is involved)"
        if has_related_member
        else "- familyDynamicsCoverage: set to 0 since no related family member is involved"
    )
    eval_prompt = "\n".join([
        "You are evaluating research papers curated for a therapy case.",
        "",
        "## Clinical Context",
        (prompt_context or "")[:800],
        "",
        f"## Papers Found ({len(rows)})",
        papers_text,
        "",
        'Return JSON: {"relevance": 0-1, "actionability": 0-1, "familyDynamicsCoverage": 0-1, "rationale": "..."}',
        "- relevance: how well papers match the clinical topic",
        "- actionability: how actionable the techniques are for a practicing therapist",
        family_line,
        "- rationale: brief 2-3 sentence summary",
    ])

    parsed = await _deepseek_json(eval_prompt) or {}
    relevance = _clamp01(parsed.get("relevance"))
    actionability = _clamp01(parsed.get("actionability"))
    family_dyn = _clamp01(parsed.get("familyDynamicsCoverage"))
    rationale = parsed.get("rationale") or ""

    components = [relevance, actionability, evidence_quality]
    if has_related_member:
        components.append(family_dyn)
    overall = sum(components) / len(components)

    out: dict = {
        "relevance": _round2(relevance),
        "actionability": _round2(actionability),
        "evidenceQuality": _round2(evidence_quality),
        "overall": _round2(overall),
        "rationale": rationale,
        "paperCount": len(rows),
    }
    if has_related_member:
        out["familyDynamicsCoverage"] = _round2(family_dyn)
    return out


async def _count_saved_papers(
    *,
    goal_id: Optional[int],
    issue_id: Optional[int],
    feedback_id: Optional[int],
    journal_entry_id: Optional[int],
) -> int:
    """Count therapy_research rows persisted for the active context id."""
    if journal_entry_id is not None:
        where, val = "journal_entry_id = %s", journal_entry_id
    elif issue_id is not None:
        where, val = "issue_id = %s", issue_id
    elif feedback_id is not None:
        where, val = "feedback_id = %s", feedback_id
    elif goal_id is not None:
        where, val = "goal_id = %s", goal_id
    else:
        return 0
    try:
        async with await psycopg.AsyncConnection.connect(_get_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"SELECT COUNT(*) FROM therapy_research WHERE {where}",
                    (val,),
                )
                row = await cur.fetchone()
                return int(row[0]) if row else 0
    except Exception as exc:
        print(f"[count_saved_papers] failed: {exc}")
        return 0


async def _update_job_succeeded(job_id: str, payload: dict) -> None:
    try:
        async with await psycopg.AsyncConnection.connect(_get_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'SUCCEEDED', progress = 100, "
                    "result = %s, updated_at = NOW() WHERE id = %s",
                    (json.dumps(payload), job_id),
                )
    except Exception as exc:
        print(f"[update_job_succeeded] failed: {exc}")


async def _update_job_failed(job_id: str, error: dict) -> None:
    try:
        async with await psycopg.AsyncConnection.connect(_get_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'FAILED', error = %s, "
                    "updated_at = NOW() WHERE id = %s",
                    (json.dumps(error), job_id),
                )
    except Exception as exc:
        print(f"[update_job_failed] failed: {exc}")


# ---------------------------------------------------------------------------
# Pipeline nodes
# ---------------------------------------------------------------------------


async def _node_run_agent(state: ResearchPipelineState) -> dict:
    """Invoke the ReAct research agent with the user message.

    If `plannedQueries` is supplied, inject them as a hint so the agent uses
    the LLM-planned queries instead of deriving its own — this preserves the
    resolver-side planner behavior that the TS workflow had.
    """
    messages = state.get("messages") or []
    user_msg = next(
        (m for m in reversed(messages) if (m.get("role") == "user") and m.get("content")),
        None,
    )
    if not user_msg:
        return {"_error": {"message": "no user message in input", "code": "NO_USER_MESSAGE"}}

    content = user_msg["content"]
    planned = state.get("plannedQueries") or []
    if isinstance(planned, list) and len(planned) >= 1:
        cleaned = [q.strip()[:200] for q in planned[:3] if isinstance(q, str) and q.strip()]
        if cleaned:
            hint = (
                "\n\nSuggested search queries (use these for your 3 search_papers calls "
                "unless clearly inappropriate):\n- " + "\n- ".join(cleaned)
            )
            content = content + hint

    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    semantic_scholar_api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    agent = create_research_agent(api_key, semantic_scholar_api_key)

    try:
        result = await agent.ainvoke({"messages": [{"role": "user", "content": content}]})
    except Exception as exc:
        return {"_error": {"message": str(exc), "code": "AGENT_FAILED"}}

    agent_messages = result.get("messages", [])
    output = ""
    for msg in reversed(agent_messages):
        msg_content = getattr(msg, "content", None)
        if msg_content and isinstance(msg_content, str):
            output = msg_content
            break
    return {"_agent_output": output}


async def _node_tally_and_save(state: ResearchPipelineState) -> dict:
    """Count saved papers and mark the job SUCCEEDED (or FAILED if zero)."""
    if state.get("_error"):
        job_id = state.get("jobId")
        if job_id:
            await _update_job_failed(job_id, state["_error"])  # type: ignore[arg-type]
        return {"_saved_count": 0, "_summary": f"Error: {state['_error'].get('message')}"}

    saved = await _count_saved_papers(
        goal_id=state.get("goalId"),
        issue_id=state.get("issueId"),
        feedback_id=state.get("feedbackId"),
        journal_entry_id=state.get("journalEntryId"),
    )
    summary = f"Curated {saved} papers from academic search."
    job_id = state.get("jobId")
    if job_id:
        if saved == 0:
            await _update_job_failed(
                job_id,
                {
                    "message": "Research pipeline completed but no papers could be saved. "
                               "Try rephrasing or try again later.",
                    "code": "NO_PAPERS_SAVED",
                },
            )
        else:
            # Mark SUCCEEDED immediately so the UI unblocks; evals are best-effort.
            await _update_job_succeeded(job_id, {"count": saved, "output": summary})
    return {"_saved_count": saved, "_summary": summary}


async def _node_evals(state: ResearchPipelineState) -> dict:
    """Best-effort eval pass; rewrites `result` with evals appended."""
    if state.get("_error") or state.get("_saved_count", 0) == 0:
        return {}
    job_id = state.get("jobId")
    if not job_id:
        return {}

    user_msg = next(
        (m for m in reversed(state.get("messages") or []) if m.get("role") == "user"),
        None,
    )
    prompt_context = state.get("evalPromptContext") or (user_msg or {}).get("content") or ""
    try:
        evals = await _run_research_evals(
            goal_id=state.get("goalId"),
            issue_id=state.get("issueId"),
            feedback_id=state.get("feedbackId"),
            journal_entry_id=state.get("journalEntryId"),
            prompt_context=prompt_context,
            has_related_member=bool(state.get("hasRelatedMember")),
        )
    except Exception as exc:
        print(f"[research.graph] eval error: {exc}")
        return {}

    try:
        await _update_job_succeeded(
            job_id,
            {"count": state.get("_saved_count", 0), "output": state.get("_summary", ""), "evals": evals},
        )
    except Exception as exc:
        print(f"[research.graph] eval result write failed: {exc}")
    return {"_evals": evals}


def _node_finalize(state: ResearchPipelineState) -> dict:
    """Return the final LangGraph output: messages list matching TS outputSchema."""
    if state.get("_error"):
        msg = state["_error"].get("message", "Research pipeline error")  # type: ignore[union-attr]
        return {"messages": [{"type": "ai", "content": f"Research pipeline error: {msg}"}]}
    summary = state.get("_summary") or state.get("_agent_output") or ""
    return {"messages": [{"type": "ai", "content": summary}]}


def create_research_pipeline():
    """Compile the ReAct-agent wrapper that also manages generation_jobs + evals."""
    builder = StateGraph(ResearchPipelineState)
    builder.add_node("run_agent", _node_run_agent)
    builder.add_node("tally_and_save", _node_tally_and_save)
    builder.add_node("evals", _node_evals)
    builder.add_node("finalize", _node_finalize)

    builder.add_edge(START, "run_agent")
    builder.add_edge("run_agent", "tally_and_save")
    builder.add_edge("tally_and_save", "evals")
    builder.add_edge("evals", "finalize")
    builder.add_edge("finalize", END)
    return builder.compile()


# Module-level graph instance for LangGraph server (reads keys from env).
# Wraps the ReAct research agent with parity-matching job-tracking + evals
# (ported from the retired `src/workflows/research.workflow.ts`).
graph = create_research_pipeline()
