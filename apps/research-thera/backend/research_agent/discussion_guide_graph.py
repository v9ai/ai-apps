"""LangGraph discussion-guide graph — generates a parent discussion guide for a
journal entry. Mirrors the legacy TS `generateDiscussionGuide` resolver but runs
inside the CF Container so it isn't bound by Vercel's ~25s function limit.

Pipeline: collect_data → generate → persist → finalize.
The `generate` step is a single DeepSeek call (JSON mode, max 8192 tokens) that
regularly takes 30–60s. Progress is written straight to `generation_jobs` and
the result row to `discussion_guides`, so the frontend can poll without any
HTTP connection back to Vercel.
"""
from __future__ import annotations

import json
import os
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END

from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig

import psycopg

from research_agent import neon

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


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


class DiscussionGuideState(TypedDict, total=False):
    journal_entry_id: int
    user_email: str
    job_id: str
    is_ro: bool
    # Internal
    _prompt: str
    _child_age: Optional[int]
    # Output
    guide: dict
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def _update_job_progress(job_id: str, progress: int) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET progress = %s, updated_at = NOW() WHERE id = %s",
                    (progress, job_id),
                )
    except Exception as exc:
        print(f"[discussion_guide._update_job_progress] failed: {exc}")


async def _update_job_succeeded(job_id: str, payload: dict) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'SUCCEEDED', progress = 100, "
                    "result = %s, updated_at = NOW() WHERE id = %s",
                    (json.dumps(payload), job_id),
                )
    except Exception as exc:
        print(f"[discussion_guide._update_job_succeeded] failed: {exc}")


async def _update_job_failed(job_id: str, error: dict) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'FAILED', error = %s, "
                    "updated_at = NOW() WHERE id = %s",
                    (json.dumps(error), job_id),
                )
    except Exception as exc:
        print(f"[discussion_guide._update_job_failed] failed: {exc}")


async def collect_data(state: DiscussionGuideState) -> dict:
    journal_entry_id = state.get("journal_entry_id")
    user_email = state.get("user_email")
    job_id = state.get("job_id")
    is_ro = bool(state.get("is_ro"))

    if not journal_entry_id or not user_email:
        return {"error": "journal_entry_id and user_email are required"}

    if job_id:
        await _update_job_progress(job_id, 10)

    child_age: Optional[int] = None
    sections: list[str] = []
    entry_context = ""
    research_context = ""

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id, title, entry_date, content, mood, mood_score, tags, family_member_id "
                    "FROM journal_entries WHERE id = %s AND user_id = %s",
                    (journal_entry_id, user_email),
                )
                entry_row = await cur.fetchone()
                if not entry_row:
                    return {"error": f"Journal entry {journal_entry_id} not found"}
                _, e_title, e_date, e_content, e_mood, e_score, e_tags, e_fm_id = entry_row

                tags_parsed: list[str] = []
                if e_tags:
                    try:
                        tags_parsed = json.loads(e_tags) if isinstance(e_tags, str) else list(e_tags)
                    except Exception:
                        tags_parsed = []

                entry_lines = [
                    f"Title: {e_title}" if e_title else None,
                    f"Date: {e_date}",
                    f"Content: {e_content}",
                    (
                        f"Mood: {e_mood}" + (f" ({e_score}/10)" if e_score is not None else "")
                        if e_mood
                        else None
                    ),
                    f"Tags: {', '.join(tags_parsed)}" if tags_parsed else None,
                ]
                entry_context = "\n".join([ln for ln in entry_lines if ln])

                if e_fm_id:
                    await cur.execute(
                        "SELECT first_name, name, age_years, relationship, date_of_birth "
                        "FROM family_members WHERE id = %s",
                        (e_fm_id,),
                    )
                    m_row = await cur.fetchone()
                    if m_row:
                        m_first, m_name, m_age, m_rel, m_dob = m_row
                        child_age = m_age
                        parts = [f"**{m_first}" + (f" {m_name}" if m_name else "") + "**"]
                        if m_age:
                            parts.append(f"Age: {m_age}")
                        if m_rel:
                            parts.append(f"Relationship: {m_rel}")
                        if m_dob:
                            parts.append(f"DOB: {m_dob}")
                        sections.append("### Child Profile\n" + " | ".join(parts))

                    await cur.execute(
                        "SELECT category, title, description, severity, impairment_domains "
                        "FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC",
                        (e_fm_id, user_email),
                    )
                    characteristics = await cur.fetchall()
                    if characteristics:
                        ch_lines = []
                        for row in characteristics:
                            c_cat, c_title, c_desc, c_sev, _c_domains = row
                            line = f"- **{c_title}** ({c_cat}" + (f", {c_sev}" if c_sev else "") + ")"
                            if c_desc:
                                line += f"\n  {c_desc}"
                            ch_lines.append(line)
                        sections.append(
                            f"### Characteristics & Support Needs ({len(characteristics)})\n"
                            + "\n".join(ch_lines)
                        )

                    await cur.execute(
                        "SELECT id, title, category, severity, description "
                        "FROM issues WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 10",
                        (e_fm_id, user_email),
                    )
                    issues = await cur.fetchall()
                    if issues:
                        i_lines = [
                            f"- [ID:{row[0]}] **{row[1]}** [{row[3]}/{row[2]}]: {(row[4] or '')[:150]}"
                            for row in issues
                        ]
                        sections.append(f"### Known Issues ({len(issues)})\n" + "\n".join(i_lines))

                        issue_ids = [row[0] for row in issues]
                        placeholders = ",".join(["%s"] * len(issue_ids))
                        await cur.execute(
                            f"SELECT id, title, key_findings, therapeutic_techniques, evidence_level "
                            f"FROM therapy_research WHERE issue_id IN ({placeholders}) "
                            f"ORDER BY relevance_score DESC LIMIT 8",
                            issue_ids,
                        )
                        issue_research = await cur.fetchall()
                        if issue_research:
                            r_lines = []
                            for r_id, r_title, r_kf, r_tt, r_ev in issue_research:
                                line = f'- [ResearchID:{r_id}] "{r_title}"'
                                if r_ev:
                                    line += f" ({r_ev})"
                                try:
                                    kf = json.loads(r_kf) if isinstance(r_kf, str) else (r_kf or [])
                                    if kf:
                                        line += f"\n  Key findings: {'; '.join(kf[:3])}"
                                except Exception:
                                    pass
                                try:
                                    tt = json.loads(r_tt) if isinstance(r_tt, str) else (r_tt or [])
                                    if tt:
                                        line += f"\n  Techniques: {'; '.join(tt[:3])}"
                                except Exception:
                                    pass
                                r_lines.append(line)
                            sections.append(
                                f"### Research for Issues ({len(issue_research)})\n" + "\n".join(r_lines)
                            )

                    await cur.execute(
                        "SELECT observed_at, observation_type, intensity, context "
                        "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY observed_at DESC LIMIT 8",
                        (e_fm_id, user_email),
                    )
                    observations = await cur.fetchall()
                    if observations:
                        o_lines = []
                        for o_date, o_type, o_int, o_ctx in observations:
                            line = f"- {str(o_date)[:10]}: {o_type}"
                            if o_int:
                                line += f", intensity={o_int}"
                            if o_ctx:
                                line += f" | Context: {o_ctx[:100]}"
                            o_lines.append(line)
                        sections.append(
                            f"### Behavior Observations ({len(observations)})\n" + "\n".join(o_lines)
                        )

                    await cur.execute(
                        "SELECT feedback_date, teacher_name, content "
                        "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY feedback_date DESC LIMIT 5",
                        (e_fm_id, user_email),
                    )
                    teacher_fbs = await cur.fetchall()
                    if teacher_fbs:
                        tf_lines = [
                            f"- {str(r[0])[:10]} from {r[1]}: {(r[2] or '')[:200]}" for r in teacher_fbs
                        ]
                        sections.append(f"### Teacher Feedbacks ({len(teacher_fbs)})\n" + "\n".join(tf_lines))

                    await cur.execute(
                        "SELECT feedback_date, content "
                        "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY feedback_date DESC LIMIT 5",
                        (e_fm_id, user_email),
                    )
                    contact_fbs = await cur.fetchall()
                    if contact_fbs:
                        cf_lines = [f"- {str(r[0])[:10]}: {(r[1] or '')[:200]}" for r in contact_fbs]
                        sections.append(f"### Contact Feedbacks ({len(contact_fbs)})\n" + "\n".join(cf_lines))

                    await cur.execute(
                        "SELECT summary FROM deep_issue_analyses "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 1",
                        (e_fm_id, user_email),
                    )
                    da_row = await cur.fetchone()
                    if da_row and da_row[0]:
                        sections.append(f"### Prior Deep Analysis\n{(da_row[0] or '')[:400]}")

                await cur.execute(
                    "SELECT id, title, abstract, key_findings, therapeutic_techniques, evidence_level "
                    "FROM therapy_research WHERE journal_entry_id = %s "
                    "ORDER BY relevance_score DESC LIMIT 10",
                    (journal_entry_id,),
                )
                entry_research = await cur.fetchall()
                if entry_research:
                    r_lines = []
                    for idx, (r_id, r_title, r_abs, r_kf, r_tt, r_ev) in enumerate(entry_research):
                        parts = [f'[{idx + 1}] "{r_title}" (id: {r_id})']
                        if r_abs:
                            parts.append(f"  Abstract: {r_abs[:200]}")
                        try:
                            kf = json.loads(r_kf) if isinstance(r_kf, str) else (r_kf or [])
                            if kf:
                                parts.append(f"  Key findings: {'; '.join(kf[:3])}")
                        except Exception:
                            pass
                        try:
                            tt = json.loads(r_tt) if isinstance(r_tt, str) else (r_tt or [])
                            if tt:
                                parts.append(f"  Techniques: {'; '.join(tt[:3])}")
                        except Exception:
                            pass
                        if r_ev:
                            parts.append(f"  Evidence: {r_ev}")
                        r_lines.append("\n".join(parts))
                    research_context = "\n\n## Research Papers\n" + "\n\n".join(r_lines)

    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    family_context = "\n\n## Family & Child Context\n" + "\n\n".join(sections) if sections else ""
    age_ref = f"{child_age} years old" if child_age else "unknown age"

    prompt_parts = [
        "You are a developmental psychology expert helping a parent prepare for a conversation with their child about a behavior described in a journal entry.",
        "You are NOT writing clinical notes. You are creating a practical, warm, evidence-based discussion guide that a parent can actually use during a real conversation with their child.",
        "",
        "## Journal Entry",
        entry_context,
        family_context,
        research_context,
        "",
        "## Instructions",
        "",
        f"Based on the journal entry above, generate a parent discussion guide. The child is {age_ref}.",
        "",
        "1. **behaviorSummary** (string): A brief 1-2 sentence plain-language summary of the behavior that needs to be discussed.",
        "",
        "2. **developmentalContext** (object): Help the parent understand WHY this behavior happens at this age.",
        '   - stage (string): The developmental stage name (e.g., "Early Adolescence", "Middle Childhood", "Preschool")',
        "   - explanation (string): What is developmentally normal vs. concerning about this behavior — explain in parent-friendly language",
        "   - normalizedBehavior (string): Reassure the parent about what part of this is age-typical — help them stay calm",
        '   - researchBasis (string, optional): Reference specific research if available (use research paper IDs like "ResearchID:5" — do NOT invent IDs)',
        "",
        "3. **conversationStarters** (array, 3-4 items): Age-appropriate ways to open the discussion.",
        "   - opener (string): The exact words a parent could say to begin the conversation",
        '   - context (string): When/where to use this opener (e.g., "during a calm moment after dinner", "on a walk together")',
        "   - ageAppropriateNote (string, optional): Why this approach works for the child's developmental stage",
        "",
        "4. **talkingPoints** (array, 3-5 items): Key things to cover in the discussion.",
        "   - point (string): The main idea to convey",
        "   - explanation (string): How to explain it in age-appropriate terms the child can understand",
        "   - researchBacking (string, optional): What research supports this approach (reference paper IDs if available)",
        "   - relatedResearchIds (int[], optional): IDs from the research papers above",
        "",
        "5. **languageGuide** (object): Concrete phrases to use and avoid.",
        "   - whatToSay (array, 4-6 items): Helpful phrases with { phrase, reason, alternative (optional) }",
        "   - whatNotToSay (array, 3-5 items): Harmful phrases with { phrase, reason, alternative (required — what to say instead) }",
        "",
        "6. **anticipatedReactions** (array, 3-4 items): How the child might respond.",
        "   - reaction (string): What the child might say or do",
        '   - likelihood (string): "high", "medium", or "low"',
        "   - howToRespond (string): How the parent should respond — stay calm and empathetic",
        "",
        "7. **followUpPlan** (array, 3-4 items): Steps to reinforce the discussion over time.",
        "   - action (string): What to do",
        '   - timing (string): When (e.g., "same evening", "next day", "within a week", "ongoing")',
        "   - description (string): How to do it practically",
        "",
        "IMPORTANT RULES:",
        "- Use warm, non-judgmental, empathetic language throughout — the parent is seeking to understand, not punish.",
        '- Never label the child — focus on the behavior, not the character ("what you did" not "you are").',
        '- Be specific and practical — generic advice like "talk to your child" is unhelpful.',
        "- If the child has known characteristics or conditions (e.g., ADHD, autism, anxiety), adapt all recommendations accordingly.",
        "- Write in the same language as the journal entry content.",
        "- If research papers are available, cite them by ID. Do NOT invent research references or IDs.",
        f"- All language and explanations must be adapted to the child's age ({age_ref}).",
        "- This guide should be something a parent can read in 5 minutes and feel prepared to have the conversation.",
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
            # One retry on JSON decode errors (DeepSeek occasionally returns malformed JSON under load).
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

    journal_entry_id = state.get("journal_entry_id")
    user_email = state.get("user_email")
    guide = state["guide"]
    child_age = state.get("_child_age")

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "DELETE FROM discussion_guides WHERE journal_entry_id = %s AND user_id = %s",
                    (journal_entry_id, user_email),
                )
                await cur.execute(
                    "INSERT INTO discussion_guides ("
                    "journal_entry_id, user_id, child_age, behavior_summary, developmental_context, "
                    "conversation_starters, talking_points, language_guide, anticipated_reactions, "
                    "follow_up_plan, model) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        journal_entry_id,
                        user_email,
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
            {"guideId": state.get("guide_id"), "journalEntryId": state.get("journal_entry_id")},
        )
    return {"success": True, "message": "Discussion guide generated successfully."}


def create_discussion_guide_graph(checkpointer=None):
    builder = StateGraph(DiscussionGuideState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)
    builder.add_node("finalize", finalize)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


graph = create_discussion_guide_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_discussion_guide_graph, graph)
