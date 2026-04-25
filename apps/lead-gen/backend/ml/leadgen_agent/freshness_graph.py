"""Content-freshness scoring graph.

Given a product_id, decides whether the cached ``icp_analysis`` / competitor
analysis still reflects the product's current landing page. Supervisor
(:mod:`product_intel_graph`) calls this before committing to cache reuse in
``ensure_icp`` / ``ensure_competitors``.

Algorithm — **content hash** (SHA-256 on normalized text):

1.  Load ``products.freshness_snapshot.content_hash`` (previous baseline) and
    ``products.icp_analysis.graph_meta.run_at`` (when the last deep run
    happened). The union of these two signals answers:
    "when did we last look, and what did we see?"
2.  Fetch the product's current landing page via :mod:`loaders` (re-uses the
    competitor loader's strategy router — sitemap / recursive / chromium /
    basic — so we get clean markdown, not HTML).
3.  Normalize the markdown (strip volatile nav/footer noise, collapse
    whitespace, lowercase).
4.  Hash and compare:

        - same hash  → stale=False, confidence=1.0, reason="same"
        - no previous hash → stale=True,  confidence=0.5, reason="no baseline"
        - different hash → stale=True, confidence=0.8, reason heuristic
        - fetch failed → stale=False, confidence=0.2, reason="unreachable"
          (don't trigger a spurious refresh on a transient outage)

5.  Persist result to ``products.freshness_snapshot`` (jsonb).
6.  If ``check_competitors=True``, probe each competitor's URL too and update
    ``competitors.last_url_hash``. Differences here feed a future
    "competitor moved" alert.

**Upgrade path — embedding similarity**: hash is binary (any diff → stale).
A cheap local embedding model (``sentence-transformers/all-MiniLM-L6-v2``,
~22MB, ~1ms/doc on M1) would let us compute cosine similarity and emit a
continuous confidence instead of a step function; a 0.98 similarity would
stay "same" and not trigger re-analysis on a one-word copy edit. Swap in
when the hash-false-positive rate becomes a budget problem.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .loaders import USER_AGENT, _load_basic, _to_markdown
from .product_intel_schemas import config_hash
from .state import FreshnessState

# Volatile regions in marketing pages that flip on every deploy but don't
# indicate a real content change: timestamps, cache-busting hashes in asset
# URLs, CSRF tokens, CSP nonces. Strip before hashing so we don't treat every
# page load as "drift".
_VOLATILE_PATTERNS: tuple[re.Pattern[str], ...] = (
    # ISO timestamps — run BEFORE hex so "2026-04-22t09:00:00z" isn't partially
    # munched by the hex regex. Case-insensitive because _normalize lowercases
    # its input before applying these.
    re.compile(r"\d{4}-\d{2}-\d{2}[t ]\d{2}:\d{2}:\d{2}[\dz:+.\-]*", re.I),
    re.compile(r"\b[0-9a-f]{8,64}\b", re.I),                     # hex hashes
    re.compile(r"csrf[-_]?token[=:\s]\S+", re.I),
    re.compile(r"nonce[=:\s]\S+", re.I),
    re.compile(r"\s+"),                                          # whitespace normalize last
)

# Content-level heuristics — when the diff looks like new pricing or
# features, bump confidence.
_PRICING_MARKERS = ("pricing", "per month", "per user", "starting at", "$", "€", "£")
_FEATURE_MARKERS = ("feature", "what's new", "changelog", "announcing")


def _normalize(text: str) -> str:
    """Normalize markdown to a stable form for hashing."""
    if not text:
        return ""
    out = text.lower()
    for pat in _VOLATILE_PATTERNS[:-1]:
        out = pat.sub(" ", out)
    # Whitespace normalize last so earlier substitutions settle.
    out = _VOLATILE_PATTERNS[-1].sub(" ", out).strip()
    return out


def _hash(text: str) -> str:
    """SHA-256 of normalized text, prefixed so callers can see the algorithm."""
    digest = hashlib.sha256(_normalize(text).encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


async def load_product_freshness(state: FreshnessState) -> dict:
    """Read product URL + previous freshness snapshot + last run_at."""
    product_id = state.get("product_id")
    if product_id is None:
        raise ValueError("product_id is required")

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, url, domain, icp_analysis, freshness_snapshot
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

    def _maybe(v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    icp = _maybe(rec.get("icp_analysis")) or {}
    snap = _maybe(rec.get("freshness_snapshot")) or {}
    previous_hash = str(snap.get("content_hash") or "")
    previous_run_at = str(
        snap.get("checked_at")
        or (icp.get("graph_meta") or {}).get("run_at")
        or ""
    )
    # Version-drift detection: if the product_intel schema version changed
    # since the last snapshot, content is effectively stale even when the
    # landing page bytes are identical — new prompt contract ⇒ re-run.
    # Stashed inside the ``product`` dict to avoid touching FreshnessState.
    previous_config_hash = str(snap.get("config_hash") or "")

    return {
        "product": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "url": rec.get("url") or "",
            "domain": rec.get("domain") or "",
            "previous_config_hash": previous_config_hash,
        },
        "previous_hash": previous_hash,
        "previous_run_at": previous_run_at,
    }


async def fetch_current_content(state: FreshnessState) -> dict:
    """Fetch the landing page via loaders._load_basic and reduce to markdown.

    Uses the same loader as the competitor pipeline so page shape (pricing,
    features, integrations) matches what deep_icp actually consumed. On any
    network/loader failure we emit ``reachable=False`` rather than raising —
    the decide_freshness node needs to see the outage to return a graceful
    "unreachable" verdict.
    """
    product = state.get("product") or {}
    url = str(product.get("url") or "").strip()
    if not url:
        return {
            "current_markdown": "",
            "current_hash": "",
            "reachable": False,
        }

    try:
        docs = await _load_basic(url)
        markdown = _to_markdown(docs)
    except Exception:  # noqa: BLE001 — loader failures are expected; route to unreachable
        return {
            "current_markdown": "",
            "current_hash": "",
            "reachable": False,
        }

    if not markdown.strip():
        return {
            "current_markdown": "",
            "current_hash": "",
            "reachable": False,
        }

    return {
        "current_markdown": markdown,
        "current_hash": _hash(markdown),
        "reachable": True,
    }


def _classify_reason(previous_markdown_hash: str, current_markdown: str) -> str:
    """Heuristic reason label for a stale verdict.

    Without the previous markdown stored (we only persist the hash to keep
    the jsonb small), we can't diff word-by-word — but we can scan the
    current content for markers that hint at the *kind* of change.
    """
    lower = current_markdown.lower()
    if any(m in lower for m in _PRICING_MARKERS):
        return "new pricing page"
    if any(m in lower for m in _FEATURE_MARKERS):
        return "new features"
    return "content drift"


async def decide_freshness(state: FreshnessState) -> dict:
    """Compare previous vs current hash → stale / confidence / reason.

    Order of checks:
      1. Unreachable → trust cache (low confidence).
      2. No previous hash → "no baseline" (first-ever check).
      3. Schema drift (``previous_config_hash`` missing or != current
         ``config_hash()``) → stale with high confidence regardless of content.
         Rationale: a new product_intel_schemas version means the prompt
         contract changed, so cached analyses are derived from an obsolete
         schema even when the landing page bytes are unchanged.
      4. Content-hash equality → "same".
      5. Otherwise → content drift with heuristic reason.
    """
    previous = str(state.get("previous_hash") or "")
    current = str(state.get("current_hash") or "")
    reachable = bool(state.get("reachable"))
    current_markdown = str(state.get("current_markdown") or "")
    product = state.get("product") or {}
    previous_config_hash = str(product.get("previous_config_hash") or "")
    current_config_hash = config_hash()

    if not reachable:
        # Treat outages as "trust the cache" — a transient fetch failure is
        # not evidence that the content changed.
        return {
            "stale": False,
            "confidence": 0.2,
            "reason": "unreachable",
        }

    if not previous:
        # First check ever — no baseline to compare against. Conservative:
        # flag as stale so the supervisor runs deep_icp once to establish a
        # baseline, but with low confidence so callers can choose to defer.
        return {
            "stale": True,
            "confidence": 0.5,
            "reason": "no baseline",
        }

    # Version-drift check runs BEFORE content equality so bumping
    # PRODUCT_INTEL_VERSION forces a re-run even on unchanged pages.
    if previous_config_hash and previous_config_hash != current_config_hash:
        return {
            "stale": True,
            "confidence": 0.9,
            "reason": "schema version drift",
        }

    if previous == current:
        return {"stale": False, "confidence": 1.0, "reason": "same"}

    return {
        "stale": True,
        "confidence": 0.8,
        "reason": _classify_reason(previous, current_markdown),
    }


async def check_competitor_freshness(state: FreshnessState) -> dict:
    """Probe each competitor URL; flag movements and update last_url_hash.

    Off by default — only runs when ``check_competitors=True`` in state.
    Competitor scraping is heavier than the product's own landing page and
    the main freshness verdict only needs the product hash.
    """
    if not state.get("check_competitors"):
        return {"competitor_movements": []}

    product_id = state["product_id"]
    # Pull only approved / done competitors — suggested ones haven't been
    # scraped yet, so there's no baseline to diff against.
    rows: list[dict[str, Any]] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.name, c.url, c.last_url_hash
                FROM competitors c
                JOIN competitor_analyses a ON a.id = c.analysis_id
                WHERE a.product_id = %s
                  AND a.status = 'done'
                  AND c.status = 'done'
                """,
                (int(product_id),),
            )
            for (cid, name, url, last_hash) in cur.fetchall() or []:
                rows.append({"id": cid, "name": name, "url": url, "last_hash": last_hash})

    if not rows:
        return {"competitor_movements": []}

    movements: list[dict[str, Any]] = []
    # Use the same loader path as the product. Sequential + short — we don't
    # want this node to dominate the run; embedding-based delta will let us
    # drop unchanged ones before hitting loaders.
    for row in rows:
        url = str(row.get("url") or "").strip()
        if not url or not urlparse(url).scheme:
            continue
        try:
            docs = await _load_basic(url)
            md = _to_markdown(docs)
        except Exception:  # noqa: BLE001
            continue
        if not md.strip():
            continue
        new_hash = _hash(md)
        moved = bool(row.get("last_hash")) and new_hash != row["last_hash"]
        if moved:
            movements.append(
                {
                    "competitor_id": row["id"],
                    "name": row["name"],
                    "url": url,
                    "previous_hash": row["last_hash"],
                    "current_hash": new_hash,
                    "reason": _classify_reason(row["last_hash"], md),
                }
            )
        # Persist the new hash either way — a first-time scrape establishes
        # the baseline for the next run.
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE competitors
                    SET last_url_hash = %s,
                        updated_at = now()::text
                    WHERE id = %s
                    """,
                    (new_hash, int(row["id"])),
                )

    return {"competitor_movements": movements}


async def persist_snapshot(state: FreshnessState) -> dict:
    """Write the final snapshot to products.freshness_snapshot.

    ``config_hash`` is stamped alongside ``content_hash`` so the next run can
    detect schema-version drift even when the landing page is unchanged.
    """
    product = state.get("product") or {}
    snapshot = {
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "url": product.get("url", ""),
        "stale": bool(state.get("stale")),
        "confidence": float(state.get("confidence") or 0.0),
        "reason": state.get("reason") or "",
        "content_hash": state.get("current_hash") or "",
        "previous_hash": state.get("previous_hash") or "",
        "previous_run_at": state.get("previous_run_at") or "",
        "config_hash": config_hash(),
        "competitor_movements": state.get("competitor_movements") or [],
    }

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE products
                SET freshness_snapshot = %s::jsonb,
                    updated_at = now()::text
                WHERE id = %s
                """,
                (json.dumps(snapshot), int(product.get("id") or state["product_id"])),
            )

    graph_meta = {
        "graph": "freshness",
        "algorithm": "sha256-normalized",
        "version": "1.0.0",
        "run_at": snapshot["checked_at"],
    }

    return {"snapshot": snapshot, "graph_meta": graph_meta}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(FreshnessState)
    builder.add_node("load_product_freshness", load_product_freshness)
    builder.add_node("fetch_current_content", fetch_current_content)
    builder.add_node("decide_freshness", decide_freshness)
    builder.add_node("check_competitor_freshness", check_competitor_freshness)
    builder.add_node("persist_snapshot", persist_snapshot)

    builder.add_edge(START, "load_product_freshness")
    builder.add_edge("load_product_freshness", "fetch_current_content")
    builder.add_edge("fetch_current_content", "decide_freshness")
    builder.add_edge("decide_freshness", "check_competitor_freshness")
    builder.add_edge("check_competitor_freshness", "persist_snapshot")
    builder.add_edge("persist_snapshot", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


# ── Helpers consumed by the supervisor ─────────────────────────────────────


async def assess_product_freshness(product_id: int) -> dict[str, Any]:
    """Synchronous-ish wrapper the supervisor can call inline.

    Returns ``{"stale": bool, "confidence": 0..1, "reason": str}`` — the
    three signals ``ensure_icp`` / ``ensure_competitors`` actually consume.
    Never raises — on internal failure returns a "trust cache" default so
    the supervisor doesn't abort the whole pipeline.
    """
    try:
        result = await graph.ainvoke({"product_id": int(product_id)})
    except Exception as exc:  # noqa: BLE001
        return {
            "stale": False,
            "confidence": 0.0,
            "reason": f"error: {str(exc)[:120]}",
        }
    return {
        "stale": bool(result.get("stale")),
        "confidence": float(result.get("confidence") or 0.0),
        "reason": str(result.get("reason") or ""),
    }
