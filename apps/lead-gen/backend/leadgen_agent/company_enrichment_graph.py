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

from .db_columns import persist_embedding
from .deep_icp_graph import _dsn
from .embeddings import (
    EMBED_MODEL,
    compose_company_profile_text,
    content_hash,
    embed_texts,
    vector_to_pg_literal,
)
from .icp_fit_scorer import (
    build_v2_signals,
    compute_icp_fit,
    load_composite_weights,
    tier_for,
)
from .llm import ainvoke_json_with_telemetry, compute_totals, make_llm, merge_node_telemetry
from .loaders import fetch_url
from .product_intel_schemas import product_intel_graph_meta
from .state import CompanyEnrichmentState
from .verticals import all_verticals, apply_signal_rules, compute_score_and_tier

EXTRACTOR_VERSION = "python-qwen-2026-04"

# ── Node 1: load ──────────────────────────────────────────────────────────────

# Re-classify a company at most once per FRESHNESS_DAYS unless the caller
# explicitly opts in via ``force_refresh``. Tunable via env so a discovery
# backfill can lower it without a code change.
try:
    _FRESHNESS_DAYS = max(1, int(os.environ.get("ENRICHMENT_FRESHNESS_DAYS", "30")))
except ValueError:
    _FRESHNESS_DAYS = 30
_FRESHNESS_MIN_CONFIDENCE = 0.6


async def load(state: CompanyEnrichmentState) -> dict:
    if state.get("_error") or state.get("_skip_reason"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {"_error": "load: company_id is required"}
    sql = (
        "SELECT id, name, canonical_domain, website, category, ai_tier, "
        "       ai_classification_confidence, updated_at "
        "FROM companies WHERE id = %s LIMIT 1"
    )
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

    company = {
        "id": rec["id"],
        "name": rec.get("name") or "",
        "canonical_domain": domain,
        "website": rec.get("website") or "",
    }

    # Fresh-skip gate: don't re-pay LLM tokens to re-derive a category we
    # already have at decent confidence and recent updated_at. Caller can
    # bypass with force_refresh=True (e.g. taxonomy migration).
    if not state.get("force_refresh"):
        category = (rec.get("category") or "").strip().upper()
        confidence = float(rec.get("ai_classification_confidence") or 0.0)
        updated_at = rec.get("updated_at")
        is_classified = category and category != "UNKNOWN" and confidence >= _FRESHNESS_MIN_CONFIDENCE
        is_recent = False
        if updated_at is not None:
            try:
                age_days = (datetime.now(timezone.utc) - updated_at).days
                is_recent = age_days < _FRESHNESS_DAYS
            except (TypeError, ValueError):
                is_recent = False
        if is_classified and is_recent:
            return {
                "company": company,
                "_skip_reason": "fresh",
            }

    return {"company": company}


# ── Node 2: fetch ─────────────────────────────────────────────────────────────

async def fetch(state: CompanyEnrichmentState) -> dict:
    if state.get("_error") or state.get("_skip_reason"):
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
    if state.get("_error") or state.get("_skip_reason"):
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
    if state.get("_error") or state.get("_skip_reason"):
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


def _load_semantic_scores(
    cur: Any, company_id: int, product_ids: list[int]
) -> dict[int, float]:
    """Return ``{product_id: cosine_similarity}`` for products with an
    ICP embedding, when this company has a ``profile_embedding`` set.

    ``<=>`` is pgvector cosine distance; ``1 - dist`` is cosine similarity
    in ``[-1, 1]``. L2-normalized vectors on both sides keep this in
    ``[0, 1]`` for all practical inputs.
    """
    if not product_ids:
        return {}
    try:
        cur.execute(
            """
            WITH c AS (
              SELECT profile_embedding AS v FROM companies
              WHERE id = %s AND profile_embedding IS NOT NULL
            )
            SELECT p.id, 1 - (p.icp_embedding <=> c.v) AS sim
            FROM products p CROSS JOIN c
            WHERE p.id = ANY(%s) AND p.icp_embedding IS NOT NULL
            """,
            (int(company_id), product_ids),
        )
        return {int(r[0]): float(r[1]) for r in cur.fetchall() or []}
    except psycopg.Error:
        return {}


_SEMANTIC_BLEND_WITH_ICP = 0.3      # β for (base_icp, semantic)
_SEMANTIC_BLEND_REGEX_ONLY = 0.4    # β for (regex, semantic) when no ICP


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
    if state.get("_error") or state.get("_skip_reason"):
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
    semantic_weight_icp = float(
        composite_weights.get("semantic_weight", _SEMANTIC_BLEND_WITH_ICP)
    )
    semantic_weight_regex = float(
        composite_weights.get("semantic_weight_regex", _SEMANTIC_BLEND_REGEX_ONLY)
    )

    persisted: dict[str, dict[str, Any]] = {}
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                icps = load_product_icps(cur, product_ids, tenant_id)
                existing_hashes = _load_existing_weights_hashes(
                    cur, int(company_id), product_ids
                )
                semantic_scores = _load_semantic_scores(
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

                    sem_score = semantic_scores.get(int(vertical.product_id))
                    # Clamp semantic into [0,1] before blending (cosine can be
                    # slightly negative on unrelated texts even with normed vecs).
                    sem_clamped = (
                        max(0.0, min(1.0, float(sem_score)))
                        if sem_score is not None
                        else None
                    )

                    if fit_result is not None:
                        base_score = float(fit_result["composite_score"])
                        base_tier = fit_result["composite_tier"]
                        # Blend semantic on top of the ICP composite base.
                        if sem_clamped is not None and base_tier != "disqualified":
                            blended = (1.0 - semantic_weight_icp) * base_score + \
                                semantic_weight_icp * sem_clamped
                            final_score = round(max(0.0, min(1.0, blended)), 4)
                            final_tier = tier_for(final_score)
                        else:
                            final_score = base_score
                            final_tier = base_tier
                        if (
                            not meaningful_keys
                            and final_score == 0
                            and final_tier != "disqualified"
                            and sem_clamped is None
                        ):
                            continue
                        v2_signals = build_v2_signals(
                            schema_version=vertical.schema_version,
                            regex_signals=regex_signals,
                            icp_block=fit_result["icp_fit"],
                            composite_score=final_score,
                            composite_tier=final_tier,
                        )
                        write_score = final_score
                        write_tier = final_tier
                    else:
                        # Regex-only path — blend with semantic if available.
                        regex_only_score = float(regex_score)
                        if sem_clamped is not None:
                            blended = (1.0 - semantic_weight_regex) * regex_only_score + \
                                semantic_weight_regex * sem_clamped
                            final_score = round(max(0.0, min(1.0, blended)), 4)
                            final_tier = tier_for(final_score)
                        else:
                            final_score = regex_only_score
                            _, final_tier = compute_score_and_tier(vertical, regex_signals)
                        if not meaningful_keys and final_score == 0 and sem_clamped is None:
                            continue
                        v2_signals = build_v2_signals(
                            schema_version=vertical.schema_version,
                            regex_signals=regex_signals,
                            icp_block=None,
                            composite_score=final_score if sem_clamped is not None else None,
                            composite_tier=final_tier if sem_clamped is not None else None,
                        )
                        write_score = final_score
                        write_tier = final_tier

                    sem_write = (
                        round(sem_clamped, 4) if sem_clamped is not None else None
                    )
                    cur.execute(
                        """
                        INSERT INTO company_product_signals
                          (company_id, product_id, signals, score, regex_score,
                           semantic_score, semantic_score_computed_at, tier, updated_at)
                        VALUES (%s, %s, %s::jsonb, %s, %s, %s,
                                CASE WHEN %s IS NULL THEN NULL ELSE now() END,
                                %s, now())
                        ON CONFLICT (company_id, product_id) DO UPDATE
                          SET signals                     = EXCLUDED.signals,
                              score                       = EXCLUDED.score,
                              regex_score                 = EXCLUDED.regex_score,
                              semantic_score              = EXCLUDED.semantic_score,
                              semantic_score_computed_at  = EXCLUDED.semantic_score_computed_at,
                              tier                        = EXCLUDED.tier,
                              updated_at                  = now()
                        """,
                        (
                            int(company_id),
                            int(vertical.product_id),
                            json.dumps(v2_signals),
                            float(write_score),
                            float(regex_score),
                            sem_write,
                            sem_write,
                            write_tier,
                        ),
                    )
                    persisted[vertical.slug] = {
                        "signals": v2_signals,
                        "score": round(float(write_score), 3),
                        "regex_score": round(float(regex_score), 3),
                        "semantic_score": sem_write,
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
    if state.get("_error") or state.get("_skip_reason"):
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


# ── Node 6: embed_profile ─────────────────────────────────────────────────────

async def embed_profile(state: CompanyEnrichmentState) -> dict:
    """Compute the company's ICP-matching profile embedding (intervention #4).

    Runs between ``persist`` and ``score_verticals`` so ``score_verticals`` can
    read the fresh embedding for semantic cosine against ``products.icp_embedding``.
    Non-fatal — a failure here does not block scoring (regex-only still works).
    """
    if state.get("_error") or state.get("_skip_reason"):
        return {}
    company_id = state.get("company_id")
    if company_id is None:
        return {}
    t0 = time.perf_counter()

    company = state.get("company") or {}
    classification = state.get("classification") or {}
    home_markdown = state.get("home_markdown") or ""

    # Hydrate the company dict with description / industry / tags so the
    # composer can use them. classification carries the freshly-inferred industry.
    company_row = {
        "description": company.get("description") or "",
        "industry": classification.get("industry") or company.get("industry") or "",
        "tags": company.get("tags"),
    }
    facts = [
        {
            "field": "classification.home",
            "value_json": {"home_markdown": home_markdown[:4000]},
        }
    ]
    text = compose_company_profile_text(company_row, facts)
    if not text.strip() or text == "query: ":
        return {"agent_timings": {"embed_profile": round(time.perf_counter() - t0, 3)}}

    new_hash = content_hash(text)
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT profile_embedding_source_hash FROM companies WHERE id = %s",
                    (int(company_id),),
                )
                row = cur.fetchone()
                prior_hash = row[0] if row else None
    except psycopg.Error:
        prior_hash = None

    if prior_hash and prior_hash == new_hash:
        return {"agent_timings": {"embed_profile": round(time.perf_counter() - t0, 3)}}

    try:
        vectors = await embed_texts([text])
    except Exception as e:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning("embed_profile: %s", e)
        return {"agent_timings": {"embed_profile": round(time.perf_counter() - t0, 3)}}

    if not vectors:
        return {"agent_timings": {"embed_profile": round(time.perf_counter() - t0, 3)}}

    try:
        persist_embedding(
            table="companies",
            row_id=int(company_id),
            column="profile_embedding",
            vector_literal=vector_to_pg_literal(vectors[0]),
            model=EMBED_MODEL,
            source_hash=new_hash,
        )
    except Exception as e:  # noqa: BLE001
        import logging as _logging
        _logging.getLogger(__name__).warning("embed_profile persist: %s", e)

    return {"agent_timings": {"embed_profile": round(time.perf_counter() - t0, 3)}}


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyEnrichmentState)
    builder.add_node("load", load)
    builder.add_node("fetch", fetch)
    builder.add_node("classify", classify)
    builder.add_node("score", score)
    builder.add_node("persist", persist)
    builder.add_node("embed_profile", embed_profile)
    builder.add_node("score_verticals", score_verticals)
    builder.add_edge(START, "load")
    builder.add_edge("load", "fetch")
    builder.add_edge("fetch", "classify")
    builder.add_edge("classify", "score")
    builder.add_edge("score", "persist")
    # Embedding runs before vertical scoring so score_verticals can blend
    # semantic cosine into the composite. Non-fatal on embed failure.
    builder.add_edge("persist", "embed_profile")
    # Vertical signal scorer runs after embed so its failures never roll back
    # classification + scores. Adding a new product is a file-drop under
    # `verticals/`, not a graph change.
    builder.add_edge("embed_profile", "score_verticals")
    builder.add_edge("score_verticals", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
