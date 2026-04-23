"""LangGraph book-recommendation graph — grounds book picks in research papers + family context."""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any, Optional, TypedDict

import httpx
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
    _evals: dict  # verification stats from verify_books node
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
            "You are a clinical bibliotherapist performing the FIRST PASS of a two-pass curation. The therapeutic goal belongs to the PARENT/CAREGIVER (the reader). The child/subject under their care is described in **Subject Profile**. Generate a WIDE SHORTLIST of 10-12 candidate books — don't filter aggressively; include well-known primary works, complementary secondary works, and practical workbooks. A separate ranking pass will pick the final top 6.",
            "",
            "Coverage to aim for across the 10-12 candidates:",
            "- Neuroscience / developmental foundations (how the child's brain drives the behavior)",
            "- Evidence-based parenting frameworks (Collaborative Problem Solving, Parent Management Training, Emotion Coaching, RIE, etc.)",
            "- Parent self-regulation and nervous-system work (DBT / ACT / mindfulness / self-compassion / polyvagal)",
            "- Practical scripts & communication (what to say in the moment)",
            "- Condition-specific works when the profile signals it (ODD, sensory, trauma, anxiety, ADHD, selective eating, etc.)",
            "",
            "## Therapeutic Goal",
            context_text,
            family_context_text,
            "",
            "## Research Papers (for grounding — cite specific findings in your whyRecommended where natural)",
            research_summary,
            "",
            "## Instructions",
            "Produce 10-12 candidate books that:",
            "- Are REAL, well-known, in-print or commonly-cited published books (do NOT invent titles — if unsure, omit)",
            "- Each maps to a clearly different facet of the goal + profile (avoid 3 books that say the same thing)",
            "- Would be accessible AND practical for this specific parent given the Subject Profile",
            "",
            "For each book provide: title (exact), authors (array of full names), year (int), isbn (string if known), description (2 sentences max), whyRecommended (3-4 sentences, personalized — cite specific items from the Subject Profile by name/phrase and link to a research finding where natural), category (one of: parenting, therapy, self-help, child development, education, psychology, neuroscience), facet (one word: foundations | framework | self-regulation | scripts | condition-specific | other).",
            "",
            'Respond with a JSON object of the shape {"books": [ {...}, ... ]}. The top-level key MUST be "books" and its value MUST be an array of 10-12 entries.',
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


async def _deepseek_json_call(
    prompt: str,
    model: str,
    temperature: float,
    max_tokens: int,
    use_json_mode: bool = True,
) -> tuple[Optional[dict], Optional[Exception]]:
    """Run a single DeepSeek call with one JSON-parse retry. Returns (parsed, last_exc)."""
    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=300.0, default_model=model)
    parsed: Optional[dict] = None
    last_exc: Optional[Exception] = None
    async with DeepSeekClient(config) as client:
        for _ in range(2):
            try:
                kwargs: dict = {
                    "model": model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                resp = await client.chat(
                    [ChatMessage(role="user", content=prompt)],
                    **kwargs,
                )
                content = resp.choices[0].message.content
                # Reasoner model doesn't honor JSON mode reliably — extract {...} if needed
                if not use_json_mode:
                    start = content.find("{")
                    end = content.rfind("}")
                    if start >= 0 and end > start:
                        content = content[start : end + 1]
                parsed = json.loads(content)
                break
            except json.JSONDecodeError as exc:
                last_exc = exc
                continue
    return parsed, last_exc


async def generate_candidates(state: dict) -> dict:
    """Pass 1: wide shortlist of 10-12 candidate books via deepseek-chat + JSON mode."""
    if state.get("error") or state.get("success") is False:
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 40)

    prompt = state.get("_prompt", "")
    model = os.environ.get("LLM_MODEL", "deepseek-chat")
    try:
        parsed, last_exc = await _deepseek_json_call(
            prompt, model=model, temperature=0.4, max_tokens=8192, use_json_mode=True
        )
    except Exception as exc:
        return {"error": f"generate_candidates failed: {exc}"}
    if parsed is None:
        return {"error": f"generate_candidates failed: {last_exc}"}

    raw_books = _normalize_books(parsed)
    candidates: list[dict] = []
    for raw in raw_books[:14]:
        coerced = _coerce_book(raw)
        if coerced:
            # Preserve facet from the raw dict if the model supplied one.
            facet = raw.get("facet")
            if isinstance(facet, str):
                coerced["facet"] = facet.strip().lower()
            candidates.append(coerced)

    if len(candidates) < 5:
        return {"error": f"candidate pass returned {len(candidates)} valid books (need >= 5)"}

    return {"_candidates": candidates}


async def rank_and_explain(state: dict) -> dict:
    """Pass 2: take candidates, pick top 6 with explicit ordering + per-rank rationale.

    Uses deepseek-reasoner for stronger clinical reasoning. Merges the rank rationale
    into each book's why_recommended so the UI displays it without a schema change.
    """
    if state.get("error"):
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 65)

    candidates = state.get("_candidates") or []
    if not candidates:
        return {"error": "rank_and_explain: no candidates to rank"}

    # Build a compact candidate digest for the reasoner
    digest_lines: list[str] = []
    for i, b in enumerate(candidates, 1):
        authors = ", ".join(b.get("authors") or []) or "(unknown)"
        year = f" ({b['year']})" if b.get("year") else ""
        facet = f" [{b.get('facet')}]" if b.get("facet") else ""
        digest_lines.append(
            f"[C{i}] {b['title']}{year} — {authors}{facet}\n"
            f"     desc: {(b.get('description') or '')[:220]}\n"
            f"     why : {(b.get('why_recommended') or '')[:320]}"
        )
    digest = "\n\n".join(digest_lines)

    # Pass original context back in so the reasoner can ground rank rationale in the profile
    original_context = state.get("_prompt", "")
    # Strip instruction block from the original prompt — keep only goal + profile + research
    context_head = original_context.split("## Instructions", 1)[0].strip()

    rank_prompt = "\n".join(
        [
            "You are the SECOND-PASS ranker for a clinical bibliotherapist curation.",
            "From 10-14 candidate books already shortlisted for a specific parent/family,",
            "choose the FINAL 6 and assign each to one of three TIERS. The UI renders these as:",
            "  • TIER 1 (Essential)   — directly synthesize the core research; read these FIRST",
            "  • TIER 2 (Deep Dives)  — specific domains of depth (e.g. polyvagal, CPS, DBT skills)",
            "  • TIER 3 (Foundational)— classic works for long-term grounding",
            "",
            "Tier allocation:",
            "  • Tier 1: 2-3 books (the backbone of the reading plan)",
            "  • Tier 2: 1-2 books",
            "  • Tier 3: 1-2 books",
            "  • Total = 6",
            "",
            "Ranking principles (apply in this priority):",
            "1. TIER 1 must give the parent the fastest leverage for the presenting profile (calming-in-the-moment, self-regulation, primary framework).",
            "2. TIER 2 deepens specific facets that the profile or research makes salient (don't pick a Tier 2 book just because it's good — it has to earn depth over Tier 1).",
            "3. TIER 3 provides long-horizon / sustainability / classics (self-compassion, identity, parent burnout).",
            "4. Within each tier, order books by immediate usefulness (book 1 of Tier 1 = read FIRST).",
            "5. Prefer diversity of facets; demote books whose content substantially overlaps one already chosen.",
            "",
            "## Original context (do NOT re-summarize; ground your rationale in it)",
            context_head,
            "",
            "## Candidate shortlist",
            digest,
            "",
            "## Your task",
            "Select exactly 6 candidates, assign each a tier (1/2/3) and a within-tier position, and produce:",
            "  • a short tag (ONE word, no spaces, no period inside — e.g. 'Framework', 'Neuroscience', 'Self-regulation', 'Classic')",
            "  • a 2-sentence rankRationale tying THIS book to the profile + research (not generic)",
            "  • an overall orderingStrategy narrating the arc (why this sequence for this parent)",
            "",
            "Respond with a JSON object of EXACTLY this shape:",
            '{',
            '  "orderingStrategy": "<2-4 sentences — the overall reading arc. Reference specifics from the profile.>",',
            '  "ranked": [',
            '    { "candidate_id": "C3", "tier": 1, "position": 1, "tag": "Neuroscience", "rankRationale": "<2 sentences — why this book at this tier/position, grounded in profile + research>" },',
            '    { "candidate_id": "C7", "tier": 1, "position": 2, "tag": "Framework",    "rankRationale": "..." },',
            '    { "candidate_id": "C5", "tier": 2, "position": 1, "tag": "Polyvagal",    "rankRationale": "..." },',
            '    ... exactly 6 entries total, tier counts 2-3/1-2/1-2 summing to 6 ...',
            '  ]',
            '}',
        ]
    )

    # Try reasoner first (no JSON mode — it emits JSON in the body), fall back to chat.
    reasoner_model = os.environ.get("LLM_REASONER_MODEL", "deepseek-reasoner")
    try:
        parsed, last_exc = await _deepseek_json_call(
            rank_prompt,
            model=reasoner_model,
            temperature=0.2,
            max_tokens=6000,
            use_json_mode=False,
        )
    except Exception as exc:
        print(f"[books.rank_and_explain] reasoner failed, falling back to chat: {exc}")
        parsed, last_exc = None, exc

    if parsed is None:
        # Fallback to chat model with JSON mode
        fallback_model = os.environ.get("LLM_MODEL", "deepseek-chat")
        try:
            parsed, last_exc = await _deepseek_json_call(
                rank_prompt,
                model=fallback_model,
                temperature=0.2,
                max_tokens=4096,
                use_json_mode=True,
            )
        except Exception as exc:
            return {"error": f"rank_and_explain failed: {exc}"}
    if parsed is None:
        return {"error": f"rank_and_explain failed: {last_exc}"}

    ordering_strategy = str(parsed.get("orderingStrategy") or "").strip()
    ranked = parsed.get("ranked") or []
    if not isinstance(ranked, list) or len(ranked) < 5:
        return {"error": f"rank_and_explain: got {len(ranked) if isinstance(ranked, list) else 0} ranked entries"}

    # Build candidate lookup by "C{n}"
    cand_by_id = {f"C{i + 1}": c for i, c in enumerate(candidates)}

    def _sanitize_tag(raw: Any) -> str:
        """Short single word (no spaces, no '.') — page regex strips up to first '.'."""
        tag = str(raw or "Recommended").strip()
        tag = tag.replace(".", "").replace(" ", "-")
        return tag or "Recommended"

    # Sort ranked entries by (tier, position) so insertion order matches reading order.
    def _sort_key(e: dict) -> tuple[int, int]:
        try:
            t = int(e.get("tier") or 3)
        except (TypeError, ValueError):
            t = 3
        try:
            p = int(e.get("position") or 99)
        except (TypeError, ValueError):
            p = 99
        return (t, p)

    valid_entries = [e for e in ranked if isinstance(e, dict)]
    valid_entries.sort(key=_sort_key)

    ranked_books: list[dict] = []
    seen_titles: set[str] = set()
    for entry in valid_entries[:6]:
        cid = str(entry.get("candidate_id") or "").strip()
        tier_raw = entry.get("tier")
        try:
            tier = int(tier_raw) if tier_raw is not None else 3
        except (TypeError, ValueError):
            tier = 3
        if tier not in (1, 2, 3):
            tier = 3
        tag = _sanitize_tag(entry.get("tag"))
        rationale = str(entry.get("rankRationale") or "").strip()
        cand = cand_by_id.get(cid)
        if not cand:
            continue
        title_key = cand["title"].lower()
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)
        # Format the UI expects: "TIER N — <tag>. <rationale>\n\n<original why>"
        # /goals/[id]/books/page.tsx uses /^TIER \d —\s*\S+\.\s*/ to strip the prefix.
        prefix = f"TIER {tier} — {tag}. {rationale}".rstrip()
        merged_why = f"{prefix}\n\n{cand['why_recommended']}" if rationale else f"TIER {tier} — {tag}. {cand['why_recommended']}"
        ranked_books.append({**cand, "why_recommended": merged_why})

    if len(ranked_books) < 4:
        return {"error": f"rank_and_explain: only {len(ranked_books)} valid ranked books after dedupe"}

    if job_id:
        await _update_job_progress(job_id, 80)

    return {"_books_raw": ranked_books, "_ordering_strategy": ordering_strategy}


# ---------------------------------------------------------------------------
# Verification eval — prevent hallucinated titles by cross-checking Open Library
# ---------------------------------------------------------------------------
_OPENLIB_SEARCH_URL = "https://openlibrary.org/search.json"
_VERIFY_TITLE_THRESHOLD = 0.72  # SequenceMatcher ratio on lowercased titles


def _normalize_title(t: str) -> str:
    """Strip subtitle so 'Raising a Secure Child: How Circle of Security…' == 'Raising a Secure Child'."""
    t = (t or "").lower().strip()
    for sep in (": ", " — ", " – ", " - "):
        if sep in t:
            t = t.split(sep, 1)[0].strip()
            break
    return t


def _title_sim(a: str, b: str) -> float:
    """Best of: raw ratio, main-title ratio, and containment (either way)."""
    a_raw = (a or "").lower().strip()
    b_raw = (b or "").lower().strip()
    raw = SequenceMatcher(None, a_raw, b_raw).ratio()

    a_main = _normalize_title(a)
    b_main = _normalize_title(b)
    main = SequenceMatcher(None, a_main, b_main).ratio() if a_main and b_main else 0.0

    # If one main-title contains the other, treat that as very strong evidence.
    contain = 0.0
    if a_main and b_main and (a_main in b_raw or b_main in a_raw):
        contain = 0.95

    return max(raw, main, contain)


def _author_match(candidate_author: str, library_authors: list[str]) -> bool:
    if not candidate_author or not library_authors:
        return False
    ca = candidate_author.lower().strip()
    # Last-name-only match is common on Open Library
    ca_last = ca.split()[-1] if ca.split() else ca
    for la in library_authors:
        la_l = (la or "").lower().strip()
        if not la_l:
            continue
        if ca in la_l or la_l in ca:
            return True
        if ca_last and ca_last in la_l:
            return True
    return False


async def _ol_search(
    client: httpx.AsyncClient, q: str, semaphore: asyncio.Semaphore
) -> Optional[list[dict]]:
    """Rate-limited Open Library search with 2 retries on transient errors."""
    last_err: str = "no-attempt"
    for attempt in range(3):
        try:
            async with semaphore:
                resp = await client.get(
                    _OPENLIB_SEARCH_URL, params={"q": q, "limit": 5}
                )
            if resp.status_code == 200:
                return resp.json().get("docs") or []
            last_err = f"HTTP {resp.status_code}"
        except Exception as exc:
            last_err = f"{exc.__class__.__name__}: {exc}".strip(": ")
        await asyncio.sleep(0.4 * (attempt + 1))
    # All retries exhausted — raise so caller can distinguish network error from
    # "book not on Open Library".
    raise RuntimeError(last_err)


async def _verify_one_book(
    title: str,
    authors: list[str],
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
) -> dict:
    """Return {verified, confidence, match_title, match_authors, url, reason}."""
    primary_author = (authors[0] if authors else "").strip()
    queries: list[str] = []
    if primary_author:
        queries.append(f'title:"{title}" author:"{primary_author}"')
    queries.append(f'title:"{title}"')

    best_doc: Optional[dict] = None
    best_sim = 0.0
    for q in queries:
        try:
            docs = await _ol_search(client, q, semaphore)
        except Exception as exc:
            return {"verified": False, "confidence": 0.0, "reason": f"api error: {exc}"}
        if docs is None:
            continue
        for doc in docs:
            sim = _title_sim(doc.get("title", ""), title)
            author_ok = _author_match(primary_author, doc.get("author_name") or [])
            if sim >= _VERIFY_TITLE_THRESHOLD and (author_ok or not primary_author):
                return {
                    "verified": True,
                    "confidence": round(sim, 2),
                    "match_title": doc.get("title"),
                    "match_authors": doc.get("author_name") or [],
                    "url": f"https://openlibrary.org{doc.get('key', '')}",
                    "reason": "openlibrary title+author match",
                }
            if sim > best_sim:
                best_sim = sim
                best_doc = doc

    if best_doc:
        return {
            "verified": False,
            "confidence": round(best_sim, 2),
            "match_title": best_doc.get("title"),
            "match_authors": best_doc.get("author_name") or [],
            "reason": f"closest: '{best_doc.get('title')}' by {best_doc.get('author_name')} (sim={round(best_sim, 2)})",
        }
    return {"verified": False, "confidence": 0.0, "reason": "no results on openlibrary"}


async def verify_books(state: dict) -> dict:
    """Eval node — drop hallucinated titles, backfill from leftover candidates."""
    if state.get("error"):
        return {}

    books = state.get("_books_raw") or []
    if not books:
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 85)

    timeout = httpx.Timeout(connect=8.0, read=12.0, write=8.0, pool=8.0)
    semaphore = asyncio.Semaphore(3)  # polite to a free public API
    async with httpx.AsyncClient(
        timeout=timeout, headers={"User-Agent": "research-thera books_graph (+verify)"}
    ) as client:
        verdicts = await asyncio.gather(
            *[_verify_one_book(b["title"], b.get("authors") or [], client, semaphore) for b in books]
        )

        verified: list[dict] = []
        rejections: list[dict] = []
        api_errors = 0
        for book, verdict in zip(books, verdicts):
            if verdict.get("verified"):
                verified.append({**book, "_verify": verdict})
            else:
                reason = str(verdict.get("reason") or "")
                if reason.startswith("api error:"):
                    api_errors += 1
                rejections.append({
                    "title": book["title"],
                    "authors": book.get("authors") or [],
                    "isbn": book.get("isbn"),
                    "reason": verdict.get("reason"),
                    "closest_match": verdict.get("match_title"),
                })

        # If more than half of first-pass drops were transient API errors, the
        # verifier is unreliable right now — keep the unverified books rather
        # than replacing them all with backfills. Open Library flakiness is not
        # the LLM's fault.
        if api_errors >= max(2, len(books) // 2):
            print(
                f"[books.verify_books] {api_errors}/{len(books)} hit transient API errors — "
                "keeping unverified books rather than over-rejecting"
            )
            verified = [{**b, "_verify": {"verified": False, "reason": "verifier unavailable"}} for b in books]
            rejections = []

        # Backfill from leftover candidates if we dropped too many.
        backfilled = 0
        if len(verified) < 4:
            used = {b["title"].lower() for b in books}
            leftover = [c for c in (state.get("_candidates") or []) if c["title"].lower() not in used]
            if leftover:
                leftover_verdicts = await asyncio.gather(
                    *[_verify_one_book(c["title"], c.get("authors") or [], client, semaphore) for c in leftover[:8]]
                )
                for cand, verdict in zip(leftover[:8], leftover_verdicts):
                    if len(verified) >= 6:
                        break
                    if verdict.get("verified"):
                        promoted = {**cand, "_verify": verdict}
                        original_why = cand.get("why_recommended") or ""
                        # Strip any existing TIER prefix so we don't double-tag.
                        stripped = original_why
                        if original_why.startswith("TIER "):
                            parts = original_why.split("\n\n", 1)
                            stripped = parts[1] if len(parts) > 1 else ""
                        promoted["why_recommended"] = (
                            f"TIER 2 — Backfilled. Promoted after a higher-ranked candidate failed verification. "
                            f"{stripped}".strip()
                        )
                        verified.append(promoted)
                        backfilled += 1

    evals = {
        "verified_count": len(verified),
        "rejected_count": len(rejections),
        "backfilled_count": backfilled,
        "rejections": rejections,
        "source": "openlibrary",
    }

    print(
        f"[books.verify_books] verified={evals['verified_count']} "
        f"rejected={evals['rejected_count']} backfilled={evals['backfilled_count']}"
    )
    for r in rejections:
        print(f"[books.verify_books]   rejected: \"{r['title']}\" — {r['reason']}")

    if len(verified) < 3:
        return {
            "error": (
                f"verify_books: only {len(verified)} books passed Open Library verification "
                f"(rejected {len(rejections)}). Refusing to persist a mostly-hallucinated list."
            ),
            "_evals": evals,
        }

    return {"_books_raw": verified, "_evals": evals}


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

    ordering_strategy = (state.get("_ordering_strategy") or "").strip()
    evals = state.get("_evals") or {}

    def _build_message(n: int, research_count: int) -> str:
        base = f"Recommended {n} books based on {research_count} research papers."
        parts = [base]
        if evals.get("rejected_count") is not None:
            verified_total = evals.get("verified_count", n)
            attempted = verified_total + evals.get("rejected_count", 0)
            line = f"Verified {verified_total}/{attempted} via Open Library"
            if evals.get("rejected_count"):
                titles = ", ".join(f'"{r["title"]}"' for r in (evals.get("rejections") or [])[:3])
                line += f"; dropped {evals['rejected_count']} unverified ({titles})"
            if evals.get("backfilled_count"):
                line += f"; backfilled {evals['backfilled_count']} from leftover candidates"
            parts.append(line)
        if ordering_strategy:
            parts.append(f"Reading order: {ordering_strategy}")
        return "\n\n".join(parts)

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
            "message": _build_message(len(inserted), research_count),
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
        "message": _build_message(len(inserted), research_count),
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
    builder.add_node("generate_candidates", generate_candidates)
    builder.add_node("rank_and_explain", rank_and_explain)
    builder.add_node("verify_books", verify_books)
    builder.add_node("persist", persist)
    builder.add_node("finalize", _finalize)

    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "generate_candidates")
    builder.add_edge("generate_candidates", "rank_and_explain")
    builder.add_edge("rank_and_explain", "verify_books")
    builder.add_edge("verify_books", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


# Module-level instance for LangGraph server
graph = create_books_graph()
