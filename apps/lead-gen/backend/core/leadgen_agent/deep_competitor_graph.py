"""Deep-dive competitor analysis graph.

Takes a single ``competitor_id`` and runs 6 specialist nodes **in parallel via
the ``Send`` API** — rather than the conditional-edges fan-out used elsewhere
in this codebase — to keep the graph declaration flat and let each specialist
receive the same shared payload without touching the state reducer.

Pipeline:

    load_competitor
        ├─Send─▶ pricing_deep           (pricing-page scrape + tier extraction)
        ├─Send─▶ features_deep          (feature parity matrix vs user's product)
        ├─Send─▶ integrations_deep      (integrations-list diff)
        ├─Send─▶ changelog              (release notes, last 90 days)
        ├─Send─▶ positioning_shift      (messaging delta vs previous snapshot)
        └─Send─▶ funding_headcount      (public funding + headcount signals)
                      ▼
                   synthesize   → persist to DB
                      ▼
                   notify_complete | notify_error_node

All specialists pin to ``deepseek-v4-pro`` (``provider="deepseek", tier="deep"``)
because extracting hard signals from noisy marketing pages benefits from the
reasoning model.

Schema writes (see 0062_add_competitor_deep_analysis.sql):
    - competitor_pricing_tiers (existing, upserted)
    - competitor_features       (existing, upserted)
    - competitor_integrations   (existing, upserted)
    - competitor_changelog           (new)
    - competitor_funding_events      (new)
    - competitor_positioning_snapshots (new)
    - competitor_feature_parity      (new)

A supervisor-level ``deep_analysis`` builder (``build_supervisor_graph``) is
scaffolded here so team 10 (restructuring ``product_intel_graph``) can wire it
in. It fans out this graph across every competitor belonging to a product —
but is **NOT** registered in ``langgraph.json`` as a standalone assistant; only
``deep_competitor`` is.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import time
from typing import Annotated, Any
from urllib.parse import urljoin

import psycopg
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from .deep_icp_graph import _dsn, _product_brief
from .llm import ainvoke_json, deepseek_model_name, make_deepseek_pro
from .loaders import fetch_url
from .notify import notify_complete, notify_error
from .product_intel_schemas import product_intel_graph_meta
from .state import DeepCompetitorState, _merge_dict

log = logging.getLogger(__name__)

# Retry budget for transient LLM failures (rate limits, 5xx, socket blips).
# Mirrors the pattern in pricing_graph: bounded retries with jitter, only for
# network/provider transients — parse errors (JSONDecodeError / ValueError) are
# deterministic and re-raised immediately. DeepSeek's public API hits short
# outages a few times per week; with 6 specialists running in parallel per
# deep-dive, any of them catching a transient used to abort the whole run.
_MAX_LLM_ATTEMPTS = 3
_RETRY_BASE_DELAY = 0.75  # seconds; doubles each attempt, jittered ±25%


async def _ainvoke_json_retry(
    llm: Any,
    messages: list[dict[str, str]],
    *,
    provider: str | None = None,
    node: str,
) -> Any:
    """Bounded retry wrapper around ``ainvoke_json``.

    Specialists fan out in parallel; a single transient from DeepSeek used to
    kill the whole graph run via ``_error`` routing. Retrying once or twice
    turns most of those into no-op blips. Parse errors are NOT retried — the
    prompt is the problem and re-calling wastes tokens.
    """
    last_exc: Exception | None = None
    for attempt in range(1, _MAX_LLM_ATTEMPTS + 1):
        try:
            return await ainvoke_json(llm, messages, provider=provider)
        except (json.JSONDecodeError, ValueError):
            raise
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt >= _MAX_LLM_ATTEMPTS:
                break
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            delay *= random.uniform(0.75, 1.25)
            log.warning(
                "deep_competitor.%s: transient LLM failure (attempt %d/%d): %s "
                "— retrying in %.2fs",
                node, attempt, _MAX_LLM_ATTEMPTS, exc, delay,
            )
            await asyncio.sleep(delay)
    raise RuntimeError(
        f"LLM failed after {_MAX_LLM_ATTEMPTS} attempts: {last_exc}"
    ) from last_exc


def _page_is_usable(page: dict[str, Any] | None) -> bool:
    """A scraped page is usable if we got 200 + non-empty markdown.

    Cheap guard to skip the LLM round-trip when /pricing, /features, etc. 404
    or redirect to an empty shell. Saves DeepSeek tokens and avoids grounding
    the extractor on empty input (which produced hallucinated tiers in the
    wild — see the previous shadow-tier bug in pricing_graph.benchmark).
    """
    if not page:
        return False
    if int(page.get("status") or 0) != 200:
        return False
    return bool((page.get("markdown") or "").strip())

# Specialist node names — single source of truth so `_fan_out` + `build_graph`
# can't drift apart. Order controls the Send fan-out order (cosmetic only;
# LangGraph runs them concurrently).
SPECIALISTS: tuple[str, ...] = (
    "pricing_deep",
    "features_deep",
    "integrations_deep",
    "changelog",
    "positioning_shift",
    "funding_headcount",
)

_PAGE_EXCERPT_CHARS = 6000


def _first_error(left: str | None, right: str | None) -> str | None:
    return left or right


class _DeepCompetitorStateWithError(DeepCompetitorState, total=False):
    """Ad-hoc ``_error`` channel for failure routing — same pattern as the other
    graphs in this package. Keeps state.py free of transient error keys."""

    _error: Annotated[str, _first_error]


# ── 0. load_competitor ────────────────────────────────────────────────


async def load_competitor(state: DeepCompetitorState) -> dict:
    """Load the competitor row + its parent product.

    Idempotent against pre-populated ``competitor`` (for tests): if the caller
    already provided both ``competitor`` and ``product`` dicts, skip the DB hop.
    """
    if state.get("competitor") and state.get("product"):
        return {}

    competitor_id = state.get("competitor_id")
    if competitor_id is None:
        raise ValueError("competitor_id is required")

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.name, c.url, c.domain, c.description,
                       c.positioning_headline, c.positioning_tagline, c.target_audience,
                       a.product_id
                FROM competitors c
                JOIN competitor_analyses a ON a.id = c.analysis_id
                WHERE c.id = %s
                LIMIT 1
                """,
                (int(competitor_id),),
            )
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f"competitor id {competitor_id} not found")
            cols = [d[0] for d in cur.description or []]
            comp = dict(zip(cols, row))

            cur.execute(
                """
                SELECT id, name, url, domain, description, highlights
                FROM products
                WHERE id = %s
                LIMIT 1
                """,
                (int(comp["product_id"]),),
            )
            prow = cur.fetchone()
            if not prow:
                raise RuntimeError(f"parent product {comp['product_id']} missing")
            pcols = [d[0] for d in cur.description or []]
            product_row = dict(zip(pcols, prow))

    highlights = product_row.get("highlights")
    if isinstance(highlights, str):
        try:
            highlights = json.loads(highlights)
        except json.JSONDecodeError:
            highlights = None

    return {
        "competitor": {
            "id": comp["id"],
            "name": comp.get("name") or "",
            "url": comp.get("url") or "",
            "domain": comp.get("domain") or "",
            "description": comp.get("description") or "",
            "positioning_headline": comp.get("positioning_headline") or "",
            "positioning_tagline": comp.get("positioning_tagline") or "",
            "target_audience": comp.get("target_audience") or "",
            "product_id": comp.get("product_id"),
        },
        "product": {
            "id": product_row["id"],
            "name": product_row.get("name") or "",
            "url": product_row.get("url") or "",
            "domain": product_row.get("domain") or "",
            "description": product_row.get("description") or "",
            "highlights": highlights,
        },
    }


# ── 1. Fan-out via Send API ───────────────────────────────────────────


def _fan_out(state: DeepCompetitorState) -> list[Send]:
    """Send-API fan-out. Each specialist gets the full state as its input — the
    LangGraph runtime schedules them concurrently. Contrast with the
    conditional-edges pattern used in ``competitors_team_graph`` and
    ``pricing_graph``, where specialists share a flat parent-scope and the
    reducer merges their outputs.

    Send gives us a clean way to launch N dynamic branches without having to
    pre-declare every edge. It also lets us pass specialist-specific payloads
    in the future (e.g. one competitor per Send for the supervisor graph below).
    """
    if state.get("_error"):
        return []
    payload = {
        "competitor": state.get("competitor") or {},
        "product": state.get("product") or {},
        "competitor_id": state.get("competitor_id"),
    }
    return [Send(name, payload) for name in SPECIALISTS]


# ── 2. Specialist nodes ──────────────────────────────────────────────


def _competitor_brief(comp: dict[str, Any]) -> str:
    return (
        f"NAME: {comp.get('name', '')}\n"
        f"URL: {comp.get('url', '')}\n"
        f"DOMAIN: {comp.get('domain', '')}\n"
        f"POSITIONING: {comp.get('positioning_headline', '')} — {comp.get('positioning_tagline', '')}\n"
        f"AUDIENCE: {comp.get('target_audience', '')}\n"
        f"DESC: {comp.get('description', '')}"
    )


async def pricing_deep(state: DeepCompetitorState) -> dict:
    """Fetch /pricing, extract tiers into structured JSON."""
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    url = comp.get("url") or ""
    if not url:
        return {"pricing_deep": {"tiers": [], "note": "no url"}}

    page = await fetch_url(urljoin(url, "/pricing"))
    if not _page_is_usable(page):
        # 404 / redirect / empty shell — skip the LLM, mark the scrape so the
        # UI can distinguish "no pricing page" from "LLM emitted no tiers".
        return {
            "pricing_deep": {
                "tiers": [],
                "note": "scrape_error",
                "scrape_status": int(page.get("status") or 0),
                "scrape_error": page.get("error"),
                "source_url": page.get("url"),
            },
            "pages": {"pricing": page},
            "agent_timings": {"pricing_deep": round(time.perf_counter() - t0, 3)},
        }
    markdown = (page.get("markdown") or "")[:_PAGE_EXCERPT_CHARS]

    try:
        llm = make_deepseek_pro(temperature=0.1)
        result = await _ainvoke_json_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You extract a competitor's pricing tiers from their pricing page. "
                        "Return strict JSON: "
                        '{"tiers":[{"tier_name":str,"monthly_price_usd":number|null,'
                        '"annual_price_usd":number|null,"seat_price_usd":number|null,'
                        '"currency":str,"included_limits":{},"is_custom_quote":bool,'
                        '"sort_order":int}],"notes":str}. '
                        "If a tier is 'Contact sales' / 'Custom', set is_custom_quote=true "
                        "and leave prices null. Ground every number in the scraped text — "
                        "do not guess."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {_competitor_brief(comp)}\n\n"
                        f"Scraped /pricing page:\n<<<\n{markdown}\n>>>\n\nReturn JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="pricing_deep",
        )
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"pricing_deep: {e}",
            "agent_timings": {"pricing_deep": round(time.perf_counter() - t0, 3)},
        }

    if not isinstance(result, dict):
        result = {}
    tiers = result.get("tiers") or []
    if not isinstance(tiers, list):
        tiers = []
    # Dedup by normalized tier_name. Reasoner occasionally restates the same
    # tier twice (once from the price card, once from a comparison table); the
    # downstream DELETE+INSERT then writes duplicate rows that inflate
    # pricing_graph's `competitor_pricing` list. Keep the first occurrence
    # since it preserves the model's intended sort_order.
    deduped: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    for t in tiers:
        if not isinstance(t, dict):
            continue
        key = str(t.get("tier_name") or "").strip().lower()
        if not key or key in seen_names:
            continue
        seen_names.add(key)
        deduped.append(t)
    return {
        "pricing_deep": {
            "tiers": deduped,
            "notes": str(result.get("notes", ""))[:600],
            "source_url": page.get("url"),
        },
        "pages": {"pricing": page},
        "agent_timings": {"pricing_deep": round(time.perf_counter() - t0, 3)},
    }


async def features_deep(state: DeepCompetitorState) -> dict:
    """Build a feature parity matrix vs the user's product."""
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    product = state.get("product") or {}
    url = comp.get("url") or ""
    if not url:
        return {"features_deep": {"parity": []}}

    page = await fetch_url(urljoin(url, "/features"))
    if not _page_is_usable(page):
        return {
            "features_deep": {
                "parity": [],
                "note": "scrape_error",
                "scrape_status": int(page.get("status") or 0),
                "scrape_error": page.get("error"),
            },
            "pages": {"features": page},
            "agent_timings": {"features_deep": round(time.perf_counter() - t0, 3)},
        }
    markdown = (page.get("markdown") or "")[:_PAGE_EXCERPT_CHARS]

    try:
        llm = make_deepseek_pro(temperature=0.2)
        result = await _ainvoke_json_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You build a feature parity matrix between OUR product and a "
                        "competitor. For each salient feature, mark whether each side "
                        "has it, and rate the gap severity. "
                        "Return strict JSON: "
                        '{"parity":[{"feature":str,"category":str,"we_have_it":bool,'
                        '"they_have_it":bool,"gap_severity":"none"|"minor"|"major"|"critical",'
                        '"note":str}],"summary":str}. '
                        "Only include features you can VERIFY from the provided content. "
                        "Do not invent features on either side."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"OUR product:\n{_product_brief(product)}\n\n"
                        f"Competitor:\n{_competitor_brief(comp)}\n\n"
                        f"Competitor /features page:\n<<<\n{markdown}\n>>>\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="features_deep",
        )
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"features_deep: {e}",
            "agent_timings": {"features_deep": round(time.perf_counter() - t0, 3)},
        }
    if not isinstance(result, dict):
        result = {}
    parity = result.get("parity") or []
    return {
        "features_deep": {
            "parity": parity if isinstance(parity, list) else [],
            "summary": str(result.get("summary", ""))[:800],
        },
        "pages": {"features": page},
        "agent_timings": {"features_deep": round(time.perf_counter() - t0, 3)},
    }


async def integrations_deep(state: DeepCompetitorState) -> dict:
    """Scrape /integrations and extract the list."""
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    url = comp.get("url") or ""
    if not url:
        return {"integrations_deep": {"integrations": []}}

    page = await fetch_url(urljoin(url, "/integrations"))
    if not _page_is_usable(page):
        return {
            "integrations_deep": {
                "integrations": [],
                "note": "scrape_error",
                "scrape_status": int(page.get("status") or 0),
                "scrape_error": page.get("error"),
            },
            "pages": {"integrations": page},
            "agent_timings": {"integrations_deep": round(time.perf_counter() - t0, 3)},
        }
    markdown = (page.get("markdown") or "")[:_PAGE_EXCERPT_CHARS]

    try:
        llm = make_deepseek_pro(temperature=0.1)
        result = await _ainvoke_json_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You extract a competitor's integration list from their "
                        "integrations page. "
                        "Return strict JSON: "
                        '{"integrations":[{"name":str,"category":str,"url":str}],"notes":str}. '
                        "Categories like 'crm', 'email', 'analytics', 'ats', 'data-warehouse'. "
                        "Only extract integrations actually mentioned on the page."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {_competitor_brief(comp)}\n\n"
                        f"Scraped /integrations page:\n<<<\n{markdown}\n>>>\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="integrations_deep",
        )
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"integrations_deep: {e}",
            "agent_timings": {"integrations_deep": round(time.perf_counter() - t0, 3)},
        }
    if not isinstance(result, dict):
        result = {}
    integrations = result.get("integrations") or []
    if not isinstance(integrations, list):
        integrations = []
    # Dedup by normalized (name, category). Integration lists often appear
    # twice on the same page (hero grid + filtered view); downstream join
    # on (competitor_id, name) would otherwise drop to last-write-wins.
    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for it in integrations:
        if not isinstance(it, dict):
            continue
        name_key = str(it.get("name") or "").strip().lower()
        cat_key = str(it.get("category") or "").strip().lower()
        if not name_key or (name_key, cat_key) in seen:
            continue
        seen.add((name_key, cat_key))
        deduped.append(it)
    return {
        "integrations_deep": {
            "integrations": deduped,
            "notes": str(result.get("notes", ""))[:400],
        },
        "pages": {"integrations": page},
        "agent_timings": {"integrations_deep": round(time.perf_counter() - t0, 3)},
    }


async def changelog(state: DeepCompetitorState) -> dict:
    """Scrape /changelog (or /release-notes, /whats-new) — what have they
    shipped in the last 90 days?"""
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    url = comp.get("url") or ""
    if not url:
        return {"changelog": {"entries": []}}

    # Try common changelog paths in order.
    pages: list[dict[str, Any]] = []
    for path in ("/changelog", "/release-notes", "/whats-new", "/updates"):
        p = await fetch_url(urljoin(url, path))
        if p.get("status") == 200 and (p.get("markdown") or "").strip():
            pages.append(p)
            break
    source_url = pages[0].get("url") if pages else ""
    markdown = (pages[0].get("markdown") if pages else "")[:_PAGE_EXCERPT_CHARS] or ""

    if not markdown:
        return {
            "changelog": {"entries": [], "note": "no changelog page found"},
            "agent_timings": {"changelog": round(time.perf_counter() - t0, 3)},
        }

    try:
        llm = make_deepseek_pro(temperature=0.2)
        result = await _ainvoke_json_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You extract release-note entries from a competitor's changelog. "
                        "Return strict JSON: "
                        '{"entries":[{"title":str,"summary":str,"category":"feature"|"pricing"'
                        '|"integration"|"security"|"other","released_at":"YYYY-MM-DD"|null,'
                        '"is_recent":bool}],"themes":[str]}. '
                        "is_recent=true if released in the last 90 days relative to today. "
                        "Cap at the 20 most recent entries. Grounded — do not invent entries."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {_competitor_brief(comp)}\n\n"
                        f"Scraped changelog page ({source_url}):\n<<<\n{markdown}\n>>>\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="changelog",
        )
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"changelog: {e}",
            "agent_timings": {"changelog": round(time.perf_counter() - t0, 3)},
        }
    if not isinstance(result, dict):
        result = {}
    entries = result.get("entries") or []
    return {
        "changelog": {
            "entries": entries if isinstance(entries, list) else [],
            "themes": [str(t)[:120] for t in (result.get("themes") or [])][:6],
            "source_url": source_url,
        },
        "pages": {"changelog": pages[0]} if pages else {},
        "agent_timings": {"changelog": round(time.perf_counter() - t0, 3)},
    }


async def positioning_shift(state: DeepCompetitorState) -> dict:
    """Detect messaging changes vs the previous positioning snapshot."""
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    competitor_id = comp.get("id") or state.get("competitor_id")
    url = comp.get("url") or ""
    if not url or competitor_id is None:
        return {"positioning_shift": {"diff_summary": "", "shift_magnitude": 0.0}}

    # Load previous snapshot if any.
    prev: dict[str, Any] | None = None
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT headline, tagline, hero_copy, captured_at
                    FROM competitor_positioning_snapshots
                    WHERE competitor_id = %s
                    ORDER BY captured_at DESC
                    LIMIT 1
                    """,
                    (int(competitor_id),),
                )
                row = cur.fetchone()
                if row:
                    cols = [d[0] for d in cur.description or []]
                    prev = dict(zip(cols, row))
    except Exception:  # noqa: BLE001 — table missing before migration applies
        prev = None

    page = await fetch_url(url)
    if not _page_is_usable(page):
        # Homepage unreachable — record a minimal snapshot so the DB INSERT in
        # synthesize has non-null fields, but skip the LLM.
        return {
            "positioning_shift": {
                "headline": "",
                "tagline": "",
                "hero_copy": "",
                "diff_summary": "homepage unreachable",
                "shift_magnitude": 0.0,
                "scrape_status": int(page.get("status") or 0),
                "scrape_error": page.get("error"),
            },
            "pages": {"homepage": page},
            "agent_timings": {"positioning_shift": round(time.perf_counter() - t0, 3)},
        }
    markdown = (page.get("markdown") or "")[:_PAGE_EXCERPT_CHARS]

    try:
        llm = make_deepseek_pro(temperature=0.2)
        result = await _ainvoke_json_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You detect messaging/positioning shifts between a previous "
                        "and current homepage snapshot. "
                        "Return strict JSON: "
                        '{"headline":str,"tagline":str,"hero_copy":str,"diff_summary":str,'
                        '"shift_magnitude":number}. '
                        "shift_magnitude is 0..1 (0=identical, 1=totally repositioned). "
                        "If there's no previous snapshot, set shift_magnitude=0 and "
                        'diff_summary="initial snapshot".'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {_competitor_brief(comp)}\n\n"
                        f"Previous snapshot: {json.dumps(prev) if prev else 'none'}\n\n"
                        f"Current homepage:\n<<<\n{markdown}\n>>>\n\nReturn JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="positioning_shift",
        )
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"positioning_shift: {e}",
            "agent_timings": {"positioning_shift": round(time.perf_counter() - t0, 3)},
        }
    if not isinstance(result, dict):
        result = {}
    try:
        magnitude = float(result.get("shift_magnitude", 0.0))
    except (TypeError, ValueError):
        magnitude = 0.0
    return {
        "positioning_shift": {
            "headline": str(result.get("headline", ""))[:240],
            "tagline": str(result.get("tagline", ""))[:200],
            "hero_copy": str(result.get("hero_copy", ""))[:1200],
            "diff_summary": str(result.get("diff_summary", ""))[:800],
            "shift_magnitude": max(0.0, min(1.0, magnitude)),
        },
        "pages": {"homepage": page},
        "agent_timings": {"positioning_shift": round(time.perf_counter() - t0, 3)},
    }


async def funding_headcount(state: DeepCompetitorState) -> dict:
    """Pull public funding + headcount signals. Optional specialist —
    contributes fewer high-confidence writes since most data lives on external
    sources (Crunchbase, LinkedIn) this node can't scrape directly; the LLM
    extracts what's claimed on the competitor's own site ('Series B', 'About')."""
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    url = comp.get("url") or ""
    if not url:
        return {"funding_headcount": {"events": [], "headcount": None}}

    page = await fetch_url(urljoin(url, "/about"))
    markdown = (page.get("markdown") or "")[:_PAGE_EXCERPT_CHARS] if _page_is_usable(page) else ""
    if not markdown:
        # fall back to homepage press mentions
        page = await fetch_url(url)
        markdown = (page.get("markdown") or "")[:_PAGE_EXCERPT_CHARS] if _page_is_usable(page) else ""

    if not markdown:
        return {
            "funding_headcount": {
                "events": [],
                "headcount": None,
                "note": "scrape_error",
                "scrape_status": int(page.get("status") or 0) if page else 0,
            },
            "agent_timings": {"funding_headcount": round(time.perf_counter() - t0, 3)},
        }

    try:
        llm = make_deepseek_pro(temperature=0.1)
        result = await _ainvoke_json_retry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You extract funding + headcount signals from a competitor's "
                        "own site copy (about page / press / blog teasers). "
                        "Return strict JSON: "
                        '{"events":[{"round_type":str,"amount_usd":int|null,'
                        '"announced_at":"YYYY-MM"|null,"investors":[str],"source_url":str}],'
                        '"headcount":int|null,"headcount_source_url":str,"notes":str}. '
                        "Only report claims explicitly stated on the page — do not infer."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competitor: {_competitor_brief(comp)}\n\n"
                        f"Scraped page ({page.get('url')}):\n<<<\n{markdown}\n>>>\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
            node="funding_headcount",
        )
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"funding_headcount: {e}",
            "agent_timings": {"funding_headcount": round(time.perf_counter() - t0, 3)},
        }
    if not isinstance(result, dict):
        result = {}
    return {
        "funding_headcount": {
            "events": result.get("events") or [],
            "headcount": result.get("headcount"),
            "headcount_source_url": str(result.get("headcount_source_url", ""))[:400],
            "notes": str(result.get("notes", ""))[:600],
        },
        "pages": {"about": page},
        "agent_timings": {"funding_headcount": round(time.perf_counter() - t0, 3)},
    }


# ── 3. synthesize ────────────────────────────────────────────────────


def _upsert_pricing_tiers(cur: Any, competitor_id: int, tiers: list[dict[str, Any]]) -> None:
    if not tiers:
        return
    # Replace strategy: delete then insert. Competitor pricing re-scrapes
    # aggressively overwrite previous state; there's no natural unique key
    # across ``(competitor_id, tier_name)`` in the live schema.
    cur.execute("DELETE FROM competitor_pricing_tiers WHERE competitor_id = %s", (competitor_id,))
    for i, t in enumerate(tiers):
        if not isinstance(t, dict):
            continue
        cur.execute(
            """
            INSERT INTO competitor_pricing_tiers (
                competitor_id, tier_name, monthly_price_usd, annual_price_usd,
                seat_price_usd, currency, included_limits, is_custom_quote, sort_order
            ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            """,
            (
                competitor_id,
                str(t.get("tier_name") or "")[:200],
                t.get("monthly_price_usd"),
                t.get("annual_price_usd"),
                t.get("seat_price_usd"),
                str(t.get("currency") or "USD")[:10],
                json.dumps(t.get("included_limits") or {}),
                bool(t.get("is_custom_quote")),
                int(t.get("sort_order", i)),
            ),
        )


def _upsert_features(cur: Any, competitor_id: int, features: list[dict[str, Any]]) -> None:
    if not features:
        return
    cur.execute("DELETE FROM competitor_features WHERE competitor_id = %s", (competitor_id,))
    for f in features:
        if not isinstance(f, dict):
            continue
        cur.execute(
            """
            INSERT INTO competitor_features (competitor_id, tier_name, feature_text, category)
            VALUES (%s, %s, %s, %s)
            """,
            (
                competitor_id,
                None,
                str(f.get("feature") or f.get("feature_text") or "")[:500],
                str(f.get("category") or "")[:80] or None,
            ),
        )


def _upsert_parity(
    cur: Any, competitor_id: int, product_id: int, parity: list[dict[str, Any]]
) -> None:
    if not parity:
        return
    cur.execute(
        "DELETE FROM competitor_feature_parity WHERE competitor_id = %s AND product_id = %s",
        (competitor_id, product_id),
    )
    for p in parity:
        if not isinstance(p, dict):
            continue
        cur.execute(
            """
            INSERT INTO competitor_feature_parity (
                competitor_id, product_id, feature, we_have_it, they_have_it,
                gap_severity, note
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                competitor_id,
                product_id,
                str(p.get("feature") or "")[:300],
                bool(p.get("we_have_it")),
                bool(p.get("they_have_it")),
                str(p.get("gap_severity") or "none")[:20],
                str(p.get("note") or "")[:600],
            ),
        )


def _upsert_integrations(cur: Any, competitor_id: int, items: list[dict[str, Any]]) -> None:
    if not items:
        return
    cur.execute("DELETE FROM competitor_integrations WHERE competitor_id = %s", (competitor_id,))
    for it in items:
        if not isinstance(it, dict):
            continue
        cur.execute(
            """
            INSERT INTO competitor_integrations (
                competitor_id, integration_name, integration_url, category
            ) VALUES (%s, %s, %s, %s)
            """,
            (
                competitor_id,
                str(it.get("name") or "")[:200],
                str(it.get("url") or "")[:500] or None,
                str(it.get("category") or "")[:80] or None,
            ),
        )


def _insert_changelog(cur: Any, competitor_id: int, payload: dict[str, Any]) -> None:
    entries = payload.get("entries") or []
    if not entries:
        return
    source_url = payload.get("source_url")
    for e in entries:
        if not isinstance(e, dict):
            continue
        cur.execute(
            """
            INSERT INTO competitor_changelog (
                competitor_id, title, summary, category, released_at, source_url, is_recent
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                competitor_id,
                str(e.get("title") or "")[:300],
                str(e.get("summary") or "")[:1000] or None,
                str(e.get("category") or "other")[:40],
                e.get("released_at"),
                source_url,
                bool(e.get("is_recent")),
            ),
        )


def _insert_funding(cur: Any, competitor_id: int, payload: dict[str, Any]) -> None:
    events = payload.get("events") or []
    headcount = payload.get("headcount")
    headcount_src = payload.get("headcount_source_url") or None
    if not events and headcount is None:
        return
    if not events:
        cur.execute(
            """
            INSERT INTO competitor_funding_events (
                competitor_id, headcount, headcount_source_url
            ) VALUES (%s, %s, %s)
            """,
            (competitor_id, int(headcount) if headcount is not None else None, headcount_src),
        )
        return
    for e in events:
        if not isinstance(e, dict):
            continue
        cur.execute(
            """
            INSERT INTO competitor_funding_events (
                competitor_id, round_type, amount_usd, announced_at, investors,
                source_url, headcount, headcount_source_url
            ) VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
            """,
            (
                competitor_id,
                str(e.get("round_type") or "")[:40] or None,
                e.get("amount_usd"),
                e.get("announced_at"),
                json.dumps(e.get("investors") or []),
                str(e.get("source_url") or "")[:500] or None,
                int(headcount) if headcount is not None else None,
                headcount_src,
            ),
        )


def _insert_positioning(
    cur: Any, competitor_id: int, payload: dict[str, Any]
) -> None:
    cur.execute(
        """
        INSERT INTO competitor_positioning_snapshots (
            competitor_id, headline, tagline, hero_copy, diff_summary, shift_magnitude
        ) VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            competitor_id,
            str(payload.get("headline") or "")[:400] or None,
            str(payload.get("tagline") or "")[:400] or None,
            str(payload.get("hero_copy") or "")[:4000] or None,
            str(payload.get("diff_summary") or "")[:1500] or None,
            payload.get("shift_magnitude"),
        ),
    )


async def synthesize(state: DeepCompetitorState) -> dict:
    """Merge all specialist outputs, persist to DB, emit unified analysis blob."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    comp = state.get("competitor") or {}
    product = state.get("product") or {}
    competitor_id = int(comp.get("id") or state.get("competitor_id") or 0)
    product_id = int(product.get("id") or 0)

    pricing = state.get("pricing_deep") or {}
    features = state.get("features_deep") or {}
    integrations = state.get("integrations_deep") or {}
    changes = state.get("changelog") or {}
    shift = state.get("positioning_shift") or {}
    funding = state.get("funding_headcount") or {}

    if competitor_id > 0:
        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    _upsert_pricing_tiers(cur, competitor_id, pricing.get("tiers") or [])
                    # Features table stores a flat list; we derive one from the parity
                    # matrix ("they_have_it == true") so competitor_features keeps its
                    # historical semantics.
                    flat = [
                        {"feature": p.get("feature"), "category": p.get("category")}
                        for p in (features.get("parity") or [])
                        if isinstance(p, dict) and p.get("they_have_it")
                    ]
                    _upsert_features(cur, competitor_id, flat)
                    if product_id:
                        _upsert_parity(cur, competitor_id, product_id, features.get("parity") or [])
                    _upsert_integrations(cur, competitor_id, integrations.get("integrations") or [])
                    _insert_changelog(cur, competitor_id, changes)
                    _insert_funding(cur, competitor_id, funding)
                    if shift:
                        _insert_positioning(cur, competitor_id, shift)
                    cur.execute(
                        """
                        UPDATE competitors
                        SET scraped_at = now()::text, updated_at = now()::text, status = 'done'
                        WHERE id = %s
                        """,
                        (competitor_id,),
                    )
        except Exception as e:  # noqa: BLE001
            return {"_error": f"synthesize: {e}"}

    meta = product_intel_graph_meta(
        graph="deep_competitor",
        model=deepseek_model_name("deep"),
        agent_timings=state.get("agent_timings") or {},
    )
    analysis = {
        "competitor_id": competitor_id,
        "pricing": pricing,
        "features": features,
        "integrations": integrations,
        "changelog": changes,
        "positioning_shift": shift,
        "funding_headcount": funding,
    }
    return {
        "analysis": analysis,
        "graph_meta": meta,
        "agent_timings": {"synthesize": round(time.perf_counter() - t0, 3)},
    }


async def notify_error_node(state: DeepCompetitorState) -> dict:
    err = state.get("_error") or "unknown error"
    await notify_error(state, err)
    return {}


def _route_final(state: DeepCompetitorState) -> str:
    return "notify_error_node" if state.get("_error") else "notify_complete"


# ── 4. build_graph ──────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(_DeepCompetitorStateWithError)
    builder.add_node("load_competitor", load_competitor)
    builder.add_node("pricing_deep", pricing_deep)
    builder.add_node("features_deep", features_deep)
    builder.add_node("integrations_deep", integrations_deep)
    builder.add_node("changelog", changelog)
    builder.add_node("positioning_shift", positioning_shift)
    builder.add_node("funding_headcount", funding_headcount)
    builder.add_node("synthesize", synthesize)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "load_competitor")
    # Send-API fan-out: router returns a list[Send] rather than a list[str].
    # Every listed node receives the shared payload and runs concurrently.
    builder.add_conditional_edges("load_competitor", _fan_out, list(SPECIALISTS))
    for name in SPECIALISTS:
        builder.add_edge(name, "synthesize")
    builder.add_conditional_edges(
        "synthesize", _route_final, ["notify_complete", "notify_error_node"]
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


# ── 5. Supervisor scaffold (not wired into product_intel_graph yet) ─


class DeepAnalysisSupervisorState(DeepCompetitorState, total=False):
    """Supervisor state: fans out the deep graph across every competitor of a
    product. Team 10 will wire this in after they finish restructuring the
    supervisor — we only scaffold the shape here.
    """

    product_id: int
    competitor_ids: list[int]
    per_competitor: Annotated[dict[int, dict[str, Any]], _merge_dict]


async def load_product_competitors(state: dict[str, Any]) -> dict:
    """Enumerate all ``competitors.id`` rows belonging to a product's most
    recent completed analysis."""
    product_id = state.get("product_id")
    if product_id is None:
        raise ValueError("product_id is required for deep_analysis supervisor")
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id
                FROM competitor_analyses a
                JOIN competitors c ON c.analysis_id = a.id
                WHERE a.product_id = %s
                  AND a.status = 'done'
                ORDER BY a.created_at DESC, c.id ASC
                LIMIT 10
                """,
                (int(product_id),),
            )
            rows = cur.fetchall() or []
    return {"competitor_ids": [int(r[0]) for r in rows]}


def _fan_out_deep_analysis(state: dict[str, Any]) -> list[Send]:
    """One Send per competitor — each one kicks off the full deep_competitor
    graph. Scaffolded only; ``build_supervisor_graph`` is not compiled into
    ``langgraph.json`` yet."""
    ids = state.get("competitor_ids") or []
    return [Send("run_deep_competitor", {"competitor_id": cid}) for cid in ids]


async def run_deep_competitor(state: dict[str, Any]) -> dict:
    """Sub-graph invocation node — runs the compiled deep_competitor graph for
    a single competitor id. Result folded into ``per_competitor`` keyed by id."""
    cid = state.get("competitor_id")
    if cid is None:
        return {}
    result = await graph.ainvoke({"competitor_id": int(cid)})
    return {"per_competitor": {int(cid): result.get("analysis") or {}}}


def build_supervisor_graph(checkpointer: Any = None) -> Any:
    """Scaffold: supervisor-level ``deep_analysis`` node. Not registered in
    ``langgraph.json`` — team 10 should wire it into the restructured
    product_intel supervisor."""
    builder = StateGraph(DeepAnalysisSupervisorState)
    builder.add_node("load_product_competitors", load_product_competitors)
    builder.add_node("run_deep_competitor", run_deep_competitor)

    builder.add_edge(START, "load_product_competitors")
    builder.add_conditional_edges(
        "load_product_competitors", _fan_out_deep_analysis, ["run_deep_competitor"]
    )
    builder.add_edge("run_deep_competitor", END)
    return builder.compile(checkpointer=checkpointer)
