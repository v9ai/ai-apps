"""Shape + compile tests for the product_intel supervisor graph.

Mirrors the ``test_pricing_graph.py`` / ``test_gtm_graph.py`` pattern: we verify
the graph compiles, the ``ProductIntelReport`` schema round-trips, the fan-out
helper is deterministic, and the ``ensure_icp`` cache-vs-force-refresh branch
behaves correctly.

The ``force_refresh`` test stubs out ``deep_icp_graph.build_graph`` and the
``psycopg.connect`` call so nothing touches a real database or LLM.
"""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from leadgen_agent.product_intel_graph import (
    _fan_out_pricing_gtm,
    build_graph,
    ensure_icp,
)
from leadgen_agent.product_intel_schemas import ProductIntelReport


# ── 1. Compile ─────────────────────────────────────────────────────────

def test_build_graph_compiles() -> None:
    """build_graph() must return a compiled graph — verifies imports + edges."""
    graph = build_graph()
    assert graph is not None


# ── 2. ensure_icp cache branch ─────────────────────────────────────────

async def test_ensure_icp_uses_cache_when_present() -> None:
    """When state already carries an ``icp`` blob and ``force_refresh`` is off,
    ``ensure_icp`` should echo the cache and NOT build the deep_icp subgraph.

    Note: since the freshness-gate refactor, ``ensure_icp`` may call
    ``freshness_graph.assess_product_freshness`` before committing to the
    cache. We stub it to report "fresh" so the cache path is taken
    deterministically. Without this stub, the freshness graph may fetch the
    product URL and decide "stale" (e.g. "new pricing page"), which forces a
    full re-run and makes the test flake depending on whether other tests
    earlier in the session warmed any module-level caches."""
    from unittest.mock import AsyncMock

    fresh_stub = AsyncMock(
        return_value={"stale": False, "confidence": 1.0, "reason": "same"}
    )
    with (
        patch(
            "leadgen_agent.product_intel_graph.deep_icp_graph.build_graph"
        ) as mock_build,
        patch(
            "leadgen_agent.product_intel_graph.freshness_graph.assess_product_freshness",
            new=fresh_stub,
        ),
    ):
        result = await ensure_icp(
            {
                "product_id": 1,
                "icp": {"weighted_total": 0.8, "segments": []},
                "force_refresh": False,
            }
        )
        mock_build.assert_not_called()
    assert result["icp"]["weighted_total"] == 0.8
    assert result["icp"]["segments"] == []
    assert "ensure_icp" in (result.get("agent_timings") or {})


# ── 3. ensure_icp force_refresh branch ─────────────────────────────────

_CAN_FORCE_REFRESH = bool(
    os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
)


@pytest.mark.skipif(
    not _CAN_FORCE_REFRESH,
    reason="force_refresh branch persists via psycopg; set NEON_DATABASE_URL or DATABASE_URL to exercise it (we stub the connect call, but _dsn() still reads env)",
)
async def test_ensure_icp_ignores_cache_when_force_refresh() -> None:
    """With ``force_refresh=True``, cached icp must be discarded and the
    deep-ICP subgraph MUST be invoked. The subgraph is now compiled once at
    module import (``_DEEP_ICP_GRAPH``) so we patch its ``ainvoke`` directly
    rather than ``build_graph`` — the latter would only fire on a cold reload.
    """
    fake_icp = {
        "weighted_total": 0.42,
        "segments": [],
        "personas": [],
    }
    fake_ainvoke = AsyncMock(return_value=fake_icp)

    fake_conn = MagicMock()
    fake_conn.__enter__ = MagicMock(return_value=fake_conn)
    fake_conn.__exit__ = MagicMock(return_value=False)
    fake_cur = MagicMock()
    fake_cur.__enter__ = MagicMock(return_value=fake_cur)
    fake_cur.__exit__ = MagicMock(return_value=False)
    fake_conn.cursor = MagicMock(return_value=fake_cur)

    with (
        patch(
            "leadgen_agent.product_intel_graph._DEEP_ICP_GRAPH.ainvoke",
            new=fake_ainvoke,
        ),
        patch(
            "leadgen_agent.product_intel_graph.psycopg.connect",
            return_value=fake_conn,
        ),
    ):
        result = await ensure_icp(
            {
                "product_id": 1,
                "icp": {"weighted_total": 0.8, "segments": []},
                "force_refresh": True,
            }
        )
        fake_ainvoke.assert_awaited_once()

    # Key assertion: the fresh icp from the subgraph replaces the cached one.
    assert result["icp"]["weighted_total"] == 0.42


# ── 4. Fan-out helper ──────────────────────────────────────────────────

def test_fan_out_includes_pricing_and_gtm() -> None:
    """The fan-out edge must always schedule both pricing + gtm nodes."""
    assert _fan_out_pricing_gtm({}) == ["run_pricing", "run_gtm"]
    assert _fan_out_pricing_gtm({"product_id": 99, "force_refresh": True}) == [
        "run_pricing",
        "run_gtm",
    ]


# ── 5. Schema roundtrip ────────────────────────────────────────────────

def test_schema_roundtrip_product_intel_report() -> None:
    """A full ProductIntelReport payload must round-trip through model_validate."""
    payload = {
        "tldr": (
            "We serve solo founders who need fast lead enrichment. We win on "
            "ICP-aware scoring and per-lead pricing. Charge $49 Starter, "
            "$249 Team. Start with LinkedIn outbound."
        ),
        "top_3_priorities": [
            "Ship pricing page this week",
            "Launch Team tier this month",
            "Close 5 design partners this quarter",
        ],
        "key_risks": [
            "Free tier cannibalizes Starter",
            "Competitors undercut per-lead price",
            "Deliverability drops on warm-up",
        ],
        "quick_wins": [
            "Add LinkedIn CTA on landing page",
            "Publish pricing calculator",
            "Ship 3-line outbound template",
        ],
        "product_profile": {
            "name": "Leadgen AI",
            "one_liner": "ICP-aware lead enrichment for solo founders.",
            "category": "B2B lead generation",
            "core_jobs": ["enrich leads", "score ICP fit"],
            "key_features": ["email verification", "ICP scoring"],
            "stated_audience": "solo founders and growth leads",
            "visible_pricing": "starts at $49/mo",
            "tech_signals": ["Next.js", "Neon Postgres"],
        },
        "graph_meta": {
            "graph": "product_intel",
            "model": "deepseek-v4-pro",
            "version": "1.0.0",
        },
    }
    report = ProductIntelReport.model_validate(payload)
    dumped = report.model_dump()
    assert dumped["tldr"].startswith("We serve")
    assert len(dumped["top_3_priorities"]) == 3
    assert dumped["product_profile"]["name"] == "Leadgen AI"
    assert dumped["graph_meta"]["version"] == "1.0.0"
