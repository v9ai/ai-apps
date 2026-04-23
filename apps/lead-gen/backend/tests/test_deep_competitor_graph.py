"""Unit tests for the deep_competitor graph.

All network + DB calls are mocked:
- ``leadgen_agent.loaders.fetch_url`` — returns canned markdown per URL.
- ``leadgen_agent.llm.ainvoke_json`` — returns canned JSON per specialist.
- ``psycopg.connect`` — patched to a recording mock so we can assert the
  actual SQL / rows written by ``synthesize``.

The core assertion is that the Send-API fan-out actually runs ALL six
specialists concurrently (every specialist gets a chance to write) and that
their outputs land in the right child tables when ``synthesize`` persists.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any

import pytest

from leadgen_agent import deep_competitor_graph as dc
from leadgen_agent.deep_competitor_graph import SPECIALISTS, build_graph


# ── Mock fetch_url + ainvoke_json ───────────────────────────────────


def _canned_fetch(url: str, *, timeout: float = 10.0) -> dict[str, Any]:
    """Return realistic markdown per URL segment so every specialist sees
    non-empty content and invokes its LLM."""
    lower = url.lower()
    if "/pricing" in lower:
        body = "## Starter $49/mo\n\n## Team $249/mo\n\n## Enterprise Contact us"
    elif "/features" in lower:
        body = "## Lead scoring\n## Email automation\n## CRM sync"
    elif "/integrations" in lower:
        body = "Salesforce · HubSpot · Slack · Gmail · Pipedrive"
    elif "/changelog" in lower or "/release" in lower or "/whats-new" in lower or "/updates" in lower:
        body = "## 2026-04-15 — New AI assistant\n## 2026-03-01 — SOC2 Type II"
    elif "/about" in lower:
        body = "Acme raised $30M Series B led by Accel in 2024. We are 120 people."
    else:
        body = "# Acme — AI lead intelligence for modern GTM teams."
    return {
        "url": url,
        "status": 200,
        "markdown": body,
        "html": f"<html>{body}</html>",
        "error": None,
        "elapsed": 0.01,
    }


def _canned_llm(llm: Any, messages: list[dict[str, str]], *, provider: str | None = None) -> dict[str, Any]:
    """Return the JSON shape each specialist expects, detected from the system
    prompt. Keeps the test payload small and realistic."""
    sys = (messages[0] or {}).get("content", "")
    if "pricing tiers" in sys:
        return {
            "tiers": [
                {
                    "tier_name": "Starter",
                    "monthly_price_usd": 49,
                    "annual_price_usd": None,
                    "seat_price_usd": None,
                    "currency": "USD",
                    "included_limits": {"seats": 1},
                    "is_custom_quote": False,
                    "sort_order": 0,
                },
                {
                    "tier_name": "Enterprise",
                    "monthly_price_usd": None,
                    "annual_price_usd": None,
                    "seat_price_usd": None,
                    "currency": "USD",
                    "included_limits": {},
                    "is_custom_quote": True,
                    "sort_order": 2,
                },
            ],
            "notes": "Public + custom tier only.",
        }
    if "feature parity matrix" in sys:
        return {
            "parity": [
                {
                    "feature": "Lead scoring",
                    "category": "intelligence",
                    "we_have_it": True,
                    "they_have_it": True,
                    "gap_severity": "none",
                    "note": "both",
                },
                {
                    "feature": "Call recording",
                    "category": "workflow",
                    "we_have_it": False,
                    "they_have_it": True,
                    "gap_severity": "major",
                    "note": "we lack it",
                },
            ],
            "summary": "1 overlap, 1 gap.",
        }
    if "integration list" in sys:
        return {
            "integrations": [
                {"name": "Salesforce", "category": "crm", "url": ""},
                {"name": "Slack", "category": "comms", "url": ""},
            ],
            "notes": "",
        }
    if "release-note entries" in sys:
        return {
            "entries": [
                {
                    "title": "AI assistant",
                    "summary": "New assistant for reps",
                    "category": "feature",
                    "released_at": "2026-04-15",
                    "is_recent": True,
                },
                {
                    "title": "SOC2 Type II",
                    "summary": "Compliance milestone",
                    "category": "security",
                    "released_at": "2026-03-01",
                    "is_recent": True,
                },
            ],
            "themes": ["AI", "trust"],
        }
    if "positioning shifts" in sys:
        return {
            "headline": "AI lead intelligence for modern GTM teams",
            "tagline": "Turn signals into revenue",
            "hero_copy": "Acme finds, scores, and routes leads.",
            "diff_summary": "initial snapshot",
            "shift_magnitude": 0.0,
        }
    if "funding + headcount" in sys:
        return {
            "events": [
                {
                    "round_type": "b",
                    "amount_usd": 30_000_000,
                    "announced_at": "2024-06",
                    "investors": ["Accel"],
                    "source_url": "https://acme.com/about",
                }
            ],
            "headcount": 120,
            "headcount_source_url": "https://acme.com/about",
            "notes": "",
        }
    return {}


# ── Recording psycopg.connect mock ──────────────────────────────────


class _RecordingCursor:
    def __init__(self, log: list[tuple[str, tuple[Any, ...]]]) -> None:
        self._log = log
        self.description: list[tuple[str, ...]] = []
        self._last_sql = ""

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        self._log.append((sql.strip(), params))
        self._last_sql = sql

    def fetchone(self) -> Any:
        # ``positioning_shift`` queries for the previous snapshot. Return None so
        # the node treats it as an initial snapshot.
        if "competitor_positioning_snapshots" in self._last_sql:
            return None
        return None

    def fetchall(self) -> list[Any]:
        return []

    def __enter__(self) -> "_RecordingCursor":
        return self

    def __exit__(self, *exc: Any) -> None:
        pass


class _RecordingConn:
    def __init__(self, log: list[tuple[str, tuple[Any, ...]]]) -> None:
        self._log = log

    def cursor(self) -> _RecordingCursor:
        return _RecordingCursor(self._log)

    def __enter__(self) -> "_RecordingConn":
        return self

    def __exit__(self, *exc: Any) -> None:
        pass


def _fake_connect_factory(log: list[tuple[str, tuple[Any, ...]]]):
    @contextmanager
    def _connect(dsn: str, *args: Any, **kwargs: Any):
        yield _RecordingConn(log)

    return _connect


# ── Fixtures ────────────────────────────────────────────────────────


@pytest.fixture()
def sql_log(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, tuple[Any, ...]]]:
    log: list[tuple[str, tuple[Any, ...]]] = []
    monkeypatch.setenv("NEON_DATABASE_URL", "postgresql://fake/for/test")
    monkeypatch.setattr(dc.psycopg, "connect", _fake_connect_factory(log))
    return log


@pytest.fixture()
def patched_specialists(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch the actual call sites — each specialist imports fetch_url +
    ainvoke_json by reference, so we patch them inside the graph module."""
    async def _afetch(url: str, *, timeout: float = 10.0) -> dict[str, Any]:
        return _canned_fetch(url, timeout=timeout)

    async def _allm(
        llm: Any, messages: list[dict[str, str]], *, provider: str | None = None
    ) -> dict[str, Any]:
        return _canned_llm(llm, messages, provider=provider)

    def _fake_make_llm(*args: Any, **kwargs: Any) -> Any:
        return object()  # we never call methods on it; ainvoke_json is patched

    monkeypatch.setattr(dc, "fetch_url", _afetch)
    monkeypatch.setattr(dc, "ainvoke_json", _allm)
    monkeypatch.setattr(dc, "make_llm", _fake_make_llm)


# ── Tests ───────────────────────────────────────────────────────────


def test_graph_compiles_with_all_six_specialists() -> None:
    g = build_graph()
    assert g is not None
    assert set(SPECIALISTS) == {
        "pricing_deep",
        "features_deep",
        "integrations_deep",
        "changelog",
        "positioning_shift",
        "funding_headcount",
    }


def test_fan_out_returns_six_send_objects() -> None:
    """The Send-API fan-out must emit one Send per specialist — that's what
    lets them run concurrently. If someone accidentally changes _fan_out to
    ``list[str]``, this test catches it."""
    from langgraph.types import Send

    state = {
        "competitor": {"id": 1, "name": "Acme", "url": "https://acme.com"},
        "product": {"id": 2, "name": "Us", "url": "https://us.com"},
        "competitor_id": 1,
    }
    sends = dc._fan_out(state)
    assert len(sends) == 6
    assert all(isinstance(s, Send) for s in sends)
    node_names = {s.node for s in sends}
    assert node_names == set(SPECIALISTS)


def test_fan_out_skips_on_error() -> None:
    sends = dc._fan_out({"_error": "boom"})
    assert sends == []


@pytest.mark.asyncio
async def test_all_six_specialists_execute_in_parallel_and_persist(
    patched_specialists: None,
    sql_log: list[tuple[str, tuple[Any, ...]]],
) -> None:
    """End-to-end: invoke the compiled graph with pre-populated state, assert
    every specialist fires (writes its slot), and assert synthesize persists
    to the expected tables."""
    g = build_graph()
    result = await g.ainvoke(
        {
            "competitor_id": 1,
            "competitor": {
                "id": 1,
                "name": "Acme",
                "url": "https://acme.com",
                "domain": "acme.com",
                "description": "Lead intel",
                "positioning_headline": "Smarter leads",
                "positioning_tagline": "AI-native",
                "target_audience": "GTM teams",
                "product_id": 42,
            },
            "product": {
                "id": 42,
                "name": "Us",
                "url": "https://us.com",
                "domain": "us.com",
                "description": "Our product",
                "highlights": None,
            },
        }
    )

    # 1. Every specialist slot is populated — proves parallel fan-out ran all 6.
    for slot in SPECIALISTS:
        assert result.get(slot), f"specialist {slot} did not run"

    # 2. agent_timings has one entry per specialist + synthesize (the reducer
    # merges them; if Send had only dispatched one of them, we'd be missing keys).
    timings = result.get("agent_timings") or {}
    for slot in SPECIALISTS:
        assert slot in timings, f"missing timing for {slot}"
    assert "synthesize" in timings

    # 3. Analysis blob gathers all specialist outputs.
    analysis = result.get("analysis") or {}
    assert analysis["competitor_id"] == 1
    assert analysis["pricing"]["tiers"]
    assert analysis["features"]["parity"]
    assert analysis["integrations"]["integrations"]
    assert analysis["changelog"]["entries"]
    assert analysis["positioning_shift"]["headline"]
    assert analysis["funding_headcount"]["events"]

    # 4. DB writes landed in the right tables.
    tables_written = {
        sql.split()[2] if sql.startswith("INSERT INTO") else None
        for sql, _ in sql_log
        if sql.startswith("INSERT INTO")
    }
    assert "competitor_pricing_tiers" in tables_written
    assert "competitor_features" in tables_written
    assert "competitor_feature_parity" in tables_written
    assert "competitor_integrations" in tables_written
    assert "competitor_changelog" in tables_written
    assert "competitor_funding_events" in tables_written
    assert "competitor_positioning_snapshots" in tables_written

    # 5. synthesize flips the competitor row to status='done'.
    assert any(
        sql.startswith("UPDATE") and "competitors" in sql for sql, _ in sql_log
    )


@pytest.mark.asyncio
async def test_pricing_deep_handles_empty_url(patched_specialists: None) -> None:
    result = await dc.pricing_deep({"competitor": {"url": ""}})
    assert result["pricing_deep"]["tiers"] == []


@pytest.mark.asyncio
async def test_positioning_shift_tolerates_missing_previous_snapshot(
    patched_specialists: None, sql_log: list[tuple[str, tuple[Any, ...]]]
) -> None:
    """On first run there's no row in competitor_positioning_snapshots. Node
    must still produce an output (shift_magnitude=0, diff_summary != '')."""
    result = await dc.positioning_shift(
        {
            "competitor": {"id": 9, "name": "Acme", "url": "https://acme.com"},
            "competitor_id": 9,
        }
    )
    ps = result["positioning_shift"]
    assert ps["shift_magnitude"] == 0.0
    assert ps["headline"]


def test_supervisor_scaffold_compiles() -> None:
    """The supervisor is scaffolded only — not registered in langgraph.json.
    We still compile it here so a syntax break is caught."""
    s = dc.build_supervisor_graph()
    assert s is not None
