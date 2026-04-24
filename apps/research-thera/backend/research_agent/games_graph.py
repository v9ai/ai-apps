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
    fm_age: Optional[int] = None
    fm_first_name: Optional[str] = None

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
                        fm_first_name = row[0]
                        try:
                            fm_age = int(row[1]) if row[1] is not None else None
                        except (TypeError, ValueError):
                            fm_age = None
                        context_lines.append(
                            f"## Family member\n- Name: {row[0]}\n- Age: {row[1] or '?'}\n"
                            f"- Relationship: {row[2] or ''}\n- Bio: {(row[3] or '')[:400]}"
                        )
    except Exception as exc:
        return {"error": f"collect_context failed: {exc}"}

    # Audience band for age-appropriate voice.
    if fm_age is not None and fm_age <= 10:
        audience = "child"
    elif fm_age is not None and fm_age <= 13:
        audience = "preteen"
    elif fm_age is not None and fm_age <= 17:
        audience = "teen"
    else:
        audience = "adult"

    audience_rules = {
        "child": (
            "AUDIENCE: child, roughly 6–10 years old"
            + (f" (this exercise is for {fm_first_name})" if fm_first_name else "")
            + ".\n"
            "- Use concrete, playful metaphors (animals, weather, colors, superheroes).\n"
            "- Externalize feelings: give worries or anger a character name (Worry Bug, Grumpy Cloud, Brave Voice).\n"
            "- Short sentences (≤ 12 words). One idea per sentence.\n"
            "- Kind, warm tone. Never blame or shame. Never clinical jargon.\n"
            "- Cues are 1–3 words a kid can whisper to themselves (e.g. 'Fill up', 'Tuck in', 'Brave Voice').\n"
            "- Total exercise should be 2–4 minutes so attention holds.\n"
            "- For CBT distortions, use exactly 3–4 kid-friendly character names like:\n"
            '    "Monster Maker — makes tiny things feel huge",\n'
            '    "Crystal Ball — pretends to know the future",\n'
            '    "Mean Judge — calls you bad names",\n'
            '    "Always-Never — says things will always or never happen".\n'
            "- For journal prompts, use imagery (weather, colors, animals, superheroes) not abstract reflection."
        ),
        "preteen": (
            "AUDIENCE: preteen, roughly 11–13 years old.\n"
            "- Respect their growing self-awareness; avoid baby-ish framing.\n"
            "- Still use metaphors, but the voice can be a little cooler.\n"
            "- Short paragraphs. Concrete situations (school, friends, social media).\n"
            "- For CBT, 4–6 distortion options with short plain-English names."
        ),
        "teen": (
            "AUDIENCE: teen, 14–17.\n"
            "- Direct, non-patronizing voice. Validate autonomy.\n"
            "- Use real-world teen contexts. Avoid lecturing.\n"
            "- CBT: full distortion list is fine; keep names short."
        ),
        "adult": (
            "AUDIENCE: adult.\n"
            "- Clinical but warm. Concise. Evidence-oriented.\n"
            "- CBT: standard 10-distortion list is appropriate."
        ),
    }[audience]

    # Stash on state so `generate()` can vary the schema hint.
    context_lines.append("## Audience guidance\n" + audience_rules)

    # Build type-specific prompt.
    system_intro = (
        "You are a clinical child/family psychologist designing a short therapeutic exercise. "
        "The exercise must be grounded in the user's situation below (not generic), clinically sound, "
        "and safe. No medical claims. Follow the AUDIENCE guidance above — voice, sentence length, "
        "metaphors, and distortion names MUST match the audience band."
    )

    is_child = audience == "child"

    if game_type == "CBT_REFRAME":
        if is_child:
            schema_hint = (
                'Respond ONLY with JSON. Design this for a young child (≈6–10). Use externalization: '
                'the worry is a character, the reframe is a "Brave Voice".\n'
                '{\n'
                '  "title": "playful, warm title",\n'
                '  "description": "one short sentence a kid can understand",\n'
                '  "estimated_minutes": 5,\n'
                '  "content": {\n'
                '    "steps": [\n'
                '      {"kind": "situation", "prompt": "Tell the story in one or two sentences."},\n'
                '      {"kind": "thought", "prompt": "What did the Worry Bug (or Grumpy Cloud / Angry Dragon / etc.) whisper?"},\n'
                '      {"kind": "distortion", "prompt": "Which trick was it using?", '
                '"options": ["Monster Maker — makes tiny things feel huge", "Crystal Ball — pretends to know the future", "Mean Judge — calls you bad names", "Always-Never — says things will always or never happen"]},\n'
                '      {"kind": "reframe", "prompt": "What would your Brave Voice say? Brave Voice tells the truth and is kind."}\n'
                '    ]\n'
                '  }\n'
                '}\n'
                'The `options` list MUST be exactly those 4 kid-friendly character names (no clinical jargon). '
                'Each prompt ≤ 18 words. Tailor wording to the child\'s situation.'
            )
        else:
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
        if is_child:
            schema_hint = (
                'Respond ONLY with JSON. Design this for a young child (≈6–10). Use a single vivid '
                'metaphor the whole exercise hangs on (dragon breath, turtle shell, glitter jar, rainbow '
                'body scan, balloon belly, etc.). Total 2–4 minutes.\n'
                '{\n'
                '  "title": "playful metaphor title",\n'
                '  "description": "one warm sentence",\n'
                '  "estimated_minutes": 3,\n'
                '  "content": {\n'
                '    "steps": [\n'
                '      {"durationSeconds": 10, "instruction": "Short, kid-voice instruction.", "cue": "1–2 word cue"}\n'
                '    ]\n'
                '  }\n'
                '}\n'
                'Provide 8–14 steps. Each `durationSeconds` is 4–30. `cue` is 1–3 words a child can whisper. '
                'Total duration ≈ estimated_minutes × 60 (aim 120–240s for kids).'
            )
        else:
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
        if is_child:
            schema_hint = (
                'Respond ONLY with JSON. Design this for a young child (≈6–10). Use imagery '
                '(weather, colors, animals, superheroes) not abstract reflection.\n'
                '{\n'
                '  "title": "playful title",\n'
                '  "description": "one warm sentence",\n'
                '  "estimated_minutes": 6,\n'
                '  "content": {\n'
                '    "prompts": ["imagery-based prompt 1", "imagery-based prompt 2", "imagery-based prompt 3"],\n'
                '    "writeToNote": true\n'
                '  }\n'
                '}\n'
                'Provide exactly 3–4 prompts. Each prompt ≤ 20 words and anchored in a concrete image '
                '(e.g. "What was the weather inside you today?", "If your day was an animal, what animal?").'
            )
        else:
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
