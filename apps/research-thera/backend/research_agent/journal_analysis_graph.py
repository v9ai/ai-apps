"""LangGraph journal deep analysis graph — mirrors the legacy TS
`generateJournalAnalysis` resolver but runs on the LangGraph server so it
isn't bound by Vercel's 60s function limit."""
from __future__ import annotations

import json
import os
import sys
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field, field_validator

import psycopg

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig  # noqa: E402


class JournalAnalysisState(TypedDict, total=False):
    journal_entry_id: int
    user_email: str
    language: str  # "en" | "ro"
    _prompt: str
    analysis: str
    analysis_id: int
    error: str


ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent Romanian. Do not translate proper nouns, "
    "people's names, or citation identifiers."
)


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_data(state: JournalAnalysisState) -> dict:
    """Collect journal entry + family/goal/research context."""
    journal_entry_id = state.get("journal_entry_id")
    user_email = state.get("user_email")
    if not journal_entry_id or not user_email:
        return {"error": "journal_entry_id and user_email are required"}

    conn_str = _conn_str()
    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id, title, entry_date, content, mood, mood_score, tags, "
                    "family_member_id, goal_id "
                    "FROM journal_entries WHERE id = %s AND user_id = %s",
                    (journal_entry_id, user_email),
                )
                entry_row = await cur.fetchone()
                if not entry_row:
                    return {"error": f"Journal entry {journal_entry_id} not found"}
                (
                    e_id, e_title, e_date, e_content, e_mood, e_score,
                    e_tags, e_fm_id, e_goal_id,
                ) = entry_row

                # Linked goal
                goal_row = None
                if e_goal_id:
                    await cur.execute(
                        "SELECT title, description FROM goals WHERE id = %s AND user_id = %s",
                        (e_goal_id, user_email),
                    )
                    goal_row = await cur.fetchone()

                # Other journal entries (for pattern detection)
                await cur.execute(
                    "SELECT id, entry_date, mood, mood_score, tags, content "
                    "FROM journal_entries "
                    "WHERE id != %s AND user_id = %s "
                    + ("AND family_member_id = %s " if e_fm_id else "")
                    + "ORDER BY entry_date DESC LIMIT 8",
                    ((journal_entry_id, user_email, e_fm_id) if e_fm_id else (journal_entry_id, user_email)),
                )
                siblings = await cur.fetchall()

                member = None
                issues: list = []
                observations: list = []
                teacher_fbs: list = []
                contact_fbs: list = []
                deep_analyses: list = []
                characteristics: list = []
                related_issues: list = []
                all_members: list = []
                issue_research: list = []

                if e_fm_id:
                    await cur.execute(
                        "SELECT id, first_name, name, age_years, relationship, date_of_birth, bio "
                        "FROM family_members WHERE id = %s",
                        (e_fm_id,),
                    )
                    member = await cur.fetchone()

                    await cur.execute(
                        "SELECT id, title, category, severity, description, recommendations "
                        "FROM issues WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 15",
                        (e_fm_id, user_email),
                    )
                    issues = await cur.fetchall()

                    await cur.execute(
                        "SELECT observed_at, observation_type, frequency, intensity, context, notes "
                        "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY observed_at DESC LIMIT 10",
                        (e_fm_id, user_email),
                    )
                    observations = await cur.fetchall()

                    await cur.execute(
                        "SELECT feedback_date, teacher_name, subject, content "
                        "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY feedback_date DESC LIMIT 5",
                        (e_fm_id, user_email),
                    )
                    teacher_fbs = await cur.fetchall()

                    await cur.execute(
                        "SELECT feedback_date, subject, content "
                        "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY feedback_date DESC LIMIT 5",
                        (e_fm_id, user_email),
                    )
                    contact_fbs = await cur.fetchall()

                    await cur.execute(
                        "SELECT summary, created_at FROM deep_issue_analyses "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 1",
                        (e_fm_id, user_email),
                    )
                    deep_analyses = await cur.fetchall()

                    await cur.execute(
                        "SELECT category, title, description, severity, impairment_domains "
                        "FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC",
                        (e_fm_id, user_email),
                    )
                    characteristics = await cur.fetchall()

                    await cur.execute(
                        "SELECT id, title, category, severity, description, family_member_id "
                        "FROM issues WHERE related_family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 5",
                        (e_fm_id, user_email),
                    )
                    related_issues = await cur.fetchall()

                    await cur.execute(
                        "SELECT id, first_name, name, age_years, relationship "
                        "FROM family_members WHERE user_id = %s",
                        (user_email,),
                    )
                    all_members = await cur.fetchall()

                    issue_ids = [row[0] for row in issues]
                    if issue_ids:
                        placeholders = ",".join(["%s"] * len(issue_ids))
                        await cur.execute(
                            f"SELECT id, issue_id, title, key_findings, therapeutic_techniques, evidence_level "
                            f"FROM therapy_research WHERE issue_id IN ({placeholders}) "
                            f"ORDER BY relevance_score DESC LIMIT 10",
                            issue_ids,
                        )
                        issue_research = await cur.fetchall()

                # Research for this specific journal entry
                await cur.execute(
                    "SELECT id, title, abstract, key_findings, therapeutic_techniques, evidence_level "
                    "FROM therapy_research WHERE journal_entry_id = %s "
                    "ORDER BY relevance_score DESC LIMIT 10",
                    (journal_entry_id,),
                )
                entry_research = await cur.fetchall()

    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    # ── Build prompt ────────────────────────────────────────────────
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
        f"Mood: {e_mood}" + (f" ({e_score}/10)" if e_score is not None else "") if e_mood else None,
        f"Tags: {', '.join(tags_parsed)}" if tags_parsed else None,
    ]
    entry_context = "\n".join([ln for ln in entry_lines if ln])

    goal_context = ""
    if goal_row:
        g_title, g_desc = goal_row
        goal_context = f"\n\n## Linked Goal\n- **{g_title}**" + (f"\n  {g_desc}" if g_desc else "")

    other_entries_context = ""
    if siblings:
        lines = []
        for row in siblings:
            s_id, s_date, s_mood, s_score, s_tags, s_content = row
            line = f"- {s_date}"
            if s_mood:
                line += f" | Mood: {s_mood}" + (f" ({s_score}/10)" if s_score is not None else "")
            if s_tags:
                try:
                    st = json.loads(s_tags) if isinstance(s_tags, str) else list(s_tags)
                    if st:
                        line += f" | Tags: {', '.join(st)}"
                except Exception:
                    pass
            line += f"\n  {(s_content or '')[:200]}"
            lines.append(line)
        other_entries_context = f"\n\n## Other Journal Entries ({len(siblings)})\n" + "\n".join(lines)

    sections: list[str] = []

    if member:
        m_id, m_first, m_name, m_age, m_rel, m_dob, m_bio = member
        parts = [f"**{m_first}" + (f" {m_name}" if m_name else "") + "**"]
        if m_age:
            parts.append(f"Age: {m_age}")
        if m_rel:
            parts.append(f"Relationship: {m_rel}")
        if m_dob:
            parts.append(f"DOB: {m_dob}")
        if m_bio:
            parts.append(f"Bio: {m_bio}")
        sections.append("### Person Profile\n" + " | ".join(parts))

    if characteristics:
        ch_lines = []
        for row in characteristics:
            c_cat, c_title, c_desc, c_sev, c_domains = row
            line = f"- **{c_title}** ({c_cat}" + (f", {c_sev}" if c_sev else "") + ")"
            if c_desc:
                line += f"\n  {c_desc}"
            if c_domains:
                try:
                    domains = json.loads(c_domains) if isinstance(c_domains, str) else c_domains
                    if domains:
                        line += f"\n  Domains: {', '.join(domains)}"
                except Exception:
                    pass
            ch_lines.append(line)
        sections.append(f"### Characteristics & Support Needs ({len(characteristics)})\n" + "\n".join(ch_lines))

    if issues:
        i_lines = []
        for row in issues:
            i_id, i_title, i_cat, i_sev, i_desc, i_recs = row
            line = f"- [ID:{i_id}] **{i_title}** [{i_sev}/{i_cat}]: {(i_desc or '')[:150]}"
            if i_recs:
                try:
                    recs = json.loads(i_recs) if isinstance(i_recs, str) else i_recs
                    if recs:
                        line += f"\n  Recommendations: {'; '.join(recs[:3])}"
                except Exception:
                    pass
            i_lines.append(line)
        sections.append(f"### All Issues ({len(issues)})\n" + "\n".join(i_lines))

        if issue_research:
            r_lines = []
            for row in issue_research:
                r_id, r_iss_id, r_title, r_kf, r_tt, r_ev = row
                line = f'- [ResearchID:{r_id}] "{r_title}"'
                if r_ev:
                    line += f" ({r_ev})"
                if r_iss_id:
                    line += f" for issue #{r_iss_id}"
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
            sections.append(f"### Research for Issues ({len(issue_research)})\n" + "\n".join(r_lines))

    if observations:
        o_lines = []
        for row in observations:
            o_date, o_type, o_freq, o_int, o_ctx, o_notes = row
            line = f"- {str(o_date)[:10]}: {o_type}"
            if o_freq:
                line += f", freq={o_freq}"
            if o_int:
                line += f", intensity={o_int}"
            if o_ctx:
                line += f" | Context: {o_ctx[:100]}"
            if o_notes:
                line += f" | Notes: {o_notes[:100]}"
            o_lines.append(line)
        sections.append(f"### Behavior Observations ({len(observations)})\n" + "\n".join(o_lines))

    if teacher_fbs:
        tf_lines = [
            f"- {str(r[0])[:10]} from {r[1]}" + (f" ({r[2]})" if r[2] else "") + f"\n  {(r[3] or '')[:200]}"
            for r in teacher_fbs
        ]
        sections.append(f"### Teacher Feedbacks ({len(teacher_fbs)})\n" + "\n".join(tf_lines))

    if contact_fbs:
        cf_lines = [
            f"- {str(r[0])[:10]}" + (f" ({r[1]})" if r[1] else "") + f"\n  {(r[2] or '')[:200]}"
            for r in contact_fbs
        ]
        sections.append(f"### Contact Feedbacks ({len(contact_fbs)})\n" + "\n".join(cf_lines))

    if related_issues:
        ri_lines = []
        for row in related_issues:
            ri_id, ri_title, ri_cat, ri_sev, ri_desc, ri_fm_id = row
            ri_lines.append(
                f'- [ID:{ri_id}] "{ri_title}" ({ri_cat}, {ri_sev}) from member #{ri_fm_id}\n  {(ri_desc or "")[:150]}'
            )
        sections.append(f"### Issues From Other Members Referencing This Person ({len(related_issues)})\n" + "\n".join(ri_lines))

    if deep_analyses:
        da_lines = [f"- {str(r[1])[:10]}: {(r[0] or '')[:300]}" for r in deep_analyses]
        sections.append(f"### Prior Deep Issue Analyses ({len(deep_analyses)})\n" + "\n".join(da_lines))

    if all_members and e_fm_id:
        others = [m for m in all_members if m[0] != e_fm_id]
        if others:
            o_lines = []
            for row in others:
                am_id, am_first, am_name, am_age, am_rel = row
                line = f"- [ID:{am_id}] {am_first}"
                if am_name:
                    line += f" {am_name}"
                if am_age:
                    line += f", age {am_age}"
                if am_rel:
                    line += f" ({am_rel})"
                o_lines.append(line)
            sections.append("### Other Family Members\n" + "\n".join(o_lines))

    family_context = ""
    if sections:
        family_context = "\n\n## Family Member Context\n" + "\n\n".join(sections)

    research_context = ""
    if entry_research:
        r_lines = []
        for i, row in enumerate(entry_research):
            r_id, r_title, r_abstract, r_kf, r_tt, r_ev = row
            parts = [f'[{i + 1}] "{r_title}" (id: {r_id})']
            if r_abstract:
                parts.append(f"  Abstract: {r_abstract[:200]}")
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
        research_context = "\n\n## Research Papers (Journal Entry)\n" + "\n\n".join(r_lines)

    prompt_parts = [
        "You are a clinical psychologist performing a deep therapeutic analysis of a journal entry.",
        "You have access to the FULL history of this person — their issues, observations, feedbacks, characteristics, prior analyses, research papers, and other journal entries.",
        "Use ALL of this context to produce a comprehensive clinical analysis that connects the current entry to the broader therapeutic picture.",
        "",
        "## Journal Entry (Primary Focus)",
        entry_context,
        goal_context,
        other_entries_context,
        family_context,
        research_context,
        "",
        "## Instructions",
        "Analyze this journal entry in the context of ALL the data above. Produce a structured JSON analysis with:",
        "",
        "1. **summary** (string): 2-3 paragraph clinical analysis. Connect the entry's themes to the broader history — known issues, behavioral patterns, feedback from teachers/contacts, prior analyses. Identify what is new, what is recurring, and what is evolving.",
        "",
        "2. **emotionalLandscape** (object):",
        "   - primaryEmotions (string[]): Main emotions expressed directly",
        "   - underlyingEmotions (string[]): Emotions implied or not directly stated but present, informed by the full history",
        "   - emotionalRegulation (string): Assessment of emotional management, referencing behavioral observations if available",
        "   - attachmentPatterns (string, optional): Attachment-related patterns from the entry and broader context",
        "",
        "3. **therapeuticInsights** (array, 3-5 items): Each with:",
        "   - title (string): Brief insight name",
        "   - observation (string): What was observed — connect to specific issues, observations, or feedbacks from the data",
        "   - clinicalRelevance (string): Why this matters therapeutically, referencing the person's characteristics and history",
        "   - relatedResearchIds (int[], optional): IDs from the research papers above — do NOT invent IDs",
        "",
        "4. **actionableRecommendations** (array, 3-5 items): Each with:",
        "   - title (string): Recommendation name",
        "   - description (string): 1-2 sentences explaining the recommendation with reference to the person's specific situation",
        "   - priority (string): immediate|short_term|long_term",
        "   - concreteSteps (string[]): 2-3 specific actionable steps tailored to the person's age, characteristics, and family context",
        "   - relatedResearchIds (int[], optional): IDs from the research papers above",
        "",
        "5. **reflectionPrompts** (string[]): 3-5 deep self-reflection questions that connect the journal entry to the broader patterns in the data",
        "",
        "Write in the same language as the journal entry content.",
        "Reference specific issues, observations, or feedbacks by their details when making insights.",
        "If research papers are available, reference their IDs where relevant. Do NOT invent research references.",
    ]

    if state.get("language") == "ro":
        prompt_parts.insert(0, ROMANIAN_INSTRUCTION)

    return {"_prompt": "\n".join(prompt_parts)}


def _coerce_list(v):
    if isinstance(v, (str, int, float)):
        return [v]
    return v


class EmotionalLandscape(BaseModel):
    primaryEmotions: list[str]
    underlyingEmotions: list[str]
    emotionalRegulation: str
    attachmentPatterns: Optional[str] = None

    @field_validator("primaryEmotions", "underlyingEmotions", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)


class TherapeuticInsight(BaseModel):
    title: str
    observation: str
    clinicalRelevance: str
    relatedResearchIds: Optional[list[int]] = None

    @field_validator("relatedResearchIds", mode="before")
    @classmethod
    def _coerce(cls, v):
        if v is None:
            return v
        return _coerce_list(v)


class ActionableRecommendation(BaseModel):
    title: str
    description: str
    priority: str
    concreteSteps: list[str]
    relatedResearchIds: Optional[list[int]] = None

    @field_validator("concreteSteps", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)

    @field_validator("relatedResearchIds", mode="before")
    @classmethod
    def _coerce_opt(cls, v):
        if v is None:
            return v
        return _coerce_list(v)


class JournalAnalysisOutput(BaseModel):
    summary: str
    emotionalLandscape: EmotionalLandscape
    therapeuticInsights: list[TherapeuticInsight]
    actionableRecommendations: list[ActionableRecommendation]
    reflectionPrompts: list[str]

    @field_validator("reflectionPrompts", mode="before")
    @classmethod
    def _coerce(cls, v):
        return _coerce_list(v)


_CONCISE_SYSTEM = (
    "CRITICAL: Your JSON response MUST fit within 8000 tokens. "
    "Keep insights/recommendations brief (1-2 sentences). "
    "Limit therapeuticInsights to 3, actionableRecommendations to 3, "
    "reflectionPrompts to 3. Keep concreteSteps to 2 per recommendation."
)


async def analyze(state: dict) -> dict:
    if state.get("error"):
        return {}

    try:
        prompt = state.get("_prompt", "")

        async with DeepSeekClient(DeepSeekConfig(timeout=300.0)) as client:
            messages = [ChatMessage(role="user", content=prompt)]
            resp = await client.chat(
                messages,
                model="deepseek-chat",
                temperature=0.3,
                max_tokens=8192,
                response_format={"type": "json_object"},
            )

            if resp.choices[0].finish_reason == "length":
                messages = [
                    ChatMessage(role="system", content=_CONCISE_SYSTEM),
                    ChatMessage(role="user", content=prompt),
                ]
                resp = await client.chat(
                    messages,
                    model="deepseek-chat",
                    temperature=0.2,
                    max_tokens=8192,
                    response_format={"type": "json_object"},
                )

        content = resp.choices[0].message.content
        result = JournalAnalysisOutput.model_validate_json(content)
        return {"analysis": result.model_dump_json()}
    except Exception as exc:
        return {"error": f"analyze failed: {exc}"}


async def persist(state: dict) -> dict:
    if state.get("error") or not state.get("analysis"):
        return {}

    try:
        analysis = json.loads(state["analysis"])
        journal_entry_id = state.get("journal_entry_id")
        user_email = state.get("user_email")

        conn_str = _conn_str()
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                # Replace any existing analysis for this entry
                await cur.execute(
                    "DELETE FROM journal_analyses WHERE journal_entry_id = %s AND user_id = %s",
                    (journal_entry_id, user_email),
                )
                await cur.execute(
                    "INSERT INTO journal_analyses "
                    "(journal_entry_id, user_id, summary, emotional_landscape, "
                    "therapeutic_insights, actionable_recommendations, reflection_prompts, model) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        journal_entry_id,
                        user_email,
                        analysis.get("summary", ""),
                        json.dumps(analysis.get("emotionalLandscape", {})),
                        json.dumps(analysis.get("therapeuticInsights", [])),
                        json.dumps(analysis.get("actionableRecommendations", [])),
                        json.dumps(analysis.get("reflectionPrompts", [])),
                        "deepseek-chat",
                    ),
                )
                row = await cur.fetchone()
                analysis_id = row[0] if row else 0

        return {"analysis_id": analysis_id}
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}


def create_journal_analysis_graph():
    builder = StateGraph(JournalAnalysisState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("analyze", analyze)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


graph = create_journal_analysis_graph()
