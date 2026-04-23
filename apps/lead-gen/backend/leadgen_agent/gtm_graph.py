"""Go-to-market strategy graph.

Inputs: product id + ICP (from products.icp_analysis) + competitive landscape
(from competitors_team output, persisted in competitors/competitor_* tables) +
pricing (optional, from products.pricing_analysis).

Nodes:
    load_inputs
      ├── pick_channels        (LLM — channels grounded in ICP presence)
      └── craft_pillars        (LLM — messaging pillars, reasoner tier)
        → write_templates      (LLM — cold emails / LinkedIn templates)
        → build_playbook       (LLM — discovery questions, objections, battlecards)
        → draft_plan           (LLM — 90-day action plan)
          → END (emits products.gtm_analysis jsonb payload)

Uses DeepSeek throughout.
"""

from __future__ import annotations

import json
import os
import time
from typing import Annotated, Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn, _product_brief
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
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
    Channel,
    GTMStrategy,
    MessagingPillar,
    Objection,
    OutreachTemplate,
    SalesPlaybook,
    product_intel_graph_meta,
)
from .state import GTMState


def _first_error(left: str | None, right: str | None) -> str | None:
    """Reducer: keep the first error set by parallel fan-out nodes."""
    return left or right


class _GTMStateWithError(GTMState, total=False):
    """Local extension of GTMState carrying an ad-hoc ``_error`` channel so
    exception-path routing survives across nodes without editing state.py."""

    _error: Annotated[str, _first_error]


async def load_inputs(state: GTMState) -> dict:
    start_seed = {} if state.get("_progress_started_at") else progress_start_marker()
    _seeded_state = {**state, **start_seed} if start_seed else state
    await update_progress(_seeded_state, stage="load_inputs")

    # Checkpoint-aware short-circuit: when resuming from a prior thread,
    # AsyncPostgresSaver rehydrates product/icp/competitive before the node
    # runs. Skip the DB round-trip in that case.
    if state.get("product") and state.get("competitive") is not None:
        return {**start_seed, "_completed_stages": ["load_inputs"]}
    product_id = state.get("product_id")
    if product_id is None:
        raise ValueError("product_id is required")

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, url, domain, description, highlights,
                       icp_analysis, pricing_analysis
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

            # Latest completed competitive analysis + its top-threat competitors
            cur.execute(
                """
                SELECT c.name, c.url, c.positioning_headline, c.positioning_tagline,
                       c.target_audience
                FROM competitor_analyses a
                JOIN competitors c ON c.analysis_id = a.id
                WHERE a.product_id = %s
                  AND a.status = 'done'
                ORDER BY a.created_at DESC, c.id ASC
                LIMIT 6
                """,
                (int(product_id),),
            )
            comp_rows = cur.fetchall()
            comp_cols = [d[0] for d in cur.description or []]

    def _maybe_json(v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    highlights = _maybe_json(product_row.get("highlights"))
    icp = _maybe_json(product_row.get("icp_analysis")) or {}
    pricing = _maybe_json(product_row.get("pricing_analysis")) or {}

    competitors = [
        {
            "name": dict(zip(comp_cols, r)).get("name") or "",
            "url": dict(zip(comp_cols, r)).get("url") or "",
            "positioning_headline": dict(zip(comp_cols, r)).get("positioning_headline") or "",
            "positioning_tagline": dict(zip(comp_cols, r)).get("positioning_tagline") or "",
            "target_audience": dict(zip(comp_cols, r)).get("target_audience") or "",
        }
        for r in comp_rows
    ]

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
        "icp": icp,
        "competitive": {"competitors": competitors},
        "pricing": pricing,
        "_completed_stages": ["load_inputs"],
    }


def _icp_summary(icp: dict[str, Any]) -> str:
    if not icp:
        return "No ICP available — produce GTM from product brief alone, note this gap."
    segments = icp.get("segments") or []
    personas = icp.get("personas") or []
    seg = ", ".join(
        f"{s.get('name', '?')}/{s.get('industry', '?')}"
        for s in segments[:3]
        if isinstance(s, dict)
    )
    per = ", ".join(
        f"{p.get('title', '?')} ({p.get('department', '?')})"
        for p in personas[:4]
        if isinstance(p, dict)
    )
    return f"Segments: {seg}\nPersonas: {per}"


def _competitive_summary(competitive: dict[str, Any]) -> str:
    comps = competitive.get("competitors") or []
    if not comps:
        return "No competitor context."
    return "\n".join(
        f"- {c.get('name', '?')}: {c.get('positioning_headline', '')} (audience: {c.get('target_audience', '')})"
        for c in comps[:6]
    )


def _pricing_summary(pricing: dict[str, Any]) -> str:
    if not pricing:
        return "No pricing strategy yet."
    model = pricing.get("model") or {}
    tiers = model.get("tiers") or []
    tier_strs = [
        f"{t.get('name', '?')} @ ${t.get('price_monthly_usd')}/mo"
        if t.get("price_monthly_usd") is not None
        else f"{t.get('name', '?')} (custom)"
        for t in tiers[:5]
    ]
    return f"Value metric: {model.get('value_metric', '?')}\nTiers: " + ", ".join(tier_strs)


async def pick_channels(state: GTMState) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="pick_channels",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: validated channel list is expensive
    # (LLM + Pydantic). Skip when a prior checkpoint already populated it.
    if state.get("channels"):
        return {"_completed_stages": ["pick_channels"]}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    icp = state.get("icp") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You choose 2-5 go-to-market channels that match the ICP. "
                        "For each: {name, why (why this channel fits), "
                        "icp_presence (evidence ICP is here — communities, hashtags, events), "
                        "tactics (3-5 concrete plays), effort ('low'|'medium'|'high'), "
                        "time_to_first_lead (e.g. '1-2 weeks')}. "
                        "Bias toward high-leverage, founder-doable channels early. Do NOT list "
                        "'paid ads' unless ICP actually converts on paid (most B2B ICPs don't). "
                        'Return strict JSON: {"channels":[...]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{brief}\n\n"
                        f"ICP:\n{_icp_summary(icp)}\n\n"
                        f"Competitors:\n{_competitive_summary(state.get('competitive') or {})}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"pick_channels: {e}"}
    raw = result.get("channels") if isinstance(result, dict) else None
    channels_validated: list[dict[str, Any]] = []
    for c in raw or []:
        if not isinstance(c, dict):
            continue
        try:
            channels_validated.append(Channel.model_validate(c).model_dump())
        except Exception:
            continue
    return {
        "channels": channels_validated[:5],
        "agent_timings": {"pick_channels": round(time.perf_counter() - t0, 3)},
        "_completed_stages": ["pick_channels"],
    }


async def craft_pillars(state: GTMState) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="craft_pillars",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: reasoner-tier LLM call. Skip on resume
    # when pillars are already populated from a prior checkpoint.
    if state.get("pillars"):
        return {"_completed_stages": ["craft_pillars"]}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    icp = state.get("icp") or {}
    comps = state.get("competitive") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You derive 3-5 messaging pillars. Each: {theme (core promise, e.g. 'Cut "
                        "research time 10x'), proof_points (specific evidence/numbers/demos), "
                        "when_to_use (persona and buying stage), avoid_when (when this backfires)}. "
                        "Tie pillars to persona pains and our differentiation vs competitors. "
                        "Avoid generic SaaS platitudes. Be concrete."
                        'Return strict JSON: {"pillars":[...]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{brief}\n\n"
                        f"ICP:\n{_icp_summary(icp)}\n\n"
                        f"Competitors:\n{_competitive_summary(comps)}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"craft_pillars: {e}"}
    raw = result.get("pillars") if isinstance(result, dict) else None
    pillars: list[dict[str, Any]] = []
    for p in raw or []:
        if not isinstance(p, dict):
            continue
        try:
            pillars.append(MessagingPillar.model_validate(p).model_dump())
        except Exception:
            continue
    return {
        "pillars": pillars[:5],
        "agent_timings": {"craft_pillars": round(time.perf_counter() - t0, 3)},
        "_completed_stages": ["craft_pillars"],
    }


def _fan_out(_state: GTMState) -> list[str]:
    return ["pick_channels", "craft_pillars"]


async def write_templates(state: GTMState) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="write_templates",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: skip the outreach-template LLM call on
    # resume when templates are already populated.
    if state.get("templates"):
        return {"_completed_stages": ["write_templates"]}
    t0 = time.perf_counter()
    icp = state.get("icp") or {}
    personas = (icp.get("personas") or [])[:4]
    pillars = state.get("pillars") or []

    try:
        llm = make_llm(temperature=0.3, provider="deepseek")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You write 3-6 short outreach templates across channels "
                        "('cold_email'|'linkedin_dm'|'linkedin_connect'|'linkedin_post'|'reply_guy'|"
                        "'community'|'webinar'). Each template: {channel, persona (title of target "
                        "persona), hook (1-line reference to something specific), "
                        "body (plain text, <100 words, no marketing fluff, use {{first_name}} and "
                        "{{company}} placeholders), cta (one clear ask)}. Each template must be "
                        "grounded in a messaging pillar. "
                        'Return strict JSON: {"templates":[...]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Personas:\n{json.dumps(personas)[:1500]}\n\n"
                        f"Pillars:\n{json.dumps(pillars)[:2000]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"write_templates: {e}"}
    raw = result.get("templates") if isinstance(result, dict) else None
    templates: list[dict[str, Any]] = []
    for t in raw or []:
        if not isinstance(t, dict):
            continue
        try:
            templates.append(OutreachTemplate.model_validate(t).model_dump())
        except Exception:
            continue
    return {
        "templates": templates[:8],
        "agent_timings": {"write_templates": round(time.perf_counter() - t0, 3)},
        "_completed_stages": ["write_templates"],
    }


async def build_playbook(state: GTMState) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="build_playbook",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: reasoner-tier LLM call. Skip on resume
    # when playbook is already fleshed out (discovery_questions populated).
    existing = state.get("playbook") or {}
    if existing.get("discovery_questions"):
        return {"_completed_stages": ["build_playbook"]}
    t0 = time.perf_counter()
    icp = state.get("icp") or {}
    comps = state.get("competitive") or {}
    pricing = state.get("pricing") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You build the sales playbook: "
                        "{discovery_questions:[6-8 questions that qualify fit AND surface pain], "
                        "objections:[{objection, response, evidence_to_show:[string]}], "
                        "battlecards:{competitor_name: 'one-paragraph differentiation vs them'}}. "
                        "Don't bash competitors; position around gaps. "
                        'Return strict JSON: {"discovery_questions":[],"objections":[],"battlecards":{}}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"ICP:\n{_icp_summary(icp)}\n\n"
                        f"Competitors:\n{_competitive_summary(comps)}\n\n"
                        f"Pricing:\n{_pricing_summary(pricing)}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"build_playbook: {e}"}
    if not isinstance(result, dict):
        result = {}
    try:
        playbook = SalesPlaybook.model_validate(result).model_dump()
    except Exception:
        playbook = SalesPlaybook().model_dump()
    return {
        "playbook": playbook,
        "agent_timings": {"build_playbook": round(time.perf_counter() - t0, 3)},
        "_completed_stages": ["build_playbook"],
    }


async def draft_plan(state: GTMState) -> dict:
    if state.get("_error"):
        return {}
    await update_progress(
        state,
        stage="draft_plan",
        completed_stages=state.get("_completed_stages") or [],
    )
    # Checkpoint-aware short-circuit: terminal node emits `gtm` (the dumped
    # GTMStrategy) and `first_90_days`. If both are set on the checkpoint,
    # the work (LLM call + products UPDATE) is already done.
    if state.get("gtm") and state.get("first_90_days"):
        return {"_completed_stages": ["draft_plan"]}
    t0 = time.perf_counter()
    channels = state.get("channels") or []
    pillars = state.get("pillars") or []
    templates = state.get("templates") or []
    playbook = state.get("playbook") or {}
    pricing = state.get("pricing") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You draft a concrete first-90-days GTM plan. 6-12 action items, each "
                        "week-labelled (e.g. 'Week 1: …', 'Week 2-3: …', 'Month 2: …', 'Month 3: …'). "
                        "Each item must be specific, owner-clear, and shippable by a small team. "
                        "Tie items back to the channels and pillars chosen. "
                        'Return strict JSON: {"first_90_days":[string]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Channels:\n{json.dumps([c.get('name') for c in channels])}\n"
                        f"Pillars:\n{json.dumps([p.get('theme') for p in pillars])}\n"
                        f"Templates ready: {len(templates)}\n"
                        f"Playbook ready: discovery_q={len(playbook.get('discovery_questions') or [])}, "
                        f"objections={len(playbook.get('objections') or [])}\n"
                        f"Pricing: {_pricing_summary(pricing)}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"draft_plan: {e}"}
    raw = result.get("first_90_days") if isinstance(result, dict) else None
    plan = [str(x)[:400] for x in (raw or []) if isinstance(x, (str, int, float))][:12]

    meta = product_intel_graph_meta(
        graph="gtm",
        model=os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
        agent_timings=state.get("agent_timings") or {},
    )
    gtm = GTMStrategy.model_validate(
        {
            "channels": channels,
            "messaging_pillars": pillars,
            "outreach_templates": templates,
            "sales_playbook": playbook,
            "first_90_days": plan,
            "graph_meta": meta,
        }
    )
    dumped = gtm.model_dump()

    product = state.get("product") or {}
    product_id = product.get("id") or state.get("product_id")
    if product_id is not None:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE products
                    SET gtm_analysis = %s::jsonb,
                        gtm_analyzed_at = now()::text,
                        updated_at = now()::text
                    WHERE id = %s
                    """,
                    (json.dumps(dumped), int(product_id)),
                )

    return {
        "first_90_days": plan,
        "gtm": dumped,
        "graph_meta": meta,
        "agent_timings": {"draft_plan": round(time.perf_counter() - t0, 3)},
    }


async def notify_error_node(state: GTMState) -> dict:
    err = state.get("_error") or "unknown error"
    await notify_error(state, err)
    return {}


def _route_final(state: GTMState) -> str:
    return "notify_error_node" if state.get("_error") else "notify_complete"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(_GTMStateWithError)
    builder.add_node("load_inputs", load_inputs)
    builder.add_node("pick_channels", pick_channels)
    builder.add_node("craft_pillars", craft_pillars)
    builder.add_node("write_templates", write_templates)
    builder.add_node("build_playbook", build_playbook)
    builder.add_node("draft_plan", draft_plan)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "load_inputs")
    builder.add_conditional_edges(
        "load_inputs", _fan_out, ["pick_channels", "craft_pillars"]
    )
    builder.add_edge("pick_channels", "write_templates")
    builder.add_edge("craft_pillars", "write_templates")
    builder.add_edge("craft_pillars", "build_playbook")
    builder.add_edge("write_templates", "draft_plan")
    builder.add_edge("build_playbook", "draft_plan")
    builder.add_conditional_edges(
        "draft_plan", _route_final, ["notify_complete", "notify_error_node"]
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
