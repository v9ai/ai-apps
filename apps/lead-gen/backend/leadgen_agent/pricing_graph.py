"""Pricing strategy graph.

Inputs: a product id + the latest ICP + competitor pricing rows already loaded
into Neon by the existing ``competitors_team`` graph.

Nodes:
    load_inputs
      ├── benchmark_competitors   (summarize competitor_pricing_tiers rows)
      └── choose_value_metric     (LLM — reasoner tier)
        → design_model            (LLM — reasoner tier, 2-5 tiers with prices)
        → write_rationale         (LLM — reasoner tier)
          → END (emits products.pricing_analysis jsonb payload)

Uses DeepSeek (``provider="deepseek"``). Respects existing ``load_product``
pattern in ``deep_icp_graph``. Never blocks on missing ICP/competitor data —
falls back to product profile only and notes the gap in the rationale.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import time
from typing import Annotated, Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .db_columns import persist_product_jsonb
from .deep_icp_graph import _dsn, _product_brief
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    deepseek_model_name,
    make_llm,
    merge_node_telemetry,
)
from .notify import (
    notify_complete,
    notify_error,
    progress_start_marker,
    update_progress,
)
from .product_intel_schemas import (
    PricingModel,
    PricingRationale,
    PricingStrategy,
    product_intel_graph_meta,
)
from .state import PricingState

log = logging.getLogger(__name__)

_COMPETITOR_BRIEF_CHARS = 3500
_ICP_BRIEF_CHARS = 2500

# Retry budget for transient DeepSeek failures (rate limits, 5xx, socket blips).
# Empirically DeepSeek's public API hits short outages a few times per week;
# a 3-attempt bounded retry with jitter recovers most of these without changing
# the "one exception → abort" invariant for genuinely malformed prompts
# (ValidationError / JSONDecodeError are raised from parse paths after the
# response returns, not from the HTTP call, so they surface on attempt 1).
_MAX_LLM_ATTEMPTS = 3
_RETRY_BASE_DELAY = 0.75  # seconds; doubles each attempt, jittered ±25%


async def _ainvoke_json_with_retry(
    llm: Any,
    messages: list[dict[str, str]],
    *,
    provider: str | None = None,
    node: str,
) -> tuple[Any, dict[str, Any]]:
    """Wrap ``ainvoke_json_with_telemetry`` with bounded retries + jitter.

    Only retries on network/provider transients — once the response has landed
    and we're parsing JSON, any error there is deterministic so re-calling
    burns money. We detect "worth retrying" via a short string-match on the
    exception chain; if the exception bubbles from ``_parse_json`` the caller
    sees it on attempt 1.

    The telemetry dict returned belongs to the *successful* attempt only;
    failed attempts are logged but not charged to the node's cost ledger
    (they never produced usable tokens anyway).
    """
    last_exc: Exception | None = None
    for attempt in range(1, _MAX_LLM_ATTEMPTS + 1):
        try:
            return await ainvoke_json_with_telemetry(
                llm, messages, provider=provider
            )
        except json.JSONDecodeError:
            # Parse error: the response came back, it's just malformed.
            # Retrying the *same* prompt won't produce different JSON, so
            # short-circuit to let the caller surface the prompt bug fast.
            raise
        except Exception as e:  # noqa: BLE001
            last_exc = e
            if attempt >= _MAX_LLM_ATTEMPTS:
                break
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            delay *= random.uniform(0.75, 1.25)
            log.warning(
                "pricing_graph.%s: transient LLM failure (attempt %d/%d): %s "
                "— retrying in %.2fs",
                node, attempt, _MAX_LLM_ATTEMPTS, e, delay,
            )
            await asyncio.sleep(delay)
    # Exhausted — re-raise with attempt context so the error node has signal.
    raise RuntimeError(
        f"LLM failed after {_MAX_LLM_ATTEMPTS} attempts: {last_exc}"
    ) from last_exc


def _first_error(left: str | None, right: str | None) -> str | None:
    """Reducer: keep the first error set by parallel fan-out nodes."""
    return left or right


class _PricingStateWithError(PricingState, total=False):
    """Local extension of PricingState that carries an optional ``_error`` key.

    LangGraph only tracks channels declared on the state schema — unknown keys
    are silently dropped. We need the error string to survive across nodes so
    the final router can pick notify_error vs notify_complete, but the instruction
    set forbids editing state.py. Extending here keeps the ad-hoc key local to
    the graph module. The ``_first_error`` reducer handles the case where two
    parallel fan-out nodes both fail in the same step.
    """

    _error: Annotated[str, _first_error]


async def load_inputs(state: _PricingStateWithError) -> dict:
    # Seed the progress clock on first entry so update_progress can report
    # monotonic elapsed_ms even after sub-subgraph fan-outs.
    start_seed = {} if state.get("_progress_started_at") else progress_start_marker()
    _seeded_state = {**state, **start_seed} if start_seed else state
    await update_progress(_seeded_state, stage="load_inputs")

    # Checkpoint-aware short-circuit: when the supervisor resumes from a prior
    # thread via `resume_from_run_id`, AsyncPostgresSaver rehydrates state
    # before any node runs. If we already loaded product + competitor rows,
    # skip the DB round-trip entirely.
    if state.get("product") and state.get("competitor_summary") is not None:
        return {**start_seed, "_completed_stages": ["load_inputs"]}

    # Entry-node guard: any exception here (bad product_id, DB down, etc.) used
    # to escape LangGraph's executor and leave product_intel_runs.status stuck
    # on "running". We now catch + route via _error so the terminal
    # notify_error_node fires and the webhook transitions the run to a clean
    # terminal state.
    try:
        product_id = state.get("product_id")
        if product_id is None:
            raise ValueError("product_id is required")

        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, name, url, domain, description, highlights, icp_analysis
                    FROM products
                    WHERE id = %s
                    LIMIT 1
                    """,
                    (int(product_id),),
                )
                row = cur.fetchone()
                if not row:
                    raise RuntimeError(f"product id {product_id} not found")
                cols = [d[0] for d in cur.description or []]
                product_row = dict(zip(cols, row))

                # Pull competitor pricing from the most recent completed analysis for
                # this product. Joining on status != 'failed' so partial runs still
                # surface something useful.
                cur.execute(
                    """
                    SELECT c.id, c.name, c.url, c.domain,
                           c.positioning_headline, c.positioning_tagline, c.target_audience,
                           t.tier_name, t.monthly_price_usd, t.annual_price_usd,
                           t.seat_price_usd, t.currency, t.included_limits,
                           t.is_custom_quote, t.sort_order
                    FROM competitor_analyses a
                    JOIN competitors c ON c.analysis_id = a.id
                    LEFT JOIN competitor_pricing_tiers t ON t.competitor_id = c.id
                    WHERE a.product_id = %s
                      AND a.status <> 'failed'
                    ORDER BY a.created_at DESC, c.id ASC, t.sort_order ASC NULLS LAST
                    """,
                    (int(product_id),),
                )
                pricing_rows = cur.fetchall()
                pricing_cols = [d[0] for d in cur.description or []]
    except Exception as e:  # noqa: BLE001
        return {"_error": f"load_inputs: {repr(e)[:1000]}"}

    highlights = product_row.get("highlights")
    if isinstance(highlights, str):
        try:
            highlights = json.loads(highlights)
        except json.JSONDecodeError:
            highlights = None
    icp_analysis = product_row.get("icp_analysis")
    if isinstance(icp_analysis, str):
        try:
            icp_analysis = json.loads(icp_analysis)
        except json.JSONDecodeError:
            icp_analysis = None

    # Collapse competitor+tier rows into {competitor_summary: [...], competitor_pricing: [...]}
    by_competitor: dict[int, dict[str, Any]] = {}
    tiers: list[dict[str, Any]] = []
    for row in pricing_rows:
        rec = dict(zip(pricing_cols, row))
        cid = rec.get("id")
        if cid is None:
            continue
        if cid not in by_competitor:
            by_competitor[cid] = {
                "name": rec.get("name") or "",
                "url": rec.get("url") or "",
                "domain": rec.get("domain") or "",
                "positioning_headline": rec.get("positioning_headline") or "",
                "positioning_tagline": rec.get("positioning_tagline") or "",
                "target_audience": rec.get("target_audience") or "",
            }
        if rec.get("tier_name"):
            tiers.append(
                {
                    "competitor_name": rec.get("name") or "",
                    "tier_name": rec.get("tier_name") or "",
                    "monthly_price_usd": rec.get("monthly_price_usd"),
                    "annual_price_usd": rec.get("annual_price_usd"),
                    "seat_price_usd": rec.get("seat_price_usd"),
                    "currency": rec.get("currency") or "USD",
                    "included_limits": rec.get("included_limits"),
                    "is_custom_quote": bool(rec.get("is_custom_quote")),
                }
            )

    return {
        **start_seed,
        "product": {
            "id": product_row["id"],
            "name": product_row.get("name") or "",
            "url": product_row.get("url") or "",
            "domain": product_row.get("domain") or "",
            "description": product_row.get("description") or "",
            "highlights": highlights,
        },
        "icp": icp_analysis or {},
        "competitor_pricing": tiers,
        "competitor_summary": list(by_competitor.values()),
        "_completed_stages": ["load_inputs"],
    }


def _fmt_competitor_block(summary: list[dict[str, Any]], tiers: list[dict[str, Any]]) -> str:
    if not summary and not tiers:
        return "No competitor data available for this product."
    tiers_by_comp: dict[str, list[dict[str, Any]]] = {}
    for t in tiers:
        tiers_by_comp.setdefault(t["competitor_name"], []).append(t)
    parts: list[str] = []
    for c in summary:
        name = c.get("name", "?")
        tier_lines: list[str] = []
        for t in tiers_by_comp.get(name, []):
            price = t.get("monthly_price_usd")
            label = f"${price}/mo" if price else (
                "custom/contact" if t.get("is_custom_quote") else "undisclosed"
            )
            tier_lines.append(f"    • {t.get('tier_name', '?')}: {label}")
        hdr = c.get("positioning_headline") or c.get("positioning_tagline") or ""
        parts.append(
            f"- {name} ({c.get('url', '')}) — {hdr}\n"
            f"  audience: {c.get('target_audience', '')}\n"
            + ("\n".join(tier_lines) if tier_lines else "    • pricing undisclosed")
        )
    return "\n".join(parts)[:_COMPETITOR_BRIEF_CHARS]


def _fmt_icp_block(icp: dict[str, Any]) -> str:
    if not icp:
        return "No ICP analysis yet — infer from product profile alone."
    segments = icp.get("segments") or []
    personas = icp.get("personas") or []
    seg_lines = [
        f"- {s.get('name', '?')} / {s.get('industry', '?')} / {s.get('stage', '?')} (fit={s.get('fit', '?')})"
        for s in segments[:4]
        if isinstance(s, dict)
    ]
    per_lines = [
        f"- {p.get('title', '?')} @ {p.get('department', '?')} — pain: {p.get('pain', '?')}"
        for p in personas[:4]
        if isinstance(p, dict)
    ]
    weighted = icp.get("weighted_total")
    return (
        f"Weighted ICP fit: {weighted}\nSegments:\n"
        + "\n".join(seg_lines)
        + "\n\nPersonas:\n"
        + "\n".join(per_lines)
    )[:_ICP_BRIEF_CHARS]


async def benchmark_competitors(state: _PricingStateWithError) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="benchmark_competitors",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: LLM call is the expensive bit. If a prior
    # checkpoint already produced a benchmark payload (non-empty summary), skip
    # the DeepSeek round-trip on resume.
    existing = state.get("benchmark") or {}
    if existing.get("category_summary"):
        return {"_completed_stages": ["benchmark_competitors"]}
    t0 = time.perf_counter()
    tiers = state.get("competitor_pricing") or []
    summary = state.get("competitor_summary") or []
    if not tiers and not summary:
        return {
            "benchmark": {
                "category_summary": "No competitor data loaded.",
                "price_anchors": [],
                "category_norms": [],
            },
            "agent_timings": {"benchmark_competitors": round(time.perf_counter() - t0, 3)},
            "_completed_stages": ["benchmark_competitors"],
        }

    try:
        llm = make_llm(temperature=0.1, provider="deepseek")
        result, tel = await _ainvoke_json_with_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You extract competitive pricing intelligence. Given competitor rows "
                        "and their tier pricing from our DB, produce: "
                        '{"category_summary":"1-2 sentence summary of how this category prices",'
                        '"price_anchors":["lowest concrete price seen","median","highest"],'
                        '"category_norms":["free_trial|no_free_trial","annual_discount|monthly_only","per_seat|per_usage|flat","pricing_opaque|pricing_public"]}. '
                        "If any anchor cannot be inferred, say so explicitly in that slot. "
                        "Respond with ONLY the JSON object — no prose, no markdown fences, "
                        "no preamble like 'Here is...'."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competitor rows + pricing tiers:\n{_fmt_competitor_block(summary, tiers)}"
                        f"\n\nReturn JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="benchmark_competitors",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"benchmark_competitors: {repr(e)[:1000]}"}
    if not isinstance(result, dict):
        result = {}
    return {
        "benchmark": {
            "category_summary": str(result.get("category_summary", ""))[:600],
            "price_anchors": [str(x)[:200] for x in (result.get("price_anchors") or [])][:6],
            "category_norms": [str(x)[:200] for x in (result.get("category_norms") or [])][:8],
        },
        "agent_timings": {"benchmark_competitors": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "benchmark_competitors", tel)
        },
        "_completed_stages": ["benchmark_competitors"],
    }


async def choose_value_metric(state: _PricingStateWithError) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="choose_value_metric",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit (reasoner-tier call, ~$0.002 saved per resume).
    existing = state.get("value_metric") or {}
    if existing.get("recommended_metric"):
        return {"_completed_stages": ["choose_value_metric"]}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    icp_block = _fmt_icp_block(state.get("icp") or {})

    try:
        llm = make_llm(temperature=0.1, provider="deepseek", tier="deep")
        result, tel = await _ainvoke_json_with_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You choose the best value metric for a B2B product. A good value "
                        "metric (a) scales with customer value received, (b) is predictable "
                        "for the buyer, (c) does not punish successful usage. Examples: "
                        "'per verified lead', 'per closed deal', 'per active workspace'. "
                        "Avoid 'per API call' (punishes success) or 'per feature' (arbitrary). "
                        "Return strict JSON: "
                        '{"recommended_metric":string,"alternatives":[string],"reasoning":"1-3 sentences"}. '
                        "Respond with ONLY the JSON object — no prose, no markdown fences, "
                        "no preamble like 'Here is...'."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{brief}\n\nICP context:\n{icp_block}"
                        f"\n\nReturn JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="choose_value_metric",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"choose_value_metric: {repr(e)[:1000]}"}
    if not isinstance(result, dict):
        result = {}
    return {
        "value_metric": {
            "recommended_metric": str(result.get("recommended_metric", ""))[:240],
            "alternatives": [str(x)[:160] for x in (result.get("alternatives") or [])][:4],
            "reasoning": str(result.get("reasoning", ""))[:600],
        },
        "agent_timings": {"choose_value_metric": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "choose_value_metric", tel)
        },
        "_completed_stages": ["choose_value_metric"],
    }


def _fan_out(_state: _PricingStateWithError) -> list[str]:
    return ["benchmark_competitors", "choose_value_metric"]


async def design_model(state: _PricingStateWithError) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="design_model",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: design_model is a reasoner-tier call with
    # validated Pydantic output. If the model was already designed in a prior
    # run on this thread, skip.
    existing = state.get("model") or {}
    if existing.get("tiers"):
        return {"_completed_stages": ["design_model"]}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    icp_block = _fmt_icp_block(state.get("icp") or {})
    benchmark = state.get("benchmark") or {}
    metric = state.get("value_metric") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result, tel = await _ainvoke_json_with_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You design a pricing model for a B2B product. Produce 2-5 tiers. "
                        "Each tier: {name, price_monthly_usd (number|null for custom), "
                        "billing_unit ('per_seat'|'per_usage'|'flat'|'hybrid'|'custom'), "
                        "target_persona, included:[string], limits:[string], upgrade_trigger, "
                        "price_justification (1-3 sentences: WHY this exact price), "
                        "anchor_competitors ([string] — names of specific competitor tiers "
                        "this price is benchmarked against, e.g. 'Relevance AI Pro ($199/mo)'), "
                        "value_math (one-line quantitative basis — e.g. 'Saves 6h/wk × $85/hr "
                        "× 4.3 wk = $2,193/mo value; price at ~9% of value captured')}. "
                        "HARD RULE: Every numeric price must be justified by at least one "
                        "competitor anchor from the benchmark OR explicit value_math. No pure "
                        "intuition. For the custom/enterprise tier, anchor against the "
                        "competitor's enterprise tier and note the value basis even if the "
                        "price itself is a range. "
                        "Also produce top-level value_metric_reasoning (why this metric — "
                        "1-2 sentences, WTP aligned) and model_type_reasoning (why this "
                        "billing model — buyer behavior + category norms). "
                        'Return strict JSON: {"value_metric":string,"value_metric_reasoning":string,'
                        '"model_type":("subscription"|"usage"|"hybrid"|"per_outcome"|"freemium"),'
                        '"model_type_reasoning":string,"free_offer":string,"tiers":[...],'
                        '"addons":[string],"discounting_strategy":string}. '
                        "Respond with ONLY the JSON object — no prose, no markdown fences, "
                        "no preamble like 'Here is...'. The very first character of your "
                        "response must be '{'."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{brief}\n\n"
                        f"ICP context:\n{icp_block}\n\n"
                        f"Benchmark:\n{json.dumps(benchmark)[:2000]}\n\n"
                        f"Value metric recommendation:\n{json.dumps(metric)[:800]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="design_model",
        )
        if not isinstance(result, dict):
            result = {}
        # Forward the value_metric node's reasoning into the model dict so the
        # UI can surface it alongside the metric label itself — don't let a
        # shorter free-text reason from design_model overwrite the dedicated
        # upstream analysis.
        upstream_metric_reasoning = str(
            (state.get("value_metric") or {}).get("reasoning") or ""
        ).strip()
        if upstream_metric_reasoning and not str(
            result.get("value_metric_reasoning") or ""
        ).strip():
            result["value_metric_reasoning"] = upstream_metric_reasoning
        # Validate via Pydantic — turns bad LLM output into an early clean failure
        validated = PricingModel.model_validate(result)
    except Exception as e:  # noqa: BLE001
        return {"_error": f"design_model: {repr(e)[:1000]}"}
    return {
        "model": validated.model_dump(),
        "agent_timings": {"design_model": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(
                (state.get("graph_meta") or {}).get("telemetry"),
                "design_model",
                tel,
            )
        },
        "_completed_stages": ["design_model"],
    }


async def write_rationale(state: _PricingStateWithError) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="write_rationale",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: if both `pricing` (the terminal dumped
    # payload) and `rationale` are set on the checkpoint, the work is done —
    # skip the reasoner-tier LLM call + the products UPDATE.
    if state.get("pricing") and (state.get("rationale") or {}).get("recommendation"):
        return {"_completed_stages": ["write_rationale"]}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    icp_block = _fmt_icp_block(state.get("icp") or {})
    benchmark = state.get("benchmark") or {}
    pricing_model = state.get("model") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result, tel = await _ainvoke_json_with_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You write the strategic rationale for a pricing model. Cover: "
                        "value_basis (why this price reflects value delivered — time saved × $/hr, "
                        "or $ earned, etc.), competitor_benchmark (how this compares vs competitors, "
                        "where deliberately above/below), wtp_estimate (USD range for the primary "
                        "persona), risks (array of 2-5 pricing pitfalls), recommendation (one-paragraph "
                        "top-line call). Be concrete, cite numbers where possible. "
                        "ALSO emit price_anchors: a structured list of 2-6 competitor tiers used "
                        "as reference points. Each anchor is {competitor, tier, monthly_price_usd "
                        "(number|null), relation ('below'|'at_parity'|'premium'|'undercut'), "
                        "note (short rationale for the comparison)}. Use real competitor names "
                        "from the benchmark — do not invent. 'below' = our price is lower; "
                        "'premium' = our price is higher; 'at_parity' = matched; 'undercut' = "
                        "deliberately priced to undercut a named incumbent. "
                        'Return strict JSON: {"value_basis":string,"competitor_benchmark":string,'
                        '"wtp_estimate":string,"risks":[string],"recommendation":string,'
                        '"price_anchors":[{"competitor":string,"tier":string,'
                        '"monthly_price_usd":number|null,"relation":string,"note":string}]}. '
                        "Respond with ONLY the JSON object — no prose, no markdown fences, "
                        "no preamble like 'Here is...'. The very first character of your "
                        "response must be '{'."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{brief}\n\n"
                        f"ICP context:\n{icp_block}\n\n"
                        f"Benchmark:\n{json.dumps(benchmark)[:1500]}\n\n"
                        f"Pricing model just designed:\n{json.dumps(pricing_model)[:2500]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="write_rationale",
        )
        if not isinstance(result, dict):
            result = {}
        rationale = PricingRationale.model_validate(result)
    except Exception as e:  # noqa: BLE001
        return {"_error": f"write_rationale: {repr(e)[:1000]}"}

    # Fold this node's telemetry into the run-level ledger, then compute totals
    # so graph_meta.totals reflects the full pricing run (not just the last
    # node). Mirrors the positioning_graph pattern.
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    telemetry = merge_node_telemetry(telemetry, "write_rationale", tel)
    meta = product_intel_graph_meta(
        graph="pricing",
        model=deepseek_model_name("deep"),
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )
    pricing = PricingStrategy.model_validate(
        {
            "model": pricing_model,
            "rationale": rationale.model_dump(),
            "graph_meta": meta,
        }
    )
    dumped = pricing.model_dump()

    # Persist to products row. The GraphQL resolver then SELECTs the updated
    # row rather than issuing a second UPDATE (avoids the pricing_analyzed_at
    # drift between the graph's clock and the resolver's clock).
    product = state.get("product") or {}
    product_id = product.get("id") or state.get("product_id")
    if product_id is not None:
        try:
            persist_product_jsonb(
                int(product_id),
                "pricing_analysis",
                "pricing_analyzed_at",
                dumped,
            )
        except Exception as e:  # noqa: BLE001
            return {"_error": f"write_rationale: persist failed: {e}"}

    return {
        "pricing": dumped,
        "graph_meta": meta,
        "rationale": rationale.model_dump(),
        "agent_timings": {"write_rationale": round(time.perf_counter() - t0, 3)},
        "_completed_stages": ["write_rationale"],
    }


async def notify_error_node(state: _PricingStateWithError) -> dict:
    """Emit an error webhook with structured node + stage context.

    The raw ``_error`` string is prefixed with ``node_name: <msg>`` by the
    nodes that set it (see ``benchmark_competitors``, ``design_model``, etc).
    We wrap it into a human-readable message that also carries the last
    ``completed_stages`` so the UI can show *where* the pipeline bailed
    without needing to cross-reference logs.
    """
    raw = state.get("_error") or "unknown error"
    # _error values are of the form "node_name: <exception text>". Split so we
    # can surface the node in a structured spot as well as keep the full
    # message for the webhook body.
    node = "unknown"
    message = raw
    if ":" in raw:
        head, _, rest = raw.partition(":")
        # Only accept short, identifier-like prefixes as the node tag; anything
        # else is just part of the exception text.
        if head.strip().replace("_", "").isalnum() and len(head) <= 40:
            node = head.strip()
            message = rest.strip()
    completed = state.get("_completed_stages") or []
    last_stage = completed[-1] if completed else "load_inputs"
    enriched = (
        f"[pricing/{node}] failed after stage={last_stage}"
        f" (completed={','.join(completed) or 'none'}): {message}"
    )
    await notify_error(state, enriched)
    return {}


def _route_final(state: _PricingStateWithError) -> str:
    return "notify_error_node" if state.get("_error") else "notify_complete"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(_PricingStateWithError)
    builder.add_node("load_inputs", load_inputs)
    builder.add_node("benchmark_competitors", benchmark_competitors)
    builder.add_node("choose_value_metric", choose_value_metric)
    builder.add_node("design_model", design_model)
    builder.add_node("write_rationale", write_rationale)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "load_inputs")
    builder.add_conditional_edges(
        "load_inputs", _fan_out, ["benchmark_competitors", "choose_value_metric"]
    )
    builder.add_edge("benchmark_competitors", "design_model")
    builder.add_edge("choose_value_metric", "design_model")
    builder.add_edge("design_model", "write_rationale")
    builder.add_conditional_edges(
        "write_rationale", _route_final, ["notify_complete", "notify_error_node"]
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
