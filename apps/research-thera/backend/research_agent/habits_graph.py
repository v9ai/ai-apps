"""LangGraph habits graph — generates personalized habits for a family member or a specific issue."""
from __future__ import annotations

import json
import os
import sys
from typing import Optional, TypedDict, Any

from langgraph.graph import StateGraph, START, END

import psycopg

from research_agent import neon

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig  # noqa: E402


ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent Romanian. Do not translate proper nouns, "
    "people's names, or citation identifiers."
)


class HabitsState(TypedDict, total=False):
    # Required: one of these must be provided
    family_member_id: int
    issue_id: int          # optional — focus generation on a specific issue
    user_email: str
    count: int             # how many habits to generate (default 5)
    language: str          # "en" | "ro"
    # Internal
    _prompt: str
    _resolved_family_member_id: int  # resolved from issue if not provided
    # Output
    habits: list[dict[str, Any]]
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_data(state: HabitsState) -> dict:
    """Collect context: family member profile, goals, issues, characteristics.

    If issue_id is provided, focus on that specific issue and its family member.
    If family_member_id is provided, gather all context for that member.
    """
    issue_id = state.get("issue_id")
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    count = state.get("count", 5)

    if not user_email:
        return {"error": "user_email is required"}
    if not issue_id and not family_member_id:
        return {"error": "Either issue_id or family_member_id is required"}

    conn_str = _conn_str()
    focal_issue_context = ""
    resolved_family_member_id = family_member_id

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:

                # ── If issue_id provided, load the focal issue ─────────────
                if issue_id:
                    await cur.execute(
                        "SELECT id, title, description, category, severity, recommendations, family_member_id "
                        "FROM issues WHERE id = %s AND user_id = %s",
                        (issue_id, user_email),
                    )
                    issue_row = await cur.fetchone()
                    if not issue_row:
                        return {"error": f"Issue {issue_id} not found"}

                    _, i_title, i_desc, i_cat, i_sev, i_recs_raw, i_fm_id = issue_row

                    # Resolve family member from issue if not explicitly set
                    if not resolved_family_member_id and i_fm_id:
                        resolved_family_member_id = i_fm_id

                    recs = json.loads(i_recs_raw) if i_recs_raw else []
                    focal_lines = [
                        f"Title: {i_title}",
                        f"Category: {i_cat}",
                        f"Severity: {i_sev}",
                    ]
                    if i_desc:
                        focal_lines.append(f"Description: {i_desc[:400]}")
                    if recs:
                        focal_lines.append("Existing recommendations:")
                        focal_lines.extend(f"  - {r}" for r in recs[:5])

                    # Research for this issue
                    await cur.execute(
                        "SELECT title, key_findings, therapeutic_techniques FROM therapy_research "
                        "WHERE issue_id = %s ORDER BY relevance_score DESC LIMIT 5",
                        (issue_id,),
                    )
                    research_rows = await cur.fetchall()
                    if research_rows:
                        focal_lines.append("Related research:")
                        for rr in research_rows:
                            focal_lines.append(f"  Paper: {rr[0]}")
                            kf = json.loads(rr[1]) if rr[1] else []
                            if kf:
                                focal_lines.append(f"    Key findings: {'; '.join(kf[:2])}")
                            tt = json.loads(rr[2]) if rr[2] else []
                            if tt:
                                focal_lines.append(f"    Techniques: {'; '.join(tt[:3])}")

                    focal_issue_context = "\n".join(focal_lines)

                # ── Family member profile ──────────────────────────────────
                profile_context = ""
                if resolved_family_member_id:
                    await cur.execute(
                        "SELECT first_name, age_years, date_of_birth, relationship, bio FROM family_members "
                        "WHERE id = %s AND user_id = %s",
                        (resolved_family_member_id, user_email),
                    )
                    fm_row = await cur.fetchone()
                    if fm_row:
                        fm_name, fm_age, fm_dob, fm_rel, fm_bio = fm_row
                        parts = [f"Name: {fm_name}"]
                        if fm_age:
                            parts.append(f"Age: {fm_age} years old")
                        if fm_dob:
                            parts.append(f"Date of birth: {fm_dob}")
                        if fm_rel:
                            parts.append(f"Relationship: {fm_rel}")
                        if fm_bio:
                            parts.append(f"Bio: {fm_bio[:200]}")
                        profile_context = "\n".join(parts)

                # ── Active goals ───────────────────────────────────────────
                goals_context = ""
                if resolved_family_member_id:
                    await cur.execute(
                        "SELECT title, description, priority FROM goals "
                        "WHERE family_member_id = %s AND user_id = %s AND status = 'active' "
                        "ORDER BY created_at DESC LIMIT 6",
                        (resolved_family_member_id, user_email),
                    )
                    goal_rows = await cur.fetchall()
                    if goal_rows:
                        goals_context = "\n".join(
                            f"- [{r[2].upper()}] {r[0]}" + (f": {r[1][:100]}" if r[1] else "")
                            for r in goal_rows
                        )

                # ── Other issues (broad context, not focal) ─────────────
                other_issues_context = ""
                if resolved_family_member_id:
                    q_params = [resolved_family_member_id, user_email]
                    extra_where = ""
                    if issue_id:
                        extra_where = " AND id != %s"
                        q_params.append(issue_id)
                    await cur.execute(
                        f"SELECT title, category, severity FROM issues "
                        f"WHERE family_member_id = %s AND user_id = %s{extra_where} "
                        f"ORDER BY created_at DESC LIMIT 8",
                        q_params,
                    )
                    other_issue_rows = await cur.fetchall()
                    if other_issue_rows:
                        other_issues_context = "\n".join(
                            f"- [{r[2].upper()}] {r[0]} ({r[1]})"
                            for r in other_issue_rows
                        )

                # ── Characteristics ────────────────────────────────────────
                chars_context = ""
                if resolved_family_member_id:
                    await cur.execute(
                        "SELECT title, category, severity FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s LIMIT 8",
                        (resolved_family_member_id, user_email),
                    )
                    char_rows = await cur.fetchall()
                    if char_rows:
                        chars_context = "\n".join(
                            f"- {r[0]} ({r[1]})" + (f" — {r[2]}" if r[2] else "")
                            for r in char_rows
                        )

                # ── Existing habits (avoid duplicates) ─────────────────────
                existing_habits: list[str] = []
                if resolved_family_member_id:
                    await cur.execute(
                        "SELECT title FROM habits WHERE family_member_id = %s AND user_id = %s AND status = 'active'",
                        (resolved_family_member_id, user_email),
                    )
                    existing_habits = [r[0] for r in await cur.fetchall()]

    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    # ── Build prompt ───────────────────────────────────────────────────────
    if issue_id and focal_issue_context:
        focus_intro = (
            "You are a therapeutic habit coach. Generate personalized, evidence-based habits "
            f"specifically designed to address the following issue. Create exactly {count} habits "
            "that directly target the root causes and symptoms of this issue."
        )
    else:
        focus_intro = (
            "You are a therapeutic habit coach. Generate personalized, evidence-based habits "
            f"for the following person. Create exactly {count} distinct habits tailored to their "
            "specific goals, issues, and characteristics."
        )

    prompt_parts = [focus_intro, ""]

    if focal_issue_context:
        prompt_parts += ["## Target Issue (PRIMARY FOCUS)", focal_issue_context, ""]

    if profile_context:
        prompt_parts += ["## Person Profile", profile_context, ""]

    if goals_context:
        prompt_parts += ["## Active Therapeutic Goals", goals_context, ""]

    if other_issues_context:
        prompt_parts += ["## Other Known Issues (context only)", other_issues_context, ""]

    if chars_context:
        prompt_parts += ["## Characteristics", chars_context, ""]

    if existing_habits:
        prompt_parts += [
            "## Already Tracking (do NOT suggest these again)",
            "\n".join(f"- {h}" for h in existing_habits),
            "",
        ]

    directive = "directly address the Target Issue above" if focal_issue_context else "address the person's goals and challenges"
    prompt_parts += [
        "## Instructions",
        f"Generate exactly {count} habit suggestions that:",
        f"- {directive}",
        "- Are age-appropriate and realistic",
        "- Mix daily (most) and weekly habits",
        "- Have a target count of 1 unless repetition clearly helps (e.g. breathing exercises ×3)",
        "- Are specific and actionable (not vague like 'be more positive')",
        "- Do NOT duplicate any existing habits listed above",
        "",
        "Respond with a JSON object:",
        '{"habits": [',
        '  {"title": "...", "description": "...", "frequency": "daily" or "weekly", "targetCount": 1-5}',
        "]}",
        "",
        "Keep titles concise (3-6 words). Descriptions explain the therapeutic benefit (1-2 sentences).",
    ]

    if state.get("language") == "ro":
        prompt_parts = [ROMANIAN_INSTRUCTION, ""] + prompt_parts

    prompt = "\n".join(str(p) for p in prompt_parts)

    return {
        "_prompt": prompt,
        "_resolved_family_member_id": resolved_family_member_id or 0,
    }


async def generate(state: HabitsState) -> dict:
    """Call DeepSeek to generate habit suggestions."""
    if state.get("error"):
        return {}

    prompt = state.get("_prompt", "")
    count = state.get("count", 5)

    try:
        async with DeepSeekClient(DeepSeekConfig(timeout=120.0)) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model="deepseek-chat",
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )

        content = resp.choices[0].message.content
        parsed = json.loads(content)
        habits = parsed.get("habits")

        if not habits or not isinstance(habits, list):
            for v in parsed.values():
                if isinstance(v, list) and len(v) > 0:
                    habits = v
                    break

        if not habits:
            return {"error": f"DeepSeek returned no habits. Keys: {list(parsed.keys())}"}

        normalised = []
        for h in habits[:count]:
            if not isinstance(h, dict) or not h.get("title"):
                continue
            freq = str(h.get("frequency", "daily")).lower()
            if freq not in ("daily", "weekly"):
                freq = "daily"
            normalised.append({
                "title": str(h["title"])[:120],
                "description": str(h.get("description", ""))[:400] or None,
                "frequency": freq,
                "targetCount": max(1, min(int(h.get("targetCount", 1)), 10)),
            })

        if not normalised:
            return {"error": "No valid habits in DeepSeek response"}

        return {"habits": normalised}

    except Exception as exc:
        return {"error": f"generate failed: {exc}"}


async def persist(state: HabitsState) -> dict:
    """Insert generated habits into the habits table."""
    if state.get("error") or not state.get("habits"):
        return {}

    issue_id = state.get("issue_id")
    user_email = state.get("user_email")
    habits = state["habits"]
    resolved_family_member_id = state.get("_resolved_family_member_id") or state.get("family_member_id")

    try:
        conn_str = _conn_str()
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                for habit in habits:
                    await cur.execute(
                        "INSERT INTO habits (user_id, family_member_id, issue_id, title, description, frequency, target_count, status) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')",
                        (
                            user_email,
                            resolved_family_member_id or None,
                            issue_id or None,
                            habit["title"],
                            habit.get("description"),
                            habit["frequency"],
                            habit["targetCount"],
                        ),
                    )
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}

    return {}


def create_habits_graph(checkpointer=None):
    """Build the habits generation LangGraph."""
    builder = StateGraph(HabitsState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


# Module-level graph instance for LangGraph server (eager, no checkpointer).
graph = create_habits_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_habits_graph, graph)
