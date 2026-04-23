"""LangGraph book-recommendation graph — grounds book picks in research papers + family context."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional, TypedDict

from langgraph.graph import StateGraph, START, END

from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig

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
    journal_entry_id: int
    user_email: str
    job_id: str
    # Internal
    _prompt: str
    _research_count: int
    _skip_persist: bool
    _candidates: list[dict]  # pass-1 candidate books (pre-rank)
    _books_raw: list[dict]  # pass-2 ranked top-N, rationales merged
    _ordering_strategy: str  # overall curatorial arc
    # Output
    success: bool
    message: str
    books: list[dict]
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
        print(f"[books._update_job_progress] failed: {exc}")


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
        print(f"[books._update_job_succeeded] failed: {exc}")


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
        print(f"[books._update_job_failed] failed: {exc}")


async def collect_data(state: BooksState) -> dict:
    # Test hook: if a prompt was pre-assembled by the caller, skip the DB
    # round-trip entirely. Prod callers never set `_prompt`.
    if state.get("_prompt"):
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 10)

    goal_id = state.get("goal_id")
    journal_entry_id = state.get("journal_entry_id")
    user_email = state.get("user_email")
    if not user_email or (not goal_id and not journal_entry_id):
        return {"error": "user_email and (goal_id or journal_entry_id) are required"}

    conn_str = _conn_str()
    try:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                goal_title: str
                goal_desc: Optional[str] = None
                family_member_id: Optional[int] = None

                if journal_entry_id:
                    # Journal entry context stands in for the goal.
                    await cur.execute(
                        "SELECT id, title, content, mood, family_member_id FROM journal_entries "
                        "WHERE id = %s AND user_id = %s",
                        (journal_entry_id, user_email),
                    )
                    je_row = await cur.fetchone()
                    if not je_row:
                        return {"error": f"Journal entry {journal_entry_id} not found"}
                    _, je_title, je_content, je_mood, family_member_id = je_row
                    goal_title = je_title or "Journal reflection"
                    desc_parts: list[str] = []
                    if je_mood:
                        desc_parts.append(f"Mood: {je_mood}")
                    if je_content:
                        desc_parts.append((je_content or "")[:800])
                    goal_desc = "\n".join(desc_parts) if desc_parts else None

                    await cur.execute(
                        "SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level "
                        "FROM therapy_research WHERE journal_entry_id = %s ORDER BY relevance_score DESC LIMIT 20",
                        (journal_entry_id,),
                    )
                else:
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
                        "FROM therapy_research WHERE goal_id = %s ORDER BY relevance_score DESC LIMIT 20",
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
                        "WHERE (family_member_id = %s OR related_family_member_id = %s) AND user_id = %s "
                        "ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC LIMIT 20",
                        (family_member_id, family_member_id, user_email),
                    )
                    issue_rows = await cur.fetchall()
                    if issue_rows:
                        lines = [
                            f"- **{row[0]}** [{row[2]}/{row[1]}]: {(row[3] or '')[:180]}"
                            for row in issue_rows
                        ]
                        family_sections.append(f"### Known Issues ({len(issue_rows)})\n" + "\n".join(lines))

                    # Priority concerns & support needs (structured clinical flags)
                    await cur.execute(
                        "SELECT title, category, risk_tier, description, strengths "
                        "FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY CASE category WHEN 'PRIORITY_CONCERN' THEN 0 WHEN 'SUPPORT_NEED' THEN 1 ELSE 2 END, created_at DESC LIMIT 12",
                        (family_member_id, user_email),
                    )
                    char_rows = await cur.fetchall()
                    if char_rows:
                        lines = []
                        for c_title, c_cat, c_risk, c_desc, c_strengths in char_rows:
                            tag = f"[{c_cat or ''}{('/' + c_risk) if c_risk and c_risk != 'NONE' else ''}]"
                            extra = f": {(c_desc or '')[:200]}" if c_desc else ""
                            strengths_line = f"\n  strengths: {c_strengths[:150]}" if c_strengths else ""
                            lines.append(f"- {tag} {c_title or ''}{extra}{strengths_line}".rstrip())
                        family_sections.append(f"### Priority Concerns & Support Needs ({len(char_rows)})\n" + "\n".join(lines))

                    # Teacher feedbacks — external observer data
                    await cur.execute(
                        "SELECT teacher_name, subject, feedback_date, content FROM teacher_feedbacks "
                        "WHERE family_member_id = %s AND user_id = %s ORDER BY feedback_date DESC, created_at DESC LIMIT 5",
                        (family_member_id, user_email),
                    )
                    teacher_rows = await cur.fetchall()
                    if teacher_rows:
                        lines = [
                            f"- {t_date} — {t_name}{(' (' + t_subj + ')') if t_subj else ''}: {(t_content or '')[:250]}"
                            for t_name, t_subj, t_date, t_content in teacher_rows
                        ]
                        family_sections.append(f"### Teacher Observations ({len(teacher_rows)})\n" + "\n".join(lines))

                    # Behavior observations (ABC data)
                    await cur.execute(
                        "SELECT observation_type, frequency, intensity, context, notes, observed_at "
                        "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY observed_at DESC, created_at DESC LIMIT 5",
                        (family_member_id, user_email),
                    )
                    obs_rows = await cur.fetchall()
                    if obs_rows:
                        lines = []
                        for o_type, o_freq, o_int, o_ctx, o_notes, o_date in obs_rows:
                            meta = [o_type or ""]
                            if o_int: meta.append(f"intensity:{o_int}")
                            if o_freq is not None: meta.append(f"freq:{o_freq}")
                            ctx_s = f" ctx: {o_ctx[:120]}" if o_ctx else ""
                            notes_s = f" — {o_notes[:160]}" if o_notes else ""
                            lines.append(f"- {o_date} [{', '.join(m for m in meta if m)}]{ctx_s}{notes_s}")
                        family_sections.append(f"### Behavior Observations ({len(obs_rows)})\n" + "\n".join(lines))

                    # Recent journal entries (incident log)
                    await cur.execute(
                        "SELECT entry_date, title, content, mood FROM journal_entries "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY entry_date DESC NULLS LAST, created_at DESC LIMIT 10",
                        (family_member_id, user_email),
                    )
                    je_rows = await cur.fetchall()
                    if je_rows:
                        lines = [
                            f"- {j_date}{(' — ' + j_title) if j_title else ''}{(' [' + j_mood + ']') if j_mood else ''}{(': ' + j_content[:200]) if j_content else ''}"
                            for j_date, j_title, j_content, j_mood in je_rows
                        ]
                        family_sections.append(f"### Recent Journal Entries ({len(je_rows)})\n" + "\n".join(lines))

                    # Prior clinical analyses (already-synthesized parent advice)
                    await cur.execute(
                        "SELECT summary, parent_advice FROM deep_issue_analyses "
                        "WHERE family_member_id = %s AND user_id = %s ORDER BY created_at DESC LIMIT 3",
                        (family_member_id, user_email),
                    )
                    analysis_rows = await cur.fetchall()
                    if analysis_rows:
                        lines = []
                        for idx, (a_summary, a_advice_raw) in enumerate(analysis_rows, 1):
                            head = f"- [Analysis {idx}] {(a_summary or '')[:350]}"
                            try:
                                advice = json.loads(a_advice_raw) if a_advice_raw else []
                            except Exception:
                                advice = []
                            advice_lines = []
                            if isinstance(advice, list):
                                for p in advice[:3]:
                                    if not isinstance(p, dict):
                                        continue
                                    title = p.get("title") or ""
                                    text = p.get("advice") or ""
                                    advice_lines.append(f"    • {title}{(': ' + str(text)[:180]) if text else ''}".rstrip())
                            lines.append("\n".join([head, *advice_lines]) if advice_lines else head)
                        family_sections.append(f"### Prior Clinical Analyses ({len(analysis_rows)})\n" + "\n".join(lines))
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
        family_context_text = "\n## Subject Profile\n" + "\n\n".join(family_sections)

    prompt = "\n".join(
        [
            "You are a clinical bibliotherapist. The therapeutic goal belongs to the PARENT/CAREGIVER (the reader). The child/subject under their care is described in **Subject Profile**. Recommend 4-6 real, published books that help the parent (a) achieve the goal, (b) co-regulate with the specific pattern the child shows (e.g. defiance, emotion dysregulation, ODD-spectrum presentations, selective eating, peer conflict — whatever the profile reveals), and (c) practice evidence-based approaches such as Collaborative Problem Solving, Parent Management Training, Emotion Coaching, and DBT/ACT parent-self-regulation skills when relevant.",
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
            "- Are directly relevant to the therapeutic goal, Subject Profile, and research findings",
            "- Would be accessible and practical for a parent or caregiver",
            "- Range from introductory to advanced where appropriate",
            "",
            "For each book provide: title (exact), authors (array of full names), year (int, optional), isbn (string, optional), description (brief content summary), whyRecommended (personalized rationale that cites specific items from the Subject Profile — e.g. reference the actual issues, teacher observations, or journal incidents by name or phrase), category (one of: parenting, therapy, self-help, child development, education, psychology, neuroscience).",
            "",
            'Respond with a JSON object of the shape {"books": [ {...}, ... ]}. The top-level key MUST be "books" and its value MUST be an array.',
        ]
    )

    if job_id:
        await _update_job_progress(job_id, 30)

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

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 50)

    prompt = state.get("_prompt", "")
    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")
    # DeepSeek's JSON mode occasionally emits malformed JSON under load; one
    # retry cuts the flake rate without adding meaningful cost.
    parsed = None
    last_exc: Optional[Exception] = None
    try:
        config = DeepSeekConfig(
            api_key=api_key, base_url=base_url, timeout=180.0, default_model=model
        )
    except Exception as exc:
        return {"error": f"generate failed (config): {exc}"}
    try:
        async with DeepSeekClient(config) as client:
            for _ in range(2):
                try:
                    resp = await client.chat(
                        [ChatMessage(role="user", content=prompt)],
                        model=model,
                        temperature=0.4,
                        max_tokens=8192,
                        response_format={"type": "json_object"},
                    )
                    content = resp.choices[0].message.content
                    parsed = json.loads(content)
                    break
                except json.JSONDecodeError as exc:
                    last_exc = exc
                    continue
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}
    if parsed is None:
        return {"error": f"generate failed: {last_exc}"}

    raw_books = _normalize_books(parsed)
    books: list[dict] = []
    for raw in raw_books[:8]:
        coerced = _coerce_book(raw)
        if coerced:
            books.append(coerced)

    if len(books) < 3:
        return {"error": f"DeepSeek returned {len(books)} valid books (need >= 3). Top-level keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'array'}"}

    if job_id:
        await _update_job_progress(job_id, 80)

    return {"_books_raw": books}


async def persist(state: dict) -> dict:
    if state.get("error"):
        return {}
    books_raw = state.get("_books_raw") or []
    if not books_raw:
        return {}

    goal_id = state.get("goal_id")
    journal_entry_id = state.get("journal_entry_id")
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
                "journalEntryId": journal_entry_id,
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
                        "(goal_id, journal_entry_id, title, authors, year, isbn, description, why_recommended, category, amazon_url, generated_at, created_at, updated_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                        "RETURNING id, goal_id, journal_entry_id, title, authors, year, isbn, description, why_recommended, category, amazon_url, generated_at, created_at, updated_at",
                        (
                            goal_id,
                            journal_entry_id,
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
                            r_id, r_goal, r_je, r_title, r_authors, r_year, r_isbn, r_desc,
                            r_why, r_cat, r_amazon, r_gen, r_created, r_updated,
                        ) = row
                        inserted.append({
                            "id": r_id,
                            "goalId": r_goal,
                            "journalEntryId": r_je,
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


async def _finalize(state: dict) -> dict:
    job_id = state.get("job_id")
    if state.get("error"):
        if job_id:
            await _update_job_failed(job_id, {"message": state["error"]})
        return {
            "success": False,
            "message": state["error"],
            "books": [],
        }
    if state.get("success") is False:
        message = state.get("message") or "Books not generated."
        if job_id:
            await _update_job_failed(job_id, {"message": message})
        return {
            "success": False,
            "message": message,
            "books": state.get("books") or [],
        }
    books = state.get("books") or []
    message = state.get("message") or ""
    if job_id:
        await _update_job_succeeded(job_id, {"count": len(books), "message": message})
    return {
        "success": state.get("success", True),
        "message": message,
        "books": books,
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
