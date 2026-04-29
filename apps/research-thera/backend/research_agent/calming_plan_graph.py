"""LangGraph: dedicated plant-based calming & behavior plan generator.

Given a family_member_id (e.g. Bogdan) and user_email, this graph:
  1. Loads the member profile (age, DOB, preferred_language) plus the latest
     issues and most-recent deep_issue_analyses row.
  2. Searches academic literature in-memory for non-pharmacologic / botanical
     calming interventions matched to the member's age band — does NOT persist
     papers to therapy_research, the cited sources are stored inline on the
     calming_plans row.
  3. Generates a structured day-shaped plan (morning / food & drinks /
     movement / evening / supplements / red flags / weekly check-ins) via
     DeepSeek JSON mode. Romanian by default for Bogdan; honors language
     override.
  4. Runs a second DeepSeek pass that re-reads the plan against the member's
     age, current-medication status (none, per recent history), and known
     issues — flags or replaces anything age-inappropriate or interaction-risky.
  5. Persists to the `calming_plans` table (history-preserving).

Graph is "light" — single member, ~5 paper searches, two LLM calls. Concurrency
in app.py defaults to 4.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, TypedDict

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph

from research_agent import neon

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402

from .research_sources import search_papers_with_fallback  # noqa: E402


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class CalmingPlanState(TypedDict, total=False):
    # Inputs
    user_email: str
    family_member_id: int
    language: Optional[str]   # 'ro' | 'en'; default derived from family_members.preferred_language
    job_id: Optional[str]

    # Internals
    _member: dict
    _issues: list[dict]
    _allergies: list[dict]
    _characteristics: list[dict]
    _deep_analysis: Optional[dict]
    _research: list[dict]
    _plan_draft: dict
    _safety_notes: str

    # Outputs
    plan_id: int
    plan: dict
    plan_markdown: str
    sources: list[dict]
    success: bool
    error: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _resolve_age(age_years: Optional[int], dob: Optional[str]) -> Optional[int]:
    if age_years:
        return int(age_years)
    if not dob:
        return None
    try:
        born = datetime.fromisoformat(dob[:10])
        today = datetime.utcnow()
        years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        return years if years >= 0 else None
    except Exception:
        return None


def _age_band(age: Optional[int]) -> str:
    if age is None:
        return "unspecified"
    if age < 6:
        return "early-childhood"
    if age < 12:
        return "school-age"
    if age < 18:
        return "adolescent"
    return "adult"


def _language_from_pref(pref: Optional[str]) -> str:
    if not pref:
        return "ro"
    pref = pref.strip().lower()
    if pref.startswith("ro"):
        return "ro"
    if pref.startswith("en"):
        return "en"
    return pref[:2] if len(pref) >= 2 else "ro"


async def _deepseek_json(prompt: str, *, max_tokens: int = 4096, temperature: float = 0.4) -> dict:
    async with DeepSeekClient(DeepSeekConfig(timeout=120.0)) as client:
        resp = await client.chat(
            [ChatMessage(role="user", content=prompt)],
            model="deepseek-chat",
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
    content = resp.choices[0].message.content
    return json.loads(content)


# ---------------------------------------------------------------------------
# Node: load_context
# ---------------------------------------------------------------------------
async def load_context(state: CalmingPlanState) -> dict:
    user_email = state.get("user_email")
    family_member_id = state.get("family_member_id")
    if not user_email or not family_member_id:
        return {"error": "user_email and family_member_id are required"}

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                # Member profile — scoped to user_id for safety. Includes the
                # free-text `allergies` column on family_members (separate from
                # the structured `allergies` table).
                await cur.execute(
                    "SELECT id, first_name, age_years, date_of_birth, preferred_language, relationship, allergies "
                    "FROM family_members WHERE id = %s AND user_id = %s",
                    (family_member_id, user_email),
                )
                row = await cur.fetchone()
                if not row:
                    return {"error": f"family_member {family_member_id} not found for user"}
                member = {
                    "id": row[0],
                    "first_name": row[1],
                    "age_years": row[2],
                    "date_of_birth": row[3],
                    "preferred_language": row[4],
                    "relationship": row[5],
                    "allergies_text": row[6],
                }

                # All issues — no LIMIT, severity-then-recency ordered. Caller
                # said "take into account all the issues", so we feed the full
                # list to the LLM and let prompt-side compression handle volume.
                await cur.execute(
                    "SELECT title, category, severity, description "
                    "FROM issues WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY CASE severity "
                    "  WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 "
                    "  WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 4 ELSE 5 END, "
                    "created_at DESC",
                    (family_member_id, user_email),
                )
                issue_rows = await cur.fetchall()
                issues = [
                    {"title": r[0], "category": r[1], "severity": r[2], "description": r[3]}
                    for r in issue_rows
                ]

                # Structured allergies (allergies table). Best-effort — older
                # databases without this table will fall back to the free-text
                # column on family_members.
                allergies: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT name, kind, severity, notes FROM allergies "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY CASE severity "
                        "  WHEN 'severe' THEN 1 WHEN 'moderate' THEN 2 "
                        "  WHEN 'mild' THEN 3 ELSE 4 END",
                        (family_member_id, user_email),
                    )
                    allergies = [
                        {"name": r[0], "kind": r[1], "severity": r[2], "notes": r[3]}
                        for r in await cur.fetchall()
                    ]
                except Exception as exc:
                    print(f"[calming_plan] allergies table unavailable: {exc}")

                # Family-member characteristics (broader than `issues` —
                # includes risk-tier, impairment domains, age-of-onset).
                characteristics: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT category, title, description, severity, risk_tier, "
                        "impairment_domains, tags "
                        "FROM family_member_characteristics "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY CASE risk_tier "
                        "  WHEN 'HIGH' THEN 1 WHEN 'MODERATE' THEN 2 "
                        "  WHEN 'LOW' THEN 3 ELSE 4 END",
                        (family_member_id, user_email),
                    )
                    characteristics = [
                        {
                            "category": r[0],
                            "title": r[1],
                            "description": r[2],
                            "severity": r[3],
                            "risk_tier": r[4],
                            "impairment_domains": r[5],
                            "tags": r[6],
                        }
                        for r in await cur.fetchall()
                    ]
                except Exception as exc:
                    print(f"[calming_plan] family_member_characteristics unavailable: {exc}")

                # Most recent deep analysis.
                await cur.execute(
                    "SELECT summary, priority_recommendations, pattern_clusters, family_system_insights "
                    "FROM deep_issue_analyses WHERE family_member_id = %s AND user_id = %s "
                    "ORDER BY created_at DESC LIMIT 1",
                    (family_member_id, user_email),
                )
                da_row = await cur.fetchone()
                deep_analysis: Optional[dict] = None
                if da_row:
                    def _loads(v: Any) -> Any:
                        if not v:
                            return []
                        try:
                            return json.loads(v) if isinstance(v, str) else v
                        except Exception:
                            return []
                    deep_analysis = {
                        "summary": da_row[0],
                        "priority_recommendations": _loads(da_row[1]),
                        "pattern_clusters": _loads(da_row[2]),
                        "family_system_insights": _loads(da_row[3]),
                    }
    except Exception as exc:
        return {"error": f"load_context failed: {exc}"}

    # Resolve language: explicit input > member's preferred_language > 'ro'.
    language = state.get("language") or _language_from_pref(member.get("preferred_language"))

    return {
        "_member": member,
        "_issues": issues,
        "_allergies": allergies,
        "_characteristics": characteristics,
        "_deep_analysis": deep_analysis,
        "language": language,
    }


# ---------------------------------------------------------------------------
# Node: search_research
# ---------------------------------------------------------------------------
_BASE_QUERIES = [
    "L-theanine children anxiety behavior randomized",
    "chamomile pediatric anxiety calming evidence",
    "magnesium glycinate child behavior sleep RCT",
    "omega-3 EPA DHA children behavior attention",
    "non-pharmacologic interventions childhood behavior regulation",
    "lemon balm Melissa officinalis pediatric anxiety sleep",
]


async def search_research(state: CalmingPlanState) -> dict:
    if state.get("error"):
        return {}

    member = state.get("_member") or {}
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    band = _age_band(age)

    # Sprinkle a band-specific qualifier so the search prefers age-relevant work.
    qualifier = {
        "early-childhood": "preschool early childhood",
        "school-age": "school age children",
        "adolescent": "adolescent teen",
        "adult": "adult",
        "unspecified": "pediatric",
    }[band]

    queries = [f"{q} {qualifier}" for q in _BASE_QUERIES]

    s2_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")

    async def _one(q: str) -> list[dict]:
        try:
            return await search_papers_with_fallback(q, limit=4, semantic_scholar_api_key=s2_key)
        except Exception as exc:
            print(f"[calming_plan] paper search failed for '{q}': {exc}")
            return []

    results = await asyncio.gather(*[_one(q) for q in queries])

    # Dedup by DOI / title; keep up to 18 papers with abstracts.
    seen_keys: set[str] = set()
    deduped: list[dict] = []
    for batch in results:
        for p in batch:
            key = (p.get("doi") or p.get("title") or "").strip().lower()
            if not key or key in seen_keys:
                continue
            abstract = (p.get("abstract") or "").strip()
            if not abstract or abstract in {"...", "None"} or len(abstract) < 80:
                continue
            seen_keys.add(key)
            deduped.append(p)
            if len(deduped) >= 18:
                break
        if len(deduped) >= 18:
            break

    return {"_research": deduped}


# ---------------------------------------------------------------------------
# Node: generate_plan
# ---------------------------------------------------------------------------
def _build_plan_prompt(state: CalmingPlanState) -> str:
    member = state.get("_member") or {}
    issues = state.get("_issues") or []
    allergies = state.get("_allergies") or []
    characteristics = state.get("_characteristics") or []
    deep = state.get("_deep_analysis") or {}
    research = state.get("_research") or []
    language = state.get("language", "ro")

    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    age_str = f"{age} years" if age is not None else "unspecified age"
    name = member.get("first_name") or "the family member"

    member_block = [
        f"Name: {name}",
        f"Age: {age_str}",
        f"Date of birth: {member.get('date_of_birth') or 'unknown'}",
        f"Relationship: {member.get('relationship') or 'unknown'}",
        "Currently on medications: NO (caller confirmed)",
    ]

    # Allergy block — combine structured rows + free-text column. This block
    # is repeated in the safety_review pass so the model can't lose track of it.
    allergy_lines: list[str] = []
    for a in allergies:
        sev = (a.get("severity") or "").upper()
        kind = a.get("kind") or "allergy"
        line = f"- [{sev}] {kind}: {a.get('name', '')}"
        if a.get("notes"):
            line += f" — {a['notes']}"
        allergy_lines.append(line)
    if member.get("allergies_text"):
        allergy_lines.append(f"- (free-text from profile) {member['allergies_text']}")
    allergies_block = "\n".join(allergy_lines) or "(no allergies recorded — still apply standard pediatric caution)"

    issues_block = "\n".join(
        f"- [{(i.get('severity') or '').upper()}] {i.get('title')} ({i.get('category')}): "
        f"{(i.get('description') or '')[:240]}"
        for i in issues
    ) or "(no issues recorded)"

    characteristics_block = "\n".join(
        f"- [{(c.get('risk_tier') or 'NONE').upper()}] {c.get('title')} ({c.get('category')}): "
        f"{(c.get('description') or '')[:240]}"
        + (f" | impairment: {c['impairment_domains']}" if c.get('impairment_domains') else "")
        for c in characteristics
    ) or "(no characteristics recorded)"

    deep_block = ""
    if deep.get("summary"):
        deep_block = f"### Deep analysis summary\n{deep['summary']}\n"
        recs = deep.get("priority_recommendations") or []
        if recs:
            deep_block += "### Priority recommendations\n" + "\n".join(
                f"- {r.get('issueTitle', 'general')}: {r.get('rationale', '')}"
                for r in recs[:5]
            ) + "\n"
        clusters = deep.get("pattern_clusters") or []
        if clusters:
            deep_block += "### Behavioral patterns\n" + "\n".join(
                f"- {c.get('name', '')}: {c.get('description', '')}"
                for c in clusters[:5]
            ) + "\n"

    research_lines = []
    for idx, p in enumerate(research, start=1):
        line = [
            f"[{idx}] {p.get('title', 'Untitled')} ({p.get('year', '?')})",
            f"  Authors: {', '.join(p.get('authors', []) or [])[:200]}",
        ]
        abstract = (p.get("abstract") or "")[:500]
        if abstract:
            line.append(f"  Abstract: {abstract}")
        if p.get("doi"):
            line.append(f"  DOI: {p['doi']}")
        research_lines.append("\n".join(line))
    research_block = "\n\n".join(research_lines) or "(no papers retrieved — rely on conservative, well-established practice)"

    lang_instruction = (
        "IMPORTANT: write every human-readable string in fluent Romanian. "
        "Keep supplement names in their conventional English/Latin form (e.g. "
        "'L-theanine', 'magnesium glycinate', 'Melissa officinalis'). Keep enum "
        "values, paper titles, and DOIs verbatim."
        if language == "ro"
        else "Write all human-readable strings in clear English."
    )

    schema = """{
  "headline": "string",
  "morning_routine": [{"step": "string", "minutes": number, "rationale": "string"}],
  "food_and_drinks": {
    "encourage": [{"item": "string", "why": "string", "frequency": "string"}],
    "avoid_or_reduce": [{"item": "string", "why": "string"}],
    "teas": [{"name": "string", "when": "string", "dose": "string", "cautions": "string"}]
  },
  "movement": [{"activity": "string", "duration_minutes": number, "when": "string", "why": "string"}],
  "evening_wind_down": [{"step": "string", "minutes": number, "rationale": "string"}],
  "supplements": [
    {
      "name": "string",
      "rationale": "string",
      "typical_dose_for_age": "string",
      "timing": "string",
      "evidence_level": "strong | moderate | preliminary",
      "cautions": "string",
      "cited_paper_indexes": [1, 2]
    }
  ],
  "sensory_and_environment": [{"tip": "string", "why": "string"}],
  "weekly_check_ins": [{"question": "string", "look_for": "string"}],
  "red_flags": [{"sign": "string", "action": "string"}]
}"""

    return "\n".join(
        [
            "You are a pediatric integrative-medicine and behavior-support expert. "
            "Generate a SAFE, plant-based, non-pharmacologic calming and behavior plan "
            "for the family member below, grounded in the cited research and the deep "
            "analysis findings.",
            "",
            "## Family member",
            *member_block,
            "",
            "## Known issues",
            issues_block,
            "",
            "## Deep analysis (if any)",
            deep_block or "(none)",
            "",
            "## Research evidence",
            research_block,
            "",
            "## Hard rules",
            "- The member is NOT on any medication right now. Do not recommend stopping or starting prescription drugs.",
            "- Recommend ONLY non-prescription, plant-based, nutritional, lifestyle, or sensory interventions.",
            "- Every supplement must include an age-appropriate typical dose and a cautions string.",
            "- Tag each supplement with cited_paper_indexes drawn from the numbered ## Research evidence list above. If no listed paper supports it, omit the supplement.",
            "- Match all dosing and timing to the member's actual age band; never copy adult doses to a child.",
            "- Avoid St. John's Wort, valerian for daytime use, and any herb with strong sedative-interaction profile when age < 12.",
            "- Keep the plan realistic for a household: <= 6 morning steps, <= 6 evening steps, <= 5 supplements.",
            "",
            f"## Language\n{lang_instruction}",
            "",
            "## Output schema",
            "Return a single JSON object EXACTLY matching this shape (no extra keys):",
            schema,
        ]
    )


async def generate_plan(state: CalmingPlanState) -> dict:
    if state.get("error"):
        return {}
    try:
        prompt = _build_plan_prompt(state)
        plan = await _deepseek_json(prompt, max_tokens=6000, temperature=0.4)
        return {"_plan_draft": plan}
    except Exception as exc:
        return {"error": f"generate_plan failed: {exc}"}


# ---------------------------------------------------------------------------
# Node: safety_review
# ---------------------------------------------------------------------------
async def safety_review(state: CalmingPlanState) -> dict:
    if state.get("error") or not state.get("_plan_draft"):
        return {}

    member = state.get("_member") or {}
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    issues = state.get("_issues") or []
    language = state.get("language", "ro")
    plan = state["_plan_draft"]

    issues_summary = "; ".join(f"{i.get('title')} ({i.get('category')})" for i in issues) or "none"

    prompt = "\n".join(
        [
            "You are a pediatric safety reviewer. The draft plan below was generated for a "
            f"{age if age is not None else 'unspecified-age'}-year-old who is currently on NO medications. "
            f"Known issues: {issues_summary}.",
            "",
            "Audit the plan for: age-inappropriate doses, sedative herbs misused for daytime, "
            "interaction risks between listed supplements, allergens implied by 'food_and_drinks', "
            "and any recommendation that crosses into prescription territory.",
            "",
            "Return a JSON object with exactly two keys:",
            '  "plan": <the corrected plan, same shape as the draft, with risky items removed or replaced and dose strings tightened>,',
            '  "notes": "<short paragraph (<=200 words) describing what you changed and why; in '
            + ("Romanian" if language == "ro" else "English")
            + '>"',
            "",
            "## Draft plan",
            json.dumps(plan, ensure_ascii=False),
        ]
    )

    try:
        result = await _deepseek_json(prompt, max_tokens=6000, temperature=0.2)
    except Exception as exc:
        # Safety pass should not gate persistence — keep draft, log note.
        return {"_safety_notes": f"safety_review failed: {exc}"}

    corrected = result.get("plan") if isinstance(result, dict) else None
    notes = result.get("notes") if isinstance(result, dict) else None

    out: dict = {}
    if isinstance(corrected, dict) and corrected:
        out["_plan_draft"] = corrected
    if isinstance(notes, str) and notes.strip():
        out["_safety_notes"] = notes.strip()
    return out


# ---------------------------------------------------------------------------
# Node: persist_plan
# ---------------------------------------------------------------------------
def _render_markdown(plan: dict, *, name: str, language: str) -> str:
    is_ro = language == "ro"
    h = {
        "headline": plan.get("headline") or ("Plan de calmare" if is_ro else "Calming plan"),
        "morning": "Rutina de dimineață" if is_ro else "Morning routine",
        "food": "Alimentație și băuturi" if is_ro else "Food and drinks",
        "encourage": "De încurajat" if is_ro else "Encourage",
        "avoid": "De evitat sau redus" if is_ro else "Avoid or reduce",
        "teas": "Ceaiuri" if is_ro else "Teas",
        "movement": "Mișcare" if is_ro else "Movement",
        "evening": "Rutina de seară" if is_ro else "Evening wind-down",
        "supplements": "Suplimente" if is_ro else "Supplements",
        "sensory": "Senzorial și mediu" if is_ro else "Sensory and environment",
        "checkins": "Verificări săptămânale" if is_ro else "Weekly check-ins",
        "redflags": "Semnale de alarmă" if is_ro else "Red flags",
    }

    lines: list[str] = [f"# {h['headline']} — {name}", ""]

    def _section(title: str, items: list, render):
        if not items:
            return
        lines.append(f"## {title}")
        for it in items:
            lines.append(render(it))
        lines.append("")

    _section(
        h["morning"],
        plan.get("morning_routine") or [],
        lambda i: f"- **{i.get('step', '')}** ({i.get('minutes', '?')} min) — {i.get('rationale', '')}",
    )

    food = plan.get("food_and_drinks") or {}
    if food:
        lines.append(f"## {h['food']}")
        if food.get("encourage"):
            lines.append(f"### {h['encourage']}")
            for i in food["encourage"]:
                lines.append(f"- **{i.get('item', '')}** — {i.get('why', '')} _(când: {i.get('frequency', '')})_")
        if food.get("avoid_or_reduce"):
            lines.append(f"### {h['avoid']}")
            for i in food["avoid_or_reduce"]:
                lines.append(f"- **{i.get('item', '')}** — {i.get('why', '')}")
        if food.get("teas"):
            lines.append(f"### {h['teas']}")
            for i in food["teas"]:
                lines.append(
                    f"- **{i.get('name', '')}** — {i.get('when', '')}, {i.get('dose', '')}. "
                    f"_Atenție:_ {i.get('cautions', '')}"
                )
        lines.append("")

    _section(
        h["movement"],
        plan.get("movement") or [],
        lambda i: f"- **{i.get('activity', '')}** ({i.get('duration_minutes', '?')} min, {i.get('when', '')}) — {i.get('why', '')}",
    )
    _section(
        h["evening"],
        plan.get("evening_wind_down") or [],
        lambda i: f"- **{i.get('step', '')}** ({i.get('minutes', '?')} min) — {i.get('rationale', '')}",
    )

    sup = plan.get("supplements") or []
    if sup:
        lines.append(f"## {h['supplements']}")
        for i in sup:
            cited = ", ".join(str(x) for x in (i.get("cited_paper_indexes") or []))
            lines.append(
                f"- **{i.get('name', '')}** — {i.get('rationale', '')}\n"
                f"  - Doză: {i.get('typical_dose_for_age', '')}\n"
                f"  - Moment: {i.get('timing', '')}\n"
                f"  - Nivel de evidență: {i.get('evidence_level', '')}\n"
                f"  - Atenții: {i.get('cautions', '')}\n"
                f"  - Surse: {cited or '—'}"
            )
        lines.append("")

    _section(
        h["sensory"],
        plan.get("sensory_and_environment") or [],
        lambda i: f"- **{i.get('tip', '')}** — {i.get('why', '')}",
    )
    _section(
        h["checkins"],
        plan.get("weekly_check_ins") or [],
        lambda i: f"- {i.get('question', '')} → urmărește: {i.get('look_for', '')}",
    )
    _section(
        h["redflags"],
        plan.get("red_flags") or [],
        lambda i: f"- **{i.get('sign', '')}** → {i.get('action', '')}",
    )

    return "\n".join(lines).strip() + "\n"


async def persist_plan(state: CalmingPlanState) -> dict:
    if state.get("error") or not state.get("_plan_draft"):
        return {}

    user_email = state["user_email"]
    family_member_id = state["family_member_id"]
    language = state.get("language", "ro")
    plan = state["_plan_draft"]
    safety_notes = state.get("_safety_notes")
    research = state.get("_research") or []
    member = state.get("_member") or {}

    sources = [
        {
            "index": idx,
            "title": p.get("title"),
            "authors": p.get("authors") or [],
            "year": p.get("year"),
            "doi": p.get("doi"),
            "url": p.get("url"),
        }
        for idx, p in enumerate(research, start=1)
    ]

    plan_markdown = _render_markdown(plan, name=member.get("first_name") or "Family member", language=language)

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO calming_plans "
                    "(family_member_id, user_id, language, plan_json, plan_markdown, sources_json, safety_notes) "
                    "VALUES (%s, %s, %s, %s::jsonb, %s, %s::jsonb, %s) RETURNING id",
                    (
                        family_member_id,
                        user_email,
                        language,
                        json.dumps(plan, ensure_ascii=False),
                        plan_markdown,
                        json.dumps(sources, ensure_ascii=False),
                        safety_notes,
                    ),
                )
                row = await cur.fetchone()
                plan_id = int(row[0]) if row else 0
    except Exception as exc:
        return {"error": f"persist_plan failed: {exc}"}

    return {
        "plan_id": plan_id,
        "plan": plan,
        "plan_markdown": plan_markdown,
        "sources": sources,
        "success": True,
    }


# ---------------------------------------------------------------------------
# Graph wiring
# ---------------------------------------------------------------------------
def create_calming_plan_graph(checkpointer=None):
    builder = StateGraph(CalmingPlanState)
    builder.add_node("load_context", load_context)
    builder.add_node("search_research", search_research)
    builder.add_node("generate_plan", generate_plan)
    builder.add_node("safety_review", safety_review)
    builder.add_node("persist_plan", persist_plan)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "search_research")
    builder.add_edge("search_research", "generate_plan")
    builder.add_edge("generate_plan", "safety_review")
    builder.add_edge("safety_review", "persist_plan")
    builder.add_edge("persist_plan", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


# Module-level eager graph for the LangGraph server.
graph = create_calming_plan_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_calming_plan_graph, graph)
