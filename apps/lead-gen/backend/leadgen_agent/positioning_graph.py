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


def _load_competitive(product_id: int) -> dict[str, Any]:
    """Fetch named competitors for the standalone positioning path.

    Mirrors the SQL in ``ensure_competitors`` (product_intel_graph) so both
    execution paths see identical competitive data. Only returns competitors
    with a done analysis and a done/approved individual status.
    """
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)::int
                FROM competitor_analyses a
                JOIN competitors c ON c.analysis_id = a.id
                WHERE a.product_id = %s AND a.status = 'done'
                """,
                (int(product_id),),
            )
            count_row = cur.fetchone() or (0,)
            has_completed = bool(count_row[0])

            named: list[dict[str, Any]] = []
            if has_completed:
                cur.execute(
                    """
                    SELECT c.name, c.url, c.domain, c.description,
                           c.positioning_headline, c.target_audience
                    FROM competitors c
                    JOIN competitor_analyses a ON c.analysis_id = a.id
                    WHERE a.product_id = %s
                      AND a.status = 'done'
                      AND c.status IN ('done', 'approved', 'suggested')
                    ORDER BY c.id
                    LIMIT 10
                    """,
                    (int(product_id),),
                )
                cols = [d[0] for d in cur.description or []]
                named = [dict(zip(cols, r)) for r in cur.fetchall()]

    return {
        "has_completed_analysis": has_completed,
        "competitor_count": count_row[0],
        "competitors": named,
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

    When invoked from the product_intel supervisor these are already in state
    (product, icp, competitive all pre-populated), in which case this is a no-op.
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

    # Standalone path: also load competitor data the supervisor would inject.
    # A failure is non-fatal — the graph degrades gracefully with an empty
    # competitive dict (LLM is told not to fabricate competitors).
    if not state.get("competitive"):
        try:
            loaded["competitive"] = _load_competitive(int(product_id))
        except Exception:  # noqa: BLE001
            loaded["competitive"] = {
                "has_completed_analysis": False,
                "competitor_count": 0,
                "competitors": [],
            }

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


def _competitive_block(competitive: dict[str, Any]) -> str:
    """Render the competitive dict as a human-readable block for LLM prompts.

    When the product_intel supervisor loaded named competitors from the DB,
    they live in competitive["competitors"] as a list of {name, url,
    description, positioning_headline, target_audience} dicts. Format them
    explicitly so the LLM can build a real competitor_frame rather than
    falling back to anti-pattern names like "naive chunking".
    """
    named: list[dict[str, Any]] = competitive.get("competitors") or []
    if named:
        lines = ["Known competitors (use these for competitor_frame):"]
        for c in named[:8]:
            headline = c.get("positioning_headline") or c.get("description") or ""
            lines.append(
                f"  - {c.get('name', '?')} ({c.get('url', '?')})"
                + (f": {headline[:160]}" if headline else "")
            )
        return "\n".join(lines) + "\n\n"
    # Fallback: minimal metadata only (no fabrication pressure)
    count = competitive.get("competitor_count") or 0
    has = competitive.get("has_completed_analysis", False)
    return (
        f"Competitive snapshot: analysis={'complete' if has else 'not run'}, "
        f"known_count={count}. "
        "If you cannot identify real named competitors with confidence, "
        "return an empty competitor_frame list.\n\n"
    )


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
                        "You map the competitive landscape for this product. Return three "
                        "distinct things:\n"
                        "  - axes: 2-4 tradeoff dimensions used to plot competitors "
                        "(e.g. 'opinionated vs customizable', 'speed vs completeness').\n"
                        "  - white_space: 2-4 unoccupied market positions the product "
                        "could credibly own — phrased as positions, not axes "
                        "(e.g. 'opinionated speed-first issue tracker for small teams'). "
                        "These must NOT repeat the axes verbatim.\n"
                        "  - competitor_frame: 2-5 entries, each naming a real competing "
                        "product/service plus its key gap in the form "
                        "'<competitor name> (<one-phrase gap>)'. Forbidden: anti-patterns "
                        "like 'naive X', 'manual Y', 'legacy tools', 'custom scripts'. "
                        "Only real, named products or services. If the competitive "
                        "snapshot is empty and you cannot name real competitors with "
                        "confidence, return an empty list — do not fabricate.\n"
                        "Only return content the product's own description already "
                        "supports — no wishful thinking. "
                        'Return strict JSON: {"axes":[string],"white_space":[string],'
                        '"competitor_frame":[string]}.'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Product brief:\n{_product_brief(product)}\n\n"
                        f"Category conventions already identified: {json.dumps(conventions)}\n\n"
                        + _competitive_block(competitive)
                        + "\nReturn JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"identify_white_space: {e}"}

    payload = result if isinstance(result, dict) else {}
    axes = payload.get("axes") or []
    white_space = payload.get("white_space") or []
    frame = payload.get("competitor_frame") or []
    if not isinstance(axes, list):
        axes = []
    if not isinstance(white_space, list):
        white_space = []
    if not isinstance(frame, list):
        frame = []

    # Scrub anti-pattern competitors that slipped past the prompt (LLMs still
    # reach for 'naive X' / 'manual Y' / the Jira example). Keep the check
    # lowercase-substring so variants like 'Naive Chunking' and 'legacy
    # tooling' are caught.
    _anti = ("naive ", "manual ", "legacy ", "custom script", "in-house ",
             "homegrown ", "jira (legacy")
    clean_frame = [
        s for s in (str(x)[:240] for x in frame)
        if not any(p in s.lower() for p in _anti)
    ][:8]

    # De-dupe white_space against axes — if the LLM returned the same phrase
    # in both, drop it from white_space (axes are the canonical dimensions).
    axes_lc = {str(a).strip().lower() for a in axes}
    clean_white_space = [
        str(x)[:240] for x in white_space
        if str(x).strip().lower() not in axes_lc
    ][:6]

    return {
        "white_space": clean_white_space,
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
            "competitor_frame": clean_frame,
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

    # Richer persona hint: pull role + seniority + team/stage so the drafter
    # has enough to write a specific ICP rather than 'tech-savvy CTOs'.
    persona_hint = ""
    personas = icp.get("personas") or []
    if personas and isinstance(personas, list) and isinstance(personas[0], dict):
        first = personas[0]
        bits = [
            str(first.get("title") or first.get("role") or ""),
            str(first.get("seniority") or ""),
            str(first.get("company_stage") or first.get("segment") or ""),
            str(first.get("team_size") or ""),
        ]
        persona_hint = " · ".join(b for b in bits if b)[:240]

    # Segment fallback when personas aren't structured: pull ICP summary text
    # so the drafter grounds the statement in upstream analysis rather than
    # inventing a buyer.
    icp_summary = ""
    segments = icp.get("segments") or []
    if segments and isinstance(segments, list):
        top_segs = [str(s) for s in segments[:3]]
        icp_summary = " | ".join(top_segs)[:300]
    if not icp_summary:
        icp_summary = str(icp.get("summary") or icp.get("description") or "")[:300]

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
                f"Top persona: {persona_hint or '(unknown — use the ICP summary below)'}\n"
                f"ICP summary: {icp_summary or '(no upstream ICP — infer from the product description, do not default to \"CTOs\")'}\n"
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


def _hard_validate_draft(draft: dict[str, Any], competitive: dict[str, Any]) -> list[str]:
    """Deterministic draft checks run before the LLM critic.

    These catch the failure modes the LLM critic was rubber-stamping in
    production: empty competitor_frame, straw-man competitors, missing
    template markers, too few differentiators. Returning a non-empty list
    forces another draft round (no LLM spend on the critic).
    """
    issues: list[str] = []

    stmt = str(draft.get("positioning_statement") or "")
    # Template: "For <ICP> who <pain>, <product> is the <category> that
    # <differentiator>, unlike <competitor> which <gap>."
    for marker in ("For ", " who ", " unlike ", " which "):
        if marker not in stmt:
            issues.append(
                f"positioning_statement is missing template marker '{marker.strip()}' "
                "— use the exact template: 'For <ICP> who <pain>, <product> is the "
                "<category> that <differentiator>, unlike <competitor> which <gap>.'"
            )
            break

    diffs = draft.get("differentiators") or []
    if not isinstance(diffs, list) or len(diffs) < 3:
        issues.append("need at least 3 concrete differentiators (evidence-backed, not adjectives)")

    frame = draft.get("competitor_frame") or []
    # Only require a non-empty competitor_frame when upstream competitive
    # analysis actually named some competitors; otherwise the honest answer
    # is "unknown" and we don't want the drafter to fabricate one.
    upstream_has_competitors = bool(
        (competitive or {}).get("competitors")
        or (competitive or {}).get("competitor_count")
    )
    if upstream_has_competitors and (not isinstance(frame, list) or len(frame) < 1):
        issues.append(
            "competitor_frame is empty but the competitive snapshot lists "
            "competitors — name 2-5 of them with their key gap, e.g. "
            "'<product> (<one-phrase gap>)'"
        )

    # Straw-man competitors in the statement itself (e.g. 'unlike naive
    # chunking which …') usually mean there's no real competitor handy.
    stmt_lc = stmt.lower()
    for anti in ("unlike naive ", "unlike manual ", "unlike legacy ",
                 "unlike custom script", "unlike in-house ",
                 "unlike homegrown "):
        if anti in stmt_lc:
            issues.append(
                f"positioning_statement uses an anti-pattern ('{anti.strip()}') as the "
                "competitor — name a real competing product/service instead"
            )
            break

    return issues


async def stress_test(state: PositioningState) -> dict:
    """LLM-as-critic with a deterministic pre-check.

    Hard validators run first; if they trip and rounds remain, we skip the
    LLM critic and force a rewrite directly (saves a call and produces a
    more targeted critique). On approval (or budget exhausted), persist.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    draft = state.get("draft") or {}
    product = state.get("product") or {}
    competitive = state.get("competitive") or {}
    rounds = int(state.get("critic_rounds") or 0)

    hard_issues = _hard_validate_draft(draft, competitive)
    if hard_issues and rounds < MAX_CRITIC_ROUNDS:
        return {
            "critic_feedback": (
                "Fix these hard issues before anything else:\n- "
                + "\n- ".join(hard_issues)
            ),
            "critic_rounds": rounds + 1,
            "agent_timings": {"stress_test": round(time.perf_counter() - t0, 3)},
            # No LLM telemetry added — this round didn't call the model.
        }

    try:
        llm = make_llm(temperature=0.1, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You are a skeptical positioning critic. Default to disapproval "
                        "unless every check below passes. Work through each:\n"
                        "  1. ICP specificity: does it name a role AND a context (company "
                        "stage, team size, or industry)? 'CTOs' or 'Engineering Managers' "
                        "alone is too generic — reject.\n"
                        "  2. Pain specificity: is the pain observable (slow, expensive, "
                        "error-prone), not abstract ('suboptimal', 'fragmented')?\n"
                        "  3. Differentiator defensibility: is it evidence-backed "
                        "(numbers, specific capabilities) or could any competitor claim "
                        "the same words?\n"
                        "  4. Competitor frame: are the named competitors real, current, "
                        "and in the same category? Reject anti-patterns like 'naive X', "
                        "'manual Y', 'legacy tools'.\n"
                        "  5. Category accuracy: does the stated category match the "
                        "product's actual buyer journey (e.g. developer onboarding, not "
                        "generic 'Employee Onboarding Software' if product is code-aware)?\n"
                        "If ALL five pass, return "
                        '{"approved":true,"critique":""}. Otherwise list the failing '
                        'checks: {"approved":false,"critique":"<one bullet per failed '
                        'check, 3-6 bullets total>"}. Return JSON only.'
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
