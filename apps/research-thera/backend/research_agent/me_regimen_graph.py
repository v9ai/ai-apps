"""Regimen Interaction Screen — analyses the user's full active regimen at once.

For a person-scoped slug ("me" or "bogdan"), loads every active medication,
pulls the existing drug-level facts already populated by
``medication_deep_research_graph`` (pharmacology, interactions, indications),
then:

  1. Screens for pairwise interactions across the regimen by querying the
     ``medication_interactions`` table for ordered pairs (a, b) where row a's
     ``interacting_drug`` matches drug b. Symmetric pairs are deduplicated.
  2. Detects duplicate therapies by grouping meds by ATC level-3 prefix
     (positions 0..4 of the ATC code, e.g. ``R03DC`` for leukotriene receptor
     antagonists). Two or more meds in the same ATC-3 group → flag.
  3. Synthesises a clinician-readable summary via DeepSeek, returning an
     overall severity ('none' | 'low' | 'moderate' | 'high'), a list of
     ``RegimenFlag`` objects (interaction / duplicate / risky-combo), and the
     list of drug slugs missing facts (so the UI can suggest running the
     per-drug ``medication_deep_research`` graph first).
  4. UPSERTS into ``regimen_analysis`` keyed on (user_id, slug). One row per
     person view; subsequent runs overwrite.

Heavy graph: registered with concurrency=1 in ``app.py`` since the LLM
synthesis is expensive and the duplicate / interaction screens hit the DB
hard for users with large regimens.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
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
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
SYNTHESIS_MAX_TOKENS = 3072

_VALID_SEVERITIES_OVERALL = {"none", "low", "moderate", "high"}
_VALID_FLAG_TYPES = {"interaction", "duplicate", "risky_combo"}
_VALID_FLAG_SEVERITIES = {"low", "moderate", "high"}

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent clinical Romanian — translate the summary, "
    "messages, and recommendations. Do NOT translate: drug brand names, generic INN, "
    "ATC codes. Preserve enum values exactly as English lowercase tokens: "
    "'interaction'/'duplicate'/'risky_combo' for flag types and 'none'/'low'/"
    "'moderate'/'high' for severities."
)


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class MeRegimenState(TypedDict, total=False):
    # Inputs
    user_email: str
    slug: str  # 'me' | 'bogdan'
    job_id: Optional[str]
    language: Optional[str]  # 'ro' | 'en'

    # Internals populated by nodes
    _meds: list[dict]
    _drug_facts: dict           # {drug_slug: {pharmacology, indications[], interactions[]}}
    _missing_facts: list[str]   # drug_slugs with no pharmacology row
    _pairwise_interactions: list[dict]
    _duplicates: list[dict]     # [{atc_prefix, drugs: [slug, ...]}]
    _analysis: dict             # {summary, severity_overall, flags[]}

    # Outputs
    success: bool
    message: str
    counts: dict
    error: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _deepseek_json(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.0,
    timeout: float = 90.0,
    max_tokens: int = SYNTHESIS_MAX_TOKENS,
) -> Optional[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[me_regimen] DEEPSEEK_API_KEY not set")
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
            print(f"[me_regimen] DeepSeek HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        body = resp.json()
        content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            print(f"[me_regimen] JSON parse failed: {content[:200]}")
            return None
    except Exception as exc:
        print(f"[me_regimen] DeepSeek error: {exc}")
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
        print(f"[me_regimen] update_job_progress failed: {exc}")


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
        print(f"[me_regimen] update_job_succeeded failed: {exc}")


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
        print(f"[me_regimen] update_job_failed failed: {exc}")


def _atc3_prefix(atc_code: Optional[str]) -> Optional[str]:
    """ATC level-3 = first 5 chars (e.g. 'R03DC' from 'R03DC03'). Returns None
    when the code is too short or missing."""
    if not atc_code or len(atc_code) < 5:
        return None
    return atc_code[:5].upper()


# ---------------------------------------------------------------------------
# Node: load_active_meds
# ---------------------------------------------------------------------------
async def load_active_meds(state: MeRegimenState) -> dict:
    user_email = (state.get("user_email") or "").strip().lower()
    slug = (state.get("slug") or "").strip().lower()
    job_id = state.get("job_id")

    if not user_email:
        return {"error": "user_email is required", "success": False}
    if slug not in {"me", "bogdan"}:
        return {"error": "slug must be 'me' or 'bogdan'", "success": False}

    await _update_job_progress(job_id, 5)

    try:
        meds = await neon.fetch_active_medications_for_person(user_email, slug)
    except Exception as exc:
        await _update_job_failed(job_id, {"message": str(exc), "code": "LOAD_FAILED"})
        return {"error": f"failed to load medications: {exc}", "success": False}

    if not meds:
        msg = f"No active medications for slug '{slug}'"
        await _update_job_succeeded(job_id, {"meds": 0, "flags": 0, "message": msg})
        return {
            "_meds": [],
            "_drug_facts": {},
            "_missing_facts": [],
            "_pairwise_interactions": [],
            "_duplicates": [],
            "_analysis": {
                "summary": msg,
                "severity_overall": "none",
                "flags": [],
            },
            "success": True,
            "message": msg,
            "counts": {"meds": 0, "interactions": 0, "duplicates": 0, "flags": 0},
        }

    # Auto-derive language from family member preference if not provided.
    language = (state.get("language") or "").strip().lower() or None
    if not language:
        prefs = [m.get("family_member_preferred_language") for m in meds]
        for p in prefs:
            if p:
                language = p
                break

    await _update_job_progress(job_id, 15)
    return {
        "_meds": meds,
        "language": language,
    }


# ---------------------------------------------------------------------------
# Node: load_drug_facts
# ---------------------------------------------------------------------------
async def load_drug_facts(state: MeRegimenState) -> dict:
    meds = state.get("_meds") or []
    job_id = state.get("job_id")
    if not meds:
        return {}

    drug_slugs = sorted({m["drug_slug"] for m in meds if m.get("drug_slug")})
    if not drug_slugs:
        await _update_job_progress(job_id, 35)
        return {"_drug_facts": {}, "_missing_facts": []}

    facts: dict[str, dict] = {ds: {"pharmacology": None, "indications": [], "interactions": []} for ds in drug_slugs}

    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT drug_slug, generic_name, brand_names, atc_code, moa, half_life
                FROM medication_pharmacology
                WHERE drug_slug = ANY(%s)
                """,
                (drug_slugs,),
            )
            for r in await cur.fetchall():
                facts[r[0]]["pharmacology"] = {
                    "generic_name": r[1],
                    "brand_names": r[2],
                    "atc_code": r[3],
                    "moa": r[4],
                    "half_life": r[5],
                }

            await cur.execute(
                """
                SELECT drug_slug, kind, condition, evidence_level
                FROM medication_indications
                WHERE drug_slug = ANY(%s)
                """,
                (drug_slugs,),
            )
            for r in await cur.fetchall():
                facts[r[0]]["indications"].append({
                    "kind": r[1],
                    "condition": r[2],
                    "evidence_level": r[3],
                })

            await cur.execute(
                """
                SELECT drug_slug, interacting_drug, severity, mechanism, recommendation, source_url
                FROM medication_interactions
                WHERE drug_slug = ANY(%s)
                """,
                (drug_slugs,),
            )
            for r in await cur.fetchall():
                facts[r[0]]["interactions"].append({
                    "interacting_drug": r[1],
                    "severity": r[2],
                    "mechanism": r[3],
                    "recommendation": r[4],
                    "source_url": r[5],
                })

    missing = [ds for ds in drug_slugs if facts[ds]["pharmacology"] is None]

    await _update_job_progress(job_id, 35)
    return {"_drug_facts": facts, "_missing_facts": missing}


# ---------------------------------------------------------------------------
# Node: screen_pairwise_interactions
# ---------------------------------------------------------------------------
async def screen_pairwise_interactions(state: MeRegimenState) -> dict:
    meds = state.get("_meds") or []
    facts = state.get("_drug_facts") or {}
    job_id = state.get("job_id")

    drug_slugs = sorted({m["drug_slug"] for m in meds if m.get("drug_slug")})
    if len(drug_slugs) < 2:
        await _update_job_progress(job_id, 55)
        return {"_pairwise_interactions": []}

    # For each drug A in the regimen, scan its `interactions` rows for any
    # `interacting_drug` text that contains another regimen drug's slug or
    # generic name (case-insensitive substring match).
    pair_to_interaction: dict[tuple[str, str], dict] = {}

    def _names_for(slug_val: str) -> list[str]:
        names = [slug_val]
        pharm = (facts.get(slug_val) or {}).get("pharmacology") or {}
        gn = (pharm.get("generic_name") or "").strip().lower()
        if gn:
            names.append(gn)
        # brand_names is stored as jsonb (list of strings)
        bns = pharm.get("brand_names") or []
        if isinstance(bns, list):
            for bn in bns:
                if isinstance(bn, str) and bn.strip():
                    names.append(bn.strip().lower())
        return list({n for n in names if n})

    for a in drug_slugs:
        a_interactions = (facts.get(a) or {}).get("interactions") or []
        for b in drug_slugs:
            if a == b:
                continue
            b_names = _names_for(b)
            for inter in a_interactions:
                hay = (inter.get("interacting_drug") or "").strip().lower()
                if not hay:
                    continue
                if any(name in hay for name in b_names):
                    key = tuple(sorted((a, b)))
                    existing = pair_to_interaction.get(key)
                    candidate = {
                        "drugs": list(key),
                        "severity": inter.get("severity"),
                        "mechanism": inter.get("mechanism"),
                        "recommendation": inter.get("recommendation"),
                        "source_url": inter.get("source_url"),
                    }
                    # Prefer the row with the most severe rating.
                    severity_rank = {"contraindicated": 4, "major": 3, "moderate": 2, "minor": 1}
                    new_rank = severity_rank.get((candidate.get("severity") or "").lower(), 0)
                    old_rank = severity_rank.get(((existing or {}).get("severity") or "").lower(), -1)
                    if not existing or new_rank > old_rank:
                        pair_to_interaction[key] = candidate

    pairwise = list(pair_to_interaction.values())
    await _update_job_progress(job_id, 55)
    return {"_pairwise_interactions": pairwise}


# ---------------------------------------------------------------------------
# Node: detect_duplicates
# ---------------------------------------------------------------------------
async def detect_duplicates(state: MeRegimenState) -> dict:
    meds = state.get("_meds") or []
    job_id = state.get("job_id")

    by_atc3: dict[str, list[str]] = {}
    for m in meds:
        prefix = _atc3_prefix(m.get("atc_code"))
        if not prefix:
            continue
        ds = m.get("drug_slug") or ""
        if not ds:
            continue
        by_atc3.setdefault(prefix, [])
        if ds not in by_atc3[prefix]:
            by_atc3[prefix].append(ds)

    duplicates = [
        {"atc_prefix": k, "drugs": sorted(v)}
        for k, v in by_atc3.items()
        if len(v) >= 2
    ]
    await _update_job_progress(job_id, 70)
    return {"_duplicates": duplicates}


# ---------------------------------------------------------------------------
# Node: synthesize
# ---------------------------------------------------------------------------
async def synthesize(state: MeRegimenState) -> dict:
    meds = state.get("_meds") or []
    facts = state.get("_drug_facts") or {}
    pairwise = state.get("_pairwise_interactions") or []
    duplicates = state.get("_duplicates") or []
    missing = state.get("_missing_facts") or []
    language = (state.get("language") or "").strip().lower()
    job_id = state.get("job_id")

    if not meds:
        await _update_job_progress(job_id, 90)
        return {
            "_analysis": {
                "summary": "No active medications.",
                "severity_overall": "none",
                "flags": [],
            }
        }

    # Compact regimen description for the LLM.
    regimen_desc: list[dict] = []
    for m in meds:
        pharm = (facts.get(m.get("drug_slug") or "") or {}).get("pharmacology") or {}
        regimen_desc.append({
            "name": m.get("name"),
            "drug_slug": m.get("drug_slug"),
            "dosage": m.get("dosage"),
            "frequency": m.get("frequency"),
            "atc_code": m.get("atc_code") or pharm.get("atc_code"),
            "generic_name": pharm.get("generic_name"),
        })

    system_prompt = (
        "You are a clinical pharmacist reviewing a patient's complete medication regimen. "
        "Your task is to synthesize a concise, actionable assessment from already-screened "
        "interactions and duplicate-therapy candidates. Be specific and conservative — only "
        "flag what is materially relevant to patient safety or efficacy. Output STRICT JSON "
        "matching the requested schema; never include prose outside JSON."
    )
    if language == "ro":
        system_prompt = system_prompt + " " + ROMANIAN_INSTRUCTION

    schema_hint = {
        "summary": "1-3 sentence overall assessment of the regimen",
        "severity_overall": "one of: none, low, moderate, high",
        "flags": [
            {
                "type": "one of: interaction, duplicate, risky_combo",
                "drugs": ["drug_slug_a", "drug_slug_b"],
                "severity": "one of: low, moderate, high",
                "message": "what is the issue, in one sentence",
                "recommendation": "what the patient/clinician should do, optional",
            }
        ],
    }

    prompt = (
        "Regimen:\n"
        + json.dumps(regimen_desc, indent=2)
        + "\n\nDB-screened pairwise interactions:\n"
        + json.dumps(pairwise, indent=2)
        + "\n\nDuplicate-therapy candidates (same ATC level-3 group):\n"
        + json.dumps(duplicates, indent=2)
        + "\n\nDrug slugs missing pharmacology facts (no DB record yet):\n"
        + json.dumps(missing, indent=2)
        + "\n\nReturn JSON in exactly this shape:\n"
        + json.dumps(schema_hint, indent=2)
        + "\n\nRules:\n"
        + "- One flag per distinct issue. Drug pairs already in the screened interactions "
        + "list MUST appear as a flag with type='interaction' and the same severity if "
        + "the screened severity is 'major' or 'contraindicated' (map to 'high'), "
        + "'moderate' (→'moderate'), 'minor' (→'low').\n"
        + "- Each duplicate-therapy candidate MUST appear as a flag with type='duplicate' "
        + "and severity='moderate' unless any overlap is clinically benign (then 'low').\n"
        + "- 'severity_overall' = the highest flag severity present, else 'none'.\n"
        + "- 'drugs' is the list of drug_slugs involved (lowercase, first-word).\n"
    )

    parsed = await _deepseek_json(prompt, system_prompt=system_prompt) or {}

    summary = (parsed.get("summary") or "").strip() or "Regimen reviewed; see flags below."
    severity_overall = (parsed.get("severity_overall") or "").strip().lower()
    if severity_overall not in _VALID_SEVERITIES_OVERALL:
        severity_overall = "none"

    raw_flags = parsed.get("flags") or []
    flags: list[dict] = []
    if isinstance(raw_flags, list):
        for f in raw_flags:
            if not isinstance(f, dict):
                continue
            ftype = str(f.get("type") or "").strip().lower()
            sev = str(f.get("severity") or "").strip().lower()
            msg = str(f.get("message") or "").strip()
            drugs_raw = f.get("drugs") or []
            if ftype not in _VALID_FLAG_TYPES:
                continue
            if sev not in _VALID_FLAG_SEVERITIES:
                sev = "moderate"
            if not msg:
                continue
            drugs = [str(d).strip().lower() for d in drugs_raw if isinstance(d, str) and d.strip()]
            rec_raw = f.get("recommendation")
            recommendation = str(rec_raw).strip() if isinstance(rec_raw, str) and rec_raw.strip() else None
            flags.append({
                "type": ftype,
                "drugs": drugs,
                "severity": sev,
                "message": msg,
                "recommendation": recommendation,
            })

    # Recompute overall severity from the validated flag list to stay consistent.
    sev_rank = {"none": 0, "low": 1, "moderate": 2, "high": 3}
    if flags:
        worst = max((sev_rank.get(f["severity"], 0) for f in flags), default=0)
        # Round-trip back to the label.
        for label, rank in sev_rank.items():
            if rank == worst:
                severity_overall = label

    await _update_job_progress(job_id, 90)
    return {
        "_analysis": {
            "summary": summary,
            "severity_overall": severity_overall,
            "flags": flags,
        }
    }


# ---------------------------------------------------------------------------
# Node: persist_analysis
# ---------------------------------------------------------------------------
async def persist_analysis(state: MeRegimenState) -> dict:
    user_email = (state.get("user_email") or "").strip().lower()
    slug = (state.get("slug") or "").strip().lower()
    meds = state.get("_meds") or []
    missing = state.get("_missing_facts") or []
    analysis = state.get("_analysis") or {}
    language = state.get("language")
    job_id = state.get("job_id")

    summary = analysis.get("summary") or ""
    severity_overall = analysis.get("severity_overall") or "none"
    flags = analysis.get("flags") or []

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO regimen_analysis (
                        user_id, slug, severity_overall, summary, flags,
                        missing_facts, meds_count, language, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, NOW())
                    ON CONFLICT (user_id, slug) DO UPDATE SET
                        severity_overall = EXCLUDED.severity_overall,
                        summary = EXCLUDED.summary,
                        flags = EXCLUDED.flags,
                        missing_facts = EXCLUDED.missing_facts,
                        meds_count = EXCLUDED.meds_count,
                        language = EXCLUDED.language,
                        updated_at = NOW()
                    """,
                    (
                        user_email,
                        slug,
                        severity_overall,
                        summary,
                        json.dumps(flags),
                        json.dumps(missing),
                        len(meds),
                        language,
                    ),
                )
    except Exception as exc:
        await _update_job_failed(job_id, {"message": str(exc), "code": "PERSIST_FAILED"})
        return {"error": f"failed to persist regimen_analysis: {exc}", "success": False}

    counts = {
        "meds": len(meds),
        "interactions": sum(1 for f in flags if f.get("type") == "interaction"),
        "duplicates": sum(1 for f in flags if f.get("type") == "duplicate"),
        "risky_combos": sum(1 for f in flags if f.get("type") == "risky_combo"),
        "flags": len(flags),
        "missing_facts": len(missing),
    }
    msg = f"Regimen analysis complete: {counts['flags']} flag(s) across {counts['meds']} medication(s)."

    await _update_job_succeeded(job_id, {**counts, "severity_overall": severity_overall, "message": msg})
    return {
        "success": True,
        "message": msg,
        "counts": counts,
    }


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------
_LLM_RETRY = RetryPolicy(max_attempts=2, initial_interval=1.0, backoff_factor=2.0)


def create_me_regimen_graph(checkpointer=None):
    builder = StateGraph(MeRegimenState)
    builder.add_node("load_active_meds", load_active_meds)
    builder.add_node("load_drug_facts", load_drug_facts)
    builder.add_node("screen_pairwise_interactions", screen_pairwise_interactions)
    builder.add_node("detect_duplicates", detect_duplicates)
    builder.add_node("synthesize", synthesize, retry=_LLM_RETRY)
    builder.add_node("persist_analysis", persist_analysis)

    builder.add_edge(START, "load_active_meds")
    builder.add_edge("load_active_meds", "load_drug_facts")
    builder.add_edge("load_drug_facts", "screen_pairwise_interactions")
    builder.add_edge("screen_pairwise_interactions", "detect_duplicates")
    builder.add_edge("detect_duplicates", "synthesize")
    builder.add_edge("synthesize", "persist_analysis")
    builder.add_edge("persist_analysis", END)

    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


graph = create_me_regimen_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_me_regimen_graph, graph)
