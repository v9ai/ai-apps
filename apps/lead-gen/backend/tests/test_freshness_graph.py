"""Tests for the freshness scoring graph.

Three core scenarios:
    1. Identical content → stale=False, reason="same"
    2. Changed content → stale=True with a meaningful reason
    3. Unreachable URL → handled gracefully, stale=False, reason="unreachable"

All DB and loader calls are stubbed — no Neon, no network.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from leadgen_agent.freshness_graph import (
    _hash,
    _normalize,
    build_graph,
    decide_freshness,
    fetch_current_content,
)


# ── Unit tests: hashing + normalization ───────────────────────────────────


def test_normalize_strips_volatile_patterns() -> None:
    """Timestamps and hex hashes must not perturb the hash."""
    a = "Pricing updated at 2026-04-23T12:34:56Z, version abc123def456"
    b = "Pricing updated at 2026-04-22T09:00:00Z, version 999888777666"
    assert _normalize(a) == _normalize(b)


def test_hash_is_stable_for_same_content() -> None:
    assert _hash("hello world") == _hash("  hello   world  ")
    assert _hash("A") != _hash("B")


def test_hash_ignores_volatile_timestamps() -> None:
    a = "Copyright 2026. Updated 2026-04-23T12:00:00Z."
    b = "Copyright 2026. Updated 2026-03-01T08:00:00Z."
    assert _hash(a) == _hash(b)


# ── decide_freshness branch logic ────────────────────────────────────────


async def test_decide_same_content_not_stale() -> None:
    """Identical previous/current hash → stale=False, reason=same, confidence=1."""
    result = await decide_freshness(
        {
            "previous_hash": "sha256:abc",
            "current_hash": "sha256:abc",
            "reachable": True,
            "current_markdown": "Hello world",
        }
    )
    assert result["stale"] is False
    assert result["reason"] == "same"
    assert result["confidence"] == 1.0


async def test_decide_changed_content_is_stale_with_reason() -> None:
    """Different hashes → stale=True, reason reflects content type, confidence high."""
    result = await decide_freshness(
        {
            "previous_hash": "sha256:old",
            "current_hash": "sha256:new",
            "reachable": True,
            "current_markdown": "Our new pricing: $49 per month, starting at $99 per user",
        }
    )
    assert result["stale"] is True
    assert result["reason"] == "new pricing page"
    assert result["confidence"] >= 0.7


async def test_decide_changed_content_feature_reason() -> None:
    """Changed content with feature markers → reason='new features'."""
    result = await decide_freshness(
        {
            "previous_hash": "sha256:old",
            "current_hash": "sha256:new",
            "reachable": True,
            "current_markdown": "Announcing: new feature rollout, see our changelog.",
        }
    )
    assert result["stale"] is True
    assert result["reason"] == "new features"


async def test_decide_changed_generic_drift() -> None:
    """Changed content without pricing/feature markers → reason='content drift'."""
    result = await decide_freshness(
        {
            "previous_hash": "sha256:old",
            "current_hash": "sha256:new",
            "reachable": True,
            "current_markdown": "We help teams collaborate better than ever before.",
        }
    )
    assert result["stale"] is True
    assert result["reason"] == "content drift"


async def test_decide_unreachable_trusts_cache() -> None:
    """Transient outage must NOT trigger a spurious re-analysis."""
    result = await decide_freshness(
        {
            "previous_hash": "sha256:abc",
            "current_hash": "",
            "reachable": False,
            "current_markdown": "",
        }
    )
    assert result["stale"] is False
    assert result["reason"] == "unreachable"
    # Low confidence so callers can distinguish "truly same" from "we don't know".
    assert result["confidence"] < 0.5


async def test_decide_no_baseline_is_stale_but_uncertain() -> None:
    """First ever check — no previous hash to compare against."""
    result = await decide_freshness(
        {
            "previous_hash": "",
            "current_hash": "sha256:new",
            "reachable": True,
            "current_markdown": "Some content",
        }
    )
    assert result["stale"] is True
    assert result["reason"] == "no baseline"
    assert result["confidence"] == 0.5


# ── fetch_current_content: loader stubs ──────────────────────────────────


class _FakeDoc:
    def __init__(self, page_content: str) -> None:
        self.page_content = page_content


async def test_fetch_identical_content_yields_expected_hash() -> None:
    """Stub _load_basic to return fixed docs; confirm hash is deterministic."""
    fixed_md = "Welcome to our product. It solves a real problem."
    with (
        patch(
            "leadgen_agent.freshness_graph._load_basic",
            new=AsyncMock(return_value=[_FakeDoc("<h1>x</h1>")]),
        ),
        patch(
            "leadgen_agent.freshness_graph._to_markdown",
            return_value=fixed_md,
        ),
    ):
        result = await fetch_current_content(
            {"product": {"url": "https://example.com"}}
        )
    assert result["reachable"] is True
    assert result["current_markdown"] == fixed_md
    assert result["current_hash"] == _hash(fixed_md)


async def test_fetch_unreachable_returns_graceful_failure() -> None:
    """Loader raising an exception must yield reachable=False, not propagate."""
    with patch(
        "leadgen_agent.freshness_graph._load_basic",
        new=AsyncMock(side_effect=RuntimeError("DNS failure")),
    ):
        result = await fetch_current_content(
            {"product": {"url": "https://unreachable.example"}}
        )
    assert result["reachable"] is False
    assert result["current_hash"] == ""
    assert result["current_markdown"] == ""


async def test_fetch_empty_markdown_treated_as_unreachable() -> None:
    """A loader returning empty markdown is as useless as a failure."""
    with (
        patch(
            "leadgen_agent.freshness_graph._load_basic",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "leadgen_agent.freshness_graph._to_markdown",
            return_value="",
        ),
    ):
        result = await fetch_current_content(
            {"product": {"url": "https://example.com"}}
        )
    assert result["reachable"] is False


async def test_fetch_missing_url_short_circuits() -> None:
    """A product without a URL cannot be fetched — must not attempt the call."""
    with patch(
        "leadgen_agent.freshness_graph._load_basic",
        new=AsyncMock(side_effect=AssertionError("should not be called")),
    ):
        result = await fetch_current_content({"product": {"url": ""}})
    assert result["reachable"] is False


# ── Graph compile ────────────────────────────────────────────────────────


def test_build_graph_compiles() -> None:
    """The full freshness graph must compile — exercises imports + edges."""
    graph = build_graph()
    assert graph is not None


# ── End-to-end scenario: identical / changed / unreachable ───────────────


def _fake_conn_ctx(fetchone_return: tuple | None = None):
    """Build a psycopg.connect context-manager stub with a scripted fetchone."""
    conn = MagicMock()
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=False)
    cur = MagicMock()
    cur.__enter__ = MagicMock(return_value=cur)
    cur.__exit__ = MagicMock(return_value=False)
    cur.fetchone = MagicMock(return_value=fetchone_return)
    cur.fetchall = MagicMock(return_value=[])
    cur.description = [
        ("id",), ("name",), ("url",), ("domain",),
        ("icp_analysis",), ("freshness_snapshot",),
    ]
    cur.execute = MagicMock(return_value=None)
    conn.cursor = MagicMock(return_value=cur)
    return conn


async def test_end_to_end_identical_content() -> None:
    """Full graph run with matching previous/current hash → stale=False."""
    fixed_md = "Pricing: contact sales"
    fixed_hash = _hash(fixed_md)

    db_row = (
        1, "Acme", "https://acme.com", "acme.com",
        None,  # icp_analysis
        {"content_hash": fixed_hash, "checked_at": "2026-03-01T00:00:00+00:00"},
    )

    with (
        patch(
            "leadgen_agent.freshness_graph.psycopg.connect",
            return_value=_fake_conn_ctx(db_row),
        ),
        patch(
            "leadgen_agent.freshness_graph._load_basic",
            new=AsyncMock(return_value=[_FakeDoc("<html/>")]),
        ),
        patch(
            "leadgen_agent.freshness_graph._to_markdown",
            return_value=fixed_md,
        ),
    ):
        graph = build_graph()
        result = await graph.ainvoke({"product_id": 1})

    assert result["stale"] is False
    assert result["reason"] == "same"


async def test_end_to_end_changed_content() -> None:
    """Full graph run with different hashes → stale=True, meaningful reason."""
    db_row = (
        1, "Acme", "https://acme.com", "acme.com",
        None,
        {"content_hash": "sha256:stale-old", "checked_at": "2026-03-01T00:00:00+00:00"},
    )

    with (
        patch(
            "leadgen_agent.freshness_graph.psycopg.connect",
            return_value=_fake_conn_ctx(db_row),
        ),
        patch(
            "leadgen_agent.freshness_graph._load_basic",
            new=AsyncMock(return_value=[_FakeDoc("<html/>")]),
        ),
        patch(
            "leadgen_agent.freshness_graph._to_markdown",
            return_value="New pricing: starting at $99 per month per user.",
        ),
    ):
        graph = build_graph()
        result = await graph.ainvoke({"product_id": 1})

    assert result["stale"] is True
    assert result["reason"] in ("new pricing page", "new features", "content drift")
    assert result["confidence"] >= 0.7


async def test_end_to_end_unreachable() -> None:
    """Full graph run with loader failure → stale=False (trust cache)."""
    db_row = (
        1, "Acme", "https://acme.com", "acme.com",
        None,
        {"content_hash": "sha256:abc", "checked_at": "2026-03-01T00:00:00+00:00"},
    )

    with (
        patch(
            "leadgen_agent.freshness_graph.psycopg.connect",
            return_value=_fake_conn_ctx(db_row),
        ),
        patch(
            "leadgen_agent.freshness_graph._load_basic",
            new=AsyncMock(side_effect=RuntimeError("timeout")),
        ),
    ):
        graph = build_graph()
        result = await graph.ainvoke({"product_id": 1})

    assert result["stale"] is False
    assert result["reason"] == "unreachable"
