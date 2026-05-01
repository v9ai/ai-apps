"""Company QA / false-positive detector — runs all four checks in one graph.

Surfaces companies that *look right* in the UI tab (e.g. ``/companies?tab=sales-tech``)
but are actually low-quality leads. Four orthogonal checks, sequentially:

1. ``check_data_quality`` — heuristic, no LLM. Flags rows with insufficient
   profile data to act on (sparse description, no LinkedIn, no canonical_domain,
   etc.).
2. ``check_taxonomy`` — DeepSeek-verified. Asks whether the company *actually*
   builds / sells the kind of product the tab implies, given its name +
   description + services. Catches mis-tagging (a CRM customer mentioned
   "sales engagement" once → tagged Sales Engagement Platform).
3. ``check_category`` — heuristic. Flags ``CONSULTANCY`` / ``STAFFING`` /
   ``AGENCY`` rows when the tab implies a product vendor.
4. ``check_icp_fit`` — reads the existing ``signals`` jsonb populated by
   ``company_enrichment_graph.score_verticals`` (see ``icp_fit_scorer.py``).
   ``composite_tier == "disqualified"`` short-circuits as a high-severity miss;
   ``"cold"`` is medium-severity.

Verdict is **flag-only**. Writes to ``companies.qa_verdict`` (jsonb) and
``companies.qa_verdict_at`` (timestamptz) — see migration
``0081_add_company_qa_verdict.sql``. The UI surfaces a badge on the row;
no auto-block, no auto-strip.

Driven by tab name, with the filter mapped at the top of this module so the
same graph services future verticals (compliance_audit, ingestible, etc.).
Mirrors the structural pattern of ``companies_verify_graph.py`` and
``company_cleanup_graph.py``.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .llm import ainvoke_json, deepseek_model_name, make_llm

log = logging.getLogger(__name__)


# ── Tab → filter + intent mapping ─────────────────────────────────────────────
#
# The UI tab name is the public input. ``service_taxonomy_any`` mirrors the
# GraphQL filter the page uses (companies-list.tsx → SearchCompanies). The
# ``intent`` describes — in one sentence — what KIND of company should appear
# in the tab; the LLM uses it to verify whether the row really belongs.

TAB_INTENTS: dict[str, dict[str, Any]] = {
    "sales-tech": {
        "service_taxonomy_any": [
            "Sales Engagement Platform",
            "Lead Generation Software",
        ],
        "intent": (
            "Companies that BUILD or SELL sales engagement / outbound automation "
            "/ lead-generation software as their primary product. Customers, "
            "agencies, resellers, and companies that merely USE such tools do "
            "not belong here."
        ),
        "expected_categories": ["PRODUCT"],
    },
}

DEFAULT_TAB = "sales-tech"
LIMIT_DEFAULT = 25
LIMIT_MAX = 200

# Confidence floor for marking a row as a "wrong taxonomy" false positive.
# Lower confidence is recorded but does not flip ``is_false_positive``.
TAXONOMY_FP_CONFIDENCE_FLOOR = 0.7

# Categories that a product-vendor tab should not contain.
NON_PRODUCT_CATEGORIES = {"CONSULTANCY", "STAFFING", "AGENCY"}


# ── State ─────────────────────────────────────────────────────────────────────


class CompanyQAState(TypedDict, total=False):
    # input
    tab: str
    service_taxonomy_any: list[str]
    company_ids: list[int]
    limit: int

    # internal
    intent: str
    expected_categories: list[str]
    companies: list[dict[str, Any]]
    verdicts: list[dict[str, Any]]

    # output
    summary: dict[str, Any]
    qa_issues: list[str]
    _error: str


# ── Helpers ───────────────────────────────────────────────────────────────────


def _parse_text_json_array(raw: Any) -> list[str]:
    """Decode a text-encoded JSON array (the schema stores arrays as text).

    Returns an empty list on missing/malformed data.
    """
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(v) for v in raw if v is not None]
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return []
    if isinstance(parsed, list):
        return [str(v) for v in parsed if v is not None]
    return []


def _resolve_tab(state: CompanyQAState) -> tuple[str, list[str], str, list[str]]:
    """Return (tab, service_taxonomy_any, intent, expected_categories)."""
    tab = (state.get("tab") or DEFAULT_TAB).strip().lower() or DEFAULT_TAB
    cfg = TAB_INTENTS.get(tab)

    explicit_filter = list(state.get("service_taxonomy_any") or [])
    if cfg is None and not explicit_filter:
        # Unknown tab and no explicit filter — default to sales-tech so the
        # graph still runs rather than 500ing on bad input.
        cfg = TAB_INTENTS[DEFAULT_TAB]
        tab = DEFAULT_TAB

    service_taxonomy_any = explicit_filter or list(cfg["service_taxonomy_any"])  # type: ignore[index]
    intent = (
        cfg["intent"] if cfg is not None  # type: ignore[index]
        else f"Companies that match the '{tab}' vertical."
    )
    expected_categories = list(
        (cfg or {}).get("expected_categories") or []
    )
    return tab, service_taxonomy_any, intent, expected_categories


# ── Nodes ─────────────────────────────────────────────────────────────────────


async def load_companies(state: CompanyQAState) -> dict:
    if state.get("_error"):
        return {}

    tab, service_taxonomy_any, intent, expected_categories = _resolve_tab(state)
    limit = max(1, min(int(state.get("limit") or LIMIT_DEFAULT), LIMIT_MAX))
    company_ids = state.get("company_ids") or []

    base_select = (
        "SELECT id, key, name, website, description, services, service_taxonomy, "
        "industries, industry, category, ai_tier, ai_classification_confidence, "
        "score, score_reasons, linkedin_url, blocked, canonical_domain "
        "FROM companies "
    )

    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                if company_ids:
                    cur.execute(
                        base_select + "WHERE id = ANY(%s) LIMIT %s",
                        (list(company_ids), limit),
                    )
                else:
                    # service_taxonomy is a text-encoded JSON array (Drizzle
                    # `text("service_taxonomy")`). Cast to jsonb and use the
                    # ?| any-key operator — same pattern as the GraphQL filter
                    # in src/apollo/resolvers/company/queries.ts.
                    cur.execute(
                        base_select
                        + "WHERE COALESCE(blocked, false) = false "
                        + "  AND service_taxonomy IS NOT NULL "
                        + "  AND service_taxonomy <> '' "
                        + "  AND service_taxonomy::jsonb ?| %s "
                        + "ORDER BY id DESC LIMIT %s",
                        (list(service_taxonomy_any), limit),
                    )
                cols = [d[0] for d in cur.description or []]
                rows = cur.fetchall()
    except psycopg.Error as e:
        return {"_error": f"load_companies: {e}"}

    companies: list[dict[str, Any]] = []
    for row in rows:
        rec = dict(zip(cols, row))
        companies.append(
            {
                "id": rec["id"],
                "key": rec.get("key") or "",
                "name": rec.get("name") or "",
                "website": (rec.get("website") or "").strip(),
                "description": (rec.get("description") or "").strip(),
                "services": _parse_text_json_array(rec.get("services")),
                "service_taxonomy": _parse_text_json_array(rec.get("service_taxonomy")),
                "industries": _parse_text_json_array(rec.get("industries")),
                "industry": rec.get("industry") or "",
                "category": (rec.get("category") or "UNKNOWN").upper(),
                "ai_tier": int(rec.get("ai_tier") or 0),
                "ai_classification_confidence": float(
                    rec.get("ai_classification_confidence") or 0.0
                ),
                "score": float(rec.get("score") or 0.0),
                "score_reasons_raw": rec.get("score_reasons") or "",
                "linkedin_url": rec.get("linkedin_url") or "",
                "canonical_domain": rec.get("canonical_domain") or "",
                "blocked": bool(rec.get("blocked")),
            }
        )

    log.info(
        "[company-qa] loaded %d companies for tab=%s (filter=%s, limit=%d)",
        len(companies),
        tab,
        service_taxonomy_any,
        limit,
    )

    # Seed empty verdicts so downstream nodes can append per-row reasons.
    verdicts = [
        {
            "company_id": c["id"],
            "key": c["key"],
            "name": c["name"],
            "reasons": [],          # list of "<check>:<severity>" tokens
            "evidence": {},         # per-check evidence payload
            "taxonomy_confidence": 0.0,
            "actual_taxonomy": [],
        }
        for c in companies
    ]

    return {
        "tab": tab,
        "intent": intent,
        "expected_categories": expected_categories,
        "companies": companies,
        "verdicts": verdicts,
        "limit": limit,
        "service_taxonomy_any": service_taxonomy_any,
    }


def _signals_for(score_reasons_raw: str) -> dict[str, Any]:
    """Best-effort decode of the signals jsonb stored as text in score_reasons.

    Older rows use a flat list; newer rows use the v2 dict shape from
    ``icp_fit_scorer.build_v2_signals``. Returns ``{}`` on any failure.
    """
    if not score_reasons_raw:
        return {}
    try:
        parsed = json.loads(score_reasons_raw)
    except (TypeError, ValueError):
        return {}
    if isinstance(parsed, dict):
        return parsed
    return {}


async def check_data_quality(state: CompanyQAState) -> dict:
    """Heuristic — no LLM. Flag profiles too sparse to act on."""
    if state.get("_error"):
        return {}

    companies = state.get("companies") or []
    verdicts = list(state.get("verdicts") or [])

    for idx, company in enumerate(companies):
        misses: list[str] = []
        description = company.get("description") or ""
        if len(description) < 200:
            misses.append("short_description")
        if not company.get("linkedin_url"):
            misses.append("missing_linkedin")
        if not company.get("services"):
            misses.append("missing_services")
        if not company.get("canonical_domain"):
            misses.append("missing_canonical_domain")
        if not company.get("website"):
            misses.append("missing_website")
        if (company.get("ai_classification_confidence") or 0.0) < 0.4:
            misses.append("low_classification_confidence")

        verdict = verdicts[idx]
        verdict["evidence"]["data_quality"] = misses
        # Two or more misses = weak data. Single isolated misses are noisy.
        if len(misses) >= 2:
            verdict["reasons"].append("weak_data:medium")

    return {"verdicts": verdicts}


async def check_taxonomy(state: CompanyQAState) -> dict:
    """LLM — verify each row's claimed taxonomy against the tab intent."""
    if state.get("_error"):
        return {}

    companies = state.get("companies") or []
    verdicts = list(state.get("verdicts") or [])
    intent = state.get("intent") or ""
    if not companies:
        return {"verdicts": verdicts}

    llm = make_llm(provider="deepseek", tier="standard")
    model_id = deepseek_model_name("standard")

    for idx, company in enumerate(companies):
        verdict = verdicts[idx]
        # Skip taxonomy LLM call when there's basically nothing to classify
        # against — record as low-confidence rather than spending tokens.
        signal_text = company.get("description") or ""
        if len(signal_text) < 80 and not company.get("services"):
            verdict["evidence"]["taxonomy"] = {
                "skipped": "insufficient_text",
                "is_taxonomy_correct": None,
                "confidence": 0.0,
            }
            continue

        payload = {
            "name": company.get("name") or "",
            "website": company.get("website") or "",
            "description": (signal_text[:1200] if signal_text else ""),
            "services": company.get("services") or [],
            "industries": company.get("industries") or [],
            "claimed_taxonomy": company.get("service_taxonomy") or [],
            "tab_intent": intent,
        }

        sys_msg = (
            "You are a B2B taxonomy auditor. Decide whether a company "
            "actually belongs under the claimed_taxonomy given the tab_intent. "
            "Companies that merely USE such tools, agencies, resellers, "
            "consultancies, or staffing firms do NOT belong. "
            "Reply ONLY with a JSON object matching this schema:\n"
            '{"is_taxonomy_correct": bool, '
            '"confidence": number between 0 and 1, '
            '"actual_taxonomy": [string], '
            '"reasoning": string}'
        )
        user_msg = (
            "Audit this row:\n```json\n"
            + json.dumps(payload, ensure_ascii=False, indent=2)
            + "\n```\nReturn only the JSON object."
        )

        try:
            parsed = await ainvoke_json(
                llm,
                [
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": user_msg},
                ],
                provider="deepseek",
            )
        except Exception as e:  # noqa: BLE001
            log.warning(
                "[company-qa] taxonomy LLM failed for id=%s: %s", company.get("id"), e
            )
            verdict["evidence"]["taxonomy"] = {"error": str(e)[:200]}
            continue

        is_correct = bool(parsed.get("is_taxonomy_correct"))
        confidence = float(parsed.get("confidence") or 0.0)
        reasoning = str(parsed.get("reasoning") or "")[:500]
        actual_taxonomy = [
            str(v) for v in (parsed.get("actual_taxonomy") or []) if v
        ][:6]

        verdict["taxonomy_confidence"] = confidence
        verdict["actual_taxonomy"] = actual_taxonomy
        verdict["evidence"]["taxonomy"] = {
            "is_taxonomy_correct": is_correct,
            "confidence": confidence,
            "reasoning": reasoning,
            "actual_taxonomy": actual_taxonomy,
        }

        if (not is_correct) and confidence >= TAXONOMY_FP_CONFIDENCE_FLOOR:
            verdict["reasons"].append("wrong_taxonomy:high")
        elif (not is_correct) and confidence > 0.0:
            verdict["reasons"].append("wrong_taxonomy:low")

    return {"verdicts": verdicts}


async def check_category(state: CompanyQAState) -> dict:
    """Heuristic — flag CONSULTANCY/STAFFING/AGENCY in product-vendor tabs."""
    if state.get("_error"):
        return {}

    companies = state.get("companies") or []
    verdicts = list(state.get("verdicts") or [])
    expected = set(state.get("expected_categories") or [])

    if not expected or expected != {"PRODUCT"}:
        # Not a product-vendor tab — nothing to flag here.
        return {"verdicts": verdicts}

    for idx, company in enumerate(companies):
        verdict = verdicts[idx]
        category = (company.get("category") or "").upper()
        verdict["evidence"]["category"] = category
        if category in NON_PRODUCT_CATEGORIES:
            verdict["reasons"].append("wrong_category:medium")

    return {"verdicts": verdicts}


async def check_icp_fit(state: CompanyQAState) -> dict:
    """Read composite_tier / composite_score from existing signals jsonb.

    The enrichment graph (``score_verticals`` in company_enrichment_graph)
    populates these via ``icp_fit_scorer.compute_icp_fit``. We trust the
    existing values rather than re-running scoring here.
    """
    if state.get("_error"):
        return {}

    companies = state.get("companies") or []
    verdicts = list(state.get("verdicts") or [])

    for idx, company in enumerate(companies):
        verdict = verdicts[idx]
        signals = _signals_for(company.get("score_reasons_raw") or "")
        composite_tier = (signals.get("composite_tier") or "").lower()
        composite_score = signals.get("composite_score")
        deal_breakers = (
            (signals.get("icp_fit") or {}).get("deal_breaker_hits") or []
            if isinstance(signals.get("icp_fit"), dict)
            else []
        )

        verdict["evidence"]["icp_fit"] = {
            "composite_tier": composite_tier,
            "composite_score": composite_score,
            "deal_breakers": [
                {"name": d.get("name"), "severity": d.get("severity")}
                for d in deal_breakers if isinstance(d, dict)
            ],
        }

        if composite_tier == "disqualified":
            verdict["reasons"].append("low_icp_fit:high")
        elif composite_tier == "cold":
            verdict["reasons"].append("low_icp_fit:medium")
        elif deal_breakers:
            # Record any deal-breakers even when tier wasn't recomputed.
            high_db = [
                d for d in deal_breakers
                if isinstance(d, dict) and (d.get("severity") or "") == "high"
            ]
            if high_db:
                verdict["reasons"].append("low_icp_fit:high")

    return {"verdicts": verdicts}


def _aggregate_verdict(
    verdict: dict[str, Any],
    *,
    tab: str,
    model_id: str,
) -> dict[str, Any]:
    """Collapse per-check reasons into the persisted verdict shape."""
    reasons: list[str] = list(verdict.get("reasons") or [])
    is_wrong_taxonomy = any(r.startswith("wrong_taxonomy:") for r in reasons)
    is_wrong_category = any(r.startswith("wrong_category:") for r in reasons)
    is_weak_data = any(r.startswith("weak_data:") for r in reasons)
    is_low_icp = any(r.startswith("low_icp_fit:") for r in reasons)

    is_false_positive = is_wrong_taxonomy or is_wrong_category
    is_weak = is_false_positive or is_weak_data or is_low_icp

    # Confidence: when the LLM had a strong taxonomy verdict, use that;
    # otherwise approximate from heuristic-only signals.
    taxonomy_conf = float(verdict.get("taxonomy_confidence") or 0.0)
    if is_wrong_taxonomy and taxonomy_conf > 0:
        confidence = taxonomy_conf
    elif is_false_positive or is_low_icp:
        confidence = 0.7
    elif is_weak_data:
        confidence = 0.55
    else:
        confidence = 0.5

    payload: dict[str, Any] = {
        "is_false_positive": bool(is_false_positive),
        "is_weak": bool(is_weak),
        "reasons": reasons,
        "confidence": round(confidence, 3),
        "model": model_id,
        "tab": tab,
        "actual_taxonomy": list(verdict.get("actual_taxonomy") or []),
        "evidence": verdict.get("evidence") or {},
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }
    return payload


async def aggregate(state: CompanyQAState) -> dict:
    """Combine reasons per row + persist to companies.qa_verdict."""
    if state.get("_error"):
        return {}

    companies = state.get("companies") or []
    verdicts = list(state.get("verdicts") or [])
    tab = state.get("tab") or DEFAULT_TAB
    model_id = deepseek_model_name("standard")

    persisted: list[dict[str, Any]] = []
    rows_to_persist: list[tuple[str, int]] = []

    for verdict in verdicts:
        payload = _aggregate_verdict(verdict, tab=tab, model_id=model_id)
        persisted.append(
            {
                "company_id": verdict["company_id"],
                "key": verdict.get("key"),
                "name": verdict.get("name"),
                "qa_verdict": payload,
            }
        )
        rows_to_persist.append((json.dumps(payload), int(verdict["company_id"])))

    if rows_to_persist:
        try:
            with psycopg.connect(_dsn(), autocommit=False, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.executemany(
                        "UPDATE companies "
                        "SET qa_verdict = %s::jsonb, qa_verdict_at = NOW() "
                        "WHERE id = %s",
                        rows_to_persist,
                    )
                conn.commit()
        except psycopg.Error as e:
            return {"_error": f"aggregate: persist failed: {e}"}

    log.info(
        "[company-qa] persisted verdicts for %d companies (tab=%s)",
        len(rows_to_persist),
        tab,
    )

    return {"verdicts": persisted}


async def summarize(state: CompanyQAState) -> dict:
    if state.get("_error"):
        return {
            "summary": {"error": state["_error"], "total": 0},
            "qa_issues": [state["_error"]],
        }

    verdicts = state.get("verdicts") or []
    total = len(verdicts)
    fp = sum(1 for v in verdicts if v.get("qa_verdict", {}).get("is_false_positive"))
    weak = sum(1 for v in verdicts if v.get("qa_verdict", {}).get("is_weak"))
    clean = total - weak

    by_reason: dict[str, int] = {}
    for v in verdicts:
        for r in (v.get("qa_verdict") or {}).get("reasons", []):
            by_reason[r] = by_reason.get(r, 0) + 1

    qa_issues: list[str] = []
    for v in verdicts:
        qv = v.get("qa_verdict") or {}
        if not qv.get("is_weak"):
            continue
        qa_issues.append(
            f"{v.get('key') or v.get('company_id')}: {','.join(qv.get('reasons') or []) or 'weak'}"
        )

    return {
        "summary": {
            "total": total,
            "false_positive": fp,
            "weak": weak,
            "clean": clean,
            "by_reason": by_reason,
            "tab": state.get("tab") or DEFAULT_TAB,
        },
        "qa_issues": qa_issues,
    }


# ── Graph ─────────────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyQAState)
    builder.add_node("load_companies", load_companies)
    builder.add_node("check_data_quality", check_data_quality)
    builder.add_node("check_taxonomy", check_taxonomy)
    builder.add_node("check_category", check_category)
    builder.add_node("check_icp_fit", check_icp_fit)
    builder.add_node("aggregate", aggregate)
    builder.add_node("summarize", summarize)

    builder.add_edge(START, "load_companies")
    builder.add_edge("load_companies", "check_data_quality")
    builder.add_edge("check_data_quality", "check_taxonomy")
    builder.add_edge("check_taxonomy", "check_category")
    builder.add_edge("check_category", "check_icp_fit")
    builder.add_edge("check_icp_fit", "aggregate")
    builder.add_edge("aggregate", "summarize")
    builder.add_edge("summarize", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
