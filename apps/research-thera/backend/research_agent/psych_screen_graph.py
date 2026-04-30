"""LangGraph: psychologist-screening assessment for a family member.

Synthesizes Bogdan's holistic clinical picture across 9 tables and decides
whether (and how urgently) a psychologist consult is warranted. The decision
policy is iatrogenic-first: during the 2-4 week post-Singulair washout
window, non-red-flag symptoms default to WAIT_AND_OBSERVE because they may
resolve as montelukast clears; hard red flags (suicidal ideation, psychotic
features, severe regression, severe persistent aggression) override and
escalate to URGENT_CONSULT regardless of phase.

Pipeline:
  load_context     - SQL across family_members, medications, behavior_observations,
                     issues, family_member_characteristics, journal_entries,
                     conditions, allergies, blood_tests, prior screens, prior
                     bogdan_discussion_guides, prior calming_plans.
  assess_window    - compute washout day-count from Singulair stop_date;
                     classify into acute|subacute|resolution|persistent.
  screen_red_flags - rule-based scan over observations + journals + characteristics
                     for hard triggers; LLM-augmented in `generate`.
  generate         - DeepSeek JSON: produces structured assessment with
                     recommendation tier, rationale (Romanian), citations.
  critique         - score 1-10 across 6 axes; refine once if any < 7.
  refine           - rewrite weak sections.
  persist          - INSERT into psych_screening_assessments + UPDATE generation_jobs.

Output is ADVISORY only; explicit "consult a clinician" framing.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, TypedDict

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy

from research_agent import neon

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402


_VALID_RECOMMENDATIONS = {
    "URGENT_CONSULT",
    "CONSULT_RECOMMENDED",
    "WAIT_AND_OBSERVE",
    "NO_CONSULT_NEEDED",
}

_REQUIRED_KEYS = (
    "recommendation",
    "confidence",
    "rationale_ro",
    "iatrogenic_likelihood",
    "observation_window",
    "red_flags",
    "supporting_observations",
    "differential",
    "recommended_next_steps_ro",
    "citations",
)

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: All Romanian fields (rationale_ro, recommended_next_steps_ro, "
    "label_ro, summary_ro, rationale_ro inside differential) MUST be natural, "
    "fluent Romanian. Other fields (recommendation, phase enums, confidence numbers, "
    "DOIs, citation titles) stay in the canonical English form."
)

_LLM_RETRY = RetryPolicy(max_attempts=2, backoff_factor=2.0)
_CRITIQUE_THRESHOLD = 7

# Hard red-flag keyword screens — applied in Romanian and English over
# observations + journal content + characteristics. Conservative; the LLM
# layer adds nuance.
_HARD_RED_FLAG_PATTERNS = {
    "suicidal_ideation": [
        "suicid", "să mă omor", "vreau să mor", "sa ma omor", "vreau sa mor",
        "kill myself", "want to die", "self-harm", "self harm",
        "tăieturi", "cutting",
    ],
    "psychotic_features": [
        "halucina", "voci", "hearing voices", "vede oameni care nu sunt",
        "paranoia severă", "severe paranoia", "delirante", "delusion",
    ],
    "severe_regression": [
        "regression", "a pierdut limbajul", "lost speech", "stopped talking",
        "nu mai vorbește", "enuresis nou", "new bedwetting",
    ],
    "severe_aggression": [
        "lovește grav", "rănește", "injures", "draws blood", "broke skin",
        "atacă", "attack with weapon", "with a knife",
    ],
}


class PsychScreenState(TypedDict, total=False):
    user_email: str
    family_member_id: int
    language: str
    job_id: str
    is_ro: bool

    # Loaded context
    _member: dict
    _medications: list[dict]
    _conditions: list[dict]
    _allergies: list[dict]
    _observations: list[dict]
    _issues: list[dict]
    _characteristics: list[dict]
    _journals: list[dict]
    _blood_markers: list[dict]
    _research: list[dict]
    _prior_screens: list[dict]
    _prior_calming_plan: Optional[dict]
    _prior_discussion: Optional[dict]
    _washout: dict
    _red_flags: list[dict]
    _draft: dict
    _critique: dict
    _refined: bool
    _prompt: str
    _data_snapshot: dict

    # Output
    success: bool
    message: str
    screen_id: Optional[int]
    error: Optional[str]


# ── Job status helpers ───────────────────────────────────────────────────

async def _update_job_progress(job_id: str, progress: int) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET progress = %s, updated_at = NOW() WHERE id = %s",
                    (progress, job_id),
                )
    except Exception as exc:
        print(f"[psych_screen._update_job_progress] failed: {exc}")


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
        print(f"[psych_screen._update_job_succeeded] failed: {exc}")


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
        print(f"[psych_screen._update_job_failed] failed: {exc}")


def _truncate(text: Optional[str], n: int = 240) -> str:
    if not text:
        return ""
    s = str(text).strip().replace("\n", " ")
    return s if len(s) <= n else s[: n - 1] + "…"


def _resolve_age(age_years: Optional[int], dob: Optional[str]) -> Optional[int]:
    if age_years:
        return int(age_years)
    if not dob:
        return None
    try:
        born = datetime.fromisoformat(str(dob)[:10])
        today = datetime.utcnow()
        years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        return years if years >= 0 else None
    except Exception:
        return None


# ── Node: load_context ───────────────────────────────────────────────────

async def load_context(state: PsychScreenState) -> dict:
    user_email = state.get("user_email")
    family_member_id = state.get("family_member_id")
    job_id = state.get("job_id")
    if not user_email or not family_member_id:
        return {"error": "user_email and family_member_id are required"}

    if job_id:
        await _update_job_progress(job_id, 10)

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                # Member profile
                await cur.execute(
                    "SELECT id, first_name, name, age_years, date_of_birth, relationship, bio "
                    "FROM family_members WHERE id = %s AND user_id = %s",
                    (family_member_id, user_email),
                )
                m_row = await cur.fetchone()
                if not m_row:
                    return {"error": f"family_member {family_member_id} not found"}
                member = {
                    "id": m_row[0],
                    "first_name": m_row[1],
                    "name": m_row[2],
                    "age_years": m_row[3],
                    "date_of_birth": m_row[4],
                    "relationship": m_row[5],
                    "bio": m_row[6],
                }

                # Medications (incl. Singulair)
                medications: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT name, dosage, frequency, notes, start_date, end_date, is_active "
                        "FROM medications WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY start_date DESC NULLS LAST",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        medications.append({
                            "name": r[0],
                            "dosage": r[1],
                            "frequency": r[2],
                            "notes": (r[3] or "")[:500],
                            "start_date": r[4].isoformat() if hasattr(r[4], "isoformat") else r[4],
                            "end_date": r[5].isoformat() if hasattr(r[5], "isoformat") else r[5],
                            "is_active": bool(r[6]) if r[6] is not None else None,
                        })
                except Exception as exc:
                    print(f"[psych_screen] medications unavailable: {exc}")

                # Conditions
                conditions: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT name, notes, created_at FROM conditions "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        conditions.append({
                            "name": r[0],
                            "notes": (r[1] or "")[:300],
                            "created_at": r[2].isoformat() if hasattr(r[2], "isoformat") else r[2],
                        })
                except Exception as exc:
                    print(f"[psych_screen] conditions unavailable: {exc}")

                # Allergies
                allergies: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT name, kind, severity, notes FROM allergies "
                        "WHERE family_member_id = %s AND user_id = %s",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        allergies.append({
                            "name": r[0],
                            "kind": r[1],
                            "severity": r[2],
                            "notes": (r[3] or "")[:200],
                        })
                except Exception as exc:
                    print(f"[psych_screen] allergies unavailable: {exc}")

                # Behavior observations (last 90 days)
                observations: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT id, observed_at, observation_type, frequency, intensity, "
                        "context, notes FROM behavior_observations "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "AND (observed_at IS NULL OR observed_at::timestamptz >= NOW() - INTERVAL '90 days') "
                        "ORDER BY observed_at DESC NULLS LAST LIMIT 40",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        observations.append({
                            "id": r[0],
                            "observed_at": r[1].isoformat() if hasattr(r[1], "isoformat") else r[1],
                            "type": r[2],
                            "frequency": r[3],
                            "intensity": r[4],
                            "context": _truncate(r[5], 240),
                            "notes": _truncate(r[6], 240),
                        })
                except Exception as exc:
                    print(f"[psych_screen] behavior_observations unavailable: {exc}")

                # Issues (severity-ordered)
                issues: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT id, title, category, severity, description "
                        "FROM issues WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, "
                        "created_at DESC LIMIT 30",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        issues.append({
                            "id": r[0],
                            "title": r[1],
                            "category": r[2],
                            "severity": r[3],
                            "description": _truncate(r[4], 300),
                        })
                except Exception as exc:
                    print(f"[psych_screen] issues unavailable: {exc}")

                # Characteristics
                characteristics: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT category, title, description, severity, risk_tier, "
                        "frequency_per_week, duration_weeks, age_of_onset, impairment_domains "
                        "FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY CASE risk_tier WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        characteristics.append({
                            "category": r[0],
                            "title": r[1],
                            "description": _truncate(r[2], 240),
                            "severity": r[3],
                            "risk_tier": r[4],
                            "frequency_per_week": r[5],
                            "duration_weeks": r[6],
                            "age_of_onset": r[7],
                            "impairment_domains": r[8],
                        })
                except Exception as exc:
                    print(f"[psych_screen] family_member_characteristics unavailable: {exc}")

                # Journal entries (last 60 days)
                journals: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT id, entry_date, mood, mood_score, title, content "
                        "FROM journal_entries WHERE family_member_id = %s AND user_id = %s "
                        "AND (entry_date IS NULL OR entry_date::date >= (CURRENT_DATE - INTERVAL '60 days')) "
                        "ORDER BY entry_date DESC NULLS LAST LIMIT 40",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        journals.append({
                            "id": r[0],
                            "entry_date": r[1].isoformat() if hasattr(r[1], "isoformat") else r[1],
                            "mood": r[2],
                            "mood_score": r[3],
                            "title": (r[4] or "")[:160],
                            "content": _truncate(r[5], 500),
                        })
                except Exception as exc:
                    print(f"[psych_screen] journal_entries unavailable: {exc}")

                # Blood test summary (latest only)
                blood_markers: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT bt.id, bt.test_date "
                        "FROM blood_tests bt WHERE bt.family_member_id = %s AND bt.user_id = %s "
                        "AND bt.status = 'completed' "
                        "ORDER BY bt.test_date DESC NULLS LAST LIMIT 1",
                        (family_member_id, user_email),
                    )
                    bt_row = await cur.fetchone()
                    if bt_row:
                        await cur.execute(
                            "SELECT name, value, unit, flag FROM blood_markers "
                            "WHERE test_id = %s AND (flag IS NOT NULL AND flag != 'normal') "
                            "ORDER BY name LIMIT 30",
                            (bt_row[0],),
                        )
                        for r in await cur.fetchall():
                            blood_markers.append({
                                "name": r[0],
                                "value": r[1],
                                "unit": r[2],
                                "flag": r[3],
                                "test_date": bt_row[1].isoformat() if hasattr(bt_row[1], "isoformat") else bt_row[1],
                            })
                except Exception as exc:
                    print(f"[psych_screen] blood_tests unavailable: {exc}")

                # Top therapy_research papers tagged montelukast / ADHD / psych
                research: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT id, title, year, doi, authors, abstract "
                        "FROM therapy_research "
                        "WHERE LOWER(COALESCE(title, '')) ~ '(montelukast|singulair|adhd|attention deficit|psychiatric|neuropsych|child psycholog|pediatric psych)' "
                        "OR LOWER(COALESCE(abstract, '')) ~ '(montelukast|singulair|adhd|attention deficit|neuropsychiatric)' "
                        "ORDER BY year DESC NULLS LAST LIMIT 15"
                    )
                    for r in await cur.fetchall():
                        authors = r[4]
                        try:
                            parsed = json.loads(authors) if authors else []
                            authors_str = "; ".join(str(a) for a in parsed[:3]) if isinstance(parsed, list) else str(authors or "")
                        except Exception:
                            authors_str = str(authors or "")
                        research.append({
                            "id": r[0],
                            "title": r[1],
                            "year": r[2],
                            "doi": r[3],
                            "authors": authors_str,
                            "abstract": _truncate(r[5], 320),
                        })
                except Exception as exc:
                    print(f"[psych_screen] therapy_research unavailable: {exc}")

                # Prior screens
                prior_screens: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT id, recommendation, confidence, rationale, observation_window, created_at "
                        "FROM psych_screening_assessments "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 3",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        prior_screens.append({
                            "id": r[0],
                            "recommendation": r[1],
                            "confidence": float(r[2]) if r[2] is not None else None,
                            "rationale": _truncate(r[3], 320),
                            "observation_window": r[4],
                            "created_at": r[5].isoformat() if hasattr(r[5], "isoformat") else r[5],
                        })
                except Exception as exc:
                    print(f"[psych_screen] prior screens unavailable: {exc}")

                # Latest calming plan + bogdan discussion (light context)
                prior_calming = None
                try:
                    await cur.execute(
                        "SELECT id, plan_json, generated_at FROM calming_plans "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY generated_at DESC LIMIT 1",
                        (family_member_id, user_email),
                    )
                    row = await cur.fetchone()
                    if row:
                        try:
                            pj = json.loads(row[1]) if isinstance(row[1], str) else (row[1] or {})
                        except Exception:
                            pj = {}
                        prior_calming = {
                            "id": row[0],
                            "headline": (pj or {}).get("headline"),
                            "executive_summary": _truncate((pj or {}).get("executive_summary"), 400),
                            "generated_at": row[2].isoformat() if hasattr(row[2], "isoformat") else row[2],
                        }
                except Exception as exc:
                    print(f"[psych_screen] calming_plans unavailable: {exc}")

                prior_discussion = None
                try:
                    await cur.execute(
                        "SELECT id, behavior_summary, created_at FROM bogdan_discussion_guides "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY created_at DESC LIMIT 1",
                        (family_member_id, user_email),
                    )
                    row = await cur.fetchone()
                    if row:
                        prior_discussion = {
                            "id": row[0],
                            "behavior_summary": _truncate(row[1], 320),
                            "created_at": row[2].isoformat() if hasattr(row[2], "isoformat") else row[2],
                        }
                except Exception as exc:
                    print(f"[psych_screen] bogdan_discussion_guides unavailable: {exc}")

    except Exception as exc:
        return {"error": f"load_context failed: {exc}"}

    if job_id:
        await _update_job_progress(job_id, 25)

    return {
        "_member": member,
        "_medications": medications,
        "_conditions": conditions,
        "_allergies": allergies,
        "_observations": observations,
        "_issues": issues,
        "_characteristics": characteristics,
        "_journals": journals,
        "_blood_markers": blood_markers,
        "_research": research,
        "_prior_screens": prior_screens,
        "_prior_calming_plan": prior_calming,
        "_prior_discussion": prior_discussion,
    }


# ── Node: assess_window (washout phase classifier) ───────────────────────

def _classify_washout(days_since_stop: Optional[int]) -> str:
    if days_since_stop is None:
        return "n/a"
    if days_since_stop < 0:
        return "n/a"
    if days_since_stop <= 7:
        return "acute"
    if days_since_stop <= 14:
        return "subacute"
    if days_since_stop <= 28:
        return "resolution"
    return "persistent"


async def assess_window(state: PsychScreenState) -> dict:
    if state.get("error"):
        return {}
    medications = state.get("_medications") or []

    singulair_rx = None
    for m in medications:
        nm = (m.get("name") or "").lower()
        if "singulair" in nm or "montelukast" in nm:
            singulair_rx = m
            break

    if not singulair_rx:
        return {"_washout": {"singulair_history": False, "phase": "n/a", "days_since_stop": None, "reassess_in_days": None}}

    is_active = bool(singulair_rx.get("is_active"))
    end_date = singulair_rx.get("end_date")
    days_since_stop: Optional[int] = None
    if not is_active and end_date:
        try:
            end_dt = datetime.fromisoformat(str(end_date)[:10])
            days_since_stop = (datetime.utcnow() - end_dt).days
        except Exception:
            pass

    phase = _classify_washout(days_since_stop)
    reassess_in_days: Optional[int] = None
    if days_since_stop is not None and 0 <= days_since_stop <= 28:
        reassess_in_days = max(28 - days_since_stop, 7)

    return {
        "_washout": {
            "singulair_history": True,
            "singulair_active": is_active,
            "stop_date": end_date,
            "start_date": singulair_rx.get("start_date"),
            "days_since_stop": days_since_stop,
            "phase": phase,
            "reassess_in_days": reassess_in_days,
            "in_washout_window": days_since_stop is not None and 0 <= days_since_stop <= 28,
        }
    }


# ── Node: screen_red_flags (rule-based) ──────────────────────────────────

def _scan_for_red_flags(text: str) -> list[str]:
    if not text:
        return []
    lower = text.lower()
    found: list[str] = []
    for category, patterns in _HARD_RED_FLAG_PATTERNS.items():
        for pat in patterns:
            if pat in lower:
                found.append(category)
                break
    return found


async def screen_red_flags(state: PsychScreenState) -> dict:
    if state.get("error"):
        return {}
    flags: list[dict] = []
    seen: set[str] = set()

    for obs in state.get("_observations") or []:
        haystack = " ".join(str(obs.get(k, "")) for k in ("type", "context", "notes"))
        for cat in _scan_for_red_flags(haystack):
            key = f"observation:{obs.get('id')}:{cat}"
            if key not in seen:
                seen.add(key)
                flags.append({
                    "category": cat,
                    "evidence_ref": f"observation:{obs.get('id')}",
                    "snippet": _truncate(haystack, 180),
                })

    for j in state.get("_journals") or []:
        haystack = " ".join(str(j.get(k, "")) for k in ("title", "content"))
        for cat in _scan_for_red_flags(haystack):
            key = f"journal:{j.get('id')}:{cat}"
            if key not in seen:
                seen.add(key)
                flags.append({
                    "category": cat,
                    "evidence_ref": f"journal:{j.get('id')}",
                    "snippet": _truncate(haystack, 180),
                })

    # High-intensity recurrent characteristics
    for ch in state.get("_characteristics") or []:
        if (ch.get("risk_tier") or "").upper() == "HIGH":
            flags.append({
                "category": "high_risk_trait",
                "evidence_ref": f"characteristic:{ch.get('title')}",
                "snippet": _truncate(ch.get("description"), 180),
            })

    return {"_red_flags": flags}


# ── Node: generate ───────────────────────────────────────────────────────

def _format_section(title: str, lines: list[str]) -> str:
    if not lines:
        return ""
    return f"### {title}\n" + "\n".join(lines)


def _compose_prompt(state: PsychScreenState) -> str:
    member = state.get("_member") or {}
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    age_band = "child" if (age and age < 12) else ("adolescent" if (age and age < 18) else "person")

    sections: list[str] = []

    profile = (
        f"### Profile\n- Name: {member.get('first_name')} ({age} ani)"
        + (f"\n- DOB: {member.get('date_of_birth')}" if member.get("date_of_birth") else "")
        + (f"\n- Bio: {_truncate(member.get('bio'), 300)}" if member.get("bio") else "")
    )
    sections.append(profile)

    washout = state.get("_washout") or {}
    if washout.get("singulair_history"):
        sections.append(
            "### Singulair / Montelukast History\n"
            f"- start_date: {washout.get('start_date')}\n"
            f"- stop_date: {washout.get('stop_date')}\n"
            f"- currently_active: {washout.get('singulair_active')}\n"
            f"- days_since_stop: {washout.get('days_since_stop')}\n"
            f"- phase: {washout.get('phase')}\n"
            f"- in_washout_window: {washout.get('in_washout_window')}"
        )

    meds = state.get("_medications") or []
    if meds:
        lines = [
            f"- {m.get('name')} {m.get('dosage') or ''} ({'active' if m.get('is_active') else 'stopped'}; "
            f"{m.get('start_date')} → {m.get('end_date') or 'present'}) {('— ' + _truncate(m.get('notes'), 120)) if m.get('notes') else ''}"
            for m in meds
        ]
        sections.append(_format_section(f"Medications ({len(meds)})", lines))

    conditions = state.get("_conditions") or []
    if conditions:
        sections.append(_format_section(
            f"Conditions ({len(conditions)})",
            [f"- {c.get('name')}{(' — ' + _truncate(c.get('notes'), 160)) if c.get('notes') else ''}" for c in conditions],
        ))

    allergies = state.get("_allergies") or []
    if allergies:
        sections.append(_format_section(
            f"Allergies ({len(allergies)})",
            [f"- {a.get('name')} ({a.get('kind') or ''}, {a.get('severity') or ''})" for a in allergies],
        ))

    chars = state.get("_characteristics") or []
    if chars:
        lines = [
            f"- [{c.get('risk_tier')}] {c.get('title')} ({c.get('category')}, sev={c.get('severity')}, "
            f"freq/wk={c.get('frequency_per_week')}, duration_wk={c.get('duration_weeks')}, "
            f"onset_age={c.get('age_of_onset')})"
            + (f"\n  {_truncate(c.get('description'), 220)}" if c.get('description') else "")
            for c in chars
        ]
        sections.append(_format_section(f"Characteristics & Risk Tiers ({len(chars)})", lines))

    issues = state.get("_issues") or []
    if issues:
        lines = [
            f"- [IssueID:{i.get('id')}] [{(i.get('severity') or '').upper()}] {i.get('title')} ({i.get('category')})"
            + (f"\n  {_truncate(i.get('description'), 200)}" if i.get('description') else "")
            for i in issues
        ]
        sections.append(_format_section(f"Issues ({len(issues)})", lines))

    obs = state.get("_observations") or []
    if obs:
        lines = [
            f"- [Observation:{o.get('id')}] {o.get('observed_at')} type={o.get('type')} "
            f"freq={o.get('frequency')} intensity={o.get('intensity')}"
            + (f"\n  context: {o.get('context')}" if o.get('context') else "")
            + (f"\n  notes: {o.get('notes')}" if o.get('notes') else "")
            for o in obs[:25]
        ]
        sections.append(_format_section(f"Behavior Observations (last 90d, {len(obs)})", lines))

    journals = state.get("_journals") or []
    if journals:
        lines = [
            f"- [JournalEntry:{j.get('id')}] {j.get('entry_date')} mood={j.get('mood')} score={j.get('mood_score')} "
            f"\"{j.get('title')}\"\n  {j.get('content')}"
            for j in journals[:20]
        ]
        sections.append(_format_section(f"Journal Entries (last 60d, {len(journals)})", lines))

    blood = state.get("_blood_markers") or []
    if blood:
        lines = [f"- {b.get('name')}: {b.get('value')} {b.get('unit') or ''} [{b.get('flag')}]" for b in blood]
        sections.append(_format_section(f"Abnormal Blood Markers ({len(blood)})", lines))

    research = state.get("_research") or []
    if research:
        lines = [
            f"- [ResearchID:{r.get('id')}] {r.get('title')} ({r.get('year')}) — {r.get('authors')}"
            + (f" — DOI: {r.get('doi')}" if r.get('doi') else "")
            + (f"\n  {r.get('abstract')}" if r.get('abstract') else "")
            for r in research
        ]
        sections.append(_format_section(f"Available Research Evidence ({len(research)})", lines))

    red_flags = state.get("_red_flags") or []
    if red_flags:
        lines = [
            f"- {f.get('category')} ({f.get('evidence_ref')}): \"{f.get('snippet')}\""
            for f in red_flags
        ]
        sections.append(_format_section(f"⚠️ RULE-BASED RED FLAGS ({len(red_flags)})", lines))
    else:
        sections.append("### ⚠️ RULE-BASED RED FLAGS\n- (none detected by keyword screen — confirm by reading observations + journals carefully)")

    prior_screens = state.get("_prior_screens") or []
    if prior_screens:
        lines = [
            f"- [{p.get('created_at')}] {p.get('recommendation')} (conf={p.get('confidence')}) — {_truncate(p.get('rationale'), 220)}"
            for p in prior_screens
        ]
        sections.append(_format_section(f"Prior Screens ({len(prior_screens)})", lines))

    if state.get("_prior_calming_plan"):
        pcp = state["_prior_calming_plan"]
        sections.append(
            f"### Latest Calming Plan ({pcp.get('generated_at')})\n"
            f"- headline: {pcp.get('headline')}\n"
            f"- summary: {pcp.get('executive_summary')}"
        )

    if state.get("_prior_discussion"):
        pd = state["_prior_discussion"]
        sections.append(
            f"### Latest Bogdan Discussion Guide ({pd.get('created_at')})\n"
            f"- behavior_summary: {pd.get('behavior_summary')}"
        )

    full_context = "\n\n".join(s for s in sections if s)

    is_ro = bool(state.get("is_ro")) or (state.get("language") == "ro")

    decision_policy = (
        "## Decision Policy (IATROGENIC-FIRST — apply in this order)\n"
        "\n"
        "1. **Hard red flags override everything.** If the rule-based red-flag section above lists ANY of "
        "`suicidal_ideation`, `psychotic_features`, `severe_regression`, or `severe_aggression` (with credible "
        "evidence_ref), recommendation MUST be `URGENT_CONSULT` regardless of washout phase. Set "
        "iatrogenic_likelihood low (≤ 0.3) — these symptoms warrant clinician evaluation independent of cause.\n"
        "\n"
        "2. **Otherwise, during 2–4wk Singulair washout** (phase = acute|subacute|resolution AND in_washout_window=true):\n"
        "   - default to `WAIT_AND_OBSERVE`.\n"
        "   - set `iatrogenic_likelihood ≥ 0.4` whenever observed symptoms (irritability, sleep disruption, "
        "anxiety, agitation, mood changes, attention disturbance, REM/nightmare changes) cluster temporally with "
        "the Singulair-active period or onset within ~14 days post-stop.\n"
        "   - reassess_in_days = max(28 - days_since_stop, 7).\n"
        "\n"
        "3. **Persistent past day-28** (phase = `persistent`) with non-resolving moderate+ symptoms → "
        "escalate to `CONSULT_RECOMMENDED`. Iatrogenic_likelihood typically drops below 0.3 here.\n"
        "\n"
        "4. **Baseline traits only, no acute change** → `NO_CONSULT_NEEDED` with reassess_in_days=30.\n"
        "\n"
        "Bias: when in doubt during the washout window, prefer WAIT_AND_OBSERVE — over-pathologizing transient "
        "montelukast neuropsychiatric AEs is a known harm. NEVER bypass red flags via this bias.\n"
    )

    output_schema = (
        "## Output schema (single JSON object — exact keys, no extras)\n"
        "{\n"
        '  "recommendation": "URGENT_CONSULT" | "CONSULT_RECOMMENDED" | "WAIT_AND_OBSERVE" | "NO_CONSULT_NEEDED",\n'
        '  "confidence": 0.0..1.0,\n'
        '  "rationale_ro": "string — 3-6 fluent Romanian sentences, advisory tone, mention washout phase + iatrogenic reasoning + key evidence refs",\n'
        '  "iatrogenic_likelihood": 0.0..1.0,\n'
        '  "observation_window": { "phase": "acute"|"subacute"|"resolution"|"persistent"|"n/a", "days_since_stop": int|null, "reassess_in_days": int|null },\n'
        '  "red_flags": [ { "category": "string", "label_ro": "string (Romanian short label)", "evidence_ref": "observation:N | journal:N | characteristic:title" } ],\n'
        '  "supporting_observations": [ { "summary_ro": "string", "evidence_ref": "string" } ],\n'
        '  "differential": [ { "condition": "string (English)", "likelihood": 0.0..1.0, "rationale_ro": "string" } ],\n'
        '  "recommended_next_steps_ro": [ "string", ... ],   // 3–6 concrete steps in Romanian\n'
        '  "citations": [ { "researchId": int, "title": "string", "doi": "string|null", "year": int|null, "authors": "string|null" } ]\n'
        "}\n"
        "\n"
        "Constraints:\n"
        "- citations MUST only reference ResearchID:N values that appear in the 'Available Research Evidence' section above. NEVER invent IDs.\n"
        "- supporting_observations.evidence_ref MUST point to real Observation:N / JournalEntry:N / IssueID:N from above.\n"
        "- This is ADVISORY only — do NOT label the child with a DSM diagnosis. Differential lists hypotheses, not diagnoses.\n"
        "- Always include the iatrogenic montelukast neuropsychiatric ADR hypothesis in differential when Singulair history is present.\n"
    )

    parts = [
        f"You are an evidence-based child & adolescent mental health triage assistant. Your job is to ADVISE a parent on whether their {age_band} ({age} ani) needs a psychologist consult, and how urgently. You are not a clinician and your output is advisory only — every recommendation includes 'consult a clinician for definitive evaluation' framing.",
        "",
        "## Full clinical context",
        "",
        full_context,
        "",
        decision_policy,
        "",
        output_schema,
    ]
    prompt = "\n".join(parts)
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"
    return prompt


async def generate(state: PsychScreenState) -> dict:
    if state.get("error"):
        return {}
    prompt = _compose_prompt(state)

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 45)

    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    try:
        config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=180.0, default_model=model)
    except Exception as exc:
        return {"error": f"generate config failed: {exc}"}

    parsed: Optional[dict] = None
    last_exc: Optional[Exception] = None
    try:
        async with DeepSeekClient(config) as client:
            for _ in range(2):
                try:
                    resp = await client.chat(
                        [ChatMessage(role="user", content=prompt)],
                        model=model,
                        temperature=0.2,
                        max_tokens=4096,
                        response_format={"type": "json_object"},
                    )
                    candidate = json.loads(resp.choices[0].message.content)
                    if not isinstance(candidate, dict):
                        last_exc = ValueError("expected JSON object at top level")
                        continue
                    parsed = candidate
                    break
                except json.JSONDecodeError as exc:
                    last_exc = exc
                    continue
    except Exception as exc:
        return {"error": f"generate failed: {exc}"}

    if parsed is None:
        return {"error": f"generate failed: {last_exc}"}

    missing = [k for k in _REQUIRED_KEYS if k not in parsed]
    if missing:
        return {"error": f"DeepSeek response missing required keys: {missing}"}

    rec = parsed.get("recommendation")
    if rec not in _VALID_RECOMMENDATIONS:
        return {"error": f"Invalid recommendation: {rec!r}"}

    if job_id:
        await _update_job_progress(job_id, 65)

    return {"_draft": parsed, "_prompt": prompt}


# ── Critique ─────────────────────────────────────────────────────────────

def _build_critique_prompt(draft: dict, washout: dict, red_flags: list[dict], is_ro: bool) -> str:
    rubric = (
        "You are reviewing a psychologist-screening assessment for a child. Score the draft on six axes 0–10 and "
        "list any sections needing rewrite.\n\n"
        "Axes:\n"
        "- romanianFluency: are rationale_ro / recommended_next_steps_ro / label_ro / summary_ro fluent Romanian?\n"
        "- iatrogenicAlignment: does the recommendation respect the iatrogenic-first policy given the washout state below? (Hard red flags should escalate; otherwise washout window should bias to WAIT_AND_OBSERVE.)\n"
        "- evidenceGrounding: does every supporting_observations.evidence_ref and citation actually appear in the input context (no inventions)?\n"
        "- redFlagFidelity: if rule-based red flags are present, are they reflected in red_flags[] AND in the recommendation tier?\n"
        "- advisoryTone: is the language advisory (mentioning 'consult a clinician'), not diagnostic? Does it avoid stamping DSM labels?\n"
        "- actionability: are recommended_next_steps_ro concrete and parent-executable, not generic?\n\n"
        "Return a SINGLE JSON object:\n"
        "{\n"
        '  "scores": { "romanianFluency": int, "iatrogenicAlignment": int, "evidenceGrounding": int, "redFlagFidelity": int, "advisoryTone": int, "actionability": int },\n'
        '  "weakSections": ["recommendation"|"rationale_ro"|"red_flags"|"supporting_observations"|"differential"|"recommended_next_steps_ro"|"citations"],\n'
        '  "sectionNotes": { "<section>": "<short critique note>" }\n'
        "}\n"
    )
    body = (
        "## Washout state\n```json\n"
        + json.dumps(washout, ensure_ascii=False)
        + "\n```\n\n## Rule-based red flags\n```json\n"
        + json.dumps(red_flags, ensure_ascii=False)
        + "\n```\n\n## Draft assessment\n```json\n"
        + json.dumps(draft, ensure_ascii=False, indent=2)
        + "\n```"
    )
    prompt = f"{rubric}\n{body}"
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"
    return prompt


async def critique(state: PsychScreenState) -> dict:
    if state.get("error") or not state.get("_draft"):
        return {}
    is_ro = bool(state.get("is_ro")) or (state.get("language") == "ro")
    prompt = _build_critique_prompt(
        state["_draft"], state.get("_washout") or {}, state.get("_red_flags") or [], is_ro
    )

    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    try:
        config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=120.0, default_model=model)
    except Exception as exc:
        print(f"[psych_screen.critique] config failed: {exc}")
        return {"_critique": {}}

    parsed: Optional[dict] = None
    try:
        async with DeepSeekClient(config) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model=model,
                temperature=0.0,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            parsed = json.loads(resp.choices[0].message.content)
    except Exception as exc:
        print(f"[psych_screen.critique] failed (skipping): {exc}")
        return {"_critique": {}}

    if not isinstance(parsed, dict) or "scores" not in parsed:
        return {"_critique": {}}

    scores = parsed.get("scores") or {}
    critique_obj = {
        "scores": {k: int(scores.get(k, 0) or 0) for k in (
            "romanianFluency", "iatrogenicAlignment", "evidenceGrounding",
            "redFlagFidelity", "advisoryTone", "actionability",
        )},
        "weakSections": [s for s in (parsed.get("weakSections") or []) if isinstance(s, str)],
        "sectionNotes": parsed.get("sectionNotes") or {},
        "refined": bool(state.get("_refined")),
    }

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 75)

    return {"_critique": critique_obj}


def should_refine(state: PsychScreenState) -> str:
    if state.get("_refined"):
        return "persist"
    critique_obj = state.get("_critique") or {}
    scores = (critique_obj.get("scores") or {}).values()
    if scores and any(s < _CRITIQUE_THRESHOLD for s in scores):
        return "refine"
    return "persist"


_REFINEABLE_KEYS = {
    "rationale_ro", "red_flags", "supporting_observations", "differential",
    "recommended_next_steps_ro", "recommendation", "citations",
}


def _build_refine_prompt(draft: dict, critique_obj: dict, washout: dict, red_flags: list[dict], is_ro: bool) -> str:
    weak = [s for s in critique_obj.get("weakSections", []) if s in _REFINEABLE_KEYS] or ["rationale_ro", "recommended_next_steps_ro"]
    notes = critique_obj.get("sectionNotes") or {}
    notes_text = "\n".join(f"- **{k}**: {notes.get(k, '(no specific note — strengthen iatrogenic reasoning + grounding)')}" for k in weak)

    parts = [
        "You are refining a psychologist-screening assessment. Rewrite ONLY the listed weak sections, preserving their exact JSON shape and keys.",
        "Iatrogenic-first policy still applies: hard red flags → URGENT_CONSULT; washout window → WAIT_AND_OBSERVE unless red flags.",
        "",
        "## Washout state",
        "```json",
        json.dumps(washout, ensure_ascii=False),
        "```",
        "",
        "## Rule-based red flags",
        "```json",
        json.dumps(red_flags, ensure_ascii=False),
        "```",
        "",
        "## Current draft",
        "```json",
        json.dumps(draft, ensure_ascii=False, indent=2),
        "```",
        "",
        "## Weak sections + notes",
        notes_text,
        "",
        "Return a SINGLE JSON object containing ONLY the rewritten weak section keys (subset of: " + ", ".join(sorted(_REFINEABLE_KEYS)) + ").",
    ]
    prompt = "\n".join(parts)
    if is_ro:
        prompt = f"{ROMANIAN_INSTRUCTION}\n\n{prompt}"
    return prompt


async def refine(state: PsychScreenState) -> dict:
    if state.get("error") or not state.get("_draft"):
        return {}
    is_ro = bool(state.get("is_ro")) or (state.get("language") == "ro")
    prompt = _build_refine_prompt(
        state["_draft"], state.get("_critique") or {}, state.get("_washout") or {},
        state.get("_red_flags") or [], is_ro,
    )

    base_url = os.environ.get("LLM_BASE_URL") or None
    api_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or ""
    model = os.environ.get("LLM_MODEL", "deepseek-chat")

    try:
        config = DeepSeekConfig(api_key=api_key, base_url=base_url, timeout=180.0, default_model=model)
    except Exception as exc:
        print(f"[psych_screen.refine] config failed: {exc}")
        return {"_refined": True}

    patch: Optional[dict] = None
    try:
        async with DeepSeekClient(config) as client:
            resp = await client.chat(
                [ChatMessage(role="user", content=prompt)],
                model=model,
                temperature=0.1,
                max_tokens=3072,
                response_format={"type": "json_object"},
            )
            patch = json.loads(resp.choices[0].message.content)
    except Exception as exc:
        print(f"[psych_screen.refine] generation failed: {exc}")
        return {"_refined": True}

    draft = dict(state["_draft"])
    if isinstance(patch, dict):
        for k, v in patch.items():
            if k in _REFINEABLE_KEYS:
                draft[k] = v

    # Guard: if the refined recommendation is invalid, revert
    if draft.get("recommendation") not in _VALID_RECOMMENDATIONS:
        draft["recommendation"] = state["_draft"].get("recommendation")

    job_id = state.get("job_id")
    if job_id:
        await _update_job_progress(job_id, 85)

    return {"_draft": draft, "_refined": True}


# ── Persist ──────────────────────────────────────────────────────────────

def _build_data_snapshot(state: PsychScreenState) -> dict:
    return {
        "member": state.get("_member"),
        "washout": state.get("_washout"),
        "medication_count": len(state.get("_medications") or []),
        "observation_count": len(state.get("_observations") or []),
        "issue_count": len(state.get("_issues") or []),
        "characteristic_count": len(state.get("_characteristics") or []),
        "journal_count": len(state.get("_journals") or []),
        "research_count": len(state.get("_research") or []),
        "rule_red_flag_count": len(state.get("_red_flags") or []),
        "prior_screen_count": len(state.get("_prior_screens") or []),
    }


async def persist(state: PsychScreenState) -> dict:
    job_id = state.get("job_id")

    if state.get("error"):
        if job_id:
            await _update_job_failed(job_id, {"message": state["error"]})
        return {"success": False, "message": state["error"]}

    draft = state.get("_draft") or {}
    if not draft:
        msg = "no draft assessment produced"
        if job_id:
            await _update_job_failed(job_id, {"message": msg})
        return {"success": False, "message": msg}

    user_email = state.get("user_email")
    family_member_id = state.get("family_member_id")
    language = state.get("language") or "ro"
    snapshot = _build_data_snapshot(state)
    critique_obj = state.get("_critique") or None
    if critique_obj is not None:
        critique_obj = {
            "scores": critique_obj.get("scores") or {},
            "weakSections": critique_obj.get("weakSections") or [],
            "refined": bool(state.get("_refined")),
        }

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO psych_screening_assessments ("
                    "user_id, family_member_id, recommendation, confidence, iatrogenic_likelihood, "
                    "rationale, red_flags, supporting_observations, differential, recommended_next_steps, "
                    "observation_window, citations, data_snapshot, critique, language, model, job_id) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (
                        user_email,
                        family_member_id,
                        draft.get("recommendation"),
                        float(draft.get("confidence") or 0.0),
                        float(draft.get("iatrogenic_likelihood") or 0.0) if draft.get("iatrogenic_likelihood") is not None else None,
                        draft.get("rationale_ro") or "",
                        json.dumps(draft.get("red_flags") or []),
                        json.dumps(draft.get("supporting_observations") or []),
                        json.dumps(draft.get("differential") or []),
                        json.dumps(draft.get("recommended_next_steps_ro") or []),
                        json.dumps(draft.get("observation_window") or {}),
                        json.dumps(draft.get("citations") or []),
                        json.dumps(snapshot),
                        json.dumps(critique_obj) if critique_obj is not None else None,
                        language,
                        os.environ.get("LLM_MODEL", "deepseek-chat"),
                        job_id,
                    ),
                )
                row = await cur.fetchone()
                screen_id = row[0] if row else None
    except Exception as exc:
        msg = f"persist failed: {exc}"
        if job_id:
            await _update_job_failed(job_id, {"message": msg})
        return {"success": False, "message": msg}

    if job_id:
        await _update_job_succeeded(job_id, {
            "screenId": screen_id,
            "familyMemberId": family_member_id,
            "recommendation": draft.get("recommendation"),
        })

    return {
        "success": True,
        "message": "Psych screening assessment generated.",
        "screen_id": screen_id,
    }


# ── Build graph ──────────────────────────────────────────────────────────

def create_psych_screen_graph(checkpointer=None):
    builder = StateGraph(PsychScreenState)
    builder.add_node("load_context", load_context)
    builder.add_node("assess_window", assess_window)
    builder.add_node("screen_red_flags", screen_red_flags)
    builder.add_node("generate", generate, retry=_LLM_RETRY)
    builder.add_node("critique", critique, retry=_LLM_RETRY)
    builder.add_node("refine", refine, retry=_LLM_RETRY)
    builder.add_node("persist", persist)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "assess_window")
    builder.add_edge("assess_window", "screen_red_flags")
    builder.add_edge("screen_red_flags", "generate")
    builder.add_edge("generate", "critique")
    builder.add_conditional_edges(
        "critique",
        should_refine,
        {"refine": "refine", "persist": "persist"},
    )
    builder.add_edge("refine", "critique")
    builder.add_edge("persist", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


graph = create_psych_screen_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_psych_screen_graph, graph)
