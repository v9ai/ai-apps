"""Medication deep-research workflow.

Given a medication slug (e.g. "singulair") and a user_email, this graph:
  1. Loads every `medications` row for that user whose first-word-lowercased
     name matches the slug.
  2. Caches drug-level facts on `drug_slug` for 30 days. When fresh, skips the
     whole facts pipeline and jumps straight to the per-row paper fan-out.
  3. Otherwise: normalises the drug (LLM → generic name + brands + ATC code),
     fetches DailyMed SPL + openFDA label + RxNav interactions in parallel,
     extracts indications / dosing / pharmacology / adverse events / black-box
     warnings / interactions via DeepSeek JSON, and UPSERTs into the 5
     medication_* tables.
  4. Fans out to `generate_therapy_research_graph` for each unique
     (drug_slug, family_member_id) pair to populate `therapy_research` papers
     scoped to each affected patient.

Heavy graph: concurrency = 1 in app.py. Heavy because the per-row paper
fan-out chains into another heavy graph; running >1 of these in parallel
would just serialise downstream anyway.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional, TypedDict

import httpx
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy

from research_agent import neon

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from research_client import dailymed, openfda, rxnav  # noqa: E402

from .graph import create_research_pipeline  # noqa: E402


# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------
FRESHNESS_DAYS = 30
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
EXTRACTION_MAX_TOKENS = 8192  # SPL XML is large — bump from 4096 default
SPL_TEXT_LIMIT = 60000  # truncate XML before LLM extraction
PAPER_RUN_TIMEOUT = 600  # per-row paper run timeout (mirrors /runs/wait)


_VALID_POPULATIONS = {"adult", "pediatric", "elderly", "renal", "hepatic"}
_VALID_FREQUENCY_BANDS = {"common", "uncommon", "rare", "black_box"}
_VALID_SEVERITIES = {"contraindicated", "major", "moderate", "minor"}
_VALID_INDICATION_KINDS = {"primary", "off_label"}
_VALID_CORRELATION_TYPES = {"possible_side_effect", "indication_match", "temporal", "other"}
_VALID_RELATED_ENTITY_TYPES = {"issue", "journal_entry", "observation", "teacher_feedback"}

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent clinical Romanian. Translate event names, "
    "rationales, dosing instructions, mechanisms, and recommendations. "
    "Do NOT translate: drug brand names, generic INN, ATC codes, RxCUIs, ICD codes, "
    "patient names, or proper nouns. Preserve enum values exactly as English "
    "lowercase tokens: 'primary'/'off_label', 'adult'/'pediatric'/'elderly'/'renal'/"
    "'hepatic', 'common'/'uncommon'/'rare'/'black_box', 'contraindicated'/'major'/"
    "'moderate'/'minor', 'possible_side_effect'/'indication_match'/'temporal'/'other', "
    "'issue'/'journal_entry'."
)


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class MedicationDeepResearchState(TypedDict, total=False):
    # Inputs
    user_email: str
    slug: str
    job_id: Optional[str]
    # Language for the consumer-facing extracted text. "ro" or "en".
    # Auto-derived in load_rows from family_members.preferred_language when
    # the caller didn't pass one.
    language: Optional[str]

    # Internals populated by nodes
    _rows: list[dict]
    _drug_meta: dict  # {generic_name, brand_names[], atc_code, drug_slug}
    _sources: dict    # {dailymed: {...}, openfda: {...}, rxnav: [...]}
    _facts: dict      # extracted structured facts
    _cache_hit: bool

    # Outputs
    success: bool
    message: str
    counts: dict      # {indications, dosing, pharmacology, adverse_events, interactions, papers, correlations}
    error: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _slugify(name: str) -> str:
    """Match `app/medications/[slug]/page.tsx` slugify: first word, lowercased."""
    if not name:
        return ""
    parts = re.findall(r"[A-Za-z0-9]+", name)
    return parts[0].lower() if parts else ""


def _resolve_age(age_years: Optional[int], dob: Optional[str]) -> Optional[int]:
    """Mirror the TS resolveAge in generateResearch.ts: prefer age_years, fall
    back to a YYYY-MM-DD dob.  Returns None when neither is usable."""
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


async def _deepseek_json(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.0,
    timeout: float = 90.0,
    max_tokens: int = 4096,
) -> Optional[dict]:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[medication_deep_research] DEEPSEEK_API_KEY not set")
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
            print(f"[medication_deep_research] DeepSeek HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        body = resp.json()
        content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            print(f"[medication_deep_research] JSON parse failed: {content[:200]}")
            return None
    except Exception as exc:
        print(f"[medication_deep_research] DeepSeek error: {exc}")
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
        print(f"[medication_deep_research] update_job_progress failed: {exc}")


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
        print(f"[medication_deep_research] update_job_succeeded failed: {exc}")


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
        print(f"[medication_deep_research] update_job_failed failed: {exc}")


# ---------------------------------------------------------------------------
# Node: load_rows
# ---------------------------------------------------------------------------
async def load_rows(state: MedicationDeepResearchState) -> dict:
    user_email = (state.get("user_email") or "").strip().lower()
    slug = (state.get("slug") or "").strip().lower()
    job_id = state.get("job_id")

    if not user_email:
        return {"error": "user_email is required", "success": False}
    if not slug:
        return {"error": "slug is required", "success": False}

    await _update_job_progress(job_id, 5)

    try:
        rows = await neon.fetch_medications_for_slug(user_email, slug)
    except Exception as exc:
        return {"error": f"load_rows failed: {exc}", "success": False}

    if not rows:
        # Not an error — caller passed a slug nobody is on. Return early with a
        # helpful message; the rest of the graph short-circuits.
        return {
            "_rows": [],
            "success": True,
            "message": f"No medications found for slug '{slug}'",
            "counts": {"indications": 0, "dosing": 0, "pharmacology": 0,
                       "adverse_events": 0, "interactions": 0, "papers": 0},
        }

    # Auto-derive language: caller-supplied wins; otherwise inherit from the
    # first row's family_member.preferred_language. "Bogdan-related" content
    # is enforced Romanian via this column.
    out: dict = {"_rows": rows}
    explicit_lang = (state.get("language") or "").strip().lower()
    if not explicit_lang:
        derived = next(
            (r.get("family_member_preferred_language") for r in rows
             if (r.get("family_member_preferred_language") or "").strip()),
            None,
        )
        if derived:
            out["language"] = derived.strip().lower()
    return out


# ---------------------------------------------------------------------------
# Node: check_freshness  (also normalises drug_slug + picks a representative name)
# ---------------------------------------------------------------------------
async def check_freshness(state: MedicationDeepResearchState) -> dict:
    rows = state.get("_rows") or []
    if not rows:
        return {"_cache_hit": True}  # nothing to do; finalize will short-circuit

    # Use the requested slug as drug_slug — every row in `rows` already matches it.
    drug_slug = (state.get("slug") or "").strip().lower()

    # An explicit language request always re-runs the facts pipeline so the
    # cached rows get rewritten in the requested language. Language is the
    # one axis the 30-day cache cannot honour.
    has_lang = bool((state.get("language") or "").strip())

    last_updated = await neon.fetch_pharmacology_updated_at(drug_slug)
    fresh = False
    if last_updated and not has_lang:
        try:
            ts = datetime.fromisoformat(last_updated.replace(" ", "T"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            fresh = (datetime.now(timezone.utc) - ts) < timedelta(days=FRESHNESS_DAYS)
        except ValueError:
            fresh = False

    return {
        "_cache_hit": fresh,
        "_drug_meta": {"drug_slug": drug_slug, "raw_name": rows[0]["name"]},
    }


def _route_after_freshness(state: MedicationDeepResearchState) -> str:
    return "skip" if state.get("_cache_hit") else "refresh"


# ---------------------------------------------------------------------------
# Node: normalize_drug (LLM)
# ---------------------------------------------------------------------------
async def normalize_drug(state: MedicationDeepResearchState) -> dict:
    meta = dict(state.get("_drug_meta") or {})
    raw_name = meta.get("raw_name") or ""
    drug_slug = meta.get("drug_slug") or _slugify(raw_name)

    await _update_job_progress(state.get("job_id"), 15)

    prompt = (
        f"You are a clinical pharmacist. Map the medication entry below to its canonical drug.\n\n"
        f"Raw entry: {raw_name!r}\n"
        f'Slug (first-word, lowercased): {drug_slug!r}\n\n'
        "Respond with JSON: {\"generic_name\": str, \"brand_names\": [str], \"atc_code\": str|null}\n"
        "Use the WHO INN for generic_name (e.g. \"montelukast\" not \"Singulair\"). "
        "Include common international brand names. Use the official 5-7 char ATC code if known."
    )
    parsed = await _deepseek_json(prompt, max_tokens=512) or {}
    generic = (parsed.get("generic_name") or "").strip() or None
    brands_raw = parsed.get("brand_names") or []
    brand_names: list[str] = [str(b).strip() for b in brands_raw if str(b).strip()][:10]
    atc = (parsed.get("atc_code") or "").strip() or None

    meta.update({
        "generic_name": generic,
        "brand_names": brand_names,
        "atc_code": atc,
    })
    return {"_drug_meta": meta}


# ---------------------------------------------------------------------------
# Node: fetch_sources (DailyMed + openFDA + RxNav in parallel)
# ---------------------------------------------------------------------------
async def fetch_sources(state: MedicationDeepResearchState) -> dict:
    meta = state.get("_drug_meta") or {}
    # Prefer the LLM-normalised generic name when we have it — DailyMed/openFDA
    # match more reliably on INN than brand names.
    drug_query = meta.get("generic_name") or meta.get("raw_name") or state.get("slug") or ""

    await _update_job_progress(state.get("job_id"), 30)

    spl_task = asyncio.create_task(dailymed.fetch_label(drug_query))
    fda_task = asyncio.create_task(openfda.fetch_label(drug_query))
    rxn_task = asyncio.create_task(rxnav.fetch_interactions(drug_query))

    spl, fda, rxn = await asyncio.gather(spl_task, fda_task, rxn_task, return_exceptions=True)

    def _safe(v: Any) -> Any:
        return None if isinstance(v, Exception) else v

    return {
        "_sources": {
            "dailymed": _safe(spl) or {},
            "openfda": _safe(fda) or {},
            "rxnav": _safe(rxn) or [],
        }
    }


# ---------------------------------------------------------------------------
# Node: extract_facts (DeepSeek JSON over openFDA structured fields + SPL excerpt)
# ---------------------------------------------------------------------------
def _build_extraction_prompt(meta: dict, sources: dict, language: Optional[str] = None) -> str:
    fda = sources.get("openfda") or {}
    spl = sources.get("dailymed") or {}
    spl_xml = (spl.get("xml") or "")[:SPL_TEXT_LIMIT]

    def _join(field: Any) -> str:
        if isinstance(field, list):
            return "\n".join(str(x) for x in field if x)
        return str(field or "")

    sections: list[str] = [
        "You are a clinical pharmacist extracting structured facts from FDA drug labeling.",
        f"Drug: generic={meta.get('generic_name')!r}, brands={meta.get('brand_names')}, ATC={meta.get('atc_code')!r}.",
        "",
        "## openFDA structured fields (authoritative when present):",
        f"### boxed_warning\n{_join(fda.get('boxed_warning'))}",
        f"### indications_and_usage\n{_join(fda.get('indications_and_usage'))}",
        f"### dosage_and_administration\n{_join(fda.get('dosage_and_administration'))}",
        f"### use_in_specific_populations\n{_join(fda.get('use_in_specific_populations'))}",
        f"### pediatric_use\n{_join(fda.get('pediatric_use'))}",
        f"### geriatric_use\n{_join(fda.get('geriatric_use'))}",
        f"### adverse_reactions\n{_join(fda.get('adverse_reactions'))}",
        f"### drug_interactions\n{_join(fda.get('drug_interactions'))}",
        f"### mechanism_of_action\n{_join(fda.get('mechanism_of_action'))}",
        f"### clinical_pharmacology\n{_join(fda.get('clinical_pharmacology'))}",
        f"### pharmacokinetics\n{_join(fda.get('pharmacokinetics'))}",
        "",
        "## DailyMed SPL XML excerpt (use when openFDA fields are sparse):",
        spl_xml,
        "",
        "## Output schema (return ONLY this JSON shape):",
        "{",
        '  "indications": [{"kind": "primary"|"off_label", "condition": str, "evidence_level": str|null, "confidence": int|null}],',
        '  "dosing":      [{"population": "adult"|"pediatric"|"elderly"|"renal"|"hepatic", "age_band": str|null, "weight_band": str|null, "dose_text": str, "frequency": str|null, "max_daily": str|null}],',
        '  "pharmacology":{"moa": str|null, "half_life": str|null, "peak_time": str|null, "metabolism": str|null, "excretion": str|null},',
        '  "adverse_events": [{"event": str, "frequency_band": "common"|"uncommon"|"rare"|"black_box", "severity": str|null}],',
        '  "interactions": [{"interacting_drug": str, "severity": "contraindicated"|"major"|"moderate"|"minor", "mechanism": str|null, "recommendation": str|null}]',
        "}",
        "",
        "Rules:",
        "- For ANY content from boxed_warning, ALSO emit it under adverse_events with frequency_band=\"black_box\".",
        "- Cap each list at 30 items; pick the most clinically important.",
        "- Use plain English event names (\"headache\" not \"cephalalgia\"); preserve clinical terms only when no plain equivalent exists.",
        "- Only include indications/dosing explicitly supported by the labeling above.",
    ]
    body = "\n\n".join(sections)
    if (language or "").strip().lower() == "ro":
        return ROMANIAN_INSTRUCTION + "\n\n" + body
    return body


async def extract_facts(state: MedicationDeepResearchState) -> dict:
    meta = state.get("_drug_meta") or {}
    sources = state.get("_sources") or {}

    await _update_job_progress(state.get("job_id"), 50)

    fda = sources.get("openfda") or {}
    spl = sources.get("dailymed") or {}
    if not fda and not spl:
        # No SPL/openFDA data at all → still seed pharmacology row from the
        # LLM-normalised meta + interactions from RxNav so the cache write
        # downstream still happens. extract_facts returns empty lists.
        return {"_facts": {"indications": [], "dosing": [], "pharmacology": {},
                           "adverse_events": [], "interactions": []}}

    prompt = _build_extraction_prompt(meta, sources, state.get("language"))
    parsed = await _deepseek_json(prompt, max_tokens=EXTRACTION_MAX_TOKENS) or {}

    return {
        "_facts": {
            "indications": parsed.get("indications") or [],
            "dosing": parsed.get("dosing") or [],
            "pharmacology": parsed.get("pharmacology") or {},
            "adverse_events": parsed.get("adverse_events") or [],
            "interactions": parsed.get("interactions") or [],
        }
    }


# ---------------------------------------------------------------------------
# Node: persist_facts
# ---------------------------------------------------------------------------
async def persist_facts(state: MedicationDeepResearchState) -> dict:
    meta = state.get("_drug_meta") or {}
    sources = state.get("_sources") or {}
    facts = state.get("_facts") or {}
    drug_slug = meta.get("drug_slug")
    if not drug_slug:
        return {"error": "no drug_slug to persist"}

    await _update_job_progress(state.get("job_id"), 65)

    spl = sources.get("dailymed") or {}
    fda = sources.get("openfda") or {}
    primary_url = spl.get("source_url") or openfda.label_url(fda) or None

    counts = {"indications": 0, "dosing": 0, "pharmacology": 0,
              "adverse_events": 0, "interactions": 0, "papers": 0}

    pharm = facts.get("pharmacology") or {}
    try:
        await neon.upsert_medication_pharmacology(
            drug_slug=drug_slug,
            generic_name=meta.get("generic_name"),
            brand_names=meta.get("brand_names") or [],
            atc_code=meta.get("atc_code"),
            moa=pharm.get("moa"),
            half_life=pharm.get("half_life"),
            peak_time=pharm.get("peak_time"),
            metabolism=pharm.get("metabolism"),
            excretion=pharm.get("excretion"),
            source_url=primary_url,
        )
        counts["pharmacology"] = 1
    except Exception as exc:
        print(f"[medication_deep_research] pharmacology UPSERT failed: {exc}")

    for ind in facts.get("indications") or []:
        kind = (ind.get("kind") or "primary").strip().lower()
        if kind not in _VALID_INDICATION_KINDS:
            kind = "primary"
        condition = (ind.get("condition") or "").strip()
        if not condition:
            continue
        try:
            await neon.upsert_medication_indication(
                drug_slug=drug_slug,
                kind=kind,
                condition=condition[:300],
                evidence_level=ind.get("evidence_level"),
                source="DailyMed/openFDA",
                source_url=primary_url,
                confidence=ind.get("confidence"),
            )
            counts["indications"] += 1
        except Exception as exc:
            print(f"[medication_deep_research] indication UPSERT failed: {exc}")

    for dose in facts.get("dosing") or []:
        pop = (dose.get("population") or "").strip().lower()
        if pop not in _VALID_POPULATIONS:
            continue
        dose_text = (dose.get("dose_text") or "").strip()
        if not dose_text:
            continue
        try:
            await neon.upsert_medication_dosing(
                drug_slug=drug_slug,
                population=pop,
                dose_text=dose_text[:600],
                age_band=(dose.get("age_band") or None),
                weight_band=(dose.get("weight_band") or None),
                frequency=(dose.get("frequency") or None),
                max_daily=(dose.get("max_daily") or None),
                source_url=primary_url,
            )
            counts["dosing"] += 1
        except Exception as exc:
            print(f"[medication_deep_research] dosing UPSERT failed: {exc}")

    for ae in facts.get("adverse_events") or []:
        event = (ae.get("event") or "").strip()
        if not event:
            continue
        band = (ae.get("frequency_band") or "common").strip().lower()
        if band not in _VALID_FREQUENCY_BANDS:
            band = "common"
        try:
            await neon.upsert_medication_adverse_event(
                drug_slug=drug_slug,
                event=event[:300],
                frequency_band=band,
                severity=ae.get("severity"),
                source_url=primary_url,
            )
            counts["adverse_events"] += 1
        except Exception as exc:
            print(f"[medication_deep_research] adverse_event UPSERT failed: {exc}")

    # Merge LLM-extracted interactions with RxNav structured ones, dedup by name.
    seen_interactions: set[str] = set()
    interactions_to_persist: list[dict] = []
    for inx in (facts.get("interactions") or []) + (sources.get("rxnav") or []):
        drug = (inx.get("interacting_drug") or "").strip()
        if not drug:
            continue
        key = drug.lower()
        if key in seen_interactions:
            continue
        seen_interactions.add(key)
        sev = (inx.get("severity") or "moderate").strip().lower()
        if sev not in _VALID_SEVERITIES:
            sev = "moderate"
        interactions_to_persist.append({
            "interacting_drug": drug[:300],
            "severity": sev,
            "mechanism": inx.get("mechanism"),
            "recommendation": inx.get("recommendation"),
            "source_url": inx.get("source_url") or primary_url,
        })

    for inx in interactions_to_persist:
        try:
            await neon.upsert_medication_interaction(
                drug_slug=drug_slug,
                **inx,
            )
            counts["interactions"] += 1
        except Exception as exc:
            print(f"[medication_deep_research] interaction UPSERT failed: {exc}")

    return {"counts": counts}


# ---------------------------------------------------------------------------
# Node: fanout_papers_per_row  (always runs — not gated by freshness)
# ---------------------------------------------------------------------------
async def fanout_papers_per_row(state: MedicationDeepResearchState) -> dict:
    rows = state.get("_rows") or []
    if not rows:
        return {}

    counts = dict(state.get("counts") or {})
    counts.setdefault("papers", 0)

    await _update_job_progress(state.get("job_id"), 75)

    # Dedup by (drug_slug, family_member_id) — one paper run per unique patient.
    drug_slug = (state.get("_drug_meta") or {}).get("drug_slug") or state.get("slug")
    seen: set[tuple[str, Optional[int]]] = set()
    unique_rows: list[dict] = []
    for r in rows:
        key = (drug_slug, r.get("family_member_id"))
        if key in seen:
            continue
        seen.add(key)
        unique_rows.append(r)

    # ReAct research pipeline — mirrors what generateResearch.ts dispatches for
    # medicationId. Built once; serialised internally by the heavy concurrency=1
    # semaphore on the "research" graph in app.py.
    child = create_research_pipeline()

    user_email = state.get("user_email") or ""
    meta = state.get("_drug_meta") or {}
    generic = meta.get("generic_name") or ""

    for row in unique_rows:
        age = _resolve_age(row.get("family_member_age_years"), row.get("family_member_date_of_birth"))
        med_label_lines: list[str] = [
            f"medication_id: {row['id']}",
            f"Drug: {row.get('name')}",
        ]
        if generic and generic.lower() not in (row.get("name") or "").lower():
            med_label_lines.append(f"Generic: {generic}")
        if row.get("dosage"):
            med_label_lines.append(f"Dosage: {row['dosage']}")
        if row.get("frequency"):
            med_label_lines.append(f"Frequency: {row['frequency']}")
        if row.get("notes"):
            med_label_lines.append(f"Notes: {row['notes']}")
        if row.get("family_member_first_name"):
            who = row["family_member_first_name"]
            if age:
                who = f"{who}, age {age}"
            med_label_lines.append(f"Patient: {who}")
        prompt = "\n".join([
            "Find evidence-based clinical research for the following medication regimen:",
            "",
            *med_label_lines,
            "",
            "Search for: efficacy in the indicated condition, age-appropriate dosing, "
            "safety profile, drug interactions, and long-term outcomes. "
            "When the patient is a child, prioritize pediatric-specific safety findings "
            "and any boxed/black-box warnings.",
            "Only save papers with real abstracts (not \"None\", \"...\", or empty). "
            "Skip papers lacking abstracts.",
            "",
            f"IMPORTANT: When calling save_research_papers, use medication_id: \"{row['id']}\" — "
            "do NOT use goal_id, issue_id, feedback_id, or journal_entry_id.",
        ])

        try:
            await asyncio.wait_for(
                child.ainvoke(
                    {
                        "messages": [{"role": "user", "content": prompt}],
                        "userEmail": user_email,
                        "medicationId": row["id"],
                    },
                    config={"configurable": {"thread_id": f"med-deep-paper-{row['id']}"}},
                ),
                timeout=PAPER_RUN_TIMEOUT,
            )
            counts["papers"] += 1
        except asyncio.TimeoutError:
            print(f"[medication_deep_research] paper run timed out for medication {row['id']}")
        except Exception as exc:
            print(f"[medication_deep_research] paper run failed for medication {row['id']}: {exc}")

    return {"counts": counts}


# ---------------------------------------------------------------------------
# Node: correlate_patient_data
#
# For every (medication_row, family_member) pair, load the patient's issues +
# journal entries and ask DeepSeek to surface relationships against the drug's
# fact profile (BBW & adverse events → possible side-effect; conditions →
# indication match; medication start/end vs entry_date → temporal). Persisted
# to medication_correlations so the medication detail page can render
# "what does this drug mean for THIS patient?"
# ---------------------------------------------------------------------------
def _build_correlation_prompt(
    *,
    member_name: str,
    member_age: Optional[int],
    medication_row: dict,
    drug_facts: dict,
    issues: list[dict],
    journals: list[dict],
    language: Optional[str] = None,
) -> str:
    pharm = drug_facts.get("pharmacology") or {}
    indications = drug_facts.get("indications") or []
    aes = drug_facts.get("adverse_events") or []
    interactions = drug_facts.get("interactions") or []

    bbw_lines = [a["event"] for a in aes if a.get("frequency_band") == "black_box"]
    common_aes = [a["event"] for a in aes if a.get("frequency_band") in ("common", "uncommon")][:30]

    indication_lines = [f"- {i['kind']}: {i['condition']}" for i in indications]
    bbw_chunk = ("\n".join(f"- BBW: {b}" for b in bbw_lines)) or "- (none)"
    common_chunk = ("\n".join(f"- {a}" for a in common_aes)) or "- (none documented)"
    interaction_chunk = (
        "\n".join(f"- {i['interacting_drug']} ({i['severity']})" for i in interactions[:20])
        or "- (none)"
    )

    issues_chunk = "\n".join([
        f"- ISSUE id={i['id']} [{(i.get('severity') or '?').upper()}] {i.get('title','')} "
        f"({i.get('category') or ''}): {(i.get('description') or '')[:240]}"
        for i in issues
    ]) or "- (none)"
    journals_chunk = "\n".join([
        f"- JOURNAL id={j['id']} {j.get('entry_date','?')} "
        f"{('mood:' + j['mood'] + ' ') if j.get('mood') else ''}"
        f"{j.get('title','')}: {(j.get('content') or '')[:240]}"
        for j in journals
    ]) or "- (none)"

    age_str = f", age {member_age}" if member_age else ""

    body = (
        f"You are a clinical pharmacist reviewing whether a patient's documented "
        f"issues and journal entries relate to their medication regimen.\n\n"
        f"## Patient\n{member_name}{age_str}\n\n"
        f"## Medication regimen\n"
        f"- Drug: {medication_row.get('name')}\n"
        f"- Generic: {pharm.get('generic_name') or 'unknown'}\n"
        f"- Dosage: {medication_row.get('dosage') or '?'}\n"
        f"- Frequency: {medication_row.get('frequency') or '?'}\n"
        f"- Started: {medication_row.get('start_date') or '?'}\n"
        f"- Ended: {medication_row.get('end_date') or 'ongoing'}\n"
        f"- Notes: {medication_row.get('notes') or ''}\n\n"
        f"## Drug fact profile\n"
        f"### Approved indications\n" + ("\n".join(indication_lines) or "- (none)") + "\n\n"
        f"### FDA black-box warnings\n{bbw_chunk}\n\n"
        f"### Common/uncommon adverse events\n{common_chunk}\n\n"
        f"### Notable interactions\n{interaction_chunk}\n\n"
        f"## Patient issues ({len(issues)})\n{issues_chunk}\n\n"
        f"## Patient journal entries ({len(journals)})\n{journals_chunk}\n\n"
        "## Task\n"
        "For each issue or journal entry that plausibly relates to this medication, "
        "emit a correlation row. Be CONSERVATIVE — skip unrelated entries. Prioritise "
        "matches against black-box warnings.\n\n"
        "Correlation types:\n"
        "  - possible_side_effect: the entry's symptom matches one of the drug's documented AEs/BBWs.\n"
        "  - indication_match: the entry describes one of the drug's approved indications "
        "(i.e. the drug is being used appropriately for that complaint).\n"
        "  - temporal: the entry's date is meaningfully tied to the medication's start/end date "
        "(symptom emerged after starting / resolved after stopping). Only emit when start_date or "
        "end_date is known.\n\n"
        "Output ONLY this JSON shape:\n"
        "{ \"correlations\": [\n"
        "  {\n"
        '    "related_entity_type": "issue" | "journal_entry",\n'
        '    "related_entity_id":   <int from the lists above>,\n'
        '    "correlation_type":    "possible_side_effect" | "indication_match" | "temporal" | "other",\n'
        '    "matched_fact":        "short label of the matched fact, e.g. \\\"BBW: sleep disturbance\\\" or \\\"indication: asthma\\\"",\n'
        '    "rationale":           "1-2 sentences citing the entry text and the matched fact",\n'
        '    "confidence":          0-100\n'
        "  }\n"
        "] }\n\n"
        "Cap the array at 25 items; pick the highest-confidence ones."
    )
    if (language or "").strip().lower() == "ro":
        return ROMANIAN_INSTRUCTION + "\n\n" + body
    return body


async def correlate_patient_data(state: MedicationDeepResearchState) -> dict:
    rows = state.get("_rows") or []
    if not rows:
        return {}

    user_email = (state.get("user_email") or "").strip().lower()
    drug_slug = (state.get("_drug_meta") or {}).get("drug_slug") or state.get("slug")
    if not drug_slug:
        return {}

    await _update_job_progress(state.get("job_id"), 88)

    # On a freshness cache hit, _facts is empty — read drug facts back from DB.
    facts = state.get("_facts")
    if not facts:
        facts = await neon.fetch_drug_facts(drug_slug)

    counts = dict(state.get("counts") or {})
    counts.setdefault("correlations", 0)

    # One DeepSeek call per unique (medication_row, family_member) pair.
    seen: set[tuple[str, Optional[int]]] = set()
    for row in rows:
        key = (row["id"], row.get("family_member_id"))
        if key in seen:
            continue
        seen.add(key)

        fm_id = row.get("family_member_id")
        if not fm_id:
            continue  # nothing to correlate against — skip rows without a patient

        try:
            patient = await neon.fetch_patient_clinical_data(user_email, fm_id)
        except Exception as exc:
            print(f"[medication_deep_research] correlate fetch failed for fm={fm_id}: {exc}")
            continue

        if not patient["issues"] and not patient["journals"]:
            continue

        # Per-row language override: if the family_member has a preferred
        # language, it wins over the workflow-level state.language so each
        # patient gets content in their own language. Bogdan has 'ro' on
        # family_members.preferred_language, so his correlations land in RO.
        row_lang = (row.get("family_member_preferred_language") or "").strip().lower() \
                   or (state.get("language") or "").strip().lower() \
                   or None
        prompt = _build_correlation_prompt(
            member_name=row.get("family_member_first_name") or f"Member {fm_id}",
            member_age=_resolve_age(row.get("family_member_age_years"), row.get("family_member_date_of_birth")),
            medication_row=row,
            drug_facts=facts,
            issues=patient["issues"],
            journals=patient["journals"],
            language=row_lang,
        )

        parsed = await _deepseek_json(prompt, max_tokens=4096) or {}
        items = parsed.get("correlations") or []
        valid_issue_ids = {i["id"] for i in patient["issues"]}
        valid_journal_ids = {j["id"] for j in patient["journals"]}

        for item in items:
            if not isinstance(item, dict):
                continue
            etype = (item.get("related_entity_type") or "").strip().lower()
            if etype not in _VALID_RELATED_ENTITY_TYPES:
                continue
            try:
                eid = int(item.get("related_entity_id"))
            except (TypeError, ValueError):
                continue
            # Defence: only persist correlations against IDs we actually loaded.
            if etype == "issue" and eid not in valid_issue_ids:
                continue
            if etype == "journal_entry" and eid not in valid_journal_ids:
                continue
            ctype = (item.get("correlation_type") or "").strip().lower()
            if ctype not in _VALID_CORRELATION_TYPES:
                continue
            try:
                conf = max(0, min(100, int(item.get("confidence") or 50)))
            except (TypeError, ValueError):
                conf = 50
            rationale = (item.get("rationale") or "").strip()[:1000] or None
            matched = (item.get("matched_fact") or "").strip()[:300] or None

            try:
                await neon.upsert_medication_correlation(
                    medication_id=row["id"],
                    family_member_id=fm_id,
                    related_entity_type=etype,
                    related_entity_id=eid,
                    correlation_type=ctype,
                    confidence=conf,
                    rationale=rationale,
                    matched_fact=matched,
                )
                counts["correlations"] += 1
            except Exception as exc:
                print(f"[medication_deep_research] correlation UPSERT failed: {exc}")

    return {"counts": counts}


# ---------------------------------------------------------------------------
# Node: finalize
# ---------------------------------------------------------------------------
async def finalize(state: MedicationDeepResearchState) -> dict:
    job_id = state.get("job_id")
    if state.get("error"):
        await _update_job_failed(job_id, {"message": state.get("error", ""), "code": "GRAPH_FAILED"})
        return {"success": False}

    counts = state.get("counts") or {}
    rows = state.get("_rows") or []
    cache_hit = bool(state.get("_cache_hit"))

    msg_parts: list[str] = []
    if cache_hit:
        msg_parts.append("facts cache hit (<30d) — skipped re-extraction")
    msg_parts.append(
        f"{len(rows)} medication row(s); "
        f"{counts.get('indications',0)} indications, "
        f"{counts.get('dosing',0)} dosing rules, "
        f"{counts.get('adverse_events',0)} AEs, "
        f"{counts.get('interactions',0)} interactions, "
        f"{counts.get('papers',0)} paper run(s), "
        f"{counts.get('correlations',0)} patient correlations"
    )
    message = "; ".join(msg_parts)

    payload = {"counts": counts, "cache_hit": cache_hit, "message": message}
    await _update_job_succeeded(job_id, payload)

    return {"success": True, "message": message, "counts": counts}


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------
_LLM_RETRY = RetryPolicy(max_attempts=2, initial_interval=1.0, backoff_factor=2.0)
_FETCH_RETRY = RetryPolicy(max_attempts=3, initial_interval=1.0, backoff_factor=2.0)


def create_medication_deep_research_graph(checkpointer=None):
    builder = StateGraph(MedicationDeepResearchState)
    builder.add_node("load_rows", load_rows)
    builder.add_node("check_freshness", check_freshness)
    builder.add_node("normalize_drug", normalize_drug, retry=_LLM_RETRY)
    builder.add_node("fetch_sources", fetch_sources, retry=_FETCH_RETRY)
    builder.add_node("extract_facts", extract_facts, retry=_LLM_RETRY)
    builder.add_node("persist_facts", persist_facts)
    builder.add_node("fanout_papers_per_row", fanout_papers_per_row)
    builder.add_node("correlate_patient_data", correlate_patient_data, retry=_LLM_RETRY)
    builder.add_node("finalize", finalize)

    builder.add_edge(START, "load_rows")
    builder.add_edge("load_rows", "check_freshness")
    builder.add_conditional_edges(
        "check_freshness",
        _route_after_freshness,
        {"refresh": "normalize_drug", "skip": "fanout_papers_per_row"},
    )
    builder.add_edge("normalize_drug", "fetch_sources")
    builder.add_edge("fetch_sources", "extract_facts")
    builder.add_edge("extract_facts", "persist_facts")
    builder.add_edge("persist_facts", "fanout_papers_per_row")
    builder.add_edge("fanout_papers_per_row", "correlate_patient_data")
    builder.add_edge("correlate_patient_data", "finalize")
    builder.add_edge("finalize", END)
    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


graph = create_medication_deep_research_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_medication_deep_research_graph, graph)
