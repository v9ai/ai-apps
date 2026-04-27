"""Company problems graph — identify operational problems an AI engineering
shop could plausibly solve at this company.

Trigger: called explicitly *after* ``company_enrichment`` has populated
``category``, ``ai_tier``, services, etc. Reads what enrichment already wrote
and asks deepseek-v4-pro to enumerate 3–7 specific, role-attached problems and
matching AI solutions. Each problem becomes one ``company_facts`` row tagged
``extractor_version='problems-v1'`` so it sits alongside the enrichment-time
``python-qwen-2026-04`` rows without colliding.

Linear three-node pipeline:

    load        — pull the company row + its latest classification fact
        ↓
    analyze     — single LLM call with strict JSON output
        ↓
    persist     — replace prior ``problems-v1`` rows; insert one per problem.
"""

from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import Annotated, Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    deepseek_model_name,
    make_deepseek_pro,
    merge_node_telemetry,
)
from .state import _merge_dict, _merge_graph_meta

log = logging.getLogger(__name__)

EXTRACTOR_VERSION = "problems-v1"
MIN_PROBLEMS = 3
MAX_PROBLEMS = 7


# ── State ────────────────────────────────────────────────────────────────────


class CompanyProblemsState(TypedDict, total=False):
    # input
    company_id: int
    # working
    company: dict[str, Any]
    classification: dict[str, Any]
    problems: list[dict[str, Any]]
    facts_persisted: int
    # plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_graph_meta]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _slugify(s: str, max_len: int = 48) -> str:
    """Lowercase, [a-z0-9-] only, collapsed dashes, length-capped. Used as the
    ``field`` suffix on ``company_facts`` so each problem row is uniquely keyed
    (``problem.candidate-screening-bottleneck``)."""
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:max_len].rstrip("-") or "untitled"


def _coerce_problem(p: Any) -> dict[str, Any] | None:
    """Validate one LLM-emitted problem object. Returns None on malformed
    input rather than raising — we'd rather drop a bad row than fail the
    whole graph."""
    if not isinstance(p, dict):
        return None
    problem = (p.get("problem") or "").strip()
    role = (p.get("role_affected") or "").strip()
    solution = (p.get("ai_solution") or "").strip()
    evidence = (p.get("evidence") or "").strip()
    if not problem or not solution:
        return None
    try:
        confidence = float(p.get("confidence", 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))
    return {
        "problem": problem,
        "role_affected": role,
        "ai_solution": solution,
        "evidence": evidence,
        "confidence": confidence,
    }


# ── Node 1: load ─────────────────────────────────────────────────────────────


async def load(state: CompanyProblemsState) -> dict:
    """Fetch the enriched company row plus the latest classification fact.
    Sets ``_error`` on missing input or DB failure so downstream nodes
    short-circuit cleanly."""
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "company_id is required"}

    try:
        dsn = _dsn()
    except RuntimeError as e:
        return {"_error": str(e)}

    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, canonical_domain, website, description,
                           industry, size, location, category, ai_tier,
                           services, service_taxonomy, industries
                    FROM companies
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (int(company_id),),
                )
                row = cur.fetchone()
                if not row:
                    return {"_error": f"company id {company_id} not found"}
                cols = [d[0] for d in cur.description or []]
                rec = dict(zip(cols, row))

                # Latest classification.home fact — has has_open_roles, remote_policy, reason
                cur.execute(
                    """
                    SELECT value_json
                    FROM company_facts
                    WHERE company_id = %s AND field = 'classification.home'
                    ORDER BY id DESC LIMIT 1
                    """,
                    (int(company_id),),
                )
                fact_row = cur.fetchone()
    except psycopg.Error as e:
        return {"_error": f"db error loading company: {e}"}

    classification: dict[str, Any] = {}
    if fact_row and fact_row[0]:
        try:
            payload = json.loads(fact_row[0]) if isinstance(fact_row[0], str) else fact_row[0]
            classification = (payload or {}).get("classification") or {}
        except (TypeError, ValueError):
            pass

    return {
        "company": {
            "id": rec.get("id"),
            "name": rec.get("name") or "",
            "canonical_domain": rec.get("canonical_domain") or "",
            "website": rec.get("website") or "",
            "description": rec.get("description") or "",
            "industry": rec.get("industry") or "",
            "size": rec.get("size") or "",
            "location": rec.get("location") or "",
            "category": (rec.get("category") or "").upper(),
            "ai_tier": rec.get("ai_tier"),
            "services": rec.get("services"),
            "service_taxonomy": rec.get("service_taxonomy"),
            "industries": rec.get("industries"),
        },
        "classification": classification,
    }


# ── Node 2: analyze ──────────────────────────────────────────────────────────


SYSTEM_PROMPT = """You analyze a B2B company's profile and identify operational problems that AI engineering can plausibly solve.

Output strict JSON of the shape:
{
  "problems": [
    {
      "problem": "1 sentence describing a real workflow pain at this company",
      "role_affected": "the specific role that feels this pain (e.g. 'Recruiter', 'Sales Rep', 'Support Agent', 'Underwriter')",
      "ai_solution": "1 sentence describing how current AI tech (LLM, embeddings, agents, vision, speech) addresses it concretely",
      "evidence": "what in the company profile suggests this problem (cite a specific field: category, services, industry, has_open_roles, etc.)",
      "confidence": 0.0
    }
  ]
}

Rules:
- 3 to 7 problems. Quality over quantity.
- Each problem must be specific to this company's category and industry. Reject generic items like "needs better marketing" or "scaling challenges".
- Each `ai_solution` must be implementable today with mainstream AI tech. No moonshots.
- `confidence` reflects how strongly the company profile supports the problem (0.5 if inferred from category alone; 0.8+ if there's explicit evidence in services/description).
- If the company is a recruiting/staffing firm, focus on candidate sourcing, screening, outreach, and ATS workflows.
- If the company is a product company (PRODUCT category), focus on the product's own user-facing workflows — not the company's internal ops.
- If the category is UNKNOWN or signal is too thin, return an empty `problems` array rather than guessing.
- Return JSON only, no commentary."""


async def analyze(state: CompanyProblemsState) -> dict:
    if state.get("_error"):
        return {"problems": []}

    t0 = time.perf_counter()
    company = state.get("company") or {}
    classification = state.get("classification") or {}

    profile = {
        "name": company.get("name"),
        "canonical_domain": company.get("canonical_domain"),
        "category": company.get("category"),
        "ai_tier": company.get("ai_tier"),
        "industry": company.get("industry") or classification.get("industry"),
        "size": company.get("size"),
        "location": company.get("location"),
        "description": company.get("description"),
        "services": company.get("services"),
        "service_taxonomy": company.get("service_taxonomy"),
        "industries": company.get("industries"),
        "remote_policy": classification.get("remote_policy"),
        "has_open_roles": classification.get("has_open_roles"),
        "classification_reason": classification.get("reason"),
    }
    user_msg = "Company profile:\n" + json.dumps(profile, indent=2, default=str)

    llm = make_deepseek_pro(temperature=0.1)
    try:
        parsed, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            provider="deepseek",
        )
    except Exception as e:
        log.warning("analyze: LLM call failed: %s", e)
        return {
            "problems": [],
            "agent_timings": {"analyze": round(time.perf_counter() - t0, 3)},
        }

    raw = (parsed or {}).get("problems") if isinstance(parsed, dict) else None
    cleaned: list[dict[str, Any]] = []
    if isinstance(raw, list):
        for p in raw:
            coerced = _coerce_problem(p)
            if coerced:
                cleaned.append(coerced)

    # Cap; the prompt asks for 3–7 but we don't trust the model to obey.
    cleaned = cleaned[:MAX_PROBLEMS]

    existing_tel = (state.get("graph_meta") or {}).get("telemetry")
    merged_tel = merge_node_telemetry(existing_tel, "analyze", tel)

    return {
        "problems": cleaned,
        "agent_timings": {"analyze": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"telemetry": merged_tel},
    }


# ── Node 3: persist ──────────────────────────────────────────────────────────


async def persist(state: CompanyProblemsState) -> dict:
    if state.get("_error"):
        return {"facts_persisted": 0}

    t0 = time.perf_counter()
    company_id = state.get("company_id")
    problems = state.get("problems") or []

    if company_id is None or not problems:
        return {
            "facts_persisted": 0,
            "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
        }

    domain = (state.get("company") or {}).get("canonical_domain") or ""
    now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    now_iso = datetime.now(timezone.utc).isoformat()

    inserted = 0
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                # Idempotency: drop prior problems-v1 rows for this company so
                # re-runs replace rather than accumulate.
                cur.execute(
                    """
                    DELETE FROM company_facts
                    WHERE company_id = %s AND extractor_version = %s
                    """,
                    (int(company_id), EXTRACTOR_VERSION),
                )

                seen_slugs: set[str] = set()
                for p in problems:
                    slug = _slugify(p["problem"])
                    # Disambiguate within this batch if two problems collide.
                    base = slug
                    i = 2
                    while slug in seen_slugs:
                        slug = f"{base}-{i}"
                        i += 1
                    seen_slugs.add(slug)

                    cur.execute(
                        """
                        INSERT INTO company_facts
                          (tenant_id, company_id, field, value_json, value_text,
                           confidence, source_type, source_url, capture_timestamp,
                           observed_at, method, extractor_version, http_status, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now()::text)
                        """,
                        (
                            "nyx",
                            int(company_id),
                            f"problem.{slug}",
                            json.dumps(p),
                            p["problem"],
                            p["confidence"],
                            "LLM_INFERENCE",
                            f"https://{domain}" if domain else None,
                            now_ts,
                            now_iso,
                            "LLM",
                            EXTRACTOR_VERSION,
                            None,
                        ),
                    )
                    inserted += 1
    except psycopg.Error as e:
        return {"_error": f"persist: {e}"}

    return {
        "facts_persisted": inserted,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyProblemsState)
    builder.add_node("load", load)
    builder.add_node("analyze", analyze)
    builder.add_node("persist", persist)

    builder.add_edge(START, "load")
    builder.add_edge("load", "analyze")
    builder.add_edge("analyze", "persist")
    builder.add_edge("persist", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


# ── Public summary helper (used by tests + tooling) ──────────────────────────


def summarise(state: CompanyProblemsState) -> dict[str, Any]:
    """Build the final dict returned via ``/runs/wait``. Kept as a separate
    helper so tests can verify the shape without running the graph."""
    model = deepseek_model_name("deep")
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    return {
        "company_id": state.get("company_id"),
        "company_name": (state.get("company") or {}).get("name"),
        "category": (state.get("company") or {}).get("category"),
        "problems": state.get("problems") or [],
        "facts_persisted": state.get("facts_persisted") or 0,
        "model": model,
        "telemetry": telemetry,
        "totals": compute_totals(telemetry),
    }
