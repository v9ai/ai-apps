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
    # Output
    guide: dict
    guide_id: int
    error: str


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
        await _update_job_progress(job_id, 75)

    return {"guide": parsed}


async def persist(state: dict) -> dict:
    if state.get("error") or not state.get("guide"):
        return {}

    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    guide = state["guide"]
    child_age = state.get("_child_age")

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO bogdan_discussion_guides ("
                    "user_id, family_member_id, child_age, behavior_summary, developmental_context, "
                    "conversation_starters, talking_points, language_guide, anticipated_reactions, "
                    "follow_up_plan, model) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
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
    builder.add_node("persist", persist)
    builder.add_node("finalize", finalize)

    builder.add_edge(START, "load_scaffold_context")
    builder.add_edge("load_scaffold_context", "retrieve_and_compose")
    builder.add_edge("retrieve_and_compose", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


graph = create_bogdan_discussion_graph()
