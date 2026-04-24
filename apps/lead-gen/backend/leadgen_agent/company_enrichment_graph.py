"""Company enrichment graph — category, ai_tier, score, and company_facts provenance.

Five-node linear pipeline (load → fetch → classify → score → persist) that
enriches a single company row identified by ``company_id``. Writes
``extractor_version='python-qwen-2026-04'`` into ``company_facts`` so rows
produced here coexist queryably alongside the Rust enricher's rows (which stamp
``rust-bge-*``). The UPDATE to ``companies`` sets ``category``, ``ai_tier``,
``score``, ``score_reasons``, ``ai_classification_reason``, and
``ai_classification_confidence`` — columns also written by the Rust enricher,
so the most-recent write wins by design (last-writer-wins UPDATE semantics).
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .icp_fit_scorer import (
    build_v2_signals,
    compute_icp_fit,
    load_composite_weights,
)
from .llm import ainvoke_json_with_telemetry, compute_totals, make_llm, merge_node_telemetry
from .loaders import fetch_url
from .product_intel_schemas import product_intel_graph_meta
from .state import CompanyEnrichmentState
from .verticals import all_verticals, apply_signal_rules, compute_score_and_tier

EXTRACTOR_VERSION = "python-qwen-2026-04"

# ── Node 1: load ──────────────────────────────────────────────────────────────

async def load(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "load: company_id is required"}
    sql = "SELECT id, name, canonical_domain, website FROM companies WHERE id = %s LIMIT 1"
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (int(company_id),))
                row = cur.fetchone()
                if not row:
                    return {"_error": f"load: company id {company_id} not found"}
                cols = [d[0] for d in cur.description or []]
    except psycopg.Error as e:
        return {"_error": f"load: {e}"}

    rec = dict(zip(cols, row))
    domain = (rec.get("canonical_domain") or "").strip()
    if not domain:
        return {"_error": "load: company has no canonical_domain"}

    return {
        "company": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "canonical_domain": domain,
            "website": rec.get("website") or "",
        }
    }


# ── Node 2: fetch ─────────────────────────────────────────────────────────────

async def fetch(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    domain = state["company"]["canonical_domain"]
    home_url = f"https://{domain}"
    careers_paths = ("/careers", "/jobs", "/company/careers", "/join-us")
    careers_candidates = [f"https://{domain}{p}" for p in careers_paths]

    try:
        home_res, *careers_results = await asyncio.gather(
            fetch_url(home_url),
            *[fetch_url(u) for u in careers_candidates],
            return_exceptions=False,
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"fetch: {e}"}

    home_markdown: str = (home_res.get("markdown") or "")[:15000]

    careers_markdown = ""
    careers_url = ""
    for res in careers_results:
        md = res.get("markdown") or ""
        if len(md) > 500:
            careers_markdown = md[:15000]
            careers_url = res.get("url") or ""
            break

    return {
        "home_markdown": home_markdown,
        "careers_markdown": careers_markdown,
        "careers_url": careers_url,
        "agent_timings": {"fetch": round(time.perf_counter() - t0, 3)},
    }


# ── Node 3: classify ──────────────────────────────────────────────────────────

def _heuristic_classify(home_markdown: str, careers_markdown: str) -> dict[str, Any]:
    text = (home_markdown + " " + careers_markdown).lower()

    if any(k in text for k in ("llm", "genai", "agent", "rag", "foundation model")):
        ai_tier = 2
    elif any(k in text for k in ("machine learning", " ml ", "data science")):
        ai_tier = 1
    else:
        ai_tier = 0

    if "consult" in text or "services" in text:
        category = "CONSULTANCY"
    elif "staff" in text or "recruit" in text:
        category = "STAFFING"
    elif "agency" in text or "marketing" in text:
        category = "AGENCY"
    elif any(k in text for k in ("platform", "saas", "product")):
        category = "PRODUCT"
    else:
        category = "UNKNOWN"

    return {
        "category": category,
        "ai_tier": ai_tier,
        "industry": "",
        "remote_policy": "unknown",
        "has_open_roles": bool(careers_markdown),
        "confidence": 0.5,
        "reason": "heuristic fallback",
    }


async def classify(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    company = state.get("company") or {}
    home_markdown = state.get("home_markdown") or ""
    careers_markdown = state.get("careers_markdown") or ""

    system_prompt = (
        "You classify a company for B2B AI-consultancy ICP targeting. "
        'Return strict JSON: {"category": "CONSULTANCY"|"STAFFING"|"AGENCY"|"PRODUCT"|"UNKNOWN", '
        '"ai_tier": 0|1|2, "industry": string, '
        '"remote_policy": "full_remote"|"hybrid"|"onsite"|"unknown", '
        '"has_open_roles": boolean, "confidence": 0..1, "reason": string}. '
        "Category rules: CONSULTANCY (paid AI/ML services), STAFFING (body-shop), "
        "AGENCY (marketing/creative), PRODUCT (SaaS). "
        "ai_tier: 2=AI core to product, 1=AI as capability, 0=no AI."
    )
    user_prompt = (
        f"Company: {company.get('name')}\n"
        f"Domain: {company.get('canonical_domain')}\n\n"
        f"Home page:\n{home_markdown[:6000]}\n\n"
        f"Careers page:\n{careers_markdown[:3000]}\n\n"
        "Return JSON only."
    )

    classification: dict[str, Any] | None = None
    tel: dict[str, Any] = {}
    classify_source = "llm"

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            provider="deepseek",
        )
        if isinstance(result, dict) and result.get("confidence", 0) >= 0.4:
            classification = result
        else:
            classify_source = "heuristic"
    except Exception:  # noqa: BLE001
        classify_source = "heuristic"

    if classification is None:
        classification = _heuristic_classify(home_markdown, careers_markdown)
        classify_source = "heuristic"

    elapsed = round(time.perf_counter() - t0, 3)
    return {
        "classification": classification,
        "classify_source": classify_source,
        "agent_timings": {"classify": elapsed},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "classify", tel),
        },
    }


# ── Node 4: score ─────────────────────────────────────────────────────────────

async def score(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    c = state.get("classification") or {}

    s = 0.0
    reasons: list[str] = []

    if c.get("category") in ("CONSULTANCY", "AGENCY"):
        s += 0.25
        reasons.append("ICP category")

    ai_tier = c.get("ai_tier", 0)
    s += {2: 0.25, 1: 0.18, 0: 0.0}.get(ai_tier, 0.0)
    if ai_tier >= 1:
        reasons.append(f"AI tier {ai_tier}")

    rp = c.get("remote_policy")
    s += {"full_remote": 0.20, "hybrid": 0.12}.get(rp, 0.0)
    if rp in ("full_remote", "hybrid"):
        reasons.append(rp)

    if c.get("has_open_roles"):
        s += 0.10
        reasons.append("hiring")

    s *= 0.6 + 0.4 * c.get("confidence", 0.5)
    score_value = round(min(s, 1.0), 3)
    needs_review = c.get("confidence", 0) < 0.6

    return {
        "scores": {
            "score": score_value,
            "reasons": reasons,
            "needs_review": needs_review,
        },
        "agent_timings": {"score": round(time.perf_counter() - t0, 3)},
    }


# ── Node 5: persist ───────────────────────────────────────────────────────────

def load_product_icps(
    cur: Any, product_ids: list[int], tenant_id: str
) -> dict[int, dict[str, Any]]:
    """Fetch ``products.icp_analysis`` for all relevant products in one query.

    Returns a ``{product_id: icp_analysis_dict}`` map. Rows without an
    analysis are omitted. Narrowed to a single tenant so we never blend
    analysis rows across tenants.
    """
    if not product_ids:
        return {}
    try:
        cur.execute(
            """
            SELECT id, icp_analysis
            FROM products
            WHERE id = ANY(%s) AND tenant_id = %s AND icp_analysis IS NOT NULL
            """,
            (product_ids, tenant_id),
        )
        out: dict[int, dict[str, Any]] = {}
        for row in cur.fetchall() or []:
            pid, payload = row[0], row[1]
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except Exception:  # noqa: BLE001
                    continue
            if isinstance(payload, dict):
                out[int(pid)] = payload
        return out
    except psycopg.Error:
        # Non-fatal — fall back to regex-only scoring.
        return {}


def _load_existing_weights_hashes(
    cur: Any, company_id: int, product_ids: list[int]
) -> dict[int, str]:
    """Read each existing row's ``signals.icp_fit.weights_hash`` — used to
    skip re-scoring when the ICP contract hasn't changed."""
    if not product_ids:
        return {}
    try:
        cur.execute(
            """
            SELECT product_id, signals->'icp_fit'->>'weights_hash'
            FROM company_product_signals
            WHERE company_id = %s AND product_id = ANY(%s)
            """,
            (int(company_id), product_ids),
        )
        return {int(r[0]): (r[1] or "") for r in cur.fetchall() or []}
    except psycopg.Error:
        return {}


async def score_verticals(state: CompanyEnrichmentState) -> dict:
    """Score every registered ``ProductVertical`` against this company.

    Runs after ``persist`` so a failure here does not roll back the core
    enrichment UPDATE. For each vertical:
      1. Apply the vertical's ``signal_rules`` to ``home_markdown +
         careers_markdown`` → a signals dict keyed by the rules' ``key``.
      2. If ``products.icp_analysis`` is present for this product, compute
         an ICP-fit block (segment / persona / deal-breakers) and blend it
         with the regex score into a composite score.
      3. UPSERT one row into ``company_product_signals`` keyed by
         ``(company_id, product_id)`` with the v2 signals jsonb shape.

    Adding a new product is a one-file change under ``verticals/<slug>.py``;
    no change needed here.
    """
    if state.get("_error"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {}
    t0 = time.perf_counter()

    home_markdown = state.get("home_markdown") or ""
    careers_markdown = state.get("careers_markdown") or ""
    classification = state.get("classification") or {}
    corpus = home_markdown + "\n" + careers_markdown
    if not corpus.strip():
        # Nothing to score against. Skip all verticals uniformly.
        return {"agent_timings": {"score_verticals": round(time.perf_counter() - t0, 3)}}

    verticals = all_verticals()
    if not verticals:
        return {"agent_timings": {"score_verticals": round(time.perf_counter() - t0, 3)}}

    tenant_id = "nyx"
    product_ids = [int(v.product_id) for v in verticals]
    composite_weights = load_composite_weights()

    persisted: dict[str, dict[str, Any]] = {}
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                icps = load_product_icps(cur, product_ids, tenant_id)
                existing_hashes = _load_existing_weights_hashes(
                    cur, int(company_id), product_ids
                )
                for vertical in verticals:
                    regex_signals = apply_signal_rules(vertical, corpus)
                    regex_score, _regex_tier = compute_score_and_tier(
                        vertical, regex_signals
                    )
                    meaningful_keys = [k for k in regex_signals if k != "schema_version"]

                    icp_payload = icps.get(int(vertical.product_id))
                    fit_result: dict[str, Any] | None = None
                    if icp_payload is not None:
                        current_hash = str(
                            (icp_payload.get("graph_meta") or {}).get("weights_hash")
                            or ""
                        )
                        prior_hash = existing_hashes.get(int(vertical.product_id), "")
                        if current_hash and current_hash == prior_hash:
                            # Idempotent skip — ICP hasn't changed since last score.
                            continue
                        fit_result = compute_icp_fit(
                            icp_analysis=icp_payload,
                            classification=classification,
                            home_markdown=home_markdown,
                            careers_markdown=careers_markdown,
                            regex_score=float(regex_score),
                            weights=composite_weights,
                        )

                    if fit_result is not None:
                        composite_score = float(fit_result["composite_score"])
                        composite_tier = fit_result["composite_tier"]
                        # Skip writes where nothing fired AND the composite is
                        # zero (e.g. no regex + no ICP evidence). Preserves the
                        # v1 skip-if-empty guard.
                        if (
                            not meaningful_keys
                            and composite_score == 0
                            and composite_tier != "disqualified"
                        ):
                            continue
                        v2_signals = build_v2_signals(
                            schema_version=vertical.schema_version,
                            regex_signals=regex_signals,
                            icp_block=fit_result["icp_fit"],
                            composite_score=composite_score,
                            composite_tier=composite_tier,
                        )
                        write_score = composite_score
                        write_tier = composite_tier
                    else:
                        if not meaningful_keys and regex_score == 0:
                            continue
                        v2_signals = build_v2_signals(
                            schema_version=vertical.schema_version,
                            regex_signals=regex_signals,
                            icp_block=None,
                            composite_score=None,
                            composite_tier=None,
                        )
                        write_score = float(regex_score)
                        _, write_tier = compute_score_and_tier(vertical, regex_signals)

                    cur.execute(
                        """
                        INSERT INTO company_product_signals
                          (company_id, product_id, signals, score, tier, updated_at)
                        VALUES (%s, %s, %s::jsonb, %s, %s, now())
                        ON CONFLICT (company_id, product_id) DO UPDATE
                          SET signals    = EXCLUDED.signals,
                              score      = EXCLUDED.score,
                              tier       = EXCLUDED.tier,
                              updated_at = now()
                        """,
                        (
                            int(company_id),
                            int(vertical.product_id),
                            json.dumps(v2_signals),
                            float(write_score),
                            write_tier,
                        ),
                    )
                    persisted[vertical.slug] = {
                        "signals": v2_signals,
                        "score": round(float(write_score), 3),
                        "tier": write_tier,
                    }
    except psycopg.Error:
        # Non-fatal — the core enrichment already committed in `persist`.
        # A failure to score doesn't invalidate classification + scores.
        return {"agent_timings": {"score_verticals": round(time.perf_counter() - t0, 3)}}

    return {
        "vertical_signals": persisted,
        "agent_timings": {"score_verticals": round(time.perf_counter() - t0, 3)},
    }


async def persist(state: CompanyEnrichmentState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    company = state.get("company") or {}
    company_id = state.get("company_id")
    classification = state.get("classification") or {}
    scores = state.get("scores") or {}
    home_markdown = state.get("home_markdown") or ""
    careers_markdown = state.get("careers_markdown") or ""
    careers_url = state.get("careers_url") or ""
    domain = company.get("canonical_domain") or ""

    reasons = scores.get("reasons") or []
    score_value = scores.get("score", 0.0)
    confidence = classification.get("confidence", 0.0)
    now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    now_iso = datetime.now(timezone.utc).isoformat()

    facts_persisted = 0
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                # a. UPDATE companies
                cur.execute(
                    """
                    UPDATE companies
                    SET category                      = %s,
                        ai_tier                       = %s,
                        score                         = %s,
                        score_reasons                 = %s,
                        ai_classification_reason      = %s,
                        ai_classification_confidence  = %s,
                        updated_at                    = now()::text
                    WHERE id = %s
                    """,
                    (
                        classification.get("category"),
                        classification.get("ai_tier"),
                        score_value,
                        json.dumps(reasons),
                        classification.get("reason"),
                        confidence,
                        int(company_id),
                    ),
                )

                # b. INSERT company_facts — home row
                home_value_json = json.dumps({
                    "home_markdown": home_markdown[:2000],
                    "classification": classification,
                    "scores": scores,
                })
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
                        "classification.home",
                        home_value_json,
                        None,
                        confidence,
                        "LIVE_FETCH",
                        f"https://{domain}",
                        now_ts,
                        now_iso,
                        "LLM",
                        EXTRACTOR_VERSION,
                        200,
                    ),
                )
                facts_persisted += 1

                # careers row — only when content was found
                if careers_markdown:
                    careers_value_json = json.dumps({"careers_markdown": careers_markdown[:2000]})
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
                            "classification.careers",
                            careers_value_json,
                            None,
                            confidence,
                            "LIVE_FETCH",
                            careers_url,
                            now_ts,
                            now_iso,
                            "LLM",
                            EXTRACTOR_VERSION,
                            200,
                        ),
                    )
                    facts_persisted += 1

    except psycopg.Error as e:
        return {"_error": f"persist: {e}"}

    model = os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner")
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    meta = product_intel_graph_meta(
        graph="company_enrichment",
        model=model,
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    summary = {
        "company_id": company_id,
        "company_name": company.get("name"),
        "canonical_domain": domain,
        "category": classification.get("category"),
        "ai_tier": classification.get("ai_tier"),
        "score": score_value,
        "classify_source": state.get("classify_source"),
        "facts_persisted": facts_persisted,
        "graph_meta": meta,
    }

    return {
        "facts_persisted": facts_persisted,
        "updated": True,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyEnrichmentState)
    builder.add_node("load", load)
    builder.add_node("fetch", fetch)
    builder.add_node("classify", classify)
    builder.add_node("score", score)
    builder.add_node("persist", persist)
    builder.add_node("score_verticals", score_verticals)
    builder.add_edge(START, "load")
    builder.add_edge("load", "fetch")
    builder.add_edge("fetch", "classify")
    builder.add_edge("classify", "score")
    builder.add_edge("score", "persist")
    # Vertical signal scorer runs after core persist so its failures never
    # roll back classification + scores. The single node iterates all
    # registered ProductVerticals internally — adding a new product is a
    # file-drop under `verticals/`, not a graph change.
    builder.add_edge("persist", "score_verticals")
    builder.add_edge("score_verticals", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
