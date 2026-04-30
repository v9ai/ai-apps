"""LangGraph: dedicated plant-based calming & behavior plan generator (deep).

Seven-node multi-stage reasoning pipeline:
  1. load_context        — member, issues, allergies, characteristics, deep analysis.
  2. analyze_patterns    — cluster issues+characteristics into 3-5 behavioral patterns
                           with hypothesized mechanisms.
  3. search_research     — cluster-targeted literature search (per-pattern queries)
                           plus base queries; in-memory only, sources stored inline.
  4. generate_bundles    — per-cluster intervention bundle generation in parallel
                           (one DeepSeek call per cluster); each bundle includes
                           mechanism reasoning, interventions, trigger→response
                           cards, and 1/4/12-week KPIs.
  5. synthesize_plan     — assemble cluster bundles + global routines + stepped
                           tiers (Tier 1 lifestyle / Tier 2 nutrition+supplements /
                           Tier 3 escalation flags) into one coherent plan.
  6. safety_review       — single audit pass against the synthesized plan with
                           full allergy + age + interaction + coverage checks.
  7. persist_plan        — INSERT the deep plan into calming_plans (history-preserving).

Romanian by default for Bogdan; honors language override.

Graph runs N + 3 DeepSeek calls (analyze + per-cluster + synthesize + safety).
Concurrency in app.py defaults to 4 — but per-cluster fan-out runs inside the
graph via asyncio.gather, not LangGraph parallelism, so a single graph run
issues bundle calls concurrently.
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
from langgraph.types import RetryPolicy

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
    _prior_plans: list[dict]       # last N calming_plans for this member
    _journal: list[dict]           # recent journal entries
    _observations: list[dict]      # behavior_observations
    _medications: list[dict]       # full medication history
    _med_context: dict             # derived: Singulair status, washout window
    _clusters: list[dict]          # from analyze_patterns
    _research: list[dict]
    _cluster_bundles: list[dict]   # from generate_bundles (one per cluster)
    _plan_draft: dict              # synthesized plan
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
    print("[calming_plan] load_context: enter (v2-merge)", flush=True)
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

                # Prior calming plans — last 5, newest first. Each new
                # generation MERGES prior plan knowledge with the current
                # state, rather than restarting from scratch.
                prior_plans: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT id, language, plan_json, safety_notes, generated_at "
                        "FROM calming_plans WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY generated_at DESC LIMIT 5",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        plan_json_raw = r[2]
                        try:
                            pj = json.loads(plan_json_raw) if isinstance(plan_json_raw, str) else plan_json_raw
                        except Exception:
                            pj = {}
                        prior_plans.append(
                            {
                                "id": r[0],
                                "language": r[1],
                                "headline": (pj or {}).get("headline"),
                                "executive_summary": (pj or {}).get("executive_summary"),
                                "cluster_names": [
                                    b.get("cluster_name")
                                    for b in ((pj or {}).get("cluster_bundles") or [])
                                ],
                                "supplement_names": [
                                    s.get("name")
                                    for s in ((pj or {}).get("supplements") or [])
                                ],
                                "safety_notes_preview": (r[3] or "")[:300],
                                "generated_at": (
                                    r[4].isoformat() if hasattr(r[4], "isoformat") else str(r[4])
                                ),
                            }
                        )
                except Exception as exc:
                    print(f"[calming_plan] prior plans unavailable: {exc}")

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

                # Recent journal entries — gives the LLM concrete lived events
                # to ground patterns, not just issue titles. Last 30 by date.
                journal: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT entry_date, mood, mood_score, title, content, tags "
                        "FROM journal_entries WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY entry_date DESC NULLS LAST LIMIT 30",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        journal.append(
                            {
                                "entry_date": r[0],
                                "mood": r[1],
                                "mood_score": r[2],
                                "title": (r[3] or "")[:200],
                                "content": (r[4] or "")[:600],
                                "tags": r[5],
                            }
                        )
                except Exception as exc:
                    print(f"[calming_plan] journal_entries unavailable: {exc}")

                # Behavior observations — structured incident records
                # (frequency, intensity, context).
                observations: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT observed_at, observation_type, frequency, intensity, "
                        "context, notes FROM behavior_observations "
                        "WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY observed_at DESC NULLS LAST LIMIT 20",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        observations.append(
                            {
                                "observed_at": r[0],
                                "type": r[1],
                                "frequency": r[2],
                                "intensity": r[3],
                                "context": (r[4] or "")[:240],
                                "notes": (r[5] or "")[:240],
                            }
                        )
                except Exception as exc:
                    print(f"[calming_plan] behavior_observations unavailable: {exc}")

                # Medication history — every row, ordered by start_date desc.
                # Drives Singulair / neuropsychiatric-AE detection downstream.
                medications: list[dict] = []
                try:
                    await cur.execute(
                        "SELECT name, dosage, frequency, notes, start_date, end_date, is_active "
                        "FROM medications WHERE family_member_id = %s AND user_id = %s "
                        "ORDER BY start_date DESC NULLS LAST",
                        (family_member_id, user_email),
                    )
                    for r in await cur.fetchall():
                        medications.append(
                            {
                                "name": r[0],
                                "dosage": r[1],
                                "frequency": r[2],
                                "notes": (r[3] or "")[:600],
                                "start_date": (
                                    r[4].isoformat() if hasattr(r[4], "isoformat") else r[4]
                                ),
                                "end_date": (
                                    r[5].isoformat() if hasattr(r[5], "isoformat") else r[5]
                                ),
                                "is_active": bool(r[6]) if r[6] is not None else None,
                            }
                        )
                except Exception as exc:
                    print(f"[calming_plan] medications unavailable: {exc}")
    except Exception as exc:
        return {"error": f"load_context failed: {exc}"}

    # Resolve language: explicit input > member's preferred_language > 'ro'.
    language = state.get("language") or _language_from_pref(member.get("preferred_language"))

    # Derived medication context — flag drugs with known neuropsychiatric AE
    # profiles, especially Singulair (montelukast) under FDA black-box warning.
    # When such a drug was recently discontinued, the plan front-loads
    # supportive recovery nutrition during the 2-4 week washout window.
    med_context = _derive_med_context(medications)

    return {
        "_member": member,
        "_issues": issues,
        "_allergies": allergies,
        "_characteristics": characteristics,
        "_deep_analysis": deep_analysis,
        "_prior_plans": prior_plans,
        "_journal": journal,
        "_observations": observations,
        "_medications": medications,
        "_med_context": med_context,
        "_graph_version": "v3-singulair-iatrogenic-2026-04-30",
        "language": language,
    }


def _derive_med_context(medications: list[dict]) -> dict:
    """Detect Singulair/montelukast in medication history and compute washout
    window. Returns a small dict the prompts use to bias interventions toward
    pathways the drug disrupts (HPA-axis, glutathione, serotonergic, BBB,
    REM/sleep) when the member is currently on or recently off the drug."""
    singulair_rx: Optional[dict] = None
    for m in medications:
        nm = (m.get("name") or "").lower()
        if "singulair" in nm or "montelukast" in nm:
            singulair_rx = m
            break

    if not singulair_rx:
        return {"singulair_history": False}

    is_active = bool(singulair_rx.get("is_active"))
    end_date_str = singulair_rx.get("end_date")
    days_since_stopped: Optional[int] = None
    in_washout = False
    if not is_active and end_date_str:
        try:
            end_dt = datetime.fromisoformat(str(end_date_str)[:10])
            days_since_stopped = (datetime.utcnow() - end_dt).days
            # 2-4 week observation per FDA / typical clinical practice.
            in_washout = 0 <= days_since_stopped <= 28
        except Exception:
            pass

    return {
        "singulair_history": True,
        "singulair_active": is_active,
        "singulair_start_date": singulair_rx.get("start_date"),
        "singulair_end_date": end_date_str,
        "days_since_stopped": days_since_stopped,
        "in_washout_window": in_washout,
        "singulair_notes": (singulair_rx.get("notes") or "")[:500],
    }


# ---------------------------------------------------------------------------
# Node: analyze_patterns
#
# Cluster the member's issues + characteristics into 3-5 behavioral patterns.
# Each cluster names dominant issues, hypothesizes a mechanism, and proposes
# the intervention axis (sensory / nutritional / sleep / social / cognitive /
# arousal / co-regulation). Clusters drive the per-pattern literature search
# and per-bundle plan generation downstream.
# ---------------------------------------------------------------------------
_CLUSTER_AXES = (
    "sensory_regulation",
    "sleep_arousal",
    "nutritional_metabolic",
    "social_communication",
    "emotional_dysregulation",
    "cognitive_attention",
    "co_regulation_attachment",
    # Special axis for medication-attributable clusters (e.g. Singulair AE
    # recovery during the post-discontinuation washout window).
    "iatrogenic_neuropsychiatric_recovery",
)


async def analyze_patterns(state: CalmingPlanState) -> dict:
    print("[calming_plan] analyze_patterns: enter", flush=True)
    if state.get("error"):
        return {}

    member = state.get("_member") or {}
    issues = state.get("_issues") or []
    characteristics = state.get("_characteristics") or []
    deep = state.get("_deep_analysis") or {}
    prior_plans = state.get("_prior_plans") or []
    journal = state.get("_journal") or []
    observations = state.get("_observations") or []
    med_context = state.get("_med_context") or {}
    language = state.get("language", "ro")

    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    if not issues and not characteristics:
        # Nothing to cluster — return one generic well-being cluster.
        return {
            "_clusters": [
                {
                    "name": "general_wellbeing",
                    "axis": "co_regulation_attachment",
                    "dominant_issues": [],
                    "hypothesized_mechanism": "No specific issues recorded; baseline calming routine.",
                    "search_query": "child general wellbeing calming routine non-pharmacologic",
                }
            ]
        }

    issues_text = "\n".join(
        f"- [{(i.get('severity') or '').upper()}] {i.get('title')} ({i.get('category')}): "
        f"{(i.get('description') or '')[:160]}"
        for i in issues[:20]
    )
    chars_text = "\n".join(
        f"- [{(c.get('risk_tier') or 'NONE').upper()}] {c.get('title')} ({c.get('category')}): "
        f"{(c.get('description') or '')[:160]}"
        for c in characteristics
    )
    deep_summary = (deep.get("summary") or "")[:600]

    # Journal — include up to 12 most recent entries with date+title+content
    # snippet so the model can ground patterns in concrete events, not just
    # issue titles.
    journal_lines: list[str] = []
    for j in journal[:12]:
        title = (j.get("title") or "")[:120]
        content = (j.get("content") or "")[:200]
        mood = j.get("mood") or ""
        score = j.get("mood_score")
        score_str = f" [mood={mood}{f' {score}' if score is not None else ''}]" if mood or score is not None else ""
        journal_lines.append(
            f"- {j.get('entry_date', '')}: {title}{score_str}\n  {content}"
        )
    journal_block = "\n".join(journal_lines) or "(no journal entries)"

    # Behavior observations — tighter, structured incidents.
    obs_lines: list[str] = []
    for o in observations[:8]:
        obs_lines.append(
            f"- {o.get('observed_at', '')}: {o.get('type', '')} "
            f"[freq={o.get('frequency', '?')}, intensity={o.get('intensity', '?')}] "
            f"context: {(o.get('context') or '')[:140]}"
        )
    obs_block = "\n".join(obs_lines) or "(no behavior observations)"

    # Singulair / iatrogenic context — drives the cluster axis suggestion.
    med_lines: list[str] = []
    if med_context.get("singulair_history"):
        if med_context.get("singulair_active"):
            med_lines.append(
                "Member is CURRENTLY taking Singulair (montelukast). FDA black-box warning for "
                "neuropsychiatric AEs (agitation, anxiety, sleep disturbance, mood, suicidality). "
                "Some symptoms may be partially iatrogenic. The plan supports the underlying "
                "physiology with plant-based interventions but does NOT advise stopping the drug "
                "(that is a clinician decision)."
            )
        elif med_context.get("in_washout_window"):
            d = med_context.get("days_since_stopped")
            med_lines.append(
                f"Member STOPPED Singulair (montelukast) {d} day(s) ago and is in the 2-4 week "
                "OBSERVATION/WASHOUT window to evaluate whether behavioral/sensory symptoms "
                "improve. The plan should front-load nutrition that supports the pathways "
                "Singulair disrupts: glutathione system (cruciferous vegetables, sulforaphane), "
                "HPA-axis (adaptogenic herbs age-permitting), serotonergic system (tryptophan-"
                "rich plant foods, saffron), mitochondrial function (polyphenols, olive oil), "
                "and REM/sleep restoration (tart cherry, magnolia bark caution, lemon balm). "
                "Frame as 'supportive recovery nutrition during washout' — NOT antidote, NOT Rx."
            )
        else:
            med_lines.append(
                "Member has Singulair (montelukast) history; not currently active and outside "
                "washout window. Behavioral profile may still partly reflect lasting effects."
            )
    med_block = "\n".join(med_lines) or "(no notable medication-AE context)"
    pattern_clusters_existing = deep.get("pattern_clusters") or []
    existing_clusters_text = "\n".join(
        f"- {c.get('name', '')}: {(c.get('description') or '')[:160]}"
        for c in pattern_clusters_existing[:5]
    )

    # Prior-plan cluster history — what patterns we've already identified
    # across previous runs. Helps the model converge on stable, refined
    # clusters rather than reshuffling each generation.
    prior_clusters_set: list[str] = []
    seen_pc: set[str] = set()
    for pp in prior_plans:
        for cn in pp.get("cluster_names") or []:
            if cn and cn not in seen_pc:
                seen_pc.add(cn)
                prior_clusters_set.append(cn)
    prior_clusters_text = ", ".join(prior_clusters_set[:8]) or "(none)"

    schema = """{
  "clusters": [
    {
      "name": "string (snake_case, e.g. 'evening_dysregulation')",
      "axis": "one of: sensory_regulation | sleep_arousal | nutritional_metabolic | social_communication | emotional_dysregulation | cognitive_attention | co_regulation_attachment",
      "dominant_issues": ["exact issue title from input", "..."],
      "hypothesized_mechanism": "string (1-2 sentences naming a plausible neurobiological / behavioral mechanism)",
      "search_query": "string (an English literature query targeting this pattern; include 'children' and the relevant intervention class)"
    }
  ]
}"""

    lang_note = (
        "Write `hypothesized_mechanism` in Romanian. Keep `name`, `axis`, and "
        "`search_query` in English (axis must be one of the enum values, search_query "
        "is for PubMed/Crossref so English is required)."
        if language == "ro"
        else "All strings in clear English."
    )

    prompt = "\n".join(
        [
            "You are a pediatric clinical-pattern analyst. Given the member's issues and "
            "characteristics, identify 3-5 distinct behavioral PATTERNS (clusters). Each "
            "pattern should group issues sharing a likely mechanism — do not just bucket "
            "by category. Aim for clusters that map to actionable intervention axes.",
            "",
            f"## Member\nAge: {age if age is not None else 'unspecified'}",
            "",
            "## Issues",
            issues_text or "(none)",
            "",
            "## Characteristics",
            chars_text or "(none)",
            "",
            "## Existing deep-analysis pattern clusters (for reference only)",
            existing_clusters_text or "(none)",
            "",
            "## Prior calming-plan cluster names (for continuity — prefer reusing/refining over inventing new)",
            prior_clusters_text,
            "",
            "## Recent journal entries (concrete lived events — anchor patterns here)",
            journal_block,
            "",
            "## Behavior observations",
            obs_block,
            "",
            "## Medication / iatrogenic context (CRITICAL — biases cluster axes)",
            med_block,
            "",
            "## Existing deep-analysis summary",
            deep_summary or "(none)",
            "",
            "## Output rules",
            "- EXACTLY 3 clusters. Pick the 3 most therapeutically actionable patterns.",
            "- If the medication context indicates an active/recent Singulair history, ONE of the 3 "
            "clusters MUST be a 'singulair_washout_recovery' (or similar name) cluster with axis "
            "'iatrogenic_neuropsychiatric_recovery' (use that exact axis literal — even though it's not "
            "in the standard enum below, prefer it when applicable). The mechanism field for that cluster "
            "should reference the specific pathways Singulair disrupts: cysLT1 receptor antagonism in CNS, "
            "glutathione depletion, HPA-axis disruption, serotonergic/noradrenergic dysregulation, "
            "mitochondrial dysfunction in neurons, BBB permeability changes, REM/sleep disruption.",
            "- Each cluster name must be snake_case and unique.",
            "- `dominant_issues` must list issue titles VERBATIM from the input — do not invent.",
            "- `axis` must be one of the enumerated values exactly.",
            "- `hypothesized_mechanism` should reference a real mechanism (e.g. HPA-axis dysregulation, "
            "dopaminergic signaling, sensory gating, parasympathetic withdrawal, gut-brain axis, etc.).",
            "- `search_query` must be a focused English query suitable for PubMed/Crossref/OpenAlex.",
            "",
            f"## Language\n{lang_note}",
            "",
            "## Output schema (JSON only)",
            schema,
        ]
    )

    try:
        result = await _deepseek_json(prompt, max_tokens=2000, temperature=0.3)
    except Exception as exc:
        # Fall back to one synthetic cluster so the pipeline can continue.
        return {
            "_clusters": [
                {
                    "name": "general_calming",
                    "axis": "emotional_dysregulation",
                    "dominant_issues": [i.get("title") for i in issues[:8]],
                    "hypothesized_mechanism": f"analyze_patterns failed ({exc}); fallback cluster.",
                    "search_query": "non-pharmacologic calming children behavior regulation",
                }
            ]
        }

    clusters = result.get("clusters") if isinstance(result, dict) else None
    if not isinstance(clusters, list) or not clusters:
        return {
            "_clusters": [
                {
                    "name": "general_calming",
                    "axis": "emotional_dysregulation",
                    "dominant_issues": [i.get("title") for i in issues[:8]],
                    "hypothesized_mechanism": "analyze_patterns returned empty; fallback cluster.",
                    "search_query": "non-pharmacologic calming children behavior regulation",
                }
            ]
        }

    # Normalize: clip count to 3 to keep runtime within CF's response window
    # (each cluster spawns one parallel bundle LLM call ~30-60s).
    cleaned: list[dict] = []
    for c in clusters[:3]:
        if not isinstance(c, dict):
            continue
        axis = c.get("axis") or "emotional_dysregulation"
        if axis not in _CLUSTER_AXES:
            axis = "emotional_dysregulation"
        cleaned.append(
            {
                "name": (c.get("name") or "cluster").strip()[:60],
                "axis": axis,
                "dominant_issues": c.get("dominant_issues") or [],
                "hypothesized_mechanism": (c.get("hypothesized_mechanism") or "").strip()[:400],
                "search_query": (c.get("search_query") or "").strip()[:200] or "non-pharmacologic calming children",
            }
        )
    return {"_clusters": cleaned}


# ---------------------------------------------------------------------------
# Node: search_research
# ---------------------------------------------------------------------------
_BASE_QUERIES = [
    "L-theanine green tea children anxiety behavior randomized",
    "passionflower passiflora children anxiety sleep clinical trial",
    "lemon balm Melissa officinalis pediatric anxiety sleep RCT",
    "saffron Crocus sativus children mood behavior randomized",
    "holy basil tulsi Ocimum sanctum stress anxiety pediatric",
    "linden tea Tilia children calming evidence",
    "lavender aromatherapy children behavior sleep RCT",
    "algal omega-3 plant-source DHA children behavior attention",
    "Mediterranean diet plants children behavior mood",
    "forest bathing nature exposure children stress regulation",
    # Singulair / montelukast neuropsychiatric AEs — mechanism-targeted recovery
    "montelukast neuropsychiatric adverse events children FDA boxed warning",
    "montelukast glutathione oxidative stress brain mechanism",
    "sulforaphane broccoli sprouts children behavior glutathione",
    "saffron extract Crocus children depression anxiety randomized",
    "tart cherry juice children sleep melatonin",
    "polyphenols Mediterranean diet pediatric mood neuroprotection",
]


async def search_research(state: CalmingPlanState) -> dict:
    if state.get("error"):
        return {}

    member = state.get("_member") or {}
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    band = _age_band(age)
    clusters = state.get("_clusters") or []

    qualifier = {
        "early-childhood": "preschool early childhood",
        "school-age": "school age children",
        "adolescent": "adolescent teen",
        "adult": "adult",
        "unspecified": "pediatric",
    }[band]

    # Cluster-targeted queries (one per cluster) get priority — they're tagged
    # with the cluster name so generate_bundles can pull the right papers.
    cluster_queries: list[tuple[str, str]] = [
        (c.get("name") or "cluster", f"{c.get('search_query', '')} {qualifier}".strip())
        for c in clusters
        if c.get("search_query")
    ]
    base_queries: list[tuple[str, str]] = [("base", f"{q} {qualifier}") for q in _BASE_QUERIES]

    all_queries = cluster_queries + base_queries
    s2_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")

    async def _one(tag: str, q: str) -> tuple[str, list[dict]]:
        try:
            papers = await search_papers_with_fallback(
                q, limit=4, semantic_scholar_api_key=s2_key
            )
            return tag, papers
        except Exception as exc:
            print(f"[calming_plan] paper search failed for '{q}': {exc}")
            return tag, []

    results = await asyncio.gather(*[_one(tag, q) for tag, q in all_queries])

    # Dedup by DOI/title; keep up to 16 papers with usable abstracts. Tag each
    # paper with the FIRST cluster (or 'base') that returned it.
    seen_keys: set[str] = set()
    deduped: list[dict] = []
    for tag, batch in results:
        for p in batch:
            key = (p.get("doi") or p.get("title") or "").strip().lower()
            if not key or key in seen_keys:
                continue
            abstract = (p.get("abstract") or "").strip()
            if not abstract or abstract in {"...", "None"} or len(abstract) < 80:
                continue
            seen_keys.add(key)
            paper_with_tag = dict(p)
            paper_with_tag["cluster_tag"] = tag
            deduped.append(paper_with_tag)
            if len(deduped) >= 16:
                break
        if len(deduped) >= 16:
            break

    return {"_research": deduped}



_TRUNCATION_HINTS = ("Unterminated", "Expecting value", "Invalid \\escape", "delimiter")


async def _llm_with_brevity_retry(prompt: str, brevity: str, *, temp: float, max_tokens: int = 8192) -> dict:
    """Run a DeepSeek JSON call; retry once with a brevity addendum if truncation was detected."""
    try:
        return await _deepseek_json(prompt, max_tokens=max_tokens, temperature=temp)
    except Exception as exc:
        msg = str(exc)
        if not any(h in msg for h in _TRUNCATION_HINTS):
            raise
        return await _deepseek_json(prompt + brevity, max_tokens=max_tokens, temperature=max(0.2, temp - 0.1))


# ---------------------------------------------------------------------------
# Node: generate_bundles
#
# For each cluster, generate a focused intervention bundle in parallel. Each
# bundle is small (< 2000 tokens output) so we never hit the 8192 ceiling that
# burned the flat one-shot generator. Bundles contain mechanism reasoning,
# interventions, trigger→response cards, and 1/4/12-week KPIs — the substance
# of the "deep" plan.
# ---------------------------------------------------------------------------
def _build_bundle_prompt(state: CalmingPlanState, cluster: dict) -> str:
    member = state.get("_member") or {}
    issues = state.get("_issues") or []
    allergies = state.get("_allergies") or []
    research = state.get("_research") or []
    journal = state.get("_journal") or []
    med_context = state.get("_med_context") or {}
    language = state.get("language", "ro")
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    name = member.get("first_name") or "the family member"

    cluster_name = cluster.get("name", "cluster")
    cluster_axis = cluster.get("axis", "emotional_dysregulation")
    cluster_mechanism = cluster.get("hypothesized_mechanism") or ""
    dominant_titles = cluster.get("dominant_issues") or []

    # Issues for THIS cluster.
    cluster_issues = [i for i in issues if i.get("title") in set(dominant_titles)]
    if not cluster_issues:
        cluster_issues = issues[:6]
    issues_block = "\n".join(
        f"- [{(i.get('severity') or '').upper()}] {i.get('title')} ({i.get('category')}): "
        f"{(i.get('description') or '')[:160]}"
        for i in cluster_issues[:8]
    )

    # Recent journal — last 6 entries; gives the bundle concrete events to
    # cite in trigger_response_pairs.
    journal_lines = []
    for j in journal[:6]:
        title = (j.get("title") or "")[:120]
        content = (j.get("content") or "")[:160]
        journal_lines.append(f"- {j.get('entry_date', '')}: {title} — {content}")
    journal_block = "\n".join(journal_lines) or "(no recent journal)"

    # Singulair / iatrogenic context — every bundle gets this so plant
    # interventions can be mechanism-targeted.
    if med_context.get("singulair_history"):
        if med_context.get("singulair_active"):
            singulair_block = (
                "Member is CURRENTLY on Singulair (montelukast). Symptoms in this cluster may be "
                "partially iatrogenic. Prefer plant interventions that support: glutathione "
                "(cruciferous: broccoli sprouts/sulforaphane, kale, garlic, onion, watercress), "
                "HPA-axis (tulsi/holy basil tea, lemon balm, oat-straw), serotonergic (saffron "
                "extract — pediatric RCT evidence, plant tryptophan: pumpkin/sunflower seeds, "
                "oats, chickpeas), mitochondrial/polyphenols (extra-virgin olive oil, blueberries "
                "modulo birch, dark leafy greens), REM/sleep (tart cherry juice, lemon balm tea). "
                "Do NOT recommend stopping Singulair — that is a clinician decision."
            )
        elif med_context.get("in_washout_window"):
            d = med_context.get("days_since_stopped") or 0
            singulair_block = (
                f"Member STOPPED Singulair (montelukast) {d} day(s) ago — currently in 2-4 week "
                "OBSERVATION/WASHOUT window. Front-load plant interventions that support pathways "
                "Singulair disrupts: glutathione (broccoli sprouts/sulforaphane, kale, garlic, "
                "watercress, asparagus), HPA-axis (tulsi/holy basil, lemon balm, ashwagandha "
                "with age caveat), serotonergic (saffron, plant tryptophan from pumpkin/sunflower "
                "seeds, oats, chickpeas, banana), mitochondrial (EVOO, polyphenol-rich plant "
                "foods, dark cocoa modulo allergy), REM/sleep restoration (tart cherry juice, "
                "lemon balm tea, magnolia bark with strict age caveat). Frame interventions as "
                "'supportive recovery nutrition during washout' — neutral, food-first language."
            )
        else:
            singulair_block = (
                "Member has Singulair history (not active, outside washout). Some lasting effects "
                "possible; gentle support of glutathione + HPA-axis pathways still useful."
            )
    else:
        singulair_block = "(no Singulair / neuropsychiatric-AE drug history)"

    # Allergies block — same hard rules apply.
    allergy_lines: list[str] = []
    for a in allergies:
        sev = (a.get("severity") or "").upper()
        line = f"- [{sev}] {a.get('kind') or 'allergy'}: {a.get('name', '')}"
        if a.get("notes"):
            line += f" — {a['notes']}"
        allergy_lines.append(line)
    if member.get("allergies_text"):
        allergy_lines.append(f"- (free-text) {member['allergies_text']}")
    allergies_block = "\n".join(allergy_lines) or "(none recorded — apply standard pediatric caution)"

    # Research subset — prefer papers tagged with this cluster, fallback to base.
    matched = [p for p in research if p.get("cluster_tag") == cluster_name]
    if len(matched) < 4:
        matched = matched + [p for p in research if p.get("cluster_tag") not in (cluster_name,)][: 8 - len(matched)]
    matched = matched[:8]

    research_lines = []
    for idx, p in enumerate(matched, start=1):
        line = [
            f"[{idx}] {p.get('title', 'Untitled')} ({p.get('year', '?')}) [tag={p.get('cluster_tag', '')}]",
            f"  Authors: {', '.join(p.get('authors') or [])[:160]}",
        ]
        abstract = (p.get("abstract") or "")[:240]
        if abstract:
            line.append(f"  Abstract: {abstract}")
        if p.get("doi"):
            line.append(f"  DOI: {p['doi']}")
        research_lines.append("\n".join(line))
    research_block = "\n\n".join(research_lines) or "(no papers retrieved — rely on conservative practice)"

    schema = """{
  "cluster_name": "string (echo back)",
  "axis": "string (echo back)",
  "summary": "string (1-2 sentence framing of why this cluster matters for this child)",
  "mechanism_explanation": "string (3-4 sentences linking the dominant issues to the hypothesized mechanism, citing paper indexes [1], [2] when relevant)",
  "interventions": [
    {
      "type": "lifestyle | food | movement | sensory | supplement | co_regulation",
      "title": "string",
      "specifics": "string (concrete what-to-do)",
      "why_it_works": "string (1 sentence; cite paper indexes when grounded)",
      "respects_allergies": "string",
      "cited_paper_indexes": [1, 2]
    }
  ],
  "trigger_response_pairs": [
    {"trigger": "string (specific scenario the parent will recognize)", "in_the_moment_response": "string (concrete words/actions)", "after_response": "string (de-escalation step)"}
  ],
  "kpis": {
    "week_1": "string (something the parent should observe within 7 days if this is working)",
    "week_4": "string",
    "week_12": "string"
  },
  "escalation_signals": ["string (a sign that escalates to professional support)"]
}"""

    lang_instruction = (
        "IMPORTANT: write all human-readable strings (summary, mechanism_explanation, "
        "interventions[*].title, .specifics, .why_it_works, trigger_response_pairs, kpis, "
        "escalation_signals) in fluent Romanian. Keep paper titles, DOIs, supplement "
        "Latin/English names, axis enum, and intervention type enum verbatim."
        if language == "ro"
        else "All human-readable strings in clear English."
    )

    return "\n".join(
        [
            f"You are a pediatric PHYTOTHERAPY and integrative-medicine expert. Generate a "
            f"FOCUSED, **PLANT-FIRST** intervention bundle for ONE behavioral cluster "
            f"('{cluster_name}', axis: {cluster_axis}) for {name} "
            f"(age {age if age is not None else 'unspecified'}, currently on NO medications). "
            f"This bundle is one of several — do not try to address every issue, only this cluster. "
            f"PRIORITIZE botanical/herbal/plant-derived interventions over minerals or synthetics.",
            "",
            "## Cluster",
            f"Name: {cluster_name}",
            f"Axis: {cluster_axis}",
            f"Hypothesized mechanism: {cluster_mechanism}",
            "",
            "## Cluster's dominant issues",
            issues_block or "(none assigned to this cluster)",
            "",
            "## Recent journal (concrete events — use for trigger_response_pairs)",
            journal_block,
            "",
            "## Singulair / iatrogenic context (mechanism-targeted plant interventions)",
            singulair_block,
            "",
            "## ALLERGIES (HARD)",
            allergies_block,
            "",
            "## Research (filtered to this cluster + nearby)",
            research_block,
            "",
            "## Hard rules — PLANT-FIRST",
            "- ONE bundle for this cluster only. Don't drift to other patterns.",
            "- 4-7 interventions. **At least 60% of interventions must be plant-based**: "
            "  herbal teas (verified against allergies), culinary spices (turmeric, cinnamon, ginger, saffron), "
            "  adaptogenic herbs age-permitting (lemon balm, holy basil/tulsi, gotu kola), "
            "  plant-derived supplements (algal omega-3, plant-source magnesium-rich foods, plant flavonoids), "
            "  aromatherapy (lavender topical/diffuser), plant foods rich in tryptophan/B6/folate, "
            "  garden/forest-bathing, plant-based sensory tools (rice/lentil bins, pine cones, herb gardens).",
            "- Cover at least 3 of: lifestyle, food (plants), movement, sensory (plant-based), supplement (plant-derived), co_regulation.",
            "- AVOID generic mineral supplements (e.g. magnesium glycinate alone) UNLESS paired with a plant-rich food source. "
            "Prefer 'magnesium from pumpkin seeds + spinach' over 'magnesium glycinate'.",
            "- 3-5 trigger_response_pairs — each pair must name a CONCRETE situation the parent will recognize, "
            "not a generic 'when child is upset'. Use the dominant issues for grounding.",
            "- KPIs at 1/4/12 weeks must be OBSERVABLE by a parent without instruments.",
            "- Allergies override everything (cross-reactivity: ragweed↔chamomile/echinacea/calendula/feverfew, "
            "mint↔lemon balm/lavender ingestion, birch↔raw apples/almonds, latex↔banana/avocado/kiwi, "
            "dairy/tree-nut/salicylate/soy/egg). Each intervention's `respects_allergies` field must state what was cross-checked.",
            "- Cite paper indexes from the ## Research section when grounding interventions; do not invent citations.",
            "- Keep every string concise: title<=80 chars, specifics<=220, why_it_works<=180.",
            "",
            f"## Language\n{lang_instruction}",
            "",
            "## Output schema (JSON only, exactly this shape, no extra keys)",
            schema,
        ]
    )


async def generate_bundles(state: CalmingPlanState) -> dict:
    print(f"[calming_plan] generate_bundles: enter, clusters={len(state.get('_clusters') or [])}", flush=True)
    if state.get("error"):
        return {}
    clusters = state.get("_clusters") or []
    if not clusters:
        return {"error": "generate_bundles: no clusters from analyze_patterns"}

    brevity = (
        "\n\n## Brevity (HARD)\nKeep every string under 160 characters. "
        "Limit lists: interventions<=5, trigger_response_pairs<=4, escalation_signals<=4."
    )

    async def _one(c: dict) -> dict:
        prompt = _build_bundle_prompt(state, c)
        try:
            bundle = await _llm_with_brevity_retry(prompt, brevity, temp=0.4, max_tokens=4096)
            # Force-echo the cluster name/axis on the bundle so synthesize can join cleanly.
            if isinstance(bundle, dict):
                bundle.setdefault("cluster_name", c.get("name"))
                bundle.setdefault("axis", c.get("axis"))
            return bundle
        except Exception as exc:
            return {
                "cluster_name": c.get("name"),
                "axis": c.get("axis"),
                "error": f"bundle generation failed: {exc}",
            }

    bundles = await asyncio.gather(*[_one(c) for c in clusters])
    # Drop any bundles that errored — synthesize will work with what's left.
    good = [b for b in bundles if isinstance(b, dict) and not b.get("error")]
    if not good:
        first_err = next((b.get("error") for b in bundles if isinstance(b, dict) and b.get("error")), "all bundles failed")
        return {"error": f"generate_bundles: {first_err}"}
    return {"_cluster_bundles": good}


# ---------------------------------------------------------------------------
# Node: synthesize_plan
#
# Take the per-cluster bundles and assemble the unified day-shaped plan with
# global routines (morning/evening), food/movement/sensory pulled across
# bundles, stepped tiers, weekly check-ins, and red flags. The bundles ARE
# the plan content for the cluster sections — synthesize doesn't rewrite them.
# ---------------------------------------------------------------------------
def _build_synthesize_prompt(state: CalmingPlanState) -> str:
    member = state.get("_member") or {}
    issues = state.get("_issues") or []
    allergies = state.get("_allergies") or []
    research = state.get("_research") or []
    bundles = state.get("_cluster_bundles") or []
    clusters = state.get("_clusters") or []
    prior_plans = state.get("_prior_plans") or []
    language = state.get("language", "ro")
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    name = member.get("first_name") or "the family member"

    # Pass a COMPACT summary of bundles to the synthesizer — just enough for
    # cross-bundle dedup and stepped-tier reasoning. Full bundles are spliced
    # back into the plan AFTER the LLM call (saves ~3000-5000 output tokens).
    bundles_summary_lines = []
    for b in bundles:
        cname = b.get("cluster_name", "")
        axis = b.get("axis", "")
        summary = (b.get("summary") or "")[:160]
        intervention_titles = "; ".join(
            (iv.get("title") or "") for iv in (b.get("interventions") or [])[:6]
        )
        bundles_summary_lines.append(
            f"- {cname} (axis: {axis}): {summary} | interventions: {intervention_titles}"
        )
    bundles_block = "\n".join(bundles_summary_lines) or "(no bundles)"
    clusters_block = "\n".join(
        f"- {c.get('name')} (axis: {c.get('axis')}): {(c.get('hypothesized_mechanism') or '')[:160]}"
        for c in clusters
    )

    # Prior plans — let the synthesizer carry forward what worked and refine.
    prior_block_lines: list[str] = []
    for pp in prior_plans[:3]:
        line = (
            f"- Plan #{pp.get('id')} ({pp.get('generated_at', '')[:10]}): "
            f"{(pp.get('headline') or '')[:120]}"
        )
        sup_names = pp.get("supplement_names") or []
        if sup_names:
            line += " | supplements: " + ", ".join(sup_names[:5])
        prior_block_lines.append(line)
    prior_block = "\n".join(prior_block_lines) or "(no prior plans — this is the first)"

    issues_block = "\n".join(
        f"- {i.get('title')} ({i.get('category')}, {i.get('severity')})"
        for i in issues[:20]
    )

    allergy_summary = "; ".join(
        f"{a.get('name')} ({a.get('severity') or 'unknown'})" for a in allergies
    ) or "none"

    sources_count = len(research)

    schema = """{
  "headline": "string",
  "executive_summary": "string (3-5 sentences naming clusters and the overall approach)",
  "stepped_tiers": [
    {
      "tier": 1,
      "name": "Foundation (always-on)",
      "items": ["string", "..."],
      "review_after_days": 14
    },
    {
      "tier": 2,
      "name": "Add after foundation is steady",
      "items": ["string", "..."],
      "review_after_days": 28
    },
    {
      "tier": 3,
      "name": "Escalation — when to seek professional support",
      "items": ["string", "..."],
      "review_after_days": null
    }
  ],
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
      "respects_allergies": "string",
      "cited_paper_indexes": [1, 2]
    }
  ],
  "sensory_and_environment": [{"tip": "string", "why": "string"}],
  "weekly_check_ins": [{"question": "string", "look_for": "string"}],
  "red_flags": [{"sign": "string", "action": "string"}],
  "issue_coverage": [{"issue_title": "string", "addressed_by": ["section name or cluster name", "..."]}]
}"""

    lang_instruction = (
        "IMPORTANT: write every human-readable string in fluent Romanian. "
        "Supplement names in conventional English/Latin form. Cluster bundles must be "
        "echoed VERBATIM (already in target language)."
        if language == "ro"
        else "All human-readable strings in clear English."
    )

    return "\n".join(
        [
            f"You are a pediatric integrative-medicine plan synthesizer. The per-cluster intervention "
            f"bundles below have already been generated. Your job is to: (a) extract a unified daily routine "
            f"and food/movement/supplement layer that combines bundles without contradiction, (b) build "
            f"3-tier stepped care, (c) draft weekly check-ins and red flags, (d) map each known issue to "
            f"a section of the plan, and (e) include the bundles VERBATIM under `cluster_bundles`.",
            "",
            f"## Member\nName: {name}\nAge: {age if age is not None else 'unspecified'}\n"
            f"Currently on medications: NO\nLanguage: {language}",
            "",
            "## Allergies (HARD CONSTRAINT — already respected by bundles)",
            allergy_summary,
            "",
            "## All known issues (for issue_coverage mapping)",
            issues_block or "(none)",
            "",
            "## Cluster identification (axes)",
            clusters_block or "(none)",
            "",
            "## Prior plan history (MERGE-mode — extract what worked, refine, do not duplicate)",
            prior_block,
            "",
            "## Cluster bundles (compact summary — full bundles will be re-attached after generation, do NOT echo them)",
            bundles_block,
            "",
            f"## Source paper count\n{sources_count}",
            "",
            "## Hard rules — PLANT-FIRST + MERGE",
            "- DO NOT include cluster_bundles in your output — they will be re-attached programmatically.",
            "- This is a MERGE of prior plans. Carry forward the best plant-based interventions that don't conflict with allergies; "
            "drop redundant or under-performing ones; refine the unified routine.",
            "- All `food_and_drinks.encourage` items MUST be plant-foods (whole grains, legumes, leafy greens, nuts/seeds modulo allergies, "
            "fruits, fermented plant foods, herbs/spices). No animal proteins as primary entries.",
            "- All `food_and_drinks.teas` MUST be herbal teas verified against allergies. Prefer tei (linden), "
            "lemon balm (if no mint allergy), passionflower (evening), tulsi (holy basil), oat-straw, rooibos, "
            "rose hip; avoid chamomile if ragweed-allergic.",
            "- All `supplements` MUST be plant-derived OR plant-rich foods. Acceptable: algal omega-3, lemon balm extract, "
            "saffron extract, magnolia bark, ashwagandha (caution under 12), holy basil, plant-source magnesium/zinc-rich food. "
            "AVOID isolated synthetic minerals as standalone entries.",
            "- Sensory items should reference plant materials where feasible: rice/bean bins, pine cones, herb gardens, "
            "lavender pillows, citrus peels, eucalyptus baths.",
            "- Stepped tiers: Tier 1 = lowest-friction plant-based lifestyle/food/sensory items. Tier 2 = botanical teas + plant-derived supplements. Tier 3 = escalation flags + when to consult.",
            "- Morning/evening/movement/food sections combine across bundles — keep each list <= 5 items.",
            "- Supplements section deduplicates supplements that appear in multiple bundles; <= 5 entries.",
            "- issue_coverage must map every input issue title to at least one section name (pattern bundle name OR routine section name).",
            "- Allergies were already respected by bundles — propagate that respect.",
            "",
            f"## Language\n{lang_instruction}",
            "",
            "## Output schema (JSON only)",
            schema,
        ]
    )


async def synthesize_plan(state: CalmingPlanState) -> dict:
    print(f"[calming_plan] synthesize_plan: enter, bundles={len(state.get('_cluster_bundles') or [])}", flush=True)
    if state.get("error"):
        return {}
    if not state.get("_cluster_bundles"):
        return {"error": "synthesize_plan: no bundles to synthesize"}

    prompt = _build_synthesize_prompt(state)
    brevity = (
        "\n\n## Brevity (HARD)\nKeep every string under 160 chars. "
        "Limit lists strictly: morning_routine<=5, evening_wind_down<=5, supplements<=5, "
        "food.encourage<=5, food.avoid_or_reduce<=5, food.teas<=3, movement<=4, "
        "sensory_and_environment<=5, weekly_check_ins<=4, red_flags<=5. "
        "Tier 1 items<=6, Tier 2 items<=5, Tier 3 items<=5."
    )

    try:
        plan = await _llm_with_brevity_retry(prompt, brevity, temp=0.3, max_tokens=8192)
        # Always splice in the full per-cluster bundles AFTER LLM call. We don't
        # ask the model to echo them — saves 3000-5000 output tokens.
        if isinstance(plan, dict):
            plan["cluster_bundles"] = state.get("_cluster_bundles") or []
        return {"_plan_draft": plan}
    except Exception as exc:
        return {"error": f"synthesize_plan failed: {exc}"}


# ---------------------------------------------------------------------------
# Node: safety_review
# ---------------------------------------------------------------------------
async def safety_review(state: CalmingPlanState) -> dict:
    if state.get("error") or not state.get("_plan_draft"):
        return {}

    member = state.get("_member") or {}
    age = _resolve_age(member.get("age_years"), member.get("date_of_birth"))
    issues = state.get("_issues") or []
    allergies = state.get("_allergies") or []
    characteristics = state.get("_characteristics") or []
    language = state.get("language", "ro")
    plan = state["_plan_draft"]

    issues_summary = "; ".join(f"{i.get('title')} ({i.get('category')})" for i in issues) or "none"

    allergy_summary_lines = [
        f"- [{(a.get('severity') or '').upper()}] {a.get('kind') or 'allergy'}: {a.get('name', '')}"
        + (f" — {a['notes']}" if a.get("notes") else "")
        for a in allergies
    ]
    if member.get("allergies_text"):
        allergy_summary_lines.append(f"- (free-text) {member['allergies_text']}")
    allergies_summary = "\n".join(allergy_summary_lines) or "none recorded"

    characteristics_summary = "; ".join(
        f"{c.get('title')} ({c.get('risk_tier') or 'NONE'})" for c in characteristics
    ) or "none"

    # Send a COMPACT plan summary (not the full plan) to reduce input + output
    # tokens. Bundles already underwent allergy checks during their generation
    # node — safety_review here only audits the SYNTHESIZED layer (stepped tiers,
    # global routines, supplements) and emits notes; it does NOT rewrite the plan.
    plan_compact = {
        "headline": plan.get("headline"),
        "executive_summary": plan.get("executive_summary"),
        "stepped_tiers": plan.get("stepped_tiers"),
        "morning_routine": plan.get("morning_routine"),
        "food_and_drinks": plan.get("food_and_drinks"),
        "movement": plan.get("movement"),
        "evening_wind_down": plan.get("evening_wind_down"),
        "supplements": plan.get("supplements"),
        "sensory_and_environment": plan.get("sensory_and_environment"),
        "weekly_check_ins": plan.get("weekly_check_ins"),
        "red_flags": plan.get("red_flags"),
    }

    prompt = "\n".join(
        [
            "You are a pediatric safety reviewer. Audit the synthesized plan below "
            f"for a {age if age is not None else 'unspecified-age'}-year-old on NO medications. "
            "Per-cluster bundles already passed their own allergy/age checks; you are "
            "auditing the GLOBAL layer only (stepped tiers, routines, supplements, food).",
            "",
            "## Allergies (HARD)",
            allergies_summary,
            "",
            f"## Issues\n{issues_summary}",
            "",
            f"## Characteristics\n{characteristics_summary}",
            "",
            "Audit checklist (in priority order):",
            "1. Allergy violations in `food_and_drinks`, `supplements`, `morning_routine`, `evening_wind_down`. "
            "Apply cross-reactivity: ragweed↔chamomile, mint↔lemon balm, birch↔raw fruit, latex↔banana/avocado/kiwi, "
            "dairy in warm-milk rituals, tree-nut in almond milk, salicylate, soy/egg in supplement excipients.",
            "2. Age-inappropriate supplement doses or adult-only herbs.",
            "3. Sedative herbs in morning routine; daytime sedation risk.",
            "4. Supplement-supplement interactions.",
            "5. Anything that crosses into prescription territory.",
            "",
            "Return a JSON object with exactly ONE key:",
            f'  "notes": "<300-word audit summary in {"Romanian" if language == "ro" else "English"}, listing concrete '
            "concerns to fix and any items the parent should specifically discuss with a clinician. "
            'If clean, say so explicitly>"',
            "Do NOT return the plan — output `notes` only.",
            "",
            "## Plan (compact)",
            json.dumps(plan_compact, ensure_ascii=False),
        ]
    )

    try:
        result = await _deepseek_json(prompt, max_tokens=2000, temperature=0.2)
    except Exception as exc:
        # Safety pass should not gate persistence — keep draft, log note.
        return {"_safety_notes": f"safety_review failed: {exc}"}

    notes = result.get("notes") if isinstance(result, dict) else None

    out: dict = {}
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
        "summary": "Sumar executiv" if is_ro else "Executive summary",
        "tiers": "Trepte de îngrijire" if is_ro else "Stepped care",
        "patterns": "Tipare comportamentale (clustere)" if is_ro else "Behavioral patterns (clusters)",
        "mechanism": "Mecanism" if is_ro else "Mechanism",
        "interventions": "Intervenții" if is_ro else "Interventions",
        "triggers": "Trigger → Răspuns" if is_ro else "Trigger → Response",
        "kpis": "Indicatori de progres" if is_ro else "KPIs",
        "escalation": "Semnale de escaladare" if is_ro else "Escalation signals",
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

    # Executive summary
    if plan.get("executive_summary"):
        lines.append(f"## {h['summary']}")
        lines.append(str(plan["executive_summary"]).strip())
        lines.append("")

    # Stepped tiers
    tiers = plan.get("stepped_tiers") or []
    if tiers:
        lines.append(f"## {h['tiers']}")
        for t in tiers:
            tier_no = t.get("tier", "?")
            tier_name = t.get("name", "")
            review = t.get("review_after_days")
            review_str = f" _(revizuire după {review} zile)_" if (is_ro and review) else (f" _(review after {review} days)_" if review else "")
            lines.append(f"### Tier {tier_no} — {tier_name}{review_str}")
            for it in t.get("items") or []:
                lines.append(f"- {it}")
        lines.append("")

    # Per-cluster bundles (the heart of the deep plan)
    bundles = plan.get("cluster_bundles") or []
    if bundles:
        lines.append(f"## {h['patterns']}")
        for b in bundles:
            cname = b.get("cluster_name", "")
            axis = b.get("axis", "")
            lines.append(f"### {cname} — _{axis}_")
            if b.get("summary"):
                lines.append(b["summary"])
            if b.get("mechanism_explanation"):
                lines.append(f"**{h['mechanism']}:** {b['mechanism_explanation']}")
            interventions = b.get("interventions") or []
            if interventions:
                lines.append(f"#### {h['interventions']}")
                for iv in interventions:
                    cited = ", ".join(str(x) for x in (iv.get("cited_paper_indexes") or []))
                    lines.append(
                        f"- **{iv.get('title', '')}** _(`{iv.get('type', '')}`)_ — {iv.get('specifics', '')}\n"
                        f"  - {iv.get('why_it_works', '')}\n"
                        f"  - Alergeni verificați: {iv.get('respects_allergies', '—')}\n"
                        f"  - Surse: {cited or '—'}"
                    )
            triggers = b.get("trigger_response_pairs") or []
            if triggers:
                lines.append(f"#### {h['triggers']}")
                for tr in triggers:
                    lines.append(
                        f"- **Trigger:** {tr.get('trigger', '')}\n"
                        f"  - **În moment:** {tr.get('in_the_moment_response', '')}\n"
                        f"  - **După:** {tr.get('after_response', '')}"
                    )
            kpis = b.get("kpis") or {}
            if kpis:
                lines.append(f"#### {h['kpis']}")
                for label, key in (("1 săpt." if is_ro else "1 wk", "week_1"), ("4 săpt." if is_ro else "4 wk", "week_4"), ("12 săpt." if is_ro else "12 wk", "week_12")):
                    if kpis.get(key):
                        lines.append(f"- **{label}:** {kpis[key]}")
            esc = b.get("escalation_signals") or []
            if esc:
                lines.append(f"#### {h['escalation']}")
                for s in esc:
                    lines.append(f"- {s}")
            lines.append("")

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

    # Retry once on transient connection/SSL drops — Neon serverless connections
    # can be reaped after long idle (the deep graph holds for 3-5 min).
    last_exc: Optional[Exception] = None
    plan_id = 0
    for attempt in range(2):
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
            break  # success
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                print(f"[calming_plan] persist_plan attempt 1 failed ({exc}); retrying", flush=True)
                await asyncio.sleep(1.0)
            else:
                return {"error": f"persist_plan failed after retry: {exc}"}

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
_LLM_RETRY = RetryPolicy(max_attempts=2, initial_interval=1.0, backoff_factor=2.0)
_FETCH_RETRY = RetryPolicy(max_attempts=3, initial_interval=1.0, backoff_factor=2.0)


def create_calming_plan_graph(checkpointer=None):
    builder = StateGraph(CalmingPlanState)
    builder.add_node("load_context", load_context)
    builder.add_node("analyze_patterns", analyze_patterns, retry=_LLM_RETRY)
    builder.add_node("search_research", search_research, retry=_FETCH_RETRY)
    builder.add_node("generate_bundles", generate_bundles, retry=_LLM_RETRY)
    builder.add_node("synthesize_plan", synthesize_plan, retry=_LLM_RETRY)
    builder.add_node("safety_review", safety_review, retry=_LLM_RETRY)
    builder.add_node("persist_plan", persist_plan)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "analyze_patterns")
    builder.add_edge("analyze_patterns", "search_research")
    builder.add_edge("search_research", "generate_bundles")
    builder.add_edge("generate_bundles", "synthesize_plan")
    builder.add_edge("synthesize_plan", "safety_review")
    builder.add_edge("safety_review", "persist_plan")
    builder.add_edge("persist_plan", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


# Module-level eager graph for the LangGraph server.
graph = create_calming_plan_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_calming_plan_graph, graph)
