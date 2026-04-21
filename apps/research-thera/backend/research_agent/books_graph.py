"""LangGraph book-recommendation graph — grounds book picks in research papers + family context."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END
from openai import AsyncOpenAI

import psycopg

from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


_VALID_CATEGORIES = {
    "parenting",
    "therapy",
    "self-help",
    "child development",
    "education",
    "psychology",
    "neuroscience",
}


class BooksState(TypedDict, total=False):
    goal_id: int
    user_email: str
    # Internal
    _prompt: str
    _research_count: int
    _skip_persist: bool
    _books_raw: list[dict]
    # Output
    success: bool
    message: str
    books: list[dict]
    error: str


def _conn_str() -> str:
    return os.environ.get("NEON_DATABASE_URL", "")


async def collect_data(state: BooksState) -> dict:
    # Test hook: if a prompt was pre-assembled by the caller, skip the DB
    # round-trip entirely. Prod callers never set `_prompt`.
    if state.get("_prompt"):
        return {}

    goal_id = state.get("goal_id")
    user_email = state.get("user_email")
    if not goal_id or not user_email:
        return {"error": "goal_id and user_email are required"}

    conn_str = _conn_str()
    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                # Goal
                await cur.execute(
                    "SELECT id, title, description, family_member_id FROM goals WHERE id = %s AND user_id = %s",
                    (goal_id, user_email),
                )
                goal_row = await cur.fetchone()
                if not goal_row:
                    return {"error": f"Goal {goal_id} not found"}
                _, goal_title, goal_desc, family_member_id = goal_row

                # Research papers for the goal
                await cur.execute(
                    "SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level "
                    "FROM therapy_research WHERE goal_id = %s ORDER BY relevance_score DESC LIMIT 10",
                    (goal_id,),
                )
                research_rows = await cur.fetchall()
                if not research_rows:
                    return {
                        "success": False,
                        "message": "No research found. Generate research first before recommending books.",
                        "books": [],
                    }

                # Family member profile and issues
                family_sections: list[str] = []
                if family_member_id:
                    await cur.execute(
                        "SELECT first_name, name, age_years, relationship, bio FROM family_members WHERE id = %s",
                        (family_member_id,),
                    )
                    fm_row = await cur.fetchone()
                    if fm_row:
                        fm_first, fm_name, fm_age, fm_rel, fm_bio = fm_row
                        profile_parts = [f"**{fm_first}{' ' + fm_name if fm_name else ''}**"]
                        if fm_age:
                            profile_parts.append(f"Age: {fm_age}")
                        if fm_rel:
                            profile_parts.append(f"Relationship: {fm_rel}")
                        if fm_bio:
                            profile_parts.append(f"Bio: {fm_bio[:500]}")
                        family_sections.append("### Person Profile\n" + " | ".join(profile_parts))

                    await cur.execute(
                        "SELECT title, category, severity, description FROM issues "
                        "WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC LIMIT 10",
                        (family_member_id, user_email),
                    )
                    issue_rows = await cur.fetchall()
                    if issue_rows:
                        lines = [
                            f"- **{row[0]}** [{row[2]}/{row[1]}]: {(row[3] or '')[:150]}"
                            for row in issue_rows
                        ]
                        family_sections.append(f"### Known Issues ({len(issue_rows)})\n" + "\n".join(lines))
    except Exception as exc:
        return {"error": f"collect_data failed: {exc}"}

    # Build research summary
    research_lines = []
    for idx, row in enumerate(research_rows):
        r_title, r_abstract, r_kf_raw, r_tt_raw, r_ev = row
        parts = [f'[{idx + 1}] "{r_title}"']
        if r_abstract:
            parts.append(f"  Abstract: {r_abstract[:200]}")
        kf = json.loads(r_kf_raw) if r_kf_raw else []
        if kf:
            parts.append(f"  Key findings: {'; '.join(kf[:3])}")
        tt = json.loads(r_tt_raw) if r_tt_raw else []
        if tt:
            parts.append(f"  Techniques: {'; '.join(tt[:3])}")
        if r_ev:
            parts.append(f"  Evidence: {r_ev}")
        research_lines.append("\n".join(parts))
    research_summary = "\n\n".join(research_lines)

    context_text = f"Goal: {goal_title}"
    if goal_desc:
        context_text += f"\nDescription: {goal_desc}"

    family_context_text = ""
    if family_sections:
        family_context_text = "\n## Family Context\n" + "\n\n".join(family_sections)

    prompt = "\n".join(
        [
            "You are a clinical bibliotherapist. Based on the therapeutic goal, family context, and academic research papers below, recommend 4-6 real, published books that would be most helpful.",
            "",
            "## Therapeutic Goal",
            context_text,
            family_context_text,
            "",
            "## Research Papers (for grounding)",
            research_summary,
            "",
            "## Instructions",
            "Recommend 4-6 books that:",
            "- Are REAL, well-known published books (do NOT invent titles)",
            "- Cover diverse categories (mix of parenting guides, therapy workbooks, psychology, child development)",
            "- Are directly relevant to the therapeutic goal and research findings",
            "- Would be accessible and practical for a parent or caregiver",
            "- Range from introductory to advanced where appropriate",
            "",
            "For each book provide: title (exact), authors (array of full names), year (int, optional), isbn (string, optional), description (brief content summary), whyRecommended (personalized rationale linking to the goal, research, and family context), category (one of: parenting, therapy, self-help, child development, education, psychology, neuroscience).",
            "",
            'Respond with a JSON object of the shape {"books": [ {...}, ... ]}. The top-level key MUST be "books" and its value MUST be an array.',
        ]
    )

    return {
        "_prompt": prompt,
        "_research_count": len(research_rows),
    }


def _normalize_books(parsed) -> list[dict]:
    """Coerce whatever DeepSeek returned into a list of book dicts."""
    if parsed is None:
        return []
    # Preferred shape: {"books": [...]}
    if isinstance(parsed, dict):
        for key in ("books", "recommendations", "results", "items", "data"):
            val = parsed.get(key)
            if isinstance(val, list):
                return [b for b in val if isinstance(b, dict)]
        # Sometimes the model returns a single book dict at top level.
        if "title" in parsed and "authors" in parsed:
            return [parsed]
        # Or a dict whose only value is the array.
        for val in parsed.values():
            if isinstance(val, list) and val and isinstance(val[0], dict):
                return [b for b in val if isinstance(b, dict)]
        return []
    # Or DeepSeek returned a bare array.
    if isinstance(parsed, list):
        return [b for b in parsed if isinstance(b, dict)]
    return []


def _coerce_book(raw: dict) -> Optional[dict]:
    title = raw.get("title")
    if not title or not isinstance(title, str):
        return None
    authors_raw = raw.get("authors") or raw.get("author") or []
    if isinstance(authors_raw, str):
        authors = [a.strip() for a in authors_raw.split(",") if a.strip()]
    elif isinstance(authors_raw, list):
        authors = [str(a).strip() for a in authors_raw if str(a).strip()]
    else:
        authors = []
    year = raw.get("year")
    if isinstance(year, str) and year.isdigit():
        year = int(year)
    elif not isinstance(year, int):
        year = None
    category = raw.get("category")
    if category not in _VALID_CATEGORIES:
        category = "self-help"
    return {
        "title": title.strip(),
        "authors": authors,
        "year": year,
        "isbn": (raw.get("isbn") or None) if isinstance(raw.get("isbn"), str) else None,
        "description": (raw.get("description") or "").strip(),
        "why_recommended": (raw.get("whyRecommended") or raw.get("why_recommended") or "").strip(),
        "category": category,
    }


async def generate(state: dict) -> dict:
    if state.get("error") or state.get("success") is False:
        return {}

    prompt = state.get("_prompt", "")
    base_url = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com")
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")
    try:
        client = AsyncOpenAI(base_url=base_url, api_key=api_key, timeout=180.0)
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=8192,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        parsed = json.loads(content)
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}

    raw_books = _normalize_books(parsed)
    books: list[dict] = []
    for raw in raw_books[:8]:
        coerced = _coerce_book(raw)
        if coerced:
            books.append(coerced)

    if len(books) < 3:
        return {"error": f"DeepSeek returned {len(books)} valid books (need >= 3). Top-level keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'array'}"}

    return {"_books_raw": books}


async def persist(state: dict) -> dict:
    if state.get("error"):
        return {}
    books_raw = state.get("_books_raw") or []
    if not books_raw:
        return {}

    goal_id = state.get("goal_id")
    conn_str = _conn_str()
    now_iso = datetime.now(timezone.utc).isoformat()
    inserted: list[dict] = []

    # Test hook: if there's no DB URL or the caller opted out, synthesize
    # output rows from `_books_raw` without touching Neon.
    if not conn_str or state.get("_skip_persist"):
        for idx, b in enumerate(books_raw, start=1):
            inserted.append({
                "id": idx,
                "goalId": goal_id,
                "title": b["title"],
                "authors": b["authors"],
                "year": b["year"],
                "isbn": b["isbn"],
                "description": b["description"],
                "whyRecommended": b["why_recommended"],
                "category": b["category"],
                "amazonUrl": None,
                "generatedAt": now_iso,
                "createdAt": now_iso,
                "updatedAt": now_iso,
            })
        research_count = state.get("_research_count", 0)
        return {
            "success": True,
            "message": f"Recommended {len(inserted)} books based on {research_count} research papers.",
            "books": inserted,
        }

    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                for b in books_raw:
                    await cur.execute(
                        "INSERT INTO recommended_books "
                        "(goal_id, title, authors, year, isbn, description, why_recommended, category, amazon_url, generated_at, created_at, updated_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                        "RETURNING id, goal_id, title, authors, year, isbn, description, why_recommended, category, amazon_url, generated_at, created_at, updated_at",
                        (
                            goal_id,
                            b["title"],
                            json.dumps(b["authors"]),
                            b["year"],
                            b["isbn"],
                            b["description"],
                            b["why_recommended"],
                            b["category"],
                            None,
                            now_iso,
                            now_iso,
                            now_iso,
                        ),
                    )
                    row = await cur.fetchone()
                    if row:
                        (
                            r_id, r_goal, r_title, r_authors, r_year, r_isbn, r_desc,
                            r_why, r_cat, r_amazon, r_gen, r_created, r_updated,
                        ) = row
                        inserted.append({
                            "id": r_id,
                            "goalId": r_goal,
                            "title": r_title,
                            "authors": json.loads(r_authors) if r_authors else [],
                            "year": r_year,
                            "isbn": r_isbn,
                            "description": r_desc,
                            "whyRecommended": r_why,
                            "category": r_cat,
                            "amazonUrl": r_amazon,
                            "generatedAt": str(r_gen),
                            "createdAt": str(r_created),
                            "updatedAt": str(r_updated),
                        })
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}

    research_count = state.get("_research_count", 0)
    return {
        "success": True,
        "message": f"Recommended {len(inserted)} books based on {research_count} research papers.",
        "books": inserted,
    }


def _finalize(state: dict) -> dict:
    if state.get("error"):
        return {
            "success": False,
            "message": state["error"],
            "books": [],
        }
    if state.get("success") is False:
        return {
            "success": False,
            "message": state.get("message") or "Books not generated.",
            "books": state.get("books") or [],
        }
    return {
        "success": state.get("success", True),
        "message": state.get("message") or "",
        "books": state.get("books") or [],
    }


def create_books_graph():
    builder = StateGraph(BooksState)
    builder.add_node("collect_data", collect_data)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)
    builder.add_node("finalize", _finalize)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


# Module-level instance for LangGraph server
graph = create_books_graph()
