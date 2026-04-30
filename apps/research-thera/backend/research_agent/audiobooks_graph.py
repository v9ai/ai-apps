"""LangGraph audiobook-recommendation graph — voxa.ro Romanian audiobook picks
for Bogdan, grounded in his Subject Profile and the same therapy_research papers
used by books/movies. Standalone DeepSeek-only generation; persists to
recommended_audiobooks.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, TypedDict

from dotenv import load_dotenv
from langgraph.graph import StateGraph, START, END

from research_agent import neon

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402


_VALID_CATEGORIES = {"emotional-development", "similar-to"}

# This graph is purpose-built for Bogdan and locked to voxa.ro (Romanian
# audiobook subscription service).
BOGDAN_FAMILY_MEMBER_ID = 2

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian for all free-text fields "
    "(description, whyRecommended). Audiobook titles and author/narrator names "
    "stay in their original language."
)


class AudiobooksState(TypedDict, total=False):
    goal_id: int
    family_member_id: int
    user_email: str
    job_id: str
    # Internal
    _prompt: str
    _category: str
    _candidates: list[dict]
    # Output
    success: bool
    message: str
    audiobooks: list[dict]
    error: str


async def _update_job_progress(job_id: str, progress: int) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET progress = %s, updated_at = NOW() WHERE id = %s",
                    (progress, job_id),
                )
    except Exception as exc:
        print(f"[audiobooks._update_job_progress] failed: {exc}")


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
        print(f"[audiobooks._update_job_succeeded] failed: {exc}")


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
        print(f"[audiobooks._update_job_failed] failed: {exc}")


def _age_band(age: Optional[int]) -> str:
    if age is None:
        return "all-ages"
    if age <= 6:
        return "preschool"
    if age <= 10:
        return "child"
    if age <= 13:
        return "preteen"
    if age <= 17:
        return "teen"
    return "adult"


async def collect_context(state: AudiobooksState) -> dict:
    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 10)

    user_email = state.get("user_email")
    if not user_email:
        return {"error": "user_email is required"}

    goal_id = state.get("goal_id")
    family_member_id = state.get("family_member_id") or BOGDAN_FAMILY_MEMBER_ID

    category = "similar-to" if goal_id else "emotional-development"
    context_lines: list[str] = []
    fm_age: Optional[int] = None
    fm_first_name: Optional[str] = None
    fm_id_for_lang: int = family_member_id

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                # Optional reference goal
                if goal_id:
                    await cur.execute(
                        "SELECT title, description, family_member_id FROM goals "
                        "WHERE id = %s AND user_id = %s",
                        (goal_id, user_email),
                    )
                    row = await cur.fetchone()
                    if not row:
                        return {"error": f"Goal {goal_id} not found"}
                    g_title, g_desc, g_fm_id = row
                    context_lines.append(
                        f"## Reference goal\n- Title: {g_title}\n- Description: {(g_desc or '')[:600]}"
                    )
                    if g_fm_id and not state.get("family_member_id"):
                        fm_id_for_lang = g_fm_id

                # Subject profile
                await cur.execute(
                    "SELECT first_name, age_years, relationship, bio, date_of_birth "
                    "FROM family_members WHERE id = %s",
                    (fm_id_for_lang,),
                )
                fm_row = await cur.fetchone()
                if fm_row:
                    fm_first_name = fm_row[0]
                    try:
                        fm_age = int(fm_row[1]) if fm_row[1] is not None else None
                    except (TypeError, ValueError):
                        fm_age = None
                    if fm_age is None and fm_row[4]:
                        try:
                            from datetime import date, datetime as _dt

                            dob = fm_row[4]
                            if isinstance(dob, str):
                                dob = _dt.strptime(dob[:10], "%Y-%m-%d").date()
                            today = date.today()
                            fm_age = today.year - dob.year - (
                                (today.month, today.day) < (dob.month, dob.day)
                            )
                        except Exception:
                            fm_age = None
                    context_lines.append(
                        f"## Subject\n- Name: {fm_row[0]}\n"
                        f"- Age: {fm_age if fm_age is not None else (fm_row[1] or '?')}\n"
                        f"- Relationship: {fm_row[2] or ''}\n- Bio: {(fm_row[3] or '')[:500]}"
                    )

                # Issues
                await cur.execute(
                    "SELECT title, category, severity, description FROM issues "
                    "WHERE (family_member_id = %s OR related_family_member_id = %s) AND user_id = %s "
                    "ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, "
                    "created_at DESC LIMIT 20",
                    (fm_id_for_lang, fm_id_for_lang, user_email),
                )
                issue_rows = await cur.fetchall()
                if issue_rows:
                    lines = [
                        f"- **{r[0]}** [{r[2]}/{r[1]}]: {(r[3] or '')[:200]}"
                        for r in issue_rows
                    ]
                    context_lines.append(
                        f"### Known Issues ({len(issue_rows)})\n" + "\n".join(lines)
                    )

                # Priority concerns & support needs
                try:
                    await cur.execute(
                        "SELECT title, category, risk_tier, description, strengths "
                        "FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY CASE category WHEN 'PRIORITY_CONCERN' THEN 0 "
                        "WHEN 'SUPPORT_NEED' THEN 1 ELSE 2 END, created_at DESC LIMIT 12",
                        (fm_id_for_lang, user_email),
                    )
                    char_rows = await cur.fetchall()
                except Exception:
                    char_rows = []
                if char_rows:
                    lines = []
                    for c_title, c_cat, c_risk, c_desc, c_strengths in char_rows:
                        tag = f"[{c_cat or ''}{('/' + c_risk) if c_risk and c_risk != 'NONE' else ''}]"
                        extra = f": {(c_desc or '')[:220]}" if c_desc else ""
                        strengths_line = f"\n  strengths: {c_strengths[:160]}" if c_strengths else ""
                        lines.append(f"- {tag} {c_title or ''}{extra}{strengths_line}".rstrip())
                    context_lines.append(
                        f"### Priority Concerns & Support Needs ({len(char_rows)})\n"
                        + "\n".join(lines)
                    )

                # Teacher feedback
                try:
                    await cur.execute(
                        "SELECT teacher_name, subject, feedback_date, content "
                        "FROM teacher_feedbacks "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY feedback_date DESC, created_at DESC LIMIT 5",
                        (fm_id_for_lang, user_email),
                    )
                    teacher_rows = await cur.fetchall()
                except Exception:
                    teacher_rows = []
                if teacher_rows:
                    lines = [
                        f"- {t_date} — {t_name}{(' (' + t_subj + ')') if t_subj else ''}: "
                        f"{(t_content or '')[:260]}"
                        for t_name, t_subj, t_date, t_content in teacher_rows
                    ]
                    context_lines.append(
                        f"### Teacher Observations ({len(teacher_rows)})\n" + "\n".join(lines)
                    )

                # Behavior observations
                try:
                    await cur.execute(
                        "SELECT observation_type, frequency, intensity, context, notes, observed_at "
                        "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY observed_at DESC, created_at DESC LIMIT 5",
                        (fm_id_for_lang, user_email),
                    )
                    obs_rows = await cur.fetchall()
                except Exception:
                    obs_rows = []
                if obs_rows:
                    lines = []
                    for o_type, o_freq, o_int, o_ctx, o_notes, o_date in obs_rows:
                        meta = [o_type or ""]
                        if o_int:
                            meta.append(f"intensity:{o_int}")
                        if o_freq is not None:
                            meta.append(f"freq:{o_freq}")
                        ctx_s = f" ctx: {o_ctx[:140]}" if o_ctx else ""
                        notes_s = f" — {o_notes[:160]}" if o_notes else ""
                        lines.append(
                            f"- {o_date} [{', '.join(m for m in meta if m)}]{ctx_s}{notes_s}"
                        )
                    context_lines.append(
                        f"### Behavior Observations ({len(obs_rows)})\n" + "\n".join(lines)
                    )

                # Recent journal entries
                try:
                    await cur.execute(
                        "SELECT entry_date, title, content, mood FROM journal_entries "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY entry_date DESC NULLS LAST, created_at DESC LIMIT 10",
                        (fm_id_for_lang, user_email),
                    )
                    je_rows = await cur.fetchall()
                except Exception:
                    je_rows = []
                if je_rows:
                    lines = [
                        f"- {j_date}{(' — ' + j_title) if j_title else ''}"
                        f"{(' [' + j_mood + ']') if j_mood else ''}"
                        f"{(': ' + j_content[:220]) if j_content else ''}"
                        for j_date, j_title, j_content, j_mood in je_rows
                    ]
                    context_lines.append(
                        f"### Recent Journal Entries ({len(je_rows)})\n" + "\n".join(lines)
                    )

                # Prior clinical analyses
                try:
                    await cur.execute(
                        "SELECT summary, parent_advice FROM deep_issue_analyses "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 3",
                        (fm_id_for_lang, user_email),
                    )
                    analysis_rows = await cur.fetchall()
                except Exception:
                    analysis_rows = []
                if analysis_rows:
                    lines = []
                    for idx, (a_summary, a_advice_raw) in enumerate(analysis_rows, 1):
                        head = f"- [Analysis {idx}] {(a_summary or '')[:380]}"
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
                                advice_lines.append(
                                    f"    • {title}{(': ' + str(text)[:200]) if text else ''}".rstrip()
                                )
                        lines.append(
                            "\n".join([head, *advice_lines]) if advice_lines else head
                        )
                    context_lines.append(
                        f"### Prior Clinical Analyses ({len(analysis_rows)})\n"
                        + "\n".join(lines)
                    )

                # Active goals
                try:
                    await cur.execute(
                        "SELECT title, description FROM goals "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 5",
                        (fm_id_for_lang, user_email),
                    )
                    goal_rows = await cur.fetchall()
                except Exception:
                    goal_rows = []
                if goal_rows:
                    lines = [
                        f"- **{g_title}**{(': ' + (g_desc or '')[:220]) if g_desc else ''}"
                        for g_title, g_desc in goal_rows
                    ]
                    context_lines.append(
                        f"### Active Goals ({len(goal_rows)})\n" + "\n".join(lines)
                    )

                # Research papers tied to Bogdan
                research_rows: list[tuple] = []
                try:
                    await cur.execute(
                        """
                        SELECT DISTINCT ON (tr.id)
                               tr.title, tr.authors, tr.year, tr.abstract,
                               tr.key_findings, tr.therapeutic_techniques,
                               tr.evidence_level, tr.relevance_score,
                               tr.therapeutic_goal_type
                        FROM therapy_research tr
                        WHERE
                            tr.goal_id IN (
                                SELECT id FROM goals WHERE family_member_id = %s AND user_id = %s
                            )
                            OR tr.issue_id IN (
                                SELECT id FROM issues
                                WHERE (family_member_id = %s OR related_family_member_id = %s)
                                AND user_id = %s
                            )
                            OR tr.journal_entry_id IN (
                                SELECT id FROM journal_entries WHERE family_member_id = %s AND user_id = %s
                            )
                        ORDER BY tr.id, tr.relevance_score DESC NULLS LAST
                        """,
                        (
                            fm_id_for_lang, user_email,
                            fm_id_for_lang, fm_id_for_lang, user_email,
                            fm_id_for_lang, user_email,
                        ),
                    )
                    research_rows = await cur.fetchall()
                except Exception:
                    research_rows = []

                research_rows.sort(key=lambda r: (r[7] or 0), reverse=True)
                research_rows = research_rows[:15]

                if research_rows:
                    lines = []
                    for idx, row in enumerate(research_rows, 1):
                        r_title, r_authors, r_year, r_abstract, r_kf_raw, r_tt_raw, r_ev, _r_rel, r_goal_type = row
                        head_parts = [f'[{idx}] "{r_title}"']
                        if r_year:
                            head_parts.append(f"({r_year})")
                        if r_ev:
                            head_parts.append(f"[evidence: {r_ev}]")
                        if r_goal_type:
                            head_parts.append(f"[goal-type: {r_goal_type}]")
                        block = [" ".join(head_parts)]
                        if r_abstract:
                            block.append(f"  Abstract: {r_abstract[:240]}")
                        try:
                            kf = json.loads(r_kf_raw) if r_kf_raw else []
                        except Exception:
                            kf = []
                        if kf:
                            block.append(f"  Key findings: {'; '.join(str(k) for k in kf[:3])}")
                        try:
                            tt = json.loads(r_tt_raw) if r_tt_raw else []
                        except Exception:
                            tt = []
                        if tt:
                            block.append(f"  Techniques: {'; '.join(str(t) for t in tt[:3])}")
                        lines.append("\n".join(block))
                    context_lines.append(
                        f"### Research Papers ({len(research_rows)} — grounding evidence)\n"
                        + "\n\n".join(lines)
                    )
    except Exception as exc:
        return {"error": f"collect_context failed: {exc}"}

    age_band = _age_band(fm_age)
    subject_label = fm_first_name or "the child"

    if category == "emotional-development":
        category_block = (
            f"Goal: pick audiobooks whose stories model the SPECIFIC emotional skills "
            f"{subject_label} needs based on the Subject Profile below. Don't pick generic "
            "'good values' titles — every recommendation must map to a named issue, priority "
            "concern, support need, recent journal incident, behavior observation, teacher "
            "observation, active goal, OR a finding/technique from the Research Papers section. "
            "When a paper recommends a specific therapeutic technique (emotion-coaching, "
            "exposure with response prevention, CPS, gradual desensitization), prefer "
            "audiobooks whose narrative arcs model that exact technique. If a title doesn't "
            "tie back to a specific item or research finding, OMIT it. Avoid scary horror, "
            "graphic violence, and mature romantic themes."
        )
    else:
        category_block = (
            "Goal: pick audiobooks SIMILAR to the reference described in the goal — same "
            "tone, themes, and emotional register. ALSO weight each candidate by how well "
            "its themes happen to address an item in the Subject Profile or a Research "
            "Paper finding below; prefer matches that double as gentle modeling for one "
            "of the named concerns or evidence-based techniques."
        )

    prompt_parts = [
        ROMANIAN_INSTRUCTION,
        "",
        (
            "You are a clinical child-development bibliotherapist with deep knowledge of "
            "Romanian and translated children's audiobook catalogs. Curate a personalized "
            "audiobook list. Recommend ONLY real, published audiobooks you are confident "
            "are present in the voxa.ro catalog (https://voxa.ro). Do NOT invent titles. "
            "If unsure whether a title is on Voxa, OMIT it rather than guess."
        ),
        "",
        (
            "PLATFORM CONSTRAINT (HARD): every recommended audiobook MUST be available on "
            "voxa.ro. Voxa is the Romanian-language audiobook subscription service "
            "(https://voxa.ro/audiobooks/copii for the kids' section). Do NOT include "
            "titles only available on Audible, Storytel, Libro.fm, or anywhere else. "
            "If you cannot place a title confidently on Voxa, OMIT it."
        ),
        "",
        (
            "LANGUAGE CONSTRAINT (HARD): every audiobook MUST have a Romanian-language "
            "narration on Voxa. Set `language` to \"ro\" for every entry. If a title only "
            "exists in English/French/etc on Voxa, OMIT it."
        ),
        "",
        category_block,
        "",
        f"AUDIENCE BAND: {age_band}.",
        "",
        "## Subject Profile (ground every pick in this — cite items by name in whyRecommended)",
    ]
    if context_lines:
        prompt_parts.append("\n\n".join(context_lines))
    else:
        prompt_parts.append("(No specific subject context found — recommend broadly.)")

    prompt_parts += [
        "",
        "## Output schema",
        (
            'Respond ONLY with JSON of the shape {"audiobooks": [ ... ]} where the array '
            "has 8-12 entries. Each entry MUST be a JSON object with EXACTLY these fields:\n"
            '  - title: string (Romanian title as listed on Voxa)\n'
            '  - authors: array of 1-3 author full names (original-language names ok)\n'
            '  - narrators: array of 1-2 narrator names (Romanian voice actors)\n'
            '  - year: integer (4-digit publication year of the original book; omit if unsure)\n'
            '  - lengthMinutes: integer (audiobook duration in minutes; omit if unsure)\n'
            '  - language: string EXACTLY "ro"\n'
            '  - ageBand: one of "preschool", "child", "preteen", "teen", "all-ages"\n'
            '  - voxaUrl: string (a https://voxa.ro/... product URL; omit if you only know '
            'the title is on Voxa but not the exact URL)\n'
            '  - description: 1-2 sentence Romanian plot synopsis\n'
            '  - whyRecommended: 2-3 sentences in Romanian. The FIRST sentence MUST quote '
            "or paraphrase a SPECIFIC item from the Subject Profile (issue title, "
            "priority-concern phrase, journal incident, teacher observation, goal title) "
            "AND/OR cite a specific Research Paper finding or technique. The second "
            "sentence names the concrete plot element or arc that does the modeling. "
            "Generic endorsements ('o carte minunată', 'învață despre prietenie') are "
            "NOT acceptable — if you can't tie the pick to a named profile item or "
            "research finding, omit it."
        ),
        "",
        f"## Category tag\nUse category = \"{category}\" for every entry (added by the server, do not include in JSON).",
    ]

    if job_id:
        await _update_job_progress(job_id, 30)

    return {
        "family_member_id": family_member_id,
        "_prompt": "\n".join(prompt_parts),
        "_category": category,
    }


def _normalize_audiobooks(parsed) -> list[dict]:
    if parsed is None:
        return []
    if isinstance(parsed, dict):
        for key in ("audiobooks", "recommendations", "results", "items", "data"):
            val = parsed.get(key)
            if isinstance(val, list):
                return [m for m in val if isinstance(m, dict)]
        if "title" in parsed and "authors" in parsed:
            return [parsed]
        for val in parsed.values():
            if isinstance(val, list) and val and isinstance(val[0], dict):
                return [m for m in val if isinstance(m, dict)]
        return []
    if isinstance(parsed, list):
        return [m for m in parsed if isinstance(m, dict)]
    return []


def _coerce_audiobook(raw: dict) -> Optional[dict]:
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
    if not authors:
        return None

    narrators_raw = raw.get("narrators") or raw.get("narrator") or []
    if isinstance(narrators_raw, str):
        narrators = [n.strip() for n in narrators_raw.split(",") if n.strip()]
    elif isinstance(narrators_raw, list):
        narrators = [str(n).strip() for n in narrators_raw if str(n).strip()]
    else:
        narrators = []

    year = raw.get("year")
    if isinstance(year, str) and year.isdigit():
        year = int(year)
    elif not isinstance(year, int):
        year = None

    length_raw = raw.get("lengthMinutes") or raw.get("length_minutes") or raw.get("length")
    length_minutes: Optional[int] = None
    if length_raw is not None:
        try:
            v = int(length_raw)
            if 1 <= v <= 6000:  # cap at 100h sanity
                length_minutes = v
        except (TypeError, ValueError):
            length_minutes = None

    language = (raw.get("language") or "ro").lower().strip()
    if language != "ro":
        # Reject non-Romanian entries — voxa.ro is Romanian-first.
        return None

    age_band = raw.get("ageBand") or raw.get("age_band")
    if age_band not in {"preschool", "child", "preteen", "teen", "all-ages", "adult"}:
        age_band = None

    voxa_url = raw.get("voxaUrl") or raw.get("voxa_url")
    if isinstance(voxa_url, str) and voxa_url.strip():
        voxa_url = voxa_url.strip()
        if "voxa.ro" not in voxa_url:
            voxa_url = None
    else:
        voxa_url = None

    cover_url = raw.get("coverUrl") or raw.get("cover_url")
    if not isinstance(cover_url, str) or not cover_url.strip():
        cover_url = None

    description = (raw.get("description") or "").strip()
    why = (raw.get("whyRecommended") or raw.get("why_recommended") or "").strip()
    if not description or not why:
        return None

    return {
        "title": title.strip(),
        "authors": authors,
        "narrators": narrators,
        "year": year,
        "length_minutes": length_minutes,
        "language": "ro",
        "age_band": age_band,
        "voxa_url": voxa_url,
        "cover_url": cover_url,
        "description": description,
        "why_recommended": why,
    }


async def generate_candidates(state: AudiobooksState) -> dict:
    if state.get("error"):
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 50)

    prompt = state.get("_prompt", "")
    if not prompt:
        return {"error": "empty prompt"}

    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")
    config = DeepSeekConfig(
        api_key=api_key,
        base_url=base_url,
        timeout=300.0,
        default_model=model,
    )

    parsed = None
    last_exc: Optional[Exception] = None
    try:
        async with DeepSeekClient(config) as client:
            for _ in range(2):
                try:
                    resp = await client.chat(
                        [ChatMessage(role="user", content=prompt)],
                        model=model,
                        temperature=0.5,
                        max_tokens=6000,
                        response_format={"type": "json_object"},
                    )
                    parsed = json.loads(resp.choices[0].message.content)
                    break
                except json.JSONDecodeError as exc:
                    last_exc = exc
                    continue
    except Exception as exc:
        return {"error": f"generate_candidates failed: {exc}"}

    if parsed is None:
        return {"error": f"generate_candidates failed: {last_exc}"}

    raw_books = _normalize_audiobooks(parsed)
    candidates: list[dict] = []
    seen: set[str] = set()
    for raw in raw_books:
        coerced = _coerce_audiobook(raw)
        if not coerced:
            continue
        key = coerced["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        candidates.append(coerced)

    if len(candidates) < 4:
        return {"error": f"candidate pass returned {len(candidates)} valid audiobooks (need >= 4)"}

    return {"_candidates": candidates[:12]}


async def persist(state: AudiobooksState) -> dict:
    if state.get("error"):
        return {}

    candidates = state.get("_candidates") or []  # type: ignore[assignment]
    if not candidates:
        return {}

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 80)

    goal_id = state.get("goal_id")
    family_member_id = state.get("family_member_id")
    category = state.get("_category") or "emotional-development"
    now_iso = datetime.now(timezone.utc).isoformat()

    inserted: list[dict] = []
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                for a in candidates:
                    await cur.execute(
                        "INSERT INTO recommended_audiobooks "
                        "(goal_id, family_member_id, title, authors, narrators, year, "
                        " length_minutes, language, age_band, voxa_url, cover_url, "
                        " description, why_recommended, category, generated_at, "
                        " created_at, updated_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, "
                        "        %s, %s, %s, %s) "
                        "RETURNING id, goal_id, family_member_id, title, authors, "
                        "narrators, year, length_minutes, language, age_band, voxa_url, "
                        "cover_url, description, why_recommended, category, generated_at, "
                        "created_at, updated_at",
                        (
                            goal_id,
                            family_member_id,
                            a["title"],
                            json.dumps(a["authors"], ensure_ascii=False),
                            json.dumps(a["narrators"], ensure_ascii=False) if a["narrators"] else None,
                            a["year"],
                            a["length_minutes"],
                            a["language"],
                            a["age_band"],
                            a["voxa_url"],
                            a["cover_url"],
                            a["description"],
                            a["why_recommended"],
                            category,
                            now_iso,
                            now_iso,
                            now_iso,
                        ),
                    )
                    row = await cur.fetchone()
                    if not row:
                        continue
                    (
                        r_id, r_goal, r_fm, r_title, r_authors, r_narrators, r_year,
                        r_length, r_lang, r_age, r_voxa, r_cover, r_desc, r_why,
                        r_cat, r_gen, r_created, r_updated,
                    ) = row
                    try:
                        authors = json.loads(r_authors) if r_authors else []
                    except Exception:
                        authors = []
                    try:
                        narrators = json.loads(r_narrators) if r_narrators else []
                    except Exception:
                        narrators = []
                    inserted.append({
                        "id": r_id,
                        "goalId": r_goal,
                        "familyMemberId": r_fm,
                        "title": r_title,
                        "authors": authors,
                        "narrators": narrators,
                        "year": r_year,
                        "lengthMinutes": r_length,
                        "language": r_lang,
                        "ageBand": r_age,
                        "voxaUrl": r_voxa,
                        "coverUrl": r_cover,
                        "description": r_desc,
                        "whyRecommended": r_why,
                        "category": r_cat,
                        "generatedAt": str(r_gen),
                        "createdAt": str(r_created),
                        "updatedAt": str(r_updated),
                    })
    except Exception as exc:
        return {"error": f"persist failed: {exc}"}

    return {
        "success": True,
        "message": f"Recommended {len(inserted)} audiobooks (voxa.ro) in category {category}.",
        "audiobooks": inserted,
    }


async def _finalize(state: AudiobooksState) -> dict:
    job_id = state.get("job_id")
    if state.get("error"):
        if job_id:
            await _update_job_failed(job_id, {"message": state["error"]})
        return {
            "success": False,
            "message": state["error"],
            "audiobooks": [],
        }
    audiobooks = state.get("audiobooks") or []
    message = state.get("message") or ""
    if job_id:
        await _update_job_succeeded(job_id, {"count": len(audiobooks), "message": message})
    return {
        "success": state.get("success", True),
        "message": message,
        "audiobooks": audiobooks,
    }


def create_audiobooks_graph(checkpointer=None):
    builder = StateGraph(AudiobooksState)
    builder.add_node("collect_context", collect_context)
    builder.add_node("generate_candidates", generate_candidates)
    builder.add_node("persist", persist)
    builder.add_node("finalize", _finalize)

    builder.add_edge(START, "collect_context")
    builder.add_edge("collect_context", "generate_candidates")
    builder.add_edge("generate_candidates", "persist")
    builder.add_edge("persist", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


graph = create_audiobooks_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_audiobooks_graph, graph)
