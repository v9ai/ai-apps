"""Condition deep-research workflow.

Given a condition slug (e.g. "adhd") + a family-member slug (e.g. "bogdan"),
this graph mints structured clinical knowledge about the condition tailored
to that family member's developmental tier and persists it to
``condition_deep_research``. 30-day cache by default.

Pipeline (5 nodes):
  1. load_context     — resolve family member, locate matching condition row,
                        derive age + developmental tier, derive language
                        (caller-supplied wins; otherwise inherit from
                        family_members.preferred_language).
  2. check_freshness  — return cached row when fresh_until > now AND
                        cached language matches the requested language.
  3. extract_facts    — single DeepSeek JSON call returning all 5 sections
                        (pathophysiology / age_manifestations / treatments /
                        comorbidities / red_flags) at once.
  4. persist          — UPSERT into condition_deep_research keyed on
                        (user_id, family_member_id, condition_slug, language).
  5. fan_out_papers   — fire-and-forget call into
                        ``generate_therapy_research_graph`` so the existing
                        therapy_research table picks up the latest papers
                        for this condition + family member.

Light graph: no external sources, single LLM call. Concurrency can be > 1.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, TypedDict

import httpx
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy

from research_agent import neon

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------
FRESHNESS_DAYS = 30
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
EXTRACTION_MAX_TOKENS = 6144

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON "
    "output must be written in natural, fluent clinical Romanian. Translate "
    "summaries, manifestations, mechanisms, treatment names, rationales, "
    "comorbidity names, and red-flag descriptions. Preserve enum values "
    "exactly as English lowercase tokens."
)

DEVELOPMENTAL_TIERS = ("preschool", "early_school", "middle_childhood", "adolescent", "adult")
TREATMENT_CATEGORIES = ("behavioral", "psychotherapy", "pharmacological", "educational", "lifestyle", "family_systems", "other")
EVIDENCE_LEVELS = ("strong", "moderate", "weak", "expert_opinion", "experimental")


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class ConditionDeepResearchState(TypedDict, total=False):
    # Inputs
    user_email: str
    condition_slug: str
    member_slug: str
    job_id: Optional[str]
    language: Optional[str]

    # Internals populated by nodes
    _condition_row: dict
    _family_member: dict
    _age: Optional[int]
    _developmental_tier: str
    _personal_evidence: dict  # all records related to the person
    _facts: dict
    _cache_hit: bool
    _research_id: Optional[str]

    # Outputs
    success: bool
    message: str
    counts: dict
    error: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _slugify(name: str) -> str:
    if not name:
        return ""
    parts = re.findall(r"[A-Za-z0-9]+", name)
    return "-".join(p.lower() for p in parts)


def _resolve_age(age_years: Optional[int], dob: Optional[str]) -> Optional[int]:
    if age_years:
        return int(age_years)
    if not dob:
        return None
    try:
        birth = datetime.fromisoformat(dob)
    except ValueError:
        return None
    today = datetime.now(timezone.utc)
    age = today.year - birth.year
    if (today.month, today.day) < (birth.month, birth.day):
        age -= 1
    return age if age >= 0 else None


def _age_to_tier(age: Optional[int]) -> str:
    if age is None:
        return "adult"
    if age <= 5:
        return "preschool"
    if age <= 8:
        return "early_school"
    if age <= 12:
        return "middle_childhood"
    if age <= 17:
        return "adolescent"
    return "adult"


def _render_timeline_block(timeline: dict) -> str:
    """Render timeline anchors so the LLM can reason about med-vs-symptom ordering."""
    if not timeline:
        return ""
    lines = ["### Timeline anchors (CRITICAL for differential)"]
    if timeline.get("earliest_recorded_symptom_date"):
        lines.append(
            f"- Earliest recorded behavioral symptom in this file: "
            f"{timeline['earliest_recorded_symptom_date']}"
        )
    for src_key, label in [
        ("earliest_issue", "earliest issue"),
        ("earliest_observation", "earliest behavior observation"),
        ("earliest_teacher_feedback", "earliest teacher feedback"),
        ("earliest_journal", "earliest journal entry"),
    ]:
        if timeline.get(src_key):
            lines.append(f"  · {label}: {timeline[src_key]}")
    actives = timeline.get("active_medications_with_start_date") or []
    if actives:
        lines.append("- Active medications and their start dates:")
        for m in actives:
            flag = (
                "  ⚠ STARTED BEFORE first recorded symptom — possible iatrogenic confound"
                if m.get("started_before_first_recorded_symptom")
                else "  (started AFTER first recorded symptom)"
            )
            lines.append(f"  · {m['name']} since {m['start_date']}\n{flag}")
    return "\n".join(lines)


def _render_evidence_block(evidence: dict) -> str:
    """Render the personal evidence dict as compact, prompt-friendly markdown."""
    if not evidence:
        return ""

    sections: list[str] = []

    timeline_block = _render_timeline_block(evidence.get("timeline") or {})
    if timeline_block:
        sections.append(timeline_block)

    def _section(title: str, items: list[dict], render_item) -> None:
        if not items:
            return
        lines = [f"### {title} ({len(items)})"]
        for item in items:
            rendered = render_item(item)
            if rendered:
                lines.append(f"- {rendered}")
        sections.append("\n".join(lines))

    _section(
        "Family-member characteristics",
        evidence.get("characteristics") or [],
        lambda c: " · ".join(
            filter(
                None,
                [
                    f"[{c['category']}]" if c.get("category") else None,
                    c.get("title"),
                    f"severity={c['severity']}" if c.get("severity") else None,
                    f"risk_tier={c['risk_tier']}" if c.get("risk_tier") else None,
                    f"freq/wk={c['frequency_per_week']}"
                    if c.get("frequency_per_week") is not None
                    else None,
                    f"duration={c['duration_weeks']}wk"
                    if c.get("duration_weeks") is not None
                    else None,
                    f"onset_age={c['age_of_onset']}"
                    if c.get("age_of_onset") is not None
                    else None,
                    f"domains={c['impairment_domains']}"
                    if c.get("impairment_domains")
                    else None,
                    c.get("description"),
                    f"strengths: {c['strengths']}" if c.get("strengths") else None,
                ],
            )
        ),
    )

    _section(
        "Sibling/comorbid conditions already tracked",
        evidence.get("other_conditions") or [],
        lambda c: " — ".join(filter(None, [c.get("name"), c.get("notes")])),
    )

    _section(
        "Active medications",
        evidence.get("medications") or [],
        lambda m: " · ".join(
            filter(
                None,
                [
                    m.get("name"),
                    m.get("dosage"),
                    m.get("frequency"),
                    "ACTIVE" if m.get("is_active") else "discontinued",
                    f"start={m['start_date']}" if m.get("start_date") else None,
                    m.get("notes"),
                ],
            )
        ),
    )

    _section(
        "Allergies & intolerances",
        evidence.get("allergies") or [],
        lambda a: " · ".join(
            filter(
                None,
                [
                    f"[{a['kind']}]" if a.get("kind") else None,
                    a.get("name"),
                    f"severity={a['severity']}" if a.get("severity") else None,
                    a.get("notes"),
                ],
            )
        ),
    )

    _section(
        "Tracked issues",
        evidence.get("issues") or [],
        lambda i: " — ".join(
            filter(
                None,
                [
                    f"[{i.get('category')}]" if i.get("category") else None,
                    i.get("title"),
                    f"severity={i['severity']}" if i.get("severity") else None,
                    f"({i['date']})" if i.get("date") else None,
                    i.get("description"),
                ],
            )
        ),
    )

    _section(
        "Behavior observations",
        evidence.get("behavior_observations") or [],
        lambda o: " · ".join(
            filter(
                None,
                [
                    f"({o['date']})" if o.get("date") else None,
                    o.get("type"),
                    f"freq={o['frequency']}" if o.get("frequency") else None,
                    f"intensity={o['intensity']}" if o.get("intensity") else None,
                    o.get("context"),
                    o.get("notes"),
                ],
            )
        ),
    )

    _section(
        "Teacher feedback",
        evidence.get("teacher_feedbacks") or [],
        lambda t: " — ".join(
            filter(
                None,
                [
                    f"({t['date']})" if t.get("date") else None,
                    t.get("teacher"),
                    f"re: {t['subject']}" if t.get("subject") else None,
                    t.get("content"),
                ],
            )
        ),
    )

    _section(
        "Other contact feedback",
        evidence.get("contact_feedbacks") or [],
        lambda c: " — ".join(
            filter(
                None,
                [
                    f"({c['date']})" if c.get("date") else None,
                    c.get("subject"),
                    c.get("content"),
                ],
            )
        ),
    )

    _section(
        "Journal entries (most recent)",
        evidence.get("journal_entries") or [],
        lambda j: " — ".join(
            filter(
                None,
                [
                    f"({j['date']})" if j.get("date") else None,
                    j.get("title"),
                    f"mood={j['mood']}" if j.get("mood") else None,
                    j.get("content"),
                ],
            )
        ),
    )

    _section(
        "Active goals",
        evidence.get("goals") or [],
        lambda g: " · ".join(
            filter(
                None,
                [
                    g.get("title"),
                    f"status={g['status']}" if g.get("status") else None,
                    f"priority={g['priority']}" if g.get("priority") else None,
                    g.get("description"),
                ],
            )
        ),
    )

    _section(
        "Tracked habits",
        evidence.get("habits") or [],
        lambda h: " · ".join(
            filter(
                None,
                [
                    h.get("title"),
                    h.get("frequency"),
                    f"target={h['target_count']}" if h.get("target_count") else None,
                    f"status={h['status']}" if h.get("status") else None,
                    h.get("description"),
                ],
            )
        ),
    )

    return "\n\n".join(sections)


async def _deepseek_json(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.0,
    timeout: float = 120.0,
    max_tokens: int = 4096,
) -> Optional[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[condition_deep_research] DEEPSEEK_API_KEY not set")
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                DEEPSEEK_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system_prompt or "Respond with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False,
                },
            )
        if resp.status_code != 200:
            print(f"[condition_deep_research] DeepSeek HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        body = resp.json()
        content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            print(f"[condition_deep_research] JSON parse failed: {content[:200]}")
            return None
    except Exception as exc:
        print(f"[condition_deep_research] DeepSeek error: {exc}")
        return None


async def _update_job_progress(job_id: Optional[str], progress: int) -> None:
    if not job_id:
        return
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET progress = %s, updated_at = NOW() WHERE id = %s",
                    (progress, job_id),
                )
    except Exception as exc:
        print(f"[condition_deep_research] update_job_progress failed: {exc}")


async def _update_job_succeeded(job_id: Optional[str], payload: dict) -> None:
    if not job_id:
        return
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'SUCCEEDED', progress = 100, "
                    "result = %s, updated_at = NOW() WHERE id = %s",
                    (json.dumps(payload), job_id),
                )
    except Exception as exc:
        print(f"[condition_deep_research] update_job_succeeded failed: {exc}")


async def _update_job_failed(job_id: Optional[str], error: dict) -> None:
    if not job_id:
        return
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'FAILED', error = %s, "
                    "updated_at = NOW() WHERE id = %s",
                    (json.dumps(error), job_id),
                )
    except Exception as exc:
        print(f"[condition_deep_research] update_job_failed failed: {exc}")


# ---------------------------------------------------------------------------
# Node: load_context
# ---------------------------------------------------------------------------
async def load_context(state: ConditionDeepResearchState) -> dict:
    user_email = (state.get("user_email") or "").strip().lower()
    condition_slug = (state.get("condition_slug") or "").strip().lower()
    member_slug = (state.get("member_slug") or "").strip().lower()
    job_id = state.get("job_id")

    if not user_email:
        return {"error": "user_email is required", "success": False}
    if not condition_slug:
        return {"error": "condition_slug is required", "success": False}
    if not member_slug:
        return {"error": "member_slug is required", "success": False}

    await _update_job_progress(job_id, 5)

    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, user_id, slug, first_name, name, age_years, "
                "date_of_birth, preferred_language "
                "FROM family_members WHERE user_id = %s AND slug = %s LIMIT 1",
                (user_email, member_slug),
            )
            fm_row = await cur.fetchone()

    if not fm_row:
        return {
            "success": False,
            "error": f"family member '{member_slug}' not found for {user_email}",
        }

    family_member = {
        "id": fm_row[0],
        "user_id": fm_row[1],
        "slug": fm_row[2],
        "first_name": fm_row[3],
        "name": fm_row[4],
        "age_years": fm_row[5],
        "date_of_birth": str(fm_row[6]) if fm_row[6] else None,
        "preferred_language": fm_row[7],
    }

    # Find a condition row for this user/member whose slugified name matches.
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id::text, name, notes FROM conditions "
                "WHERE user_id = %s AND family_member_id = %s",
                (user_email, family_member["id"]),
            )
            cond_rows = await cur.fetchall()

    matched = None
    for r in cond_rows:
        if _slugify(r[1]) == condition_slug:
            matched = {"id": r[0], "name": r[1], "notes": r[2]}
            break

    if not matched:
        # Allow research generation even when no condition row exists —
        # use the slug as the canonical name (capitalized) so the user can
        # research a condition before adding it.
        matched = {
            "id": None,
            "name": condition_slug.upper() if len(condition_slug) <= 5 else condition_slug.title(),
            "notes": None,
        }

    age = _resolve_age(family_member["age_years"], family_member["date_of_birth"])
    tier = _age_to_tier(age)

    # Resolve language: explicit > family_member.preferred_language > "ro".
    explicit_lang = (state.get("language") or "").strip().lower()
    if explicit_lang:
        language = explicit_lang
    elif family_member["preferred_language"]:
        language = family_member["preferred_language"].strip().lower()
    else:
        language = "ro"

    return {
        "_condition_row": matched,
        "_family_member": family_member,
        "_age": age,
        "_developmental_tier": tier,
        "language": language,
    }


# ---------------------------------------------------------------------------
# Node: check_freshness
# ---------------------------------------------------------------------------
async def check_freshness(state: ConditionDeepResearchState) -> dict:
    user_email = state["user_email"].strip().lower()
    fm = state.get("_family_member") or {}
    condition_slug = state["condition_slug"].strip().lower()
    language = (state.get("language") or "ro").strip().lower()
    job_id = state.get("job_id")

    if not fm.get("id"):
        return {"_cache_hit": False}

    await _update_job_progress(job_id, 15)

    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id::text, fresh_until FROM condition_deep_research "
                "WHERE user_id = %s AND family_member_id = %s "
                "AND condition_slug = %s AND language = %s LIMIT 1",
                (user_email, fm["id"], condition_slug, language),
            )
            row = await cur.fetchone()

    if not row:
        return {"_cache_hit": False}

    fresh_until = row[1]
    if fresh_until and fresh_until > datetime.now(timezone.utc):
        return {"_cache_hit": True, "_research_id": row[0]}

    return {"_cache_hit": False, "_research_id": row[0]}


# ---------------------------------------------------------------------------
# Node: gather_personal_evidence
# ---------------------------------------------------------------------------
# Per-table soft caps so the prompt stays bounded even for very active users.
_PERSON_LIMITS = {
    "characteristics": 30,
    "issues": 25,
    "journal": 20,
    "observations": 25,
    "teacher": 10,
    "contact": 10,
    "goals": 15,
    "habits": 15,
    "medications": 20,
    "allergies": 30,
}


async def gather_personal_evidence(state: ConditionDeepResearchState) -> dict:
    """Pull every relevant record for this family member and condense it into a
    structured payload that ``extract_facts`` injects into the LLM prompt.

    The goal is condition research that is calibrated to *this* person's actual
    history — observed behaviors, teacher reports, current medications, comorbid
    conditions, allergies, etc. — not a generic pediatric reference.
    """
    if state.get("_cache_hit"):
        return {}

    fm = state.get("_family_member") or {}
    user_email = state["user_email"].strip().lower()
    job_id = state.get("job_id")
    fm_id = fm.get("id")

    if not fm_id:
        return {"_personal_evidence": {}}

    await _update_job_progress(job_id, 25)

    cond_slug = state.get("condition_slug", "").strip().lower()
    cond_name = (state.get("_condition_row") or {}).get("name") or cond_slug

    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            # Family characteristics (severity / risk tiers)
            await cur.execute(
                "SELECT category, title, description, severity, "
                "frequency_per_week, duration_weeks, age_of_onset, "
                "impairment_domains, strengths, risk_tier "
                "FROM family_member_characteristics "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY created_at DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["characteristics"]),
            )
            characteristics = [
                {
                    "category": r[0],
                    "title": r[1],
                    "description": (r[2] or "")[:400] if r[2] else None,
                    "severity": r[3],
                    "frequency_per_week": r[4],
                    "duration_weeks": r[5],
                    "age_of_onset": r[6],
                    "impairment_domains": r[7],
                    "strengths": (r[8] or "")[:300] if r[8] else None,
                    "risk_tier": r[9],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT title, description, category, severity, recommendations, "
                "created_at FROM issues "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY created_at DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["issues"]),
            )
            issues = [
                {
                    "title": r[0],
                    "description": (r[1] or "")[:600],
                    "category": r[2],
                    "severity": r[3],
                    "recommendations": (r[4] or "")[:400] if r[4] else None,
                    "date": str(r[5])[:10] if r[5] else None,
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT title, content, mood, mood_score, tags, entry_date "
                "FROM journal_entries "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY entry_date DESC NULLS LAST, id DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["journal"]),
            )
            journal = [
                {
                    "title": r[0],
                    "content": (r[1] or "")[:600],
                    "mood": r[2],
                    "mood_score": r[3],
                    "tags": r[4],
                    "date": r[5],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT observation_type, frequency, intensity, context, notes, "
                "observed_at FROM behavior_observations "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY observed_at DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["observations"]),
            )
            observations = [
                {
                    "type": r[0],
                    "frequency": r[1],
                    "intensity": r[2],
                    "context": (r[3] or "")[:300] if r[3] else None,
                    "notes": (r[4] or "")[:400] if r[4] else None,
                    "date": r[5],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT teacher_name, subject, feedback_date, content, tags "
                "FROM teacher_feedbacks "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY feedback_date DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["teacher"]),
            )
            teacher_feedbacks = [
                {
                    "teacher": r[0],
                    "subject": r[1],
                    "date": r[2],
                    "content": (r[3] or "")[:800],
                    "tags": r[4],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT subject, feedback_date, content, tags "
                "FROM contact_feedbacks "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY feedback_date DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["contact"]),
            )
            contact_feedbacks = [
                {
                    "subject": r[0],
                    "date": r[1],
                    "content": (r[2] or "")[:800],
                    "tags": r[3],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT title, description, status, priority, target_date "
                "FROM goals "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY created_at DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["goals"]),
            )
            goals = [
                {
                    "title": r[0],
                    "description": (r[1] or "")[:400] if r[1] else None,
                    "status": r[2],
                    "priority": r[3],
                    "target_date": r[4],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT title, description, frequency, target_count, status "
                "FROM habits "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY created_at DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["habits"]),
            )
            habits = [
                {
                    "title": r[0],
                    "description": (r[1] or "")[:300] if r[1] else None,
                    "frequency": r[2],
                    "target_count": r[3],
                    "status": r[4],
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT name, dosage, frequency, notes, is_active, "
                "start_date, end_date FROM medications "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY COALESCE(is_active, TRUE) DESC, created_at DESC "
                "LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["medications"]),
            )
            medications = [
                {
                    "name": r[0],
                    "dosage": r[1],
                    "frequency": r[2],
                    # Keep medication notes nearly verbatim — drug names + safety
                    # warnings are load-bearing for differential diagnosis.
                    "notes": (r[3] or "")[:1200] if r[3] else None,
                    "is_active": bool(r[4]) if r[4] is not None else True,
                    "start_date": str(r[5])[:10] if r[5] else None,
                    "end_date": str(r[6])[:10] if r[6] else None,
                }
                for r in await cur.fetchall()
            ]

            await cur.execute(
                "SELECT kind, name, severity, notes FROM allergies "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY created_at DESC LIMIT %s",
                (fm_id, user_email, _PERSON_LIMITS["allergies"]),
            )
            allergies = [
                {"kind": r[0], "name": r[1], "severity": r[2], "notes": r[3]}
                for r in await cur.fetchall()
            ]

            # Sibling conditions tracked for this person.
            await cur.execute(
                "SELECT name, notes FROM conditions "
                "WHERE family_member_id = %s AND user_id = %s "
                "ORDER BY created_at DESC",
                (fm_id, user_email),
            )
            other_conditions = [
                {"name": r[0], "notes": (r[1] or "")[:300] if r[1] else None}
                for r in await cur.fetchall()
                if (r[0] or "").strip().lower() != cond_name.strip().lower()
            ]

    # Compute timeline anchors so the LLM can reason about temporal ordering
    # between symptom onset and active medications — critical for ruling out
    # iatrogenic etiology (e.g. montelukast neuropsychiatric side effects).
    def _earliest(items: list[dict], key: str) -> str | None:
        dates = sorted(
            {(it.get(key) or "").strip()[:10] for it in items if it.get(key)}
        )
        return dates[0] if dates else None

    earliest_journal = _earliest(journal, "date")
    earliest_observation = _earliest(observations, "date")
    earliest_teacher = _earliest(teacher_feedbacks, "date")
    earliest_issue = _earliest(issues, "date")
    earliest_symptom_record = min(
        d
        for d in (
            earliest_journal,
            earliest_observation,
            earliest_teacher,
            earliest_issue,
        )
        if d
    ) if any(
        (earliest_journal, earliest_observation, earliest_teacher, earliest_issue)
    ) else None

    timeline = {
        "earliest_recorded_symptom_date": earliest_symptom_record,
        "earliest_journal": earliest_journal,
        "earliest_observation": earliest_observation,
        "earliest_teacher_feedback": earliest_teacher,
        "earliest_issue": earliest_issue,
        "active_medications_with_start_date": [
            {
                "name": m["name"],
                "start_date": m.get("start_date"),
                "started_before_first_recorded_symptom": (
                    bool(m.get("start_date"))
                    and bool(earliest_symptom_record)
                    and m["start_date"] < earliest_symptom_record
                ),
            }
            for m in medications
            if m.get("is_active") and m.get("start_date")
        ],
    }

    evidence = {
        "characteristics": characteristics,
        "issues": issues,
        "journal_entries": journal,
        "behavior_observations": observations,
        "teacher_feedbacks": teacher_feedbacks,
        "contact_feedbacks": contact_feedbacks,
        "goals": goals,
        "habits": habits,
        "medications": medications,
        "allergies": allergies,
        "other_conditions": other_conditions,
        "timeline": timeline,
    }

    counts = {
        k: len(v) if isinstance(v, list) else (1 if v else 0)
        for k, v in evidence.items()
    }
    print(f"[condition_deep_research] gathered evidence: {counts}")

    return {"_personal_evidence": evidence}


# ---------------------------------------------------------------------------
# Node: extract_facts
# ---------------------------------------------------------------------------
async def extract_facts(state: ConditionDeepResearchState) -> dict:
    if state.get("_cache_hit"):
        return {}

    job_id = state.get("job_id")
    await _update_job_progress(job_id, 35)

    cond = state.get("_condition_row") or {}
    fm = state.get("_family_member") or {}
    age = state.get("_age")
    tier = state.get("_developmental_tier", "adult")
    language = (state.get("language") or "ro").strip().lower()

    cond_name = cond.get("name") or state["condition_slug"]
    person_label = fm.get("first_name") or "the person"
    age_label = f"{age} years old" if age is not None else "unknown age"

    lang_directive = ROMANIAN_INSTRUCTION if language == "ro" else (
        "Respond entirely in English with clear, clinical prose."
    )

    system_prompt = (
        "You are a pediatric and developmental clinical reference. Extract structured, "
        "evidence-aligned knowledge about a named health condition, calibrated to a "
        "specific developmental tier. Return JSON ONLY — no prose outside the JSON.\n\n"
        f"{lang_directive}\n\n"
        "Output schema (return EXACTLY these keys):\n"
        "{\n"
        '  "pathophysiology": {\n'
        '    "summary": string (2-4 sentences),\n'
        '    "mechanisms": [string]  // 3-6 concrete neurobiological / behavioral mechanisms\n'
        "  },\n"
        '  "age_manifestations": [\n'
        "    {\n"
        f'      "developmental_tier": one of {list(DEVELOPMENTAL_TIERS)},\n'
        '      "manifestations": [string]  // 3-6 observable signs typical for that tier\n,'
        '      "notes": string | null\n'
        "    }\n"
        "  ],  // Cover at least the requested tier; include adjacent tiers when clinically informative.\n"
        '  "evidence_based_treatments": [\n'
        "    {\n"
        '      "name": string,\n'
        f'      "category": one of {list(TREATMENT_CATEGORIES)},\n'
        f'      "evidence_level": one of {list(EVIDENCE_LEVELS)},\n'
        '      "age_appropriate": string  // e.g. "school-age and older", "ages 6-12", "any",\n'
        '      "notes": string | null  // mechanism, key references, caveats\n'
        "    }\n"
        "  ],  // 4-8 treatments, ordered by evidence_level then age fit\n"
        '  "comorbidities": [\n'
        "    {\n"
        '      "name": string,\n'
        '      "prevalence": string | null  // e.g. "30-50% lifetime", "common", null if unknown,\n'
        '      "notes": string | null\n'
        "    }\n"
        "  ],  // 3-6 high-impact comorbidities\n"
        '  "red_flags": [\n'
        "    {\n"
        '      "flag": string,  // a symptom or pattern that warrants escalation\n'
        '      "action": string | null  // what a parent / clinician should do\n'
        "    }\n"
        "  ],  // 3-6 red flags\n"
        '  "criteria_match": {  // DSM-5 ADHD criteria mapped against the personal file\n'
        '    "framework": "DSM-5 ADHD",\n'
        '    "criterion_a_inattention": {\n'
        '      "matched_symptoms": [{ "symptom": string, "evidence": string }],\n'
        '        // For each of the 9 DSM-5 inattention symptoms (often misses details, '
        'difficulty sustaining attention, doesn\'t seem to listen, fails to follow through, '
        'difficulty organizing, avoids sustained mental effort, loses things, easily distracted, '
        'forgetful in daily activities), ONLY include it if the personal file contains explicit '
        'evidence. Quote the evidence string verbatim.\n'
        '      "matched_count": integer 0-9,\n'
        '      "threshold_met": boolean  // true if matched_count >= 6 (children) or >= 5 (>=17yo)\n'
        "    },\n"
        '    "criterion_a_hyperactivity_impulsivity": {\n'
        '      "matched_symptoms": [{ "symptom": string, "evidence": string }],\n'
        '        // For each of the 9 DSM-5 hyperactivity-impulsivity symptoms (fidgets, leaves '
        'seat, runs/climbs inappropriately, can\'t play quietly, "on the go", talks excessively, '
        'blurts out answers, difficulty waiting turn, interrupts others), same evidence rule.\n'
        '      "matched_count": integer 0-9,\n'
        '      "threshold_met": boolean\n'
        "    },\n"
        '    "presentation": "predominantly_inattentive" | "predominantly_hyperactive_impulsive" | "combined" | "subthreshold",\n'
        '    "criterion_b_age_onset":  { "met": boolean, "evidence": string },  // symptoms before age 12\n'
        '    "criterion_c_settings":   { "met": boolean, "evidence": string },  // present in 2+ settings\n'
        '    "criterion_d_impairment": { "met": boolean, "evidence": string },  // documented functional impairment\n'
        '    "criterion_e_differential": { "ruled_out": boolean, "notes": string }  // not better explained by another condition\n'
        "  },\n"
        '  "proximity_assessment": {  // PRIMARY OUTPUT — derived from criteria_match + clinical judgment\n'
        '    "score": integer 0-100,  // 100 = strongest match across ALL criteria\n'
        '    "label": "very_likely" | "likely" | "possible" | "unlikely" | "very_unlikely",\n'
        '    "confidence": "high" | "moderate" | "low",  // reflects evidence depth, not your certainty about ADHD\n'
        '    "rationale": string,  // 2-4 sentences synthesizing the criteria_match into a verdict\n'
        '    "supporting_evidence": [string],  // bullets quoting specific records (date + content)\n'
        '    "contradicting_evidence": [string],  // bullets of what argues against ADHD\n'
        '    "missing_evidence": [string],  // what would sharpen the assessment (e.g. "Vanderbilt teacher rating", "history before age 12", "structured classroom observation")\n'
        '    "recommended_next_step": string  // concrete clinical next action\n'
        "  }\n"
        "}"
    )

    evidence = state.get("_personal_evidence") or {}
    evidence_block = _render_evidence_block(evidence)

    user_prompt = (
        f"Condition: {cond_name}\n"
        f"Subject: {person_label}, {age_label} (developmental tier: {tier})\n"
        + (f"Existing notes on this condition: {cond.get('notes')}\n" if cond.get("notes") else "")
        + "\n"
        + (
            "PERSONAL CLINICAL FILE — every section below is real recorded data "
            "for this person. Use it to PERSONALIZE the research:\n"
            "- In `pathophysiology.summary`, reference the actual presentation when "
            "it matches the documented behaviors / observations.\n"
            "- In `age_manifestations`, prioritize manifestations that are already "
            "evidenced in this person's record. Keep generic ones too.\n"
            "- In `evidence_based_treatments`, factor in active medications, "
            "documented allergies, sibling conditions (drug interactions, "
            "contraindications, augmentation strategies). Mention specific "
            "interactions when relevant.\n"
            "- In `comorbidities`, weight the list toward conditions already "
            "tracked OR strongly suggested by the journal / teacher feedback / "
            "behavior observations.\n"
            "- In `red_flags`, be EXTRA concrete — if the file shows escalating "
            "intensity / frequency in observations, surface that pattern.\n"
            "\n"
            "IATROGENIC / DIFFERENTIAL CHECK (mandatory for ADHD assessment):\n"
            "Before declaring a high-confidence ADHD verdict, you MUST scan the "
            "active medication list for known causes of ADHD-like symptoms. "
            "Watch list (any of these can mimic or worsen ADHD presentation in "
            "children — list each one you find in the file under "
            "`proximity_assessment.contradicting_evidence` AND in "
            "`criteria_match.criterion_e_differential.notes`, and lower the "
            "score accordingly):\n"
            "  · MONTELUKAST (Singulair) — FDA black-box warning (March 2020) "
            "for serious neuropsychiatric events including agitation, "
            "aggression, anxiety, depression, sleep disturbance, attention "
            "and memory impairment, hyperactivity, and irritability. "
            "Especially relevant in pediatric patients.\n"
            "  · Systemic / inhaled CORTICOSTEROIDS (prednisone, beclometasone, "
            "fluticasone) — mood lability, hyperactivity, insomnia.\n"
            "  · Pseudoephedrine / sympathomimetics — restlessness, attention "
            "deficits.\n"
            "  · Benzodiazepines — paradoxical disinhibition in children.\n"
            "  · Antihistamines (1st-generation — diphenhydramine) — "
            "paradoxical agitation in young children.\n"
            "  · Antiepileptics (levetiracetam, topiramate) — irritability, "
            "attention problems.\n"
            "  · Beta-agonists (albuterol/salbutamol) — tremor, jitteriness.\n"
            "Use the timeline anchors to check causality: if a watch-list "
            "medication was STARTED BEFORE the earliest recorded symptom date, "
            "iatrogenic etiology becomes the leading differential and "
            "criterion E ('not better explained by another condition') CANNOT "
            "be ruled out without first trialing discontinuation. In that "
            "case set `criterion_e_differential.ruled_out=false`, knock the "
            "proximity score down by AT LEAST 25 points from where pure "
            "symptom-count would put it, label as `possible` or lower, and "
            "make the recommended_next_step a structured drug-holiday or "
            "alternative agent trial under medical supervision.\n"
            "\n"
            "When you reference the personal file, do so concisely (e.g. "
            "\"per 2026-03-12 teacher feedback\", \"per active Singulair "
            "regimen since 2025-08\").\n\n"
            f"{evidence_block}\n\n"
            if evidence_block
            else ""
        )
        + f"Tailor the age_manifestations and evidence_based_treatments to be MOST relevant to "
        f"the {tier} tier first, but include adjacent tiers when useful. Be concrete and "
        f"actionable. Cite well-known guidelines or trial names in the notes when helpful "
        f"(e.g. AAP, NICE, MTA Cooperative Group)."
    )

    facts = await _deepseek_json(
        user_prompt,
        system_prompt=system_prompt,
        max_tokens=EXTRACTION_MAX_TOKENS,
    )

    if not facts:
        return {
            "success": False,
            "error": "DeepSeek extraction returned no content",
        }

    return {"_facts": facts}


# ---------------------------------------------------------------------------
# Node: persist
# ---------------------------------------------------------------------------
async def persist(state: ConditionDeepResearchState) -> dict:
    if state.get("_cache_hit"):
        # Cached path — no write.
        return {
            "success": True,
            "message": "served from 30-day cache",
            "counts": {"sections": 5, "papers": 0, "cached": 1},
        }

    facts = state.get("_facts") or {}
    if not facts:
        return {
            "success": False,
            "error": "no facts to persist (extract_facts did not return content)",
        }

    user_email = state["user_email"].strip().lower()
    condition_slug = state["condition_slug"].strip().lower()
    fm = state.get("_family_member") or {}
    language = (state.get("language") or "ro").strip().lower()
    cond = state.get("_condition_row") or {}
    job_id = state.get("job_id")

    await _update_job_progress(job_id, 75)

    fresh_until = datetime.now(timezone.utc) + timedelta(days=FRESHNESS_DAYS)

    pathophysiology = facts.get("pathophysiology") or None
    age_manifestations = facts.get("age_manifestations") or []
    evidence_based_treatments = facts.get("evidence_based_treatments") or []
    comorbidities = facts.get("comorbidities") or []
    red_flags = facts.get("red_flags") or []
    criteria_match = facts.get("criteria_match") or None
    proximity_assessment = facts.get("proximity_assessment") or None

    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO condition_deep_research (
                    user_id, family_member_id, condition_slug, condition_name, language,
                    pathophysiology, age_manifestations, evidence_based_treatments,
                    comorbidities, red_flags, criteria_match, proximity_assessment,
                    source_urls, fresh_until, generated_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s::jsonb, %s::jsonb, %s::jsonb,
                    %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
                    %s::jsonb, %s, NOW(), NOW()
                )
                ON CONFLICT (user_id, family_member_id, condition_slug, language)
                DO UPDATE SET
                    condition_name = EXCLUDED.condition_name,
                    pathophysiology = EXCLUDED.pathophysiology,
                    age_manifestations = EXCLUDED.age_manifestations,
                    evidence_based_treatments = EXCLUDED.evidence_based_treatments,
                    comorbidities = EXCLUDED.comorbidities,
                    red_flags = EXCLUDED.red_flags,
                    criteria_match = EXCLUDED.criteria_match,
                    proximity_assessment = EXCLUDED.proximity_assessment,
                    source_urls = EXCLUDED.source_urls,
                    fresh_until = EXCLUDED.fresh_until,
                    generated_at = NOW(),
                    updated_at = NOW()
                RETURNING id::text
                """,
                (
                    user_email,
                    fm.get("id"),
                    condition_slug,
                    cond.get("name") or condition_slug.upper(),
                    language,
                    json.dumps(pathophysiology) if pathophysiology else None,
                    json.dumps(age_manifestations),
                    json.dumps(evidence_based_treatments),
                    json.dumps(comorbidities),
                    json.dumps(red_flags),
                    json.dumps(criteria_match) if criteria_match else None,
                    json.dumps(proximity_assessment) if proximity_assessment else None,
                    json.dumps([]),
                    fresh_until,
                ),
            )
            row = await cur.fetchone()

    return {
        "_research_id": row[0] if row else None,
        "success": True,
        "message": f"persisted condition deep research for '{condition_slug}'",
        "counts": {
            "sections": sum(
                1 for v in (
                    pathophysiology,
                    age_manifestations,
                    evidence_based_treatments,
                    comorbidities,
                    red_flags,
                    criteria_match,
                    proximity_assessment,
                ) if v
            ),
            "treatments": len(evidence_based_treatments),
            "comorbidities": len(comorbidities),
            "red_flags": len(red_flags),
            "proximity_score": (proximity_assessment or {}).get("score"),
            "proximity_label": (proximity_assessment or {}).get("label"),
        },
    }


# ---------------------------------------------------------------------------
# Node: fan_out_papers (fire-and-forget)
# ---------------------------------------------------------------------------
async def fan_out_papers(state: ConditionDeepResearchState) -> dict:
    """Reserved hook for fan-out into therapy_research papers.

    The existing generate_therapy_research_graph is keyed on goal/issue/
    feedback IDs and has no native condition entry point. Skipping for now —
    structured deep research alone is the primary value; paper fan-out
    becomes a follow-up that either:
      (a) extends generate_therapy_research with a condition entry, or
      (b) adds a thin per-condition paper graph.
    """
    job_id = state.get("job_id")
    await _update_job_progress(job_id, 90)
    counts = dict(state.get("counts") or {})
    counts.setdefault("papers", 0)
    return {"counts": counts}


# ---------------------------------------------------------------------------
# Finalize
# ---------------------------------------------------------------------------
async def finalize(state: ConditionDeepResearchState) -> dict:
    job_id = state.get("job_id")
    success = bool(state.get("success", True))
    error = state.get("error")

    if success and not error:
        await _update_job_succeeded(
            job_id,
            {
                "research_id": state.get("_research_id"),
                "counts": state.get("counts") or {},
                "language": state.get("language"),
            },
        )
        return {"success": True, "message": state.get("message", "completed")}

    await _update_job_failed(job_id, {"message": error or "unknown error"})
    return {"success": False}


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------
def _route_after_freshness(state: ConditionDeepResearchState) -> str:
    if state.get("_cache_hit"):
        return "persist"  # persist short-circuits to message + counts
    return "gather_personal_evidence"


def _route_after_load_context(state: ConditionDeepResearchState) -> str:
    if state.get("error"):
        return "finalize"
    return "check_freshness"


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------
builder = StateGraph(ConditionDeepResearchState)
builder.add_node("load_context", load_context, retry_policy=RetryPolicy(max_attempts=2))
builder.add_node("check_freshness", check_freshness, retry_policy=RetryPolicy(max_attempts=2))
builder.add_node(
    "gather_personal_evidence",
    gather_personal_evidence,
    retry_policy=RetryPolicy(max_attempts=2),
)
builder.add_node("extract_facts", extract_facts, retry_policy=RetryPolicy(max_attempts=2))
builder.add_node("persist", persist, retry_policy=RetryPolicy(max_attempts=2))
builder.add_node("fan_out_papers", fan_out_papers)
builder.add_node("finalize", finalize)

builder.add_edge(START, "load_context")
builder.add_conditional_edges(
    "load_context",
    _route_after_load_context,
    {"check_freshness": "check_freshness", "finalize": "finalize"},
)
builder.add_conditional_edges(
    "check_freshness",
    _route_after_freshness,
    {
        "gather_personal_evidence": "gather_personal_evidence",
        "persist": "persist",
    },
)
builder.add_edge("gather_personal_evidence", "extract_facts")
builder.add_edge("extract_facts", "persist")
builder.add_edge("persist", "fan_out_papers")
builder.add_edge("fan_out_papers", "finalize")
builder.add_edge("finalize", END)

graph = builder.compile()
