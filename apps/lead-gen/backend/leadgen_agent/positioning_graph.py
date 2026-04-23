"""Positioning graph — the synthesis layer the intel report was missing.

The product_intel supervisor previously jumped straight from pricing/gtm to a
flattened executive TL;DR. That misses the one artifact marketing and sales
actually need: a positioning statement grounded in (a) the category's own
conventions, (b) where the competitive map is empty, and (c) what the product
actually differentiates on.

Flow:

    extract_category_conventions   — what the category says about itself
        ↓
    identify_white_space           — unoccupied axes in the competitive map
        ↓
    draft_positioning_statement    — "For <ICP> who <pain>, <product> is the
                                      <category> that <differentiator>,
                                      unlike <competitor> which <gap>."
        ↓
    stress_test                    — LLM-as-critic loop; at most 2 extra
                                      draft/critic rounds, then persist.

Output: ``PositioningStatement`` → ``products.positioning_analysis`` jsonb
(migration 0064). Also consumed inline by ``product_intel_graph`` between
``run_gtm`` and ``synthesize_report``.

Pinned to ``deepseek-reasoner`` with ``temperature=0.1`` — this is a reasoning
task, not a copy task. The critic loop is bounded at 2 rewrites so a
pathologically unhappy critic can't run up the bill.
"""

from __future__ import annotations

import json
import os
import time
from typing import Annotated, Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    make_llm,
    merge_node_telemetry,
)
from .notify import notify_complete, notify_error
from .product_intel_schemas import (
    PositioningStatement,
    product_intel_graph_meta,
)
from .state import _merge_dict, _merge_graph_meta

MAX_CRITIC_ROUNDS = 2  # additional draft→critic cycles after the first draft


# ── State ────────────────────────────────────────────────────────────────

class PositioningState(TypedDict, total=False):
    # input
    product_id: int
    product: dict[str, Any]
    icp: dict[str, Any]
    competitive: dict[str, Any]
    pricing: dict[str, Any]
    gtm: dict[str, Any]
    # webhook plumbing
    app_run_id: str
    webhook_url: str
    webhook_secret: str
    # working state
    category_conventions: list[str]
    white_space: list[str]
    draft: dict[str, Any]
    critic_feedback: str
    critic_rounds: int
    positioning: dict[str, Any]
    # telemetry / error plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_graph_meta]


def _load_product_row(product_id: int) -> dict[str, Any]:
    """Fetch the minimal product + cached analyses the positioning graph needs."""
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, url, domain, description, highlights,
                       icp_analysis, pricing_analysis, gtm_analysis
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
    rec = dict(zip(cols, row))

    def _maybe_json(v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    return {
        "product": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "url": rec.get("url") or "",
            "domain": rec.get("domain") or "",
            "description": rec.get("description") or "",
            "highlights": _maybe_json(rec.get("highlights")) or {},
        },
        "icp": _maybe_json(rec.get("icp_analysis")) or {},
        "pricing": _maybe_json(rec.get("pricing_analysis")) or {},
        "gtm": _maybe_json(rec.get("gtm_analysis")) or {},
    }


def _product_brief(product: dict[str, Any]) -> str:
    parts = [
        f"Name: {product.get('name', '')}",
        f"URL:  {product.get('url', '')}",
        f"Description: {product.get('description', '')}",
    ]
    highlights = product.get("highlights") or {}
    if highlights:
        parts.append(f"Highlights: {json.dumps(highlights)[:800]}")
    return "\n".join(parts)


# ── Nodes ────────────────────────────────────────────────────────────────

async def load_inputs(state: PositioningState) -> dict:
    """Materialize product + cached analyses from the DB when called standalone.

    When invoked from the product_intel supervisor these are already in state,
    in which case this is a no-op.
    """
    if state.get("_error"):
        return {}
    if state.get("product") and state.get("icp") is not None:
        return {}
    product_id = state.get("product_id")
    if product_id is None:
        return {"_error": "load_inputs: product_id is required"}
    try:
        loaded = _load_product_row(int(product_id))
    except Exception as e:  # noqa: BLE001
        return {"_error": f"load_inputs: {e}"}
    return loaded


async def extract_category_conventions(state: PositioningState) -> dict:
    if state.get("_error"):
        return {}
    if state.get("category_conventions"):
        return {}  # checkpoint-aware short-circuit
    t0 = time.perf_counter()
    product = state.get("product") or {}
    icp = state.get("icp") or {}

    try:
        llm = make_llm(temperature=0.1, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You identify the conventions of a product category — how "
                        "category leaders describe themselves, the buyer jobs-to-be-done "
                        "the category implicitly owns, and the stock claims a new "
                        "entrant would be expected to make. Stay grounded — don't invent "
                        "new category claims. "
                        'Return strict JSON: {"category":string,"conventions":[string]} '
                        "with 4-8 conventions, each a short phrase (≤ 12 words)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{_product_brief(product)}\n\n"
                        f"ICP hints: {json.dumps((icp.get('segments') or [])[:3])[:600]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"extract_category_conventions: {e}"}

    payload = result if isinstance(result, dict) else {}
    conventions = payload.get("conventions") or []
    if not isinstance(conventions, list):
        conventions = []

    return {
        "category_conventions": [str(x)[:240] for x in conventions][:10],
        "agent_timings": {"extract_category_conventions": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(
                None, "extract_category_conventions", tel
            )
        },
        # stash for the drafter so it can lift the category as-is
        "draft": {
            **(state.get("draft") or {}),
            "category": str(payload.get("category") or "")[:160],
        },
    }


async def identify_white_space(state: PositioningState) -> dict:
    if state.get("_error"):
        return {}
    if state.get("white_space"):
        return {}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    competitive = state.get("competitive") or {}
    conventions = state.get("category_conventions") or []

    try:
        llm = make_llm(temperature=0.1, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You map the competitive landscape and identify unoccupied axes "
                        "(the 'white space') where this product could credibly position. "
                        "An axis is a tradeoff dimension most competitors have picked "
                        "one side of (e.g. 'opinionated vs customizable', 'speed vs "
                        "completeness'). Only return axes the product's own description "
                        "already supports — no wishful thinking. "
                        'Return strict JSON: {"axes":[string],"competitor_frame":[string]} '
                        "with 2-4 axes and 2-5 competitor frames. Each frame names a "
                        "competitor with the key gap: 'jira (legacy, bloated)'."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{_product_brief(product)}\n\n"
                        f"Category conventions already identified: {json.dumps(conventions)}\n\n"
                        f"Competitive snapshot: {json.dumps(competitive)[:600]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"identify_white_space: {e}"}

    payload = result if isinstance(result, dict) else {}
    axes = payload.get("axes") or []
    frame = payload.get("competitor_frame") or []
    if not isinstance(axes, list):
        axes = []
    if not isinstance(frame, list):
        frame = []

    return {
        "white_space": [str(x)[:240] for x in axes][:6],
        "agent_timings": {"identify_white_space": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(
                (state.get("graph_meta") or {}).get("telemetry"),
                "identify_white_space",
                tel,
            )
        },
        "draft": {
            **(state.get("draft") or {}),
            "positioning_axes": [str(x)[:240] for x in axes][:6],
            "competitor_frame": [str(x)[:240] for x in frame][:8],
        },
    }


async def draft_positioning_statement(state: PositioningState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    icp = state.get("icp") or {}
    gtm = state.get("gtm") or {}
    draft_so_far = state.get("draft") or {}
    critic_feedback = state.get("critic_feedback") or ""
    rounds = int(state.get("critic_rounds") or 0)

    persona_hint = ""
    personas = icp.get("personas") or []
    if personas and isinstance(personas, list):
        first = personas[0] if isinstance(personas[0], dict) else {}
        persona_hint = str(first.get("title") or first.get("role") or "")[:120]

    top_pillar = ""
    pillars = (gtm.get("messaging_pillars") or [])
    if pillars and isinstance(pillars[0], dict):
        top_pillar = str(pillars[0].get("theme") or "")[:160]

    messages = [
        {
            "role": "system",
            "content": (
                "You write one concrete positioning statement using the template:\n"
                "  \"For [ICP] who [pain], [product] is the [category] that [differentiator], "
                "unlike [competitor] which [gap].\"\n"
                "Also output 3-5 differentiators and 2-4 narrative hooks (short taglines). "
                "Be ruthless: no marketing fluff, no passive voice. "
                'Return strict JSON: {"positioning_statement":string,"differentiators":[string],'
                '"narrative_hooks":[string]}'
            ),
        },
        {
            "role": "user",
            "content": (
                f"Product brief:\n{_product_brief(product)}\n\n"
                f"Category: {draft_so_far.get('category', '')}\n"
                f"Positioning axes: {json.dumps(draft_so_far.get('positioning_axes') or [])}\n"
                f"Competitor frame: {json.dumps(draft_so_far.get('competitor_frame') or [])}\n"
                f"Top persona: {persona_hint}\n"
                f"Top messaging pillar: {top_pillar}\n"
                + (f"\nCritic feedback from previous draft (address this directly):\n{critic_feedback}\n"
                   if critic_feedback else "")
                + "\nReturn JSON only."
            ),
        },
    ]

    try:
        llm = make_llm(temperature=0.1, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm, messages, provider="deepseek"
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"draft_positioning_statement: {e}"}

    payload = result if isinstance(result, dict) else {}
    differentiators = payload.get("differentiators") or []
    hooks = payload.get("narrative_hooks") or []
    if not isinstance(differentiators, list):
        differentiators = []
    if not isinstance(hooks, list):
        hooks = []

    new_draft = {
        **draft_so_far,
        "positioning_statement": str(payload.get("positioning_statement") or "")[:600],
        "differentiators": [str(x)[:240] for x in differentiators][:8],
        "narrative_hooks": [str(x)[:240] for x in hooks][:6],
    }

    return {
        "draft": new_draft,
        "critic_rounds": rounds,
        "agent_timings": {"draft_positioning_statement": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(
                (state.get("graph_meta") or {}).get("telemetry"),
                "draft_positioning_statement",
                tel,
            )
        },
    }


async def stress_test(state: PositioningState) -> dict:
    """LLM-as-critic. Emits a critique; if non-empty and rounds remain, the
    router bounces back to ``draft_positioning_statement`` with the critique
    in state. On approval (or budget exhausted), persist to DB.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    draft = state.get("draft") or {}
    product = state.get("product") or {}

    try:
        llm = make_llm(temperature=0.1, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You are a skeptical positioning critic. Attack the draft: is the "
                        "differentiator defensible, or is it a claim every competitor also "
                        "makes? Is the competitor frame accurate or strawmanned? Does the "
                        "statement commit to a specific ICP and pain, or hedge? "
                        "If the draft is defensible and specific, return "
                        '{"approved":true,"critique":""}. Otherwise return '
                        '{"approved":false,"critique":"<3-6 sentence critique>"}. '
                        "Return JSON only."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{_product_brief(product)}\n\n"
                        f"Draft:\n{json.dumps(draft)[:1800]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        # Non-fatal: bail out with the current draft rather than losing work.
        result = {"approved": True, "critique": ""}
        tel = {"model": "unknown", "cost_usd": 0.0, "latency_ms": 0,
               "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

    payload = result if isinstance(result, dict) else {}
    approved = bool(payload.get("approved", True))
    critique = str(payload.get("critique") or "")[:2000]

    rounds = int(state.get("critic_rounds") or 0)
    will_revise = (not approved) and rounds < MAX_CRITIC_ROUNDS

    delta: dict[str, Any] = {
        "agent_timings": {"stress_test": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(
                (state.get("graph_meta") or {}).get("telemetry"),
                "stress_test",
                tel,
            )
        },
    }

    if will_revise:
        delta["critic_feedback"] = critique
        delta["critic_rounds"] = rounds + 1
        return delta

    # Final — assemble PositioningStatement and persist.
    model = os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner")
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    # include this node's own call in the telemetry we persist
    telemetry = merge_node_telemetry(telemetry, "stress_test", tel)
    meta = product_intel_graph_meta(
        graph="positioning",
        model=model,
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    statement = PositioningStatement.model_validate(
        {
            "category": draft.get("category", ""),
            "category_conventions": state.get("category_conventions") or [],
            "white_space": state.get("white_space") or [],
            "differentiators": draft.get("differentiators") or [],
            "positioning_axes": draft.get("positioning_axes") or [],
            "competitor_frame": draft.get("competitor_frame") or [],
            "narrative_hooks": draft.get("narrative_hooks") or [],
            "positioning_statement": draft.get("positioning_statement", ""),
            "critic_rounds": rounds,
            "graph_meta": meta,
        }
    )
    dumped = statement.model_dump()

    product_id = state.get("product_id") or (state.get("product") or {}).get("id")
    if product_id is not None:
        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE products
                        SET positioning_analysis = %s::jsonb,
                            updated_at = now()::text
                        WHERE id = %s
                        """,
                        (json.dumps(dumped), int(product_id)),
                    )
        except Exception as e:  # noqa: BLE001
            # Persist failure shouldn't mask the in-memory result; the caller
            # (supervisor) still gets positioning via return state.
            delta["_error"] = f"stress_test persist: {e}"

    delta["positioning"] = dumped
    return delta


async def notify_error_node(state: PositioningState) -> dict:
    err = state.get("_error") or "unknown error"
    await notify_error(state, err)
    return {}


def _route_after_stress_test(state: PositioningState) -> str:
    if state.get("_error"):
        return "notify_error_node"
    if state.get("positioning"):
        return "notify_complete"
    # critic bounced back; loop to draft
    return "draft_positioning_statement"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(PositioningState)
    builder.add_node("load_inputs", load_inputs)
    builder.add_node("extract_category_conventions", extract_category_conventions)
    builder.add_node("identify_white_space", identify_white_space)
    builder.add_node("draft_positioning_statement", draft_positioning_statement)
    builder.add_node("stress_test", stress_test)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "load_inputs")
    builder.add_edge("load_inputs", "extract_category_conventions")
    builder.add_edge("extract_category_conventions", "identify_white_space")
    builder.add_edge("identify_white_space", "draft_positioning_statement")
    builder.add_edge("draft_positioning_statement", "stress_test")
    builder.add_conditional_edges(
        "stress_test",
        _route_after_stress_test,
        ["draft_positioning_statement", "notify_complete", "notify_error_node"],
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
