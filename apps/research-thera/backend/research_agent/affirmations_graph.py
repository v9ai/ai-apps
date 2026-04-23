"""LangGraph affirmations graph — generates personalized affirmations for a family member.

Uses the same rich context as `deep_analysis_v2` (family member profile, issues,
observations, journal entries, research) so affirmations are grounded in the
member's real situation. Three nodes: collect_context → generate → persist.
Persists new rows in the `affirmations` table; the existing React UI at
`/family/[id]/affirmations` picks them up on refetch.
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

from . import _deep_analysis_shared as shared  # noqa: E402

# deepseek_client — local (container) path first, fall back to pypackages for local dev
sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402


ALLOWED_CATEGORIES = ("gratitude", "strength", "encouragement", "growth", "self-worth")
DEFAULT_CATEGORY = "encouragement"
MAX_COUNT = 10


class AffirmationsState(TypedDict, total=False):
    # Input
    family_member_id: int
    user_email: str
    count: int
    language: str  # "en" | "ro"
    category_focus: Optional[str]
    seed_theme: Optional[str]
    # Internal
    _prompt: str
    _member_label: str
    # Output
    affirmations: list[dict[str, Any]]
    persisted_ids: list[int]
    error: str


def _normalise_category(raw: Any) -> str:
    if not raw:
        return DEFAULT_CATEGORY
    v = str(raw).strip().lower().replace("_", "-")
    return v if v in ALLOWED_CATEGORIES else DEFAULT_CATEGORY


def _clamp_count(raw: Any, default: int = 5) -> int:
    try:
        n = int(raw) if raw is not None else default
    except (TypeError, ValueError):
        n = default
    return max(1, min(n, MAX_COUNT))


async def collect_context(state: AffirmationsState) -> dict:
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    language = state.get("language") or "en"
    count = _clamp_count(state.get("count"))
    category_focus = state.get("category_focus")
    seed_theme = state.get("seed_theme")

    if not family_member_id or not user_email:
        return {"error": "family_member_id and user_email are required"}

    try:
        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                ctx = await shared.load_family_member_full_context(cur, family_member_id, user_email)

                await cur.execute(
                    "SELECT text, category FROM affirmations "
                    "WHERE family_member_id = %s AND user_id = %s AND is_active = 1 "
                    "ORDER BY created_at DESC LIMIT 50",
                    (family_member_id, user_email),
                )
                existing = await cur.fetchall()
    except Exception as exc:
        return {"error": f"collect_context failed: {exc}"}

    fm_id, fm_first, fm_name, fm_age, fm_rel, fm_bio = ctx["fm"]

    sections: list[str] = []
    sections.append(
        "You are a clinical psychologist and strengths-based family coach. Your task is "
        f"to write {count} deeply personal affirmations for the family member below, "
        "grounded in their real situation, goals, and challenges — not generic platitudes.\n\n"
        "CRITICAL — ATTRIBUTION RULES:\n"
        "- Read each issue/observation carefully. The profiled family member may be "
        "the subject, victim, or bystander. If they were harmed, frame affirmations "
        "around resilience, safety, and self-worth — never blame them for the harm.\n"
        "- People mentioned who are NOT in ## Other Family Members are external "
        "(classmates, colleagues, neighbors).\n\n"
        "VOICE:\n"
        "- English: second-person present tense (\"You are…\", \"You can…\").\n"
        "- Romanian: use natural Romanian affirmation voice (\"Ești…\", \"Poți…\").\n"
        "- Age-appropriate for the member's age shown in the profile.\n"
        "- Concrete and grounded in the data below, not abstract."
    )

    sections.append(shared.render_family_member_profile(fm_first, fm_name, fm_age, fm_rel, fm_bio))

    role_note = (
        "\n(The profiled member may be subject, victim, or bystander. Read descriptions "
        "to determine their role before phrasing any affirmation that references an issue.)\n"
    )
    issues_chunk = shared.render_issues_section(
        ctx["issues"], f"## Issues ({len(ctx['issues'])}){role_note}"
    )
    if issues_chunk:
        sections.append(issues_chunk)

    for renderer, rows in [
        (shared.render_observations_section, ctx["observations"]),
        (shared.render_journals_section, ctx["journals"]),
        (shared.render_teacher_feedbacks_section, ctx["teacher_fbs"]),
        (shared.render_contact_feedbacks_section, ctx["contact_fbs"]),
        (shared.render_related_member_issues_section, ctx["related_issues"]),
        (shared.render_research_section, ctx["research"]),
    ]:
        chunk = renderer(rows)
        if chunk:
            sections.append(chunk)

    members_chunk = shared.render_family_members_section(ctx["all_members"], exclude_id=fm_id)
    if members_chunk:
        sections.append(members_chunk)

    if existing:
        existing_lines = [
            f"- [{(cat or DEFAULT_CATEGORY)}] {(txt or '')[:180]}"
            for (txt, cat) in existing
        ]
        sections.append(
            "## Existing Active Affirmations (do NOT duplicate these; write fresh ones)\n"
            + "\n".join(existing_lines)
        )

    instructions: list[str] = [
        f"Generate exactly {count} affirmations that:",
        "- Are directly grounded in the profile, issues, and observations above.",
        "- Are short (≤ 180 characters), first-impact wording, no hedging.",
        f"- Use only these categories: {', '.join(ALLOWED_CATEGORIES)}.",
        "- Do not duplicate any existing affirmation listed above.",
        "- Spread across multiple categories unless a focus is specified below.",
    ]
    if category_focus:
        cf = _normalise_category(category_focus)
        instructions.append(
            f"- FOCUS: at least {max(1, count // 2)} of the {count} must be in category "
            f"\"{cf}\". The rest may vary."
        )
    if seed_theme:
        instructions.append(f"- Seed theme to weave in where natural: {seed_theme[:160]}")

    instructions += [
        "",
        "Respond ONLY with a JSON object in this exact shape:",
        '{"affirmations": [',
        '  {"text": "...", "category": "encouragement", "rationale": "1 sentence — why this fits their situation"}',
        "]}",
        f"Return exactly {count} items in the array.",
    ]
    sections.append("## Instructions\n" + "\n".join(instructions))

    if language == "ro":
        sections.insert(0, shared.ROMANIAN_INSTRUCTION)

    prompt = "\n\n".join(sections)
    return {
        "_prompt": prompt,
        "_member_label": fm_first or fm_name or f"Member {fm_id}",
    }


async def generate(state: AffirmationsState) -> dict:
    if state.get("error"):
        return {}
    prompt = state.get("_prompt", "")
    if not prompt:
        return {"error": "empty prompt"}
    count = _clamp_count(state.get("count"))

    try:
        async with DeepSeekClient(DeepSeekConfig(timeout=120.0)) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model=os.environ.get("LLM_MODEL", "deepseek-chat"),
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
        content = resp.choices[0].message.content
        parsed = json.loads(content)
        items = parsed.get("affirmations")
        if not isinstance(items, list):
            # Tolerate different key names
            for v in parsed.values():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    items = v
                    break
        if not items:
            return {"error": f"DeepSeek returned no affirmations. Keys: {list(parsed.keys())}"}
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}

    normalised: list[dict[str, Any]] = []
    for it in items[:count]:
        if not isinstance(it, dict):
            continue
        text = str(it.get("text") or "").strip()
        if not text:
            continue
        normalised.append({
            "text": text[:400],
            "category": _normalise_category(it.get("category")),
            "rationale": str(it.get("rationale") or "")[:400] or None,
        })

    if not normalised:
        return {"error": "no valid affirmations in DeepSeek response"}
    return {"affirmations": normalised}


async def persist(state: AffirmationsState) -> dict:
    if state.get("error") or not state.get("affirmations"):
        return {}
    family_member_id = state.get("family_member_id")
    user_email = state.get("user_email")
    affirmations = state["affirmations"]

    ids: list[int] = []
    try:
        async with await psycopg.AsyncConnection.connect(shared.conn_str()) as conn:
            async with conn.cursor() as cur:
                for item in affirmations:
                    await cur.execute(
                        "INSERT INTO affirmations (family_member_id, user_id, text, category) "
                        "VALUES (%s, %s, %s, %s) RETURNING id",
                        (family_member_id, user_email, item["text"], item["category"]),
                    )
                    row = await cur.fetchone()
                    if row:
                        ids.append(row[0])
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}
    return {"persisted_ids": ids}


def create_affirmations_graph():
    builder = StateGraph(AffirmationsState)
    builder.add_node("collect_context", collect_context)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)
    builder.add_edge(START, "collect_context")
    builder.add_edge("collect_context", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", END)
    return builder.compile()


graph = create_affirmations_graph()
