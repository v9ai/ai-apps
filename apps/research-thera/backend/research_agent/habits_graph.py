"""LangGraph habits graph — generates personalized habits for a family member based on their goals, issues, and characteristics."""
from __future__ import annotations

import json
import os
import sys
from typing import Optional, TypedDict, Any

from langgraph.graph import StateGraph, START, END

import psycopg

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig  # noqa: E402


class HabitsState(TypedDict, total=False):
    family_member_id: int
    user_email: str
    count: int          # how many habits to generate (default 5)
    # Internal
    _prompt: str
    _family_member_name: str
    # Output
    habits: list[dict[str, Any]]
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_data(state: HabitsState) -> dict:
    """Collect family member profile, goals, issues, and characteristics."""
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    count = state.get("count", 5)

    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    conn_str = _conn_str()
    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                # Family member profile
                await cur.execute(
                    "SELECT first_name, age_years, date_of_birth, relationship, bio FROM family_members "
                    "WHERE id = %s AND user_id = %s",
                    (family_member_id, user_email),
                )
                fm_row = await cur.fetchone()
                if not fm_row:
                    return {"error": f"Family member {family_member_id} not found"}
                fm_name, fm_age, fm_dob, fm_rel, fm_bio = fm_row

                profile_parts = [f"Name: {fm_name}"]
                if fm_age:
                    profile_parts.append(f"Age: {fm_age} years old")
                if fm_dob:
                    profile_parts.append(f"Date of birth: {fm_dob}")
                if fm_rel:
                    profile_parts.append(f"Relationship: {fm_rel}")
                if fm_bio:
                    profile_parts.append(f"Bio: {fm_bio[:300]}")
                profile_context = "\n".join(profile_parts)

                # Active goals
                await cur.execute(
                    "SELECT title, description, priority FROM goals "
                    "WHERE family_member_id = %s AND user_id = %s AND status = 'active' "
                    "ORDER BY created_at DESC LIMIT 8",
                    (family_member_id, user_email),
                )
                goal_rows = await cur.fetchall()
                goals_context = ""
                if goal_rows:
                    goals_context = "\n".join(
                        f"- [{row[2].upper()}] {row[0]}" + (f": {row[1][:150]}" if row[1] else "")
                        for row in goal_rows
                    )

                # Issues
                await cur.execute(
                    "SELECT title, category, severity, description, recommendations FROM issues "
                    "WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY created_at DESC LIMIT 10",
                    (family_member_id, user_email),
                )
                issue_rows = await cur.fetchall()
                issues_context = ""
                if issue_rows:
                    issues_context = "\n".join(
                        f"- [{row[2].upper()}] {row[0]} ({row[1]}): {(row[3] or '')[:200]}"
                        for row in issue_rows
                    )

                # Family member characteristics
                await cur.execute(
                    "SELECT title, category, description, severity, frequency_per_week FROM family_member_characteristics "
                    "WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY created_at DESC LIMIT 10",
                    (family_member_id, user_email),
                )
                char_rows = await cur.fetchall()
                chars_context = ""
                if char_rows:
                    chars_context = "\n".join(
                        f"- {row[0]} ({row[1]})"
                        + (f" — severity: {row[3]}" if row[3] else "")
                        + (f", {row[4]}x/week" if row[4] else "")
                        + (f": {row[2][:150]}" if row[2] else "")
                        for row in char_rows
                    )

                # Recent journal entries (mood signal)
                await cur.execute(
                    "SELECT title, mood, mood_score, content FROM journal_entries "
                    "WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY entry_date DESC LIMIT 5",
                    (family_member_id, user_email),
                )
                journal_rows = await cur.fetchall()
                journal_context = ""
                if journal_rows:
                    journal_context = "\n".join(
                        f"- {row[0] or 'Entry'}" + (f" [mood: {row[1]}, score: {row[2]}]" if row[1] else "")
                        + f": {(row[3] or '')[:200]}"
                        for row in journal_rows
                    )

                # Existing habits (avoid duplicates)
                await cur.execute(
                    "SELECT title FROM habits WHERE family_member_id = %s AND user_id = %s AND status = 'active'",
                    (family_member_id, user_email),
                )
                existing_habit_rows = await cur.fetchall()
                existing_habits = [row[0] for row in existing_habit_rows]

    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    # Build prompt
    prompt_parts = [
        "You are a therapeutic habit coach. Generate personalized, evidence-based daily and weekly habits "
        f"for the following person. Create exactly {count} distinct habits tailored to their specific goals, "
        "issues, and characteristics.",
        "",
        "## Person Profile",
        profile_context,
        "",
    ]

    if goals_context:
        prompt_parts += ["## Active Therapeutic Goals", goals_context, ""]

    if issues_context:
        prompt_parts += ["## Known Issues & Challenges", issues_context, ""]

    if chars_context:
        prompt_parts += ["## Characteristics", chars_context, ""]

    if journal_context:
        prompt_parts += ["## Recent Journal Entries (mood context)", journal_context, ""]

    if existing_habits:
        prompt_parts += [
            "## Already Tracking (do NOT suggest these again)",
            "\n".join(f"- {h}" for h in existing_habits),
            "",
        ]

    prompt_parts += [
        "## Instructions",
        f"Generate exactly {count} habit suggestions that:",
        "- Directly address the person's goals and challenges above",
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
        "Keep titles concise (3-6 words). Descriptions should explain the therapeutic benefit (1-2 sentences).",
    ]

    prompt = "\n".join(str(p) for p in prompt_parts)

    return {
        "_prompt": prompt,
        "_family_member_name": fm_name,
    }


async def generate(state: HabitsState) -> dict:
    """Call DeepSeek to generate habit suggestions."""
    if state.get("error"):
        return {}

    prompt = state.get("_prompt", "")
    count = state.get("count", 5)

    try:
        async with DeepSeekClient(DeepSeekConfig(timeout=60.0)) as client:
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
            # Try to find the list under any key
            for v in parsed.values():
                if isinstance(v, list) and len(v) > 0:
                    habits = v
                    break

        if not habits:
            return {"error": f"DeepSeek returned no habits. Keys: {list(parsed.keys())}"}

        # Validate and normalise each habit
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

    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    habits = state["habits"]

    try:
        conn_str = _conn_str()
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                for habit in habits:
                    await cur.execute(
                        "INSERT INTO habits (user_id, family_member_id, title, description, frequency, target_count, status) "
                        "VALUES (%s, %s, %s, %s, %s, %s, 'active')",
                        (
                            user_email,
                            family_member_id,
                            habit["title"],
                            habit.get("description"),
                            habit["frequency"],
                            habit["targetCount"],
                        ),
                    )
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}

    return {}


def create_habits_graph():
    """Build the habits generation LangGraph."""
    builder = StateGraph(HabitsState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", END)

    return builder.compile()


# Module-level graph instance for LangGraph server
graph = create_habits_graph()
