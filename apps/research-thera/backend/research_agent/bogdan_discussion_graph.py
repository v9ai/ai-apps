"""LangGraph bogdan-discussion graph — generates a parent discussion guide
specifically for Bogdan, sourced from his full therapeutic context (active
goals, recent issues, contact feedbacks, journal entries) rather than a single
journal entry.

Pipeline: load_bogdan_context -> generate -> persist -> finalize.

Hard-wired to a single family member resolved by the calling resolver, but the
graph itself accepts `family_member_id` so the same machinery can power similar
single-subject one-shot guides for other children later.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END

import psycopg

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402

# ── research_client (local 384-dim embeddings) ────────────────────────────
sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "research" / "src"),
)
from research_client.embeddings import aembed_text  # noqa: E402

from .entity_embeddings import (  # noqa: E402
    rerank_passages,
    search_for_family_member,
    search_global_research,
)


_REQUIRED_KEYS = (
    "behaviorSummary",
    "developmentalContext",
    "conversationStarters",
    "talkingPoints",
    "languageGuide",
    "anticipatedReactions",
    "followUpPlan",
)

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent Romanian. Do not translate proper nouns, "
    "people's names, or citation identifiers."
)


class BogdanDiscussionState(TypedDict, total=False):
    family_member_id: int
    user_email: str
    job_id: str
    is_ro: bool
    # Internal — scaffold
    _scaffold: dict
    _child_age: Optional[int]
    # Internal — retrieval
    _query: str
    _retrieved_entities: list[dict]
    _retrieved_research: list[dict]
    # Internal — prompt
    _prompt: str
    # Internal — critique loop
    _critique: dict
    _refined: bool
    # Internal — citations
    _citations: list[dict]
    # Output
    guide: dict
    guide_id: int
    error: str


_CRITIQUE_THRESHOLD = 7
_RESEARCH_ID_RE = re.compile(r"ResearchID:(\d+)")


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def _update_job_progress(job_id: str, progress: int) -> None:
    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET progress = %s, updated_at = NOW() WHERE id = %s",
                    (progress, job_id),
                )
    except Exception as exc:
        print(f"[bogdan_discussion._update_job_progress] failed: {exc}")


async def _update_job_succeeded(job_id: str, payload: dict) -> None:
    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'SUCCEEDED', progress = 100, "
                    "result = %s, updated_at = NOW() WHERE id = %s",
                    (json.dumps(payload), job_id),
                )
    except Exception as exc:
        print(f"[bogdan_discussion._update_job_succeeded] failed: {exc}")


async def _update_job_failed(job_id: str, error: dict) -> None:
    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'FAILED', error = %s, "
                    "updated_at = NOW() WHERE id = %s",
                    (json.dumps(error), job_id),
                )
    except Exception as exc:
        print(f"[bogdan_discussion._update_job_failed] failed: {exc}")


async def load_scaffold_context(state: BogdanDiscussionState) -> dict:
    """Load the small, always-relevant scaffold: profile, goals, characteristics.

    These are kept rule-based (no embedding retrieval) because there are only
    a handful of each and ALL of them are relevant to ANY discussion.
    """
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    job_id = state.get("job_id")

    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    if job_id:
        await _update_job_progress(job_id, 10)

    scaffold: dict = {
        "profile_section": "",
        "characteristics_section": "",
        "goals_section": "",
        "goal_ids": [],
        "issue_ids": [],
        "journal_ids": [],
    }
    child_age: Optional[int] = None

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                # Profile
                await cur.execute(
                    "SELECT first_name, name, age_years, relationship, date_of_birth, bio "
                    "FROM family_members WHERE id = %s AND user_id = %s",
                    (family_member_id, user_email),
                )
                m_row = await cur.fetchone()
                if not m_row:
                    return {"error": f"Family member {family_member_id} not found"}
                m_first, m_name, m_age, m_rel, m_dob, m_bio = m_row
                child_age = m_age
                parts = [f"**{m_first}" + (f" {m_name}" if m_name else "") + "**"]
                if m_age:
                    parts.append(f"Age: {m_age}")
                if m_rel:
                    parts.append(f"Relationship: {m_rel}")
                if m_dob:
                    parts.append(f"DOB: {m_dob}")
                profile_line = "### Child Profile\n" + " | ".join(parts)
                if m_bio:
                    profile_line += f"\nBio: {m_bio[:300]}"
                scaffold["profile_section"] = profile_line

                # Characteristics (small, stable, always relevant)
                await cur.execute(
                    "SELECT category, title, description, severity "
                    "FROM family_member_characteristics "
                    "WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY created_at DESC",
                    (family_member_id, user_email),
                )
                characteristics = await cur.fetchall()
                if characteristics:
                    ch_lines = []
                    for c_cat, c_title, c_desc, c_sev in characteristics:
                        line = f"- **{c_title}** ({c_cat}" + (f", {c_sev}" if c_sev else "") + ")"
                        if c_desc:
                            line += f"\n  {c_desc[:200]}"
                        ch_lines.append(line)
                    scaffold["characteristics_section"] = (
                        f"### Characteristics & Support Needs ({len(characteristics)})\n"
                        + "\n".join(ch_lines)
                    )

                # Goals (small, stable, always relevant) — also capture id list for FK-scoped research retrieval
                await cur.execute(
                    "SELECT id, title, description, status, priority, tags "
                    "FROM goals WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, "
                    "created_at DESC",
                    (family_member_id, user_email),
                )
                goals = await cur.fetchall()
                if goals:
                    g_lines = []
                    for g_id, g_title, g_desc, g_status, g_prio, g_tags in goals:
                        scaffold["goal_ids"].append(g_id)
                        line = f"- [GoalID:{g_id}] **{g_title}**"
                        if g_status:
                            line += f" [{g_status}]"
                        if g_prio:
                            line += f" priority={g_prio}"
                        if g_desc:
                            line += f"\n  {g_desc[:250]}"
                        try:
                            tags = json.loads(g_tags) if isinstance(g_tags, str) else (g_tags or [])
                            if tags:
                                line += f"\n  Tags: {', '.join(tags[:8])}"
                        except Exception:
                            pass
                        g_lines.append(line)
                    scaffold["goals_section"] = f"### Active Goals ({len(goals)})\n" + "\n".join(g_lines)

                # Issue/journal id lists — used later for FK-scoped research retrieval filter
                await cur.execute(
                    "SELECT id FROM issues WHERE family_member_id = %s AND user_id = %s",
                    (family_member_id, user_email),
                )
                scaffold["issue_ids"] = [r[0] for r in await cur.fetchall()]

                await cur.execute(
                    "SELECT id FROM journal_entries WHERE family_member_id = %s AND user_id = %s",
                    (family_member_id, user_email),
                )
                scaffold["journal_ids"] = [r[0] for r in await cur.fetchall()]
    except Exception as exc:
        return {"error": f"load_scaffold_context failed: {exc}"}

    if job_id:
        await _update_job_progress(job_id, 20)

    return {"_scaffold": scaffold, "_child_age": child_age}


def _build_query_text(scaffold: dict, child_age: Optional[int]) -> str:
    """Synthesize a focused query string from the scaffold for semantic retrieval."""
    parts = ["Parent seeking to have a therapeutic discussion with their child."]
    if child_age:
        parts.append(f"Child age: {child_age} years.")
    if scaffold.get("goals_section"):
        parts.append(scaffold["goals_section"])
    if scaffold.get("characteristics_section"):
        parts.append(scaffold["characteristics_section"])
    parts.append(
        "Focus: emotional regulation, frustration tolerance, opposition, peer conflict, "
        "disruptive behavior, selective communication, evidence-based parenting strategies."
    )
    return "\n\n".join(parts)


async def retrieve_and_compose(state: BogdanDiscussionState) -> dict:
    """Embed a synthetic query → vector search across all Bogdan's embedded rows
    + research papers → cross-encoder rerank → build prompt.
    """
    scaffold = state.get("_scaffold") or {}
    family_member_id = state.get("family_member_id")
    child_age = state.get("_child_age")
    job_id = state.get("job_id")
    is_ro = bool(state.get("is_ro"))

    if not scaffold:
        return {"error": "retrieve_and_compose requires _scaffold from the prior node"}

    query_text = _build_query_text(scaffold, child_age)
    try:
        query_vec = await aembed_text(query_text)
    except Exception as exc:
        return {"error": f"embedding query failed: {exc}"}

    if job_id:
        await _update_job_progress(job_id, 30)

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            # Bogdan-scoped entities: issues/journals/feedbacks/observations/analyses
            entity_candidates = await search_for_family_member(
                conn,
                family_member_id=family_member_id,
                query_vec=query_vec,
                top_k=40,
                entity_types=[
                    "issue",
                    "journal_entry",
                    "contact_feedback",
                    "teacher_feedback",
                    "behavior_observation",
                    "deep_issue_analysis",
                ],
            )
            # Research papers: FK-scoped via goal/issue/journal FKs (preserves topical scoping)
            restrict_ids: list[int] = []
            all_fk_ids = list(
                set(scaffold.get("goal_ids", []) + scaffold.get("issue_ids", []) + scaffold.get("journal_ids", []))
            )
            if all_fk_ids:
                async with conn.cursor() as cur:
                    placeholders = ",".join(["%s"] * len(all_fk_ids))
                    await cur.execute(
                        f"SELECT DISTINCT id FROM therapy_research "
                        f"WHERE goal_id IN ({placeholders}) "
                        f"OR issue_id IN ({placeholders}) "
                        f"OR journal_entry_id IN ({placeholders})",
                        all_fk_ids + all_fk_ids + all_fk_ids,
                    )
                    restrict_ids = [r[0] for r in await cur.fetchall()]
            research_candidates = await search_global_research(
                conn,
                query_vec=query_vec,
                top_k=30,
                restrict_ids=restrict_ids or None,
            )
    except Exception as exc:
        return {"error": f"semantic retrieval failed: {exc}"}

    if job_id:
        await _update_job_progress(job_id, 45)

    # Cross-encoder rerank in separate pools so we keep both categories
    try:
        reranked_entities = await rerank_passages(query_text, entity_candidates, top_k=20)
        reranked_research = await rerank_passages(query_text, research_candidates, top_k=12)
    except Exception as exc:
        return {"error": f"rerank failed: {exc}"}

    if job_id:
        await _update_job_progress(job_id, 55)

    prompt = _compose_prompt(
        scaffold=scaffold,
        retrieved_entities=reranked_entities,
        retrieved_research=reranked_research,
        child_age=child_age,
        is_ro=is_ro,
    )

    return {
        "_retrieved_entities": reranked_entities,
        "_retrieved_research": reranked_research,
        "_prompt": prompt,
    }


def _group_entities_by_type(entities: list[dict]) -> dict[str, list[dict]]:
    buckets: dict[str, list[dict]] = {}
    for e in entities:
        buckets.setdefault(e["entity_type"], []).append(e)
    return buckets


_ENTITY_TYPE_LABELS = {
    "issue": ("IssueID", "Issues"),
    "journal_entry": ("JournalEntry", "Journal Entries"),
    "contact_feedback": ("ContactFeedback", "Contact Feedbacks"),
    "teacher_feedback": ("TeacherFeedback", "Teacher Feedbacks"),
    "behavior_observation": ("Observation", "Behavior Observations"),
    "deep_issue_analysis": ("AnalysisID", "Prior Deep Analyses"),
}


def _compose_prompt(
    scaffold: dict,
    retrieved_entities: list[dict],
    retrieved_research: list[dict],
    child_age: Optional[int],
    is_ro: bool,
) -> str:
    sections: list[str] = []
    if scaffold.get("profile_section"):
        sections.append(scaffold["profile_section"])
    if scaffold.get("characteristics_section"):
        sections.append(scaffold["characteristics_section"])
    if scaffold.get("goals_section"):
        sections.append(scaffold["goals_section"])

    # Grouped retrieved entities with similarity + rerank scores
    buckets = _group_entities_by_type(retrieved_entities)
    for etype, label_pair in _ENTITY_TYPE_LABELS.items():
        rows = buckets.get(etype) or []
        if not rows:
            continue
        id_label, header = label_pair
        lines = []
        for r in rows:
            lines.append(
                f"- [{id_label}:{r['entity_id']}] (sim={r['similarity']:.2f}, "
                f"rerank={r['rerank_score']:.2f})\n  {r['text']}"
            )
        sections.append(f"### Semantically-Retrieved {header} ({len(rows)})\n" + "\n".join(lines))

    # Retrieved research papers
    if retrieved_research:
        lines = []
        for r in retrieved_research:
            lines.append(
                f"- [ResearchID:{r['entity_id']}] (sim={r['similarity']:.2f}, "
                f"rerank={r['rerank_score']:.2f})\n  {r['text']}"
            )
        sections.append(
            f"### Semantically-Retrieved Research Evidence ({len(retrieved_research)} papers)\n"
            + "\n".join(lines)
        )

    full_context = "\n\n".join(sections)
    age_ref = f"{child_age} years old" if child_age else "school-age"
    lego_hint = (
        "\n- Bogdan responds well to LEGO-based play; you may suggest LEGO scenarios "
        "as concrete metaphors or activities to anchor the conversation."
    )

    prompt_parts = [
        "You are a developmental psychology expert helping a parent prepare for an upcoming conversation with their child.",
        "You are NOT writing clinical notes. You are creating a practical, warm, evidence-based discussion guide that the parent can actually use during a real conversation.",
        "",
        "## Full Child Context",
        "",
        "Each retrieved section below shows items ranked by *semantic similarity* to the child's current therapeutic concerns (higher `rerank` score = more relevant). Use these as the primary source material.",
        "",
        full_context,
        "",
        "## Instructions",
        "",
        f"Generate a parent discussion guide for an upcoming conversation with the child above ({age_ref}). Synthesize the goals, retrieved issues, journal entries, feedback, observations, analyses, and research into a single coherent conversation plan.",
        "",
        "1. **behaviorSummary** (string): 1-2 sentences naming the most pressing behavior/theme — cite specific IssueIDs.",
        "",
        "2. **developmentalContext** (object): { stage, explanation, normalizedBehavior, researchBasis } — researchBasis MUST cite real ResearchID:N from the retrieved research above.",
        "",
        "3. **conversationStarters** (array, 3-4 items): { opener, context, ageAppropriateNote (optional) }",
        "",
        "4. **talkingPoints** (array, 3-5 items): { point, explanation, researchBacking (MUST cite real ResearchID:N) }",
        "",
        "5. **languageGuide** (object): { whatToSay (4-6 items), whatNotToSay (3-5 items) } — each item { phrase, reason, alternative }",
        "",
        "6. **anticipatedReactions** (array, 3-4 items): { reaction, likelihood (high/medium/low), howToRespond }",
        "",
        "7. **followUpPlan** (array, 3-4 items): { action, timing, description }",
        "",
        "IMPORTANT RULES:",
        "- Warm, non-judgmental, empathetic language throughout.",
        '- Never label the child — focus on behavior, not character ("what you did" not "you are").',
        "- Be specific and practical — no generic advice.",
        "- Adapt to known characteristics (see scaffold).",
        f"- All language must be adapted to the child's age ({age_ref}).{lego_hint}",
        "- This guide should be something a parent can read in 5 minutes and feel prepared.",
        "",
        "GROUNDING REQUIREMENTS (do NOT skip — this is what makes the guide different from generic advice):",
        "- The context above contains real IDs: GoalID:N, IssueID:N, JournalEntry:N, ContactFeedback:N, TeacherFeedback:N, Observation:N, AnalysisID:N, ResearchID:N.",
        "- Pick 1–3 most pressing IssueIDs (highest rerank) as focus — name them in behaviorSummary.",
        "- Every talkingPoints.researchBacking MUST cite at least one real ResearchID:N from the retrieved research above. Do NOT invent IDs.",
        "- developmentalContext.researchBasis MUST cite specific ResearchIDs.",
        "- Reference specific JournalEntry:N or AnalysisID:N when explaining a pattern.",
        "- Synthesize ACROSS issues when they share a root cause (frustration tolerance, opposition, peer conflict, etc.).",
        "",
        "Respond with a single JSON object containing EXACTLY these top-level keys: "
        + ", ".join(_REQUIRED_KEYS) + ".",
    ]

    prompt = "\n".join(p for p in prompt_parts if p is not None)
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"
    return prompt


async def generate(state: dict) -> dict:
    if state.get("error"):
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 40)

    prompt = state.get("_prompt", "")
    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    try:
        config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=180.0, default_model=model)
    except Exception as exc:
        return {"error": f"generate failed (config): {exc}"}

    parsed: Optional[dict] = None
    last_exc: Optional[Exception] = None
    try:
        async with DeepSeekClient(config) as client:
            for _ in range(2):
                try:
                    resp = await client.chat(
                        [ChatMessage(role="user", content=prompt)],
                        model=model,
                        temperature=0.3,
                        max_tokens=8192,
                        response_format={"type": "json_object"},
                    )
                    content = resp.choices[0].message.content
                    candidate = json.loads(content)
                    if not isinstance(candidate, dict):
                        last_exc = ValueError("expected JSON object at top level")
                        continue
                    parsed = candidate
                    break
                except json.JSONDecodeError as exc:
                    last_exc = exc
                    continue
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}

    if parsed is None:
        return {"error": f"generate failed: {last_exc}"}

    missing = [k for k in _REQUIRED_KEYS if k not in parsed]
    if missing:
        return {"error": f"DeepSeek response missing required keys: {missing}. Got: {list(parsed.keys())}"}

    if job_id:
        await _update_job_progress(job_id, 65)

    return {"guide": parsed}


# ── Critique ─────────────────────────────────────────────────────────────

def _build_critique_prompt(guide: dict, is_ro: bool) -> str:
    rubric = (
        "You are an expert reviewer of parent–child discussion guides. "
        "Given the draft guide JSON below, score it on five axes from 0 to 10 "
        "and list the keys of sections that need a rewrite.\n\n"
        "Axes:\n"
        "- romanianFluency: is every string natural, fluent Romanian? (If non-Romanian text leaks in, score < 5.)\n"
        "- actionability: are talking points and language examples concrete enough that a parent can say them verbatim?\n"
        "- citationCoverage: does every talkingPoints[i].researchBacking and developmentalContext.researchBasis cite at least one ResearchID:N token?\n"
        "- ageAppropriateness: is the tone and vocabulary suitable for the stated child age?\n"
        "- internalConsistency: do the sections tell one coherent story (same behaviors, same goals)?\n\n"
        "Return a SINGLE JSON object with this exact shape:\n"
        "{\n"
        '  "scores": { "romanianFluency": 0-10, "actionability": 0-10, "citationCoverage": 0-10, "ageAppropriateness": 0-10, "internalConsistency": 0-10 },\n'
        '  "sectionNotes": { "<sectionKey>": "<short Romanian critique note>", ... },\n'
        '  "weakSections": [ "<sectionKey>", ... ]   // any section with score < 7, by top-level key\n'
        "}\n\n"
        "Valid section keys: behaviorSummary, developmentalContext, conversationStarters, talkingPoints, "
        "languageGuide, anticipatedReactions, followUpPlan.\n"
    )
    body = "## Draft guide\n\n```json\n" + json.dumps(guide, ensure_ascii=False, indent=2) + "\n```"
    prompt = f"{rubric}\n{body}"
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"
    return prompt


async def critique(state: BogdanDiscussionState) -> dict:
    if state.get("error") or not state.get("guide"):
        return {}

    job_id = state.get("job_id")
    is_ro = bool(state.get("is_ro"))
    guide = state["guide"]

    prompt = _build_critique_prompt(guide, is_ro)
    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    try:
        config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=120.0, default_model=model)
    except Exception as exc:
        return {"error": f"critique failed (config): {exc}"}

    parsed: Optional[dict] = None
    try:
        async with DeepSeekClient(config) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model=model,
                temperature=0.0,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            parsed = json.loads(resp.choices[0].message.content)
    except Exception as exc:
        # Non-fatal — if critique fails, skip refine and proceed to resolve_citations
        print(f"[bogdan_discussion.critique] failed (continuing without critique): {exc}")
        return {"_critique": {}}

    if not isinstance(parsed, dict) or "scores" not in parsed:
        return {"_critique": {}}

    # Normalize
    scores = parsed.get("scores") or {}
    critique_obj = {
        "scores": {
            "romanianFluency": int(scores.get("romanianFluency", 0) or 0),
            "actionability": int(scores.get("actionability", 0) or 0),
            "citationCoverage": int(scores.get("citationCoverage", 0) or 0),
            "ageAppropriateness": int(scores.get("ageAppropriateness", 0) or 0),
            "internalConsistency": int(scores.get("internalConsistency", 0) or 0),
        },
        "sectionNotes": parsed.get("sectionNotes") or {},
        "weakSections": [s for s in (parsed.get("weakSections") or []) if isinstance(s, str)],
        "refined": bool(state.get("_refined")),
    }

    if job_id:
        await _update_job_progress(job_id, 75)

    return {"_critique": critique_obj}


def should_refine(state: BogdanDiscussionState) -> str:
    critique_obj = state.get("_critique") or {}
    if state.get("_refined"):
        return "resolve_citations"
    scores = (critique_obj.get("scores") or {}).values()
    if scores and any(s < _CRITIQUE_THRESHOLD for s in scores):
        return "refine"
    return "resolve_citations"


# ── Refine ───────────────────────────────────────────────────────────────

_VALID_SECTION_KEYS = set(_REQUIRED_KEYS)


def _build_refine_prompt(guide: dict, critique_obj: dict, is_ro: bool) -> str:
    weak = [s for s in critique_obj.get("weakSections", []) if s in _VALID_SECTION_KEYS]
    if not weak:
        # Fallback: pick lowest-scoring axis and rewrite the two most-related sections
        weak = ["talkingPoints", "languageGuide"]
    notes = critique_obj.get("sectionNotes") or {}
    notes_text = "\n".join(
        f"- **{k}**: {notes.get(k, '(no specific note — rewrite for higher actionability and citation coverage)')}"
        for k in weak
    )

    prompt_parts = [
        "You are refining a parent discussion guide. Below is the current draft, a list of weak sections, and specific critique notes per section.",
        "Your task: rewrite ONLY the weak sections, preserving their exact JSON shape and field names. Every talkingPoints.researchBacking must still cite at least one ResearchID:N from the context already used. Be specific, warm, evidence-backed. No generic advice.",
        "",
        "## Current draft",
        "```json",
        json.dumps(guide, ensure_ascii=False, indent=2),
        "```",
        "",
        "## Weak sections + critique notes",
        notes_text,
        "",
        "## Output format",
        "Return a SINGLE JSON object containing ONLY the rewritten weak section keys — do NOT include sections that don't need changes. Keys MUST be from: "
        + ", ".join(sorted(_VALID_SECTION_KEYS))
        + ". The shape under each key MUST match the original draft exactly.",
    ]
    prompt = "\n".join(prompt_parts)
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"
    return prompt


async def refine(state: BogdanDiscussionState) -> dict:
    if state.get("error") or not state.get("guide"):
        return {}

    job_id = state.get("job_id")
    is_ro = bool(state.get("is_ro"))
    guide = dict(state["guide"])
    critique_obj = state.get("_critique") or {}

    prompt = _build_refine_prompt(guide, critique_obj, is_ro)
    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    try:
        config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=180.0, default_model=model)
    except Exception as exc:
        # Non-fatal
        print(f"[bogdan_discussion.refine] config failed (skipping refine): {exc}")
        return {"_refined": True}

    patch: Optional[dict] = None
    try:
        async with DeepSeekClient(config) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model=model,
                temperature=0.2,
                max_tokens=6144,
                response_format={"type": "json_object"},
            )
            patch = json.loads(resp.choices[0].message.content)
    except Exception as exc:
        print(f"[bogdan_discussion.refine] generation failed (keeping original guide): {exc}")
        return {"_refined": True}

    if isinstance(patch, dict):
        for k, v in patch.items():
            if k in _VALID_SECTION_KEYS:
                guide[k] = v

    if job_id:
        await _update_job_progress(job_id, 85)

    return {"guide": guide, "_refined": True}


# ── Resolve citations ────────────────────────────────────────────────────

async def _fetch_research_by_ids(ids: list[int]) -> dict[int, dict]:
    if not ids:
        return {}
    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                placeholders = ",".join(["%s"] * len(ids))
                await cur.execute(
                    f"SELECT id, doi, title, year, authors, url FROM therapy_research WHERE id IN ({placeholders})",
                    ids,
                )
                rows = await cur.fetchall()
    except Exception as exc:
        print(f"[bogdan_discussion._fetch_research_by_ids] failed: {exc}")
        return {}

    out: dict[int, dict] = {}
    for r_id, r_doi, r_title, r_year, r_authors, r_url in rows:
        # authors is stored as JSON array in TEXT; keep as compact string "A; B; C"
        authors_str = r_authors or ""
        try:
            parsed = json.loads(r_authors) if r_authors else None
            if isinstance(parsed, list):
                authors_str = "; ".join(str(a) for a in parsed[:4])
        except Exception:
            pass
        out[int(r_id)] = {
            "researchId": int(r_id),
            "doi": r_doi,
            "title": r_title or f"Paper #{r_id}",
            "year": int(r_year) if r_year else None,
            "authors": authors_str or None,
            "url": r_url,
        }
    return out


def _extract_research_ids(guide: dict) -> tuple[list[int], dict[int, list[int]]]:
    """Returns (unique_ids_in_order, per_talking_point_ids). The list index of
    per_talking_point_ids aligns with guide['talkingPoints']."""
    seen: list[int] = []
    seen_set: set[int] = set()

    def _scan(text: Optional[str]) -> list[int]:
        if not text:
            return []
        ids = [int(m.group(1)) for m in _RESEARCH_ID_RE.finditer(text)]
        out: list[int] = []
        for i in ids:
            if i not in seen_set:
                seen.append(i)
                seen_set.add(i)
            out.append(i)
        return out

    dc = guide.get("developmentalContext") or {}
    _scan(dc.get("researchBasis") if isinstance(dc, dict) else None)

    per_tp: dict[int, list[int]] = {}
    for idx, tp in enumerate(guide.get("talkingPoints") or []):
        if not isinstance(tp, dict):
            per_tp[idx] = []
            continue
        ids = _scan(tp.get("researchBacking"))
        # also pull from relatedResearchIds if model used the structured path
        for rid in tp.get("relatedResearchIds") or []:
            try:
                rid_int = int(rid)
                if rid_int not in seen_set:
                    seen.append(rid_int)
                    seen_set.add(rid_int)
                if rid_int not in ids:
                    ids.append(rid_int)
            except Exception:
                continue
        per_tp[idx] = ids

    return seen, per_tp


async def resolve_citations(state: BogdanDiscussionState) -> dict:
    if state.get("error") or not state.get("guide"):
        return {}
    guide = dict(state["guide"])
    job_id = state.get("job_id")

    unique_ids, per_tp_ids = _extract_research_ids(guide)
    meta = await _fetch_research_by_ids(unique_ids)

    # Guide-level citations (ordered, deduped)
    citations = [meta[i] for i in unique_ids if i in meta]

    # Attach per-talking-point citations
    tps = list(guide.get("talkingPoints") or [])
    for idx, tp in enumerate(tps):
        if not isinstance(tp, dict):
            continue
        ids = per_tp_ids.get(idx) or []
        tp_citations = [meta[i] for i in ids if i in meta]
        tp["citations"] = tp_citations
        tps[idx] = tp
    guide["talkingPoints"] = tps

    if job_id:
        await _update_job_progress(job_id, 95)

    return {"guide": guide, "_citations": citations}


async def persist(state: dict) -> dict:
    if state.get("error") or not state.get("guide"):
        return {}

    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    guide = state["guide"]
    child_age = state.get("_child_age")
    citations = state.get("_citations") or []
    critique_obj = state.get("_critique") or None
    # Only persist the fields the frontend consumes
    if critique_obj:
        critique_payload = {
            "scores": critique_obj.get("scores", {}),
            "weakSections": critique_obj.get("weakSections", []),
            "refined": bool(state.get("_refined")),
        }
    else:
        critique_payload = None

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO bogdan_discussion_guides ("
                    "user_id, family_member_id, child_age, behavior_summary, developmental_context, "
                    "conversation_starters, talking_points, language_guide, anticipated_reactions, "
                    "follow_up_plan, citations, critique, model) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        user_email,
                        family_member_id,
                        child_age,
                        guide.get("behaviorSummary", ""),
                        json.dumps(guide.get("developmentalContext", {})),
                        json.dumps(guide.get("conversationStarters", [])),
                        json.dumps(guide.get("talkingPoints", [])),
                        json.dumps(guide.get("languageGuide", {"whatToSay": [], "whatNotToSay": []})),
                        json.dumps(guide.get("anticipatedReactions", [])),
                        json.dumps(guide.get("followUpPlan", [])),
                        json.dumps(citations),
                        json.dumps(critique_payload) if critique_payload is not None else None,
                        "deepseek-chat",
                    ),
                )
                row = await cur.fetchone()
                guide_id = row[0] if row else None
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}

    return {"guide_id": guide_id}


async def finalize(state: dict) -> dict:
    job_id = state.get("job_id")
    if state.get("error"):
        if job_id:
            await _update_job_failed(job_id, {"message": state["error"]})
        return {"success": False, "message": state["error"]}
    if job_id:
        await _update_job_succeeded(
            job_id,
            {"guideId": state.get("guide_id"), "familyMemberId": state.get("family_member_id")},
        )
    return {"success": True, "message": "Bogdan discussion guide generated successfully."}


def create_bogdan_discussion_graph():
    builder = StateGraph(BogdanDiscussionState)
    builder.add_node("load_scaffold_context", load_scaffold_context)
    builder.add_node("retrieve_and_compose", retrieve_and_compose)
    builder.add_node("generate", generate)
    builder.add_node("critique", critique)
    builder.add_node("refine", refine)
    builder.add_node("resolve_citations", resolve_citations)
    builder.add_node("persist", persist)
    builder.add_node("finalize", finalize)

    builder.add_edge(START, "load_scaffold_context")
    builder.add_edge("load_scaffold_context", "retrieve_and_compose")
    builder.add_edge("retrieve_and_compose", "generate")
    builder.add_edge("generate", "critique")
    builder.add_conditional_edges(
        "critique",
        should_refine,
        {"refine": "refine", "resolve_citations": "resolve_citations"},
    )
    # After refine, re-critique once; should_refine then falls through because _refined=True
    builder.add_edge("refine", "critique")
    builder.add_edge("resolve_citations", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


graph = create_bogdan_discussion_graph()
