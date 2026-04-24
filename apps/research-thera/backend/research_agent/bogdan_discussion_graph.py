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
    # Internal
    _prompt: str
    _child_age: Optional[int]
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


async def load_bogdan_context(state: BogdanDiscussionState) -> dict:
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    job_id = state.get("job_id")
    is_ro = bool(state.get("is_ro"))

    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    if job_id:
        await _update_job_progress(job_id, 10)

    child_age: Optional[int] = None
    sections: list[str] = []
    profile_line = ""

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
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
                sections.append(profile_line)

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
                    sections.append(
                        f"### Characteristics & Support Needs ({len(characteristics)})\n"
                        + "\n".join(ch_lines)
                    )

                await cur.execute(
                    "SELECT id, title, description, status, priority, tags "
                    "FROM goals WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, "
                    "created_at DESC LIMIT 10",
                    (family_member_id, user_email),
                )
                goals = await cur.fetchall()
                goal_ids: list[int] = []
                if goals:
                    g_lines = []
                    for g_id, g_title, g_desc, g_status, g_prio, g_tags in goals:
                        goal_ids.append(g_id)
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
                    sections.append(f"### Active Goals ({len(goals)})\n" + "\n".join(g_lines))

                await cur.execute(
                    "SELECT id, title, category, severity, description, journal_entry_id "
                    "FROM issues WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, "
                    "created_at DESC LIMIT 25",
                    (family_member_id, user_email),
                )
                issues = await cur.fetchall()
                issue_ids: list[int] = []
                if issues:
                    i_lines = []
                    for row in issues:
                        issue_ids.append(row[0])
                        line = f"- [IssueID:{row[0]}] **{row[1]}** [{row[3]}/{row[2]}]: {(row[4] or '')[:250]}"
                        if row[5]:
                            line += f"  (extracted from JournalEntry:{row[5]})"
                        i_lines.append(line)
                    sections.append(f"### Known Issues ({len(issues)})\n" + "\n".join(i_lines))

                await cur.execute(
                    "SELECT observed_at, observation_type, intensity, context "
                    "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY observed_at DESC LIMIT 8",
                    (family_member_id, user_email),
                )
                observations = await cur.fetchall()
                if observations:
                    o_lines = []
                    for o_date, o_type, o_int, o_ctx in observations:
                        line = f"- {str(o_date)[:10]}: {o_type}"
                        if o_int:
                            line += f", intensity={o_int}"
                        if o_ctx:
                            line += f" | Context: {o_ctx[:120]}"
                        o_lines.append(line)
                    sections.append(
                        f"### Behavior Observations ({len(observations)})\n" + "\n".join(o_lines)
                    )

                await cur.execute(
                    "SELECT feedback_date, teacher_name, content "
                    "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY feedback_date DESC LIMIT 5",
                    (family_member_id, user_email),
                )
                teacher_fbs = await cur.fetchall()
                if teacher_fbs:
                    tf_lines = [
                        f"- {str(r[0])[:10]} from {r[1]}: {(r[2] or '')[:250]}" for r in teacher_fbs
                    ]
                    sections.append(f"### Teacher Feedbacks ({len(teacher_fbs)})\n" + "\n".join(tf_lines))

                await cur.execute(
                    "SELECT feedback_date, content "
                    "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY feedback_date DESC LIMIT 10",
                    (family_member_id, user_email),
                )
                contact_fbs = await cur.fetchall()
                if contact_fbs:
                    cf_lines = [f"- {str(r[0])[:10]}: {(r[1] or '')[:250]}" for r in contact_fbs]
                    sections.append(f"### Contact Feedbacks ({len(contact_fbs)})\n" + "\n".join(cf_lines))

                await cur.execute(
                    "SELECT id, entry_date, title, content, mood, tags "
                    "FROM journal_entries WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY entry_date DESC LIMIT 20",
                    (family_member_id, user_email),
                )
                journals = await cur.fetchall()
                if journals:
                    j_lines = []
                    for j_id, j_date, j_title, j_content, j_mood, j_tags in journals:
                        line = f"- [JournalEntry:{j_id}] {str(j_date)[:10]}"
                        if j_title:
                            line += f" — {j_title}"
                        if j_mood:
                            line += f" ({j_mood})"
                        if j_content:
                            line += f"\n  {j_content[:300]}"
                        try:
                            tags = json.loads(j_tags) if isinstance(j_tags, str) else (j_tags or [])
                            if tags:
                                line += f"\n  Tags: {', '.join(tags[:8])}"
                        except Exception:
                            pass
                        j_lines.append(line)
                    sections.append(f"### Recent Journal Entries ({len(journals)})\n" + "\n".join(j_lines))

                # Research papers linked to Bogdan's goals AND issues — the evidence base.
                # Pull top-N by relevance so the LLM can ground recommendations with real ResearchID citations.
                research_filter_ids = list(set(goal_ids + issue_ids))
                if research_filter_ids:
                    placeholders = ",".join(["%s"] * len(research_filter_ids))
                    await cur.execute(
                        f"SELECT id, title, evidence_level, key_findings, therapeutic_techniques, "
                        f"goal_id, issue_id, year "
                        f"FROM therapy_research "
                        f"WHERE goal_id IN ({placeholders}) OR issue_id IN ({placeholders}) "
                        f"ORDER BY "
                        f"  CASE evidence_level "
                        f"    WHEN 'meta-analysis' THEN 1 "
                        f"    WHEN 'systematic_review' THEN 2 "
                        f"    WHEN 'rct' THEN 3 "
                        f"    ELSE 4 END, "
                        f"  relevance_score DESC NULLS LAST "
                        f"LIMIT 20",
                        research_filter_ids + research_filter_ids,
                    )
                    research = await cur.fetchall()
                    if research:
                        r_lines = []
                        for r_id, r_title, r_ev, r_kf, r_tt, r_goal, r_issue, r_year in research:
                            line = f"- [ResearchID:{r_id}] \"{r_title}\""
                            if r_year:
                                line += f" ({r_year})"
                            if r_ev:
                                line += f" [{r_ev}]"
                            link_parts = []
                            if r_goal:
                                link_parts.append(f"GoalID:{r_goal}")
                            if r_issue:
                                link_parts.append(f"IssueID:{r_issue}")
                            if link_parts:
                                line += f" → {', '.join(link_parts)}"
                            try:
                                kf = json.loads(r_kf) if isinstance(r_kf, str) else (r_kf or [])
                                if kf:
                                    line += f"\n  Key findings: {' | '.join(kf[:3])}"
                            except Exception:
                                pass
                            try:
                                tt = json.loads(r_tt) if isinstance(r_tt, str) else (r_tt or [])
                                if tt:
                                    line += f"\n  Techniques: {' | '.join(tt[:3])}"
                            except Exception:
                                pass
                            r_lines.append(line)
                        sections.append(
                            f"### Research Evidence Base ({len(research)} papers)\n"
                            + "\n".join(r_lines)
                        )

                await cur.execute(
                    "SELECT id, summary, trigger_issue_id, created_at FROM deep_issue_analyses "
                    "WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY created_at DESC LIMIT 6",
                    (family_member_id, user_email),
                )
                analyses = await cur.fetchall()
                if analyses:
                    a_lines = []
                    for a_id, a_summary, a_trigger, a_created in analyses:
                        line = f"- [AnalysisID:{a_id}] {str(a_created)[:10]}"
                        if a_trigger:
                            line += f" → IssueID:{a_trigger}"
                        if a_summary:
                            line += f"\n  {(a_summary or '')[:400]}"
                        a_lines.append(line)
                    sections.append(
                        f"### Prior Deep Analyses ({len(analyses)})\n" + "\n".join(a_lines)
                    )
    except Exception as exc:
        return {"error": f"load_bogdan_context failed: {exc}"}

    family_context = "\n\n".join(sections)
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
        family_context,
        "",
        "## Instructions",
        "",
        f"Generate a parent discussion guide for an upcoming conversation with the child above ({age_ref}). The guide should synthesize the active goals, known issues, recent observations, teacher/contact feedback, and recent journal entries into a single coherent conversation plan.",
        "",
        "1. **behaviorSummary** (string): A brief 1-2 sentence plain-language summary of the most pressing behavior or theme to discuss right now, drawn from the most recent context above.",
        "",
        "2. **developmentalContext** (object): Help the parent understand WHY this behavior happens at this age.",
        '   - stage (string): The developmental stage name (e.g., "Middle Childhood", "Early Adolescence")',
        "   - explanation (string): What is developmentally normal vs. concerning — in parent-friendly language",
        "   - normalizedBehavior (string): Reassure the parent about what part is age-typical",
        "   - researchBasis (string, optional): Reference any research mentioned in the context above",
        "",
        "3. **conversationStarters** (array, 3-4 items): Age-appropriate ways to open the discussion.",
        "   - opener (string): The exact words a parent could say to begin",
        '   - context (string): When/where to use this opener (e.g., "during a calm moment after dinner", "on a walk")',
        "   - ageAppropriateNote (string, optional): Why this approach works for the developmental stage",
        "",
        "4. **talkingPoints** (array, 3-5 items): Key things to cover.",
        "   - point (string): The main idea to convey",
        "   - explanation (string): How to explain it in age-appropriate terms",
        "   - researchBacking (string, optional): What research supports this approach",
        "",
        "5. **languageGuide** (object): Concrete phrases to use and avoid.",
        "   - whatToSay (array, 4-6 items): Helpful phrases with { phrase, reason, alternative (optional) }",
        "   - whatNotToSay (array, 3-5 items): Harmful phrases with { phrase, reason, alternative (required) }",
        "",
        "6. **anticipatedReactions** (array, 3-4 items): How the child might respond.",
        "   - reaction (string): What the child might say or do",
        '   - likelihood (string): "high", "medium", or "low"',
        "   - howToRespond (string): How the parent should respond",
        "",
        "7. **followUpPlan** (array, 3-4 items): Steps to reinforce the discussion over time.",
        "   - action (string): What to do",
        '   - timing (string): When (e.g., "same evening", "next day", "within a week")',
        "   - description (string): How to do it practically",
        "",
        "IMPORTANT RULES:",
        "- Use warm, non-judgmental, empathetic language throughout.",
        '- Never label the child — focus on the behavior, not the character ("what you did" not "you are").',
        '- Be specific and practical — generic advice like "talk to your child" is unhelpful.',
        "- Adapt to known characteristics (e.g., selective mutism, sensory needs).",
        f"- All language must be adapted to the child's age ({age_ref}).{lego_hint}",
        "- This guide should be something a parent can read in 5 minutes and feel prepared.",
        "",
        "Respond with a single JSON object containing EXACTLY these top-level keys: "
        + ", ".join(_REQUIRED_KEYS) + ".",
    ]

    prompt = "\n".join(p for p in prompt_parts if p is not None)
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"

    if job_id:
        await _update_job_progress(job_id, 25)

    return {"_prompt": prompt, "_child_age": child_age}


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
    builder.add_node("load_bogdan_context", load_bogdan_context)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)
    builder.add_node("finalize", finalize)

    builder.add_edge(START, "load_bogdan_context")
    builder.add_edge("load_bogdan_context", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


graph = create_bogdan_discussion_graph()
