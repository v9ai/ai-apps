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

import asyncio
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
        "  ]  // 3-6 red flags\n"
        "}"
    )

    user_prompt = (
        f"Condition: {cond_name}\n"
        f"Subject: {person_label}, {age_label} (developmental tier: {tier})\n"
        + (f"Existing notes on this condition: {cond.get('notes')}\n" if cond.get("notes") else "")
        + "\n"
        f"Tailor the age_manifestations and evidence_based_treatments to be MOST relevant to "
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

    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO condition_deep_research (
                    user_id, family_member_id, condition_slug, condition_name, language,
                    pathophysiology, age_manifestations, evidence_based_treatments,
                    comorbidities, red_flags, source_urls, fresh_until,
                    generated_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s::jsonb, %s::jsonb, %s::jsonb,
                    %s::jsonb, %s::jsonb, %s::jsonb, %s,
                    NOW(), NOW()
                )
                ON CONFLICT (user_id, family_member_id, condition_slug, language)
                DO UPDATE SET
                    condition_name = EXCLUDED.condition_name,
                    pathophysiology = EXCLUDED.pathophysiology,
                    age_manifestations = EXCLUDED.age_manifestations,
                    evidence_based_treatments = EXCLUDED.evidence_based_treatments,
                    comorbidities = EXCLUDED.comorbidities,
                    red_flags = EXCLUDED.red_flags,
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
                ) if v
            ),
            "treatments": len(evidence_based_treatments),
            "comorbidities": len(comorbidities),
            "red_flags": len(red_flags),
        },
    }


# ---------------------------------------------------------------------------
# Node: fan_out_papers (fire-and-forget)
# ---------------------------------------------------------------------------
async def fan_out_papers(state: ConditionDeepResearchState) -> dict:
    """Schedule a therapy_research run scoped to this condition + family member.

    Best-effort: failures here do not fail the parent run. The papers will
    flow into the existing therapy_research table and be visible alongside
    the structured deep-research card on the page.
    """
    job_id = state.get("job_id")
    await _update_job_progress(job_id, 90)

    fm = state.get("_family_member") or {}
    cond = state.get("_condition_row") or {}
    counts = dict(state.get("counts") or {})

    # No family member = nothing to fan out to (paper search is family-scoped).
    if not fm.get("id"):
        counts.setdefault("papers", 0)
        return {"counts": counts}

    try:
        # Lazy import to avoid pulling the heavy paper graph into module init.
        from .generate_therapy_research_graph import graph as paper_graph  # noqa: WPS433

        cond_name = cond.get("name") or state["condition_slug"]
        await asyncio.wait_for(
            paper_graph.ainvoke(
                {
                    "user_email": state["user_email"],
                    "family_member_id": fm["id"],
                    "subject": cond_name,
                    "language": (state.get("language") or "ro").strip().lower(),
                    "source_kind": "condition",
                    "source_slug": state["condition_slug"].strip().lower(),
                }
            ),
            timeout=600,
        )
        counts["papers"] = counts.get("papers", 0) + 1
    except asyncio.TimeoutError:
        print("[condition_deep_research] paper fan-out timed out")
    except Exception as exc:
        print(f"[condition_deep_research] paper fan-out failed: {exc}")

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
    return "extract_facts"


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
    {"extract_facts": "extract_facts", "persist": "persist"},
)
builder.add_edge("extract_facts", "persist")
builder.add_edge("persist", "fan_out_papers")
builder.add_edge("fan_out_papers", "finalize")
builder.add_edge("finalize", END)

graph = builder.compile()
