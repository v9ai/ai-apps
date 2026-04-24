"""LangGraph games graph — generates a single personalized therapeutic game.

Types: CBT_REFRAME, MINDFULNESS, JOURNAL_PROMPT. Optional goal_id / issue_id /
family_member_id ground the game in the user's situation. Three nodes:
collect_context → generate → persist. Persists one row in the `games` table.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Optional, TypedDict

import psycopg
from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402


ALLOWED_TYPES = ("CBT_REFRAME", "MINDFULNESS", "JOURNAL_PROMPT")

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent Romanian."
)


class GamesState(TypedDict, total=False):
    # Input
    type: str  # CBT_REFRAME | MINDFULNESS | JOURNAL_PROMPT
    goal_id: Optional[int]
    issue_id: Optional[int]
    family_member_id: Optional[int]
    user_email: str
    language: str  # "en" | "ro"
    # Internal
    _prompt: str
    _title: str
    _description: str
    _content: dict
    # Output
    persisted_ids: list[int]
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_context(state: GamesState) -> dict:
    game_type = (state.get("type") or "").upper()
    user_email = state.get("user_email")
    goal_id = state.get("goal_id")
    issue_id = state.get("issue_id")
    family_member_id = state.get("family_member_id")
    language = (state.get("language") or "en").lower()

    if not user_email:
        return {"error": "user_email is required"}
    if game_type not in ALLOWED_TYPES:
        return {"error": f"type must be one of {ALLOWED_TYPES}"}

    context_lines: list[str] = []

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                if goal_id:
                    await cur.execute(
                        "SELECT title, description FROM goals WHERE id = %s AND user_id = %s",
                        (goal_id, user_email),
                    )
                    row = await cur.fetchone()
                    if row:
                        context_lines.append(f"## Goal\n- Title: {row[0]}\n- Description: {row[1] or ''}")
                if issue_id:
                    await cur.execute(
                        "SELECT title, description, category, severity "
                        "FROM issues WHERE id = %s AND user_id = %s",
                        (issue_id, user_email),
                    )
                    row = await cur.fetchone()
                    if row:
                        context_lines.append(
                            f"## Issue\n- Title: {row[0]}\n- Description: {row[1] or ''}\n"
                            f"- Category: {row[2] or ''}\n- Severity: {row[3] or ''}"
                        )
                if family_member_id:
                    await cur.execute(
                        "SELECT first_name, age_years, relationship, bio "
                        "FROM family_members WHERE id = %s AND user_id = %s",
                        (family_member_id, user_email),
                    )
                    row = await cur.fetchone()
                    if row:
                        context_lines.append(
                            f"## Family member\n- Name: {row[0]}\n- Age: {row[1] or '?'}\n"
                            f"- Relationship: {row[2] or ''}\n- Bio: {(row[3] or '')[:400]}"
                        )
    except Exception as exc:
        return {"error": f"collect_context failed: {exc}"}

    # Build type-specific prompt.
    system_intro = (
        "You are a clinical psychologist designing a short therapeutic exercise. "
        "The exercise must be grounded in the user's situation below (not generic), "
        "clinically sound, and safe. No medical claims. Keep language warm and concrete."
    )

    if game_type == "CBT_REFRAME":
        schema_hint = (
            'Respond ONLY with JSON:\n'
            '{\n'
            '  "title": "short evocative title",\n'
            '  "description": "one-sentence summary",\n'
            '  "estimated_minutes": 5,\n'
            '  "content": {\n'
            '    "steps": [\n'
            '      {"kind": "situation", "prompt": "Describe the situation briefly."},\n'
            '      {"kind": "thought", "prompt": "What automatic thought went through your mind?"},\n'
            '      {"kind": "distortion", "prompt": "Which distortion fits best?", "options": ["All-or-nothing thinking", "Catastrophizing", "Mind reading", "Fortune telling", "Personalization", "Should statements", "Emotional reasoning", "Labeling", "Discounting the positive", "Mental filter"]},\n'
            '      {"kind": "reframe", "prompt": "Write a balanced, evidence-based thought."}\n'
            '    ]\n'
            '  }\n'
            '}\n'
            'All 4 steps (situation, thought, distortion, reframe) must be present, in that order. '
            'The `options` array on the distortion step is REQUIRED and should be the exact list above. '
            'Tailor the prompt wording to the user\'s situation; keep each prompt under 30 words.'
        )
    elif game_type == "MINDFULNESS":
        schema_hint = (
            'Respond ONLY with JSON:\n'
            '{\n'
            '  "title": "short evocative title",\n'
            '  "description": "one-sentence summary",\n'
            '  "estimated_minutes": 5,\n'
            '  "content": {\n'
            '    "steps": [\n'
            '      {"durationSeconds": 20, "instruction": "Settle in…", "cue": "Arrive"}\n'
            '    ]\n'
            '  }\n'
            '}\n'
            'Provide 6–14 timed steps. Each `durationSeconds` is 4–60. `cue` is a 1–2 word label. '
            'Total duration should roughly equal estimated_minutes * 60. Tailor to the user\'s situation.'
        )
    else:  # JOURNAL_PROMPT
        schema_hint = (
            'Respond ONLY with JSON:\n'
            '{\n'
            '  "title": "short evocative title",\n'
            '  "description": "one-sentence summary",\n'
            '  "estimated_minutes": 8,\n'
            '  "content": {\n'
            '    "prompts": ["prompt 1", "prompt 2", "prompt 3"],\n'
            '    "writeToNote": true\n'
            '  }\n'
            '}\n'
            'Provide 3–5 open-ended journal prompts tailored to the user\'s situation. '
            'Prompts should invite reflection, not yes/no answers.'
        )

    sections = [system_intro]
    if context_lines:
        sections.append("\n\n".join(context_lines))
    else:
        sections.append("(No specific goal/issue/family member context — design a useful general exercise.)")
    sections.append("## Instructions\n" + schema_hint)
    if language == "ro":
        sections.insert(0, ROMANIAN_INSTRUCTION)

    return {"_prompt": "\n\n".join(sections)}


async def generate(state: GamesState) -> dict:
    if state.get("error"):
        return {}
    prompt = state.get("_prompt", "")
    if not prompt:
        return {"error": "empty prompt"}
    game_type = (state.get("type") or "").upper()

    try:
        async with DeepSeekClient(DeepSeekConfig(timeout=120.0)) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model=os.environ.get("LLM_MODEL", "deepseek-chat"),
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
        content_str = resp.choices[0].message.content
        parsed = json.loads(content_str)
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}

    title = str(parsed.get("title") or "").strip()[:200]
    description = str(parsed.get("description") or "").strip()[:500]
    content_obj = parsed.get("content")
    estimated_minutes = parsed.get("estimated_minutes")
    try:
        estimated_minutes = int(estimated_minutes) if estimated_minutes is not None else None
    except (TypeError, ValueError):
        estimated_minutes = None

    if not title or not isinstance(content_obj, dict):
        return {"error": f"DeepSeek response missing title/content. Keys: {list(parsed.keys())}"}

    # Basic shape validation per type.
    if game_type in ("CBT_REFRAME", "MINDFULNESS"):
        steps = content_obj.get("steps")
        if not isinstance(steps, list) or not steps:
            return {"error": f"{game_type} content.steps must be a non-empty array"}
    elif game_type == "JOURNAL_PROMPT":
        prompts = content_obj.get("prompts")
        if not isinstance(prompts, list) or not prompts:
            return {"error": "JOURNAL_PROMPT content.prompts must be a non-empty array"}
        if "writeToNote" not in content_obj:
            content_obj["writeToNote"] = True

    return {
        "_title": title,
        "_description": description,
        "_content": content_obj,
        "estimated_minutes": estimated_minutes,
    }


async def persist(state: GamesState) -> dict:
    if state.get("error") or not state.get("_title"):
        return {}
    game_type = (state.get("type") or "").upper()
    content_json = json.dumps(state["_content"], ensure_ascii=False)
    estimated_minutes = state.get("estimated_minutes")

    try:
        async with await psycopg.AsyncConnection.connect(_conn_str()) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO games (user_id, goal_id, issue_id, family_member_id, type, title, "
                    "description, content, language, estimated_minutes, source) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        state.get("user_email"),
                        state.get("goal_id"),
                        state.get("issue_id"),
                        state.get("family_member_id"),
                        game_type,
                        state["_title"],
                        state.get("_description"),
                        content_json,
                        (state.get("language") or "en").lower(),
                        estimated_minutes,
                        "AI",
                    ),
                )
                row = await cur.fetchone()
                if not row:
                    return {"error": "insert returned no id"}
                return {"persisted_ids": [row[0]]}
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}


def create_games_graph():
    builder = StateGraph(GamesState)
    builder.add_node("collect_context", collect_context)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)
    builder.add_edge(START, "collect_context")
    builder.add_edge("collect_context", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", END)
    return builder.compile()


graph = create_games_graph()
