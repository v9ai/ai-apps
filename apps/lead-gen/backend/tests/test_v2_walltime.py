"""Walltime benchmark: v2's parallel fan-out must be meaningfully faster than
sequential execution.

Each subgraph is mocked with ``await asyncio.sleep(5)``. Sequentially, that's
at least 15s (3 × 5) plus positioning/synthesize/freshness overhead
(~5s more). In parallel, the three branches overlap → ~5s plus overhead.

Assertion: total wall time < 12s. Sequential execution would require >= 20s,
so 12s is a safe threshold that proves the fan-out is genuinely concurrent.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from leadgen_agent import product_intel_v2_graph as v2


class _FakeCursor:
    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *a: Any) -> bool:
        return False

    def execute(self, *_a: Any, **_kw: Any) -> None: ...

    def fetchone(self):
        return None

    @property
    def description(self):
        return []


class _FakeConn:
    def __enter__(self) -> "_FakeConn":
        return self

    def __exit__(self, *a: Any) -> bool:
        return False

    def cursor(self) -> _FakeCursor:
        return _FakeCursor()


def _fake_connect(*_a: Any, **_kw: Any) -> _FakeConn:
    return _FakeConn()


async def _slow_pricing(_inputs: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(5)
    return {"pricing": {"rationale": {"recommendation": "ship"}}}


async def _slow_gtm(_inputs: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(5)
    return {"gtm": {"channels": [{"name": "cold_email"}]}}


async def _slow_deep_competitor(_inputs: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(5)
    return {"competitor_deep": {"top_threat": "X"}}


async def _fast_positioning(_inputs: dict[str, Any]) -> dict[str, Any]:
    # Positioning is normally quick — it's a synthesis step, not scraping.
    await asyncio.sleep(0.05)
    return {"positioning": {"angle": "depth"}}


async def _fake_synth_llm(*_a: Any, **_kw: Any) -> dict[str, Any]:
    return {
        "tldr": "x",
        "top_3_priorities": ["a"],
        "key_risks": [],
        "quick_wins": [],
    }


@pytest.mark.asyncio
async def test_parallel_fanout_completes_under_wall_budget() -> None:
    """With three 5s-sleep branches running in parallel, total wall time
    should be ~5s, not 15s+. Assert <12s."""

    fake_pricing_graph = MagicMock()
    fake_pricing_graph.ainvoke = AsyncMock(side_effect=_slow_pricing)
    fake_gtm_graph = MagicMock()
    fake_gtm_graph.ainvoke = AsyncMock(side_effect=_slow_gtm)
    fake_deep_graph = MagicMock()
    fake_deep_graph.ainvoke = AsyncMock(side_effect=_slow_deep_competitor)
    fake_positioning_graph = MagicMock()
    fake_positioning_graph.ainvoke = AsyncMock(side_effect=_fast_positioning)

    with (
        patch.object(v2, "_PRICING_GRAPH", fake_pricing_graph),
        patch.object(v2, "_GTM_GRAPH", fake_gtm_graph),
        patch.object(v2, "_DEEP_COMPETITOR_GRAPH", fake_deep_graph),
        patch.object(v2, "_POSITIONING_GRAPH", fake_positioning_graph),
        patch.object(v2, "_FRESHNESS_GRAPH", None),  # stale path
        patch.object(v2, "ainvoke_json", AsyncMock(side_effect=_fake_synth_llm)),
        patch.object(v2, "make_llm", MagicMock(return_value=MagicMock())),
        patch(
            "leadgen_agent.product_intel_v2_graph.psycopg.connect",
            side_effect=_fake_connect,
        ),
    ):
        graph = v2.build_graph()
        t0 = time.perf_counter()
        result = await graph.ainvoke(
            {"product_id": 1, "force_refresh": True}
        )
        elapsed = time.perf_counter() - t0

    # Hard budget: 12s. Parallel path should hit ~5-6s. Sequential would
    # exceed 15s just for the three branches, so this proves concurrency.
    assert elapsed < 12, (
        f"v2 took {elapsed:.2f}s — parallel fan-out is not actually parallel. "
        f"Sequential lower bound would be ~15s."
    )

    # Sanity — all three branches still completed.
    assert fake_pricing_graph.ainvoke.await_count == 1
    assert fake_gtm_graph.ainvoke.await_count == 1
    assert fake_deep_graph.ainvoke.await_count == 1
    assert not result.get("_error")
