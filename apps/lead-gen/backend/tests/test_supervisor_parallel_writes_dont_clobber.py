"""Regression test: the v2 supervisor's parallel fan-out must never clobber
another branch's DB write, and every branch's output must survive the join.

We run the v2 supervisor end-to-end with *real* concurrency (no monkey-patching
of ``asyncio.gather`` or the LangGraph runtime) but mock every I/O boundary:

    • LLM calls → return canned JSON
    • each subgraph (``_PRICING_GRAPH`` / ``_GTM_GRAPH`` / deep_competitor /
      positioning / freshness) → replaced with a fake async callable that
      records when it ran, sleeps briefly, and emits a disjoint state fragment
    • ``psycopg.connect`` → in-memory fake that captures UPDATE statements

The key assertions:
    1. The three parallel branches all ran (none were skipped by the join).
    2. Each branch recorded a different ``products.*_analysis`` column in
       ``db_writes`` — i.e. no two branches wrote the same column.
    3. All three payloads (``pricing``, ``gtm``, ``competitor_deep``) are
       present in the final state — the reducers did not drop any of them.
    4. The positioning join saw all three inputs when it ran.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from leadgen_agent import product_intel_v2_graph as v2


class _FakeCursor:
    def __init__(self, captured: list[tuple[str, tuple]]):
        self._captured = captured
        self._last_sql = ""

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *a: Any) -> bool:
        return False

    def execute(self, sql: str, params: tuple = ()) -> None:
        self._last_sql = sql
        self._captured.append((sql, params))

    def fetchone(self):
        # Called by load_cached_outputs — return a row that matches the
        # columns SELECT'd. That path only runs on the fresh short-circuit
        # (not exercised by the stale-path concurrency tests), but we still
        # return a safe row so the code doesn't crash if the path ever runs.
        if "FROM products" in self._last_sql and "SELECT" in self._last_sql:
            return (
                1,                              # id
                "Test Product",                 # name
                "https://example.com",          # url
                "example.com",                  # domain
                "desc",                         # description
                json.dumps({"weighted_total": 0.5}),  # icp_analysis
                json.dumps({"rationale": {"recommendation": "ship"}}),
                json.dumps({"channels": []}),
            )
        return None

    @property
    def description(self):
        # column names matching the SELECT in load_cached_outputs
        return [
            ("id",),
            ("name",),
            ("url",),
            ("domain",),
            ("description",),
            ("icp_analysis",),
            ("pricing_analysis",),
            ("gtm_analysis",),
        ]


class _FakeConn:
    def __init__(self, captured: list[tuple[str, tuple]]):
        self._captured = captured

    def __enter__(self) -> "_FakeConn":
        return self

    def __exit__(self, *a: Any) -> bool:
        return False

    def cursor(self) -> _FakeCursor:
        return _FakeCursor(self._captured)


def _fake_psycopg_connect(captured: list[tuple[str, tuple]]):
    def _connect(*_args: Any, **_kwargs: Any) -> _FakeConn:
        return _FakeConn(captured)

    return _connect


def _make_astream_fake(node_name: str, payload: dict[str, Any], delay: float = 0.05):
    """Build an ``astream``-compatible async generator that mimics a compiled
    subgraph yielding one ``{node_name: state_delta}`` chunk.

    The supervisor's ``stream_subgraph`` helper iterates with
    ``async for chunk in compiled.astream(inputs, stream_mode='updates')``
    and folds ``delta`` dicts into the final state, so a single chunk is
    enough to carry the payload the branch would have returned.
    """
    def _astream(inputs: dict[str, Any], stream_mode: str = "updates"):
        async def _gen():
            await asyncio.sleep(delay)
            yield {node_name: payload}
        return _gen()
    return _astream


def _make_positioning_astream():
    def _astream(inputs: dict[str, Any], stream_mode: str = "updates"):
        async def _gen():
            # Positioning join must see all three predecessors.
            assert inputs.get("pricing"), "positioning ran before pricing flushed"
            assert inputs.get("gtm"), "positioning ran before gtm flushed"
            assert inputs.get("competitor_deep"), (
                "positioning ran before deep_competitor flushed"
            )
            await asyncio.sleep(0.01)
            yield {"stress_test": {"positioning": {"angle": "speed + depth", "confidence": 0.9}}}
        return _gen()
    return _astream


async def _fake_synth_llm_response(*args: Any, **kwargs: Any) -> dict[str, Any]:
    return {
        "tldr": "Fast, deep, ICP-aware. Ship Starter + Team. Cold email first.",
        "top_3_priorities": ["a", "b", "c"],
        "key_risks": ["r1"],
        "quick_wins": ["w1", "w2"],
    }


@pytest.mark.asyncio
async def test_parallel_writes_dont_clobber() -> None:
    """Run the v2 supervisor with real concurrency + mocked I/O. Every
    branch's write must survive to the final state."""

    captured_sql: list[tuple[str, tuple]] = []

    # Swap the compiled subgraphs with our fakes. The supervisor now calls
    # ``astream`` (for progress events), so we mock that as an async generator
    # rather than ``ainvoke``.
    fake_pricing_graph = MagicMock()
    fake_pricing_graph.astream = MagicMock(
        side_effect=_make_astream_fake(
            "write_rationale",
            {"pricing": {"rationale": {"recommendation": "ship starter + team"}}},
        )
    )
    fake_gtm_graph = MagicMock()
    fake_gtm_graph.astream = MagicMock(
        side_effect=_make_astream_fake(
            "draft_plan",
            {"gtm": {"channels": [{"name": "cold_email"}, {"name": "linkedin_dm"}]}},
        )
    )
    fake_deep_graph = MagicMock()
    fake_deep_graph.astream = MagicMock(
        side_effect=_make_astream_fake(
            "synthesize",
            {"competitor_deep": {"top_threat": "Competitor X", "score": 0.8}},
        )
    )
    fake_positioning_graph = MagicMock()
    fake_positioning_graph.astream = MagicMock(side_effect=_make_positioning_astream())

    with (
        patch.object(v2, "_PRICING_GRAPH", fake_pricing_graph),
        patch.object(v2, "_GTM_GRAPH", fake_gtm_graph),
        patch.object(v2, "_DEEP_COMPETITOR_GRAPH", fake_deep_graph),
        patch.object(v2, "_POSITIONING_GRAPH", fake_positioning_graph),
        patch.object(v2, "_FRESHNESS_GRAPH", None),  # force stale path
        patch.object(v2, "ainvoke_json", AsyncMock(side_effect=_fake_synth_llm_response)),
        patch.object(v2, "make_llm", MagicMock(return_value=MagicMock())),
        patch(
            "leadgen_agent.product_intel_v2_graph.psycopg.connect",
            side_effect=_fake_psycopg_connect(captured_sql),
        ),
    ):
        graph = v2.build_graph()
        result = await graph.ainvoke(
            {"product_id": 1, "force_refresh": True}
        )

    # 1. All three parallel branches ran.
    assert fake_pricing_graph.astream.call_count == 1, "pricing did not run"
    assert fake_gtm_graph.astream.call_count == 1, "gtm did not run"
    assert fake_deep_graph.astream.call_count == 1, "deep_competitor did not run"
    assert fake_positioning_graph.astream.call_count == 1, "positioning join did not run"

    # 2. Each branch recorded exactly one distinct column write. No collisions.
    db_writes = result.get("db_writes") or []
    assert "pricing_analysis" in db_writes
    assert "gtm_analysis" in db_writes
    assert "competitor_analysis_deep" in db_writes
    assert "positioning_analysis" in db_writes
    assert "intel_report" in db_writes
    # No duplicates — each column is written exactly once.
    assert len(db_writes) == len(set(db_writes)), (
        f"duplicate writes: {db_writes}"
    )

    # 3. All three payloads survived the reducer — no branch was dropped.
    assert result.get("pricing"), "pricing payload was lost"
    assert result.get("gtm"), "gtm payload was lost"
    assert result.get("competitor_deep"), "competitor_deep payload was lost"
    assert result.get("positioning"), "positioning payload was lost"

    # 4. The final intel_report UPDATE actually hit our fake DB.
    update_stmts = [s for s, _ in captured_sql if "UPDATE products" in s]
    assert update_stmts, "synthesize_report did not issue an UPDATE"
    assert any("intel_report" in s for s in update_stmts)

    # 5. No errors.
    assert not result.get("_error"), f"graph set _error: {result.get('_error')}"


@pytest.mark.asyncio
async def test_fresh_path_short_circuits_past_parallel_fanout() -> None:
    """When freshness_graph reports fresh, the three heavyweight branches
    must NOT run — we go straight to load_cached_outputs → synthesize."""

    captured_sql: list[tuple[str, tuple]] = []

    fake_pricing_graph = MagicMock()
    fake_pricing_graph.astream = MagicMock(
        side_effect=AssertionError("pricing ran on fresh path")
    )
    fake_gtm_graph = MagicMock()
    fake_gtm_graph.astream = MagicMock(
        side_effect=AssertionError("gtm ran on fresh path")
    )
    fake_deep_graph = MagicMock()
    fake_deep_graph.astream = MagicMock(
        side_effect=AssertionError("deep_competitor ran on fresh path")
    )
    fake_freshness_graph = MagicMock()
    # FreshnessState emits ``stale`` + ``snapshot`` — the v2 supervisor
    # translates those into ``is_fresh`` / ``freshness_report``.
    fake_freshness_graph.ainvoke = AsyncMock(
        return_value={"stale": False, "snapshot": {"age_days": 2}}
    )

    with (
        patch.object(v2, "_PRICING_GRAPH", fake_pricing_graph),
        patch.object(v2, "_GTM_GRAPH", fake_gtm_graph),
        patch.object(v2, "_DEEP_COMPETITOR_GRAPH", fake_deep_graph),
        patch.object(v2, "_POSITIONING_GRAPH", None),
        patch.object(v2, "_FRESHNESS_GRAPH", fake_freshness_graph),
        patch.object(v2, "ainvoke_json", AsyncMock(side_effect=_fake_synth_llm_response)),
        patch.object(v2, "make_llm", MagicMock(return_value=MagicMock())),
        patch(
            "leadgen_agent.product_intel_v2_graph.psycopg.connect",
            side_effect=_fake_psycopg_connect(captured_sql),
        ),
    ):
        graph = v2.build_graph()
        result = await graph.ainvoke({"product_id": 1})

    assert result.get("is_fresh") is True
    assert fake_pricing_graph.astream.call_count == 0
    assert fake_gtm_graph.astream.call_count == 0
    assert fake_deep_graph.astream.call_count == 0
    # synthesize still runs on the fresh path (it reads cached columns).
    assert result.get("report"), "fresh path failed to emit a report"
