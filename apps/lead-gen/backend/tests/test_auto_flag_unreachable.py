"""Tests for ``auto_flag_unreachable_node`` and ``_flag_contact_for_deletion``.

The node is the final step of the paper-author contact-enrichment graph.
It auto-flags ``contacts.to_be_deleted = true`` when the predicate

    (buyer_verdict == "not_buyer" OR affiliation_type == "academic")
    AND no contact channel (email / linkedin_url / github_handle) is set

evaluates True — automating the manual triage Team B did for the
2026-04-22 paper-author dump.

All DB writes are mocked via ``unittest.mock`` — no real Neon traffic.
"""

from __future__ import annotations

import asyncio
import json
from unittest.mock import MagicMock, patch

import pytest

from leadgen_agent.contact_enrich_paper_author_graph import (
    _flag_contact_for_deletion,
    _has_contact_channel,
    auto_flag_unreachable_node,
)


def _run(coro):
    """Sync runner — keeps tests readable without pytest-asyncio."""
    return asyncio.run(coro)


# --------------------------------------------------------------------------- #
# Helpers — predicate truth table
# --------------------------------------------------------------------------- #


def _state(
    *,
    contact_id: int = 42,
    email: str = "",
    linkedin_url: str = "",
    github_handle: str = "",
    affiliation_type: str | None = None,
    buyer_verdict: str | None = None,
) -> dict:
    """Build a minimal ContactEnrichPaperAuthorState-shaped dict."""
    state: dict = {
        "contact": {
            "id": contact_id,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": email,
            "linkedin_url": linkedin_url,
            "github_handle": github_handle,
            "tags": [],
            "openalex_profile": {},
        }
    }
    if affiliation_type is not None:
        state["affiliation_type"] = affiliation_type
    if buyer_verdict is not None:
        state["buyer_verdict"] = buyer_verdict
    return state


# --------------------------------------------------------------------------- #
# Predicate cases (the four required test scenarios)
# --------------------------------------------------------------------------- #


def test_academic_no_channels_is_flagged():
    """affiliation_type=academic, no email/linkedin/github → flag True."""
    state = _state(affiliation_type="academic", buyer_verdict="unknown")

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        mock_flag.return_value = True
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is True
    reason = result["auto_flag_reason"]
    assert "academic" in reason
    assert "no contact channels" in reason
    mock_flag.assert_called_once()
    # Inspect call args: (contact_id, reason) — db kwarg defaults to None.
    args, _ = mock_flag.call_args
    assert args[0] == 42
    assert "academic" in args[1]


def test_not_buyer_with_email_not_flagged():
    """buyer_verdict=not_buyer but has email → NOT flagged (has channel)."""
    state = _state(
        email="ada@example.com",
        affiliation_type="industry",
        buyer_verdict="not_buyer",
    )

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    assert result["auto_flag_reason"] == ""
    mock_flag.assert_not_called()


def test_buyer_no_channels_not_flagged():
    """buyer_verdict=buyer, no contact channels → NOT flagged (real lead)."""
    state = _state(affiliation_type="industry", buyer_verdict="buyer")

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    assert result["auto_flag_reason"] == ""
    mock_flag.assert_not_called()


def test_unknown_unknown_no_channels_not_flagged():
    """affiliation_type=unknown, buyer_verdict=unknown, no channels → NOT flagged.

    Don't flag on unknown — predicate requires definitive non-buyer signal.
    """
    state = _state(affiliation_type="unknown", buyer_verdict="unknown")

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    assert result["auto_flag_reason"] == ""
    mock_flag.assert_not_called()


# --------------------------------------------------------------------------- #
# Predicate edge cases — defensive coverage
# --------------------------------------------------------------------------- #


def test_not_buyer_no_channels_is_flagged():
    """buyer_verdict=not_buyer, no channels → flagged with not_buyer reason."""
    state = _state(affiliation_type="industry", buyer_verdict="not_buyer")

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is True
    assert "buyer_verdict=not_buyer" in result["auto_flag_reason"]
    assert "no contact channels" in result["auto_flag_reason"]


def test_academic_with_linkedin_not_flagged():
    """academic but has linkedin_url → not flagged (has channel)."""
    state = _state(
        linkedin_url="https://linkedin.com/in/ada",
        affiliation_type="academic",
        buyer_verdict="not_buyer",
    )

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    mock_flag.assert_not_called()


def test_academic_with_github_not_flagged():
    """academic but has github_handle → not flagged (has channel)."""
    state = _state(
        github_handle="adalovelace",
        affiliation_type="academic",
        buyer_verdict="unknown",
    )

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    mock_flag.assert_not_called()


def test_missing_team_a_b_state_does_not_flag():
    """If Teams A/B haven't run, fields default to "unknown" → NOT flagged.

    Confirms the fallback wiring works even when upstream nodes are absent.
    """
    state = {
        "contact": {
            "id": 99,
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "",
            "linkedin_url": "",
            "github_handle": "",
        }
    }
    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    assert result["auto_flag_reason"] == ""
    mock_flag.assert_not_called()


def test_upstream_error_does_not_flag():
    """If state.error is set, the node short-circuits with no flag."""
    state = _state(affiliation_type="academic", buyer_verdict="not_buyer")
    state["error"] = "db error: ..."

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    mock_flag.assert_not_called()


def test_missing_contact_id_does_not_flag():
    """No contact_id → silent no-op, never call the DB helper."""
    state = {
        "contact": {"first_name": "Ada", "last_name": "Lovelace"},
        "affiliation_type": "academic",
        "buyer_verdict": "not_buyer",
    }
    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion"
    ) as mock_flag:
        result = _run(auto_flag_unreachable_node(state))

    assert result["auto_flagged_for_deletion"] is False
    mock_flag.assert_not_called()


# --------------------------------------------------------------------------- #
# Idempotency — calling the node twice doesn't re-flag an already-flagged row
# --------------------------------------------------------------------------- #


def test_idempotent_second_run_does_not_re_update():
    """The SQL ``WHERE to_be_deleted IS NOT TRUE`` guarantees zero rows on re-run.

    We mock psycopg.connect and assert:
      1. First call → cursor.execute runs, rowcount=1 → returned True.
      2. Second call (row already flagged) → cursor.execute runs, but
         rowcount=0 → returned False, and no second UPDATE has any effect.
    """
    fake_cursor = MagicMock()
    # Sequence rowcounts: first call flags 1 row, second call flags 0.
    fake_cursor.rowcount = 1

    fake_cursor_ctx = MagicMock()
    fake_cursor_ctx.__enter__.return_value = fake_cursor
    fake_cursor_ctx.__exit__.return_value = False

    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor_ctx
    fake_conn_ctx = MagicMock()
    fake_conn_ctx.__enter__.return_value = fake_conn
    fake_conn_ctx.__exit__.return_value = False

    with patch.dict(
        "os.environ",
        {"NEON_DATABASE_URL": "postgresql://fake/fake"},
        clear=False,
    ), patch(
        "leadgen_agent.contact_enrich_paper_author_graph.psycopg.connect",
        return_value=fake_conn_ctx,
    ) as mock_connect:
        # First invocation: row not yet flagged → succeeds.
        first = _flag_contact_for_deletion(42, "test reason")
        assert first is True
        assert fake_cursor.execute.call_count == 1

        # Inspect the SQL — must include the idempotency guard.
        sql, params = fake_cursor.execute.call_args[0]
        assert "to_be_deleted IS NOT TRUE" in sql
        assert "to_be_deleted = true" in sql
        assert "deletion_reasons" in sql
        assert "deletion_flagged_at = NOW()::text" in sql
        # The deletion_reasons payload mirrors Team B's manual shape.
        payload, contact_id = params
        assert json.loads(payload) == ["auto-flag: test reason"]
        assert contact_id == 42

        # Second invocation: simulate already-flagged row → rowcount = 0.
        fake_cursor.rowcount = 0
        second = _flag_contact_for_deletion(42, "test reason")
        assert second is False
        assert fake_cursor.execute.call_count == 2

        # Both invocations went through psycopg.connect — neither was skipped.
        assert mock_connect.call_count == 2


def test_idempotent_via_node_double_invocation():
    """Calling auto_flag_unreachable_node twice flags only once (via the helper).

    First call: helper returns True (rowcount=1). Second call: helper would
    return False because the SQL guard returns rowcount=0 — but the node
    itself doesn't gate on that, it always returns the predicate verdict.
    The DB-side idempotency is the load-bearing guarantee.
    """
    state = _state(affiliation_type="academic", buyer_verdict="not_buyer")

    call_log: list[tuple[int, str]] = []

    def fake_flag(contact_id: int, reason: str, db=None):
        call_log.append((contact_id, reason))
        # Simulate the SQL guard: first call flags, subsequent are no-ops.
        return len(call_log) == 1

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph._flag_contact_for_deletion",
        side_effect=fake_flag,
    ):
        first = _run(auto_flag_unreachable_node(state))
        second = _run(auto_flag_unreachable_node(state))

    # Predicate is True both times — the node returns True both times.
    assert first["auto_flagged_for_deletion"] is True
    assert second["auto_flagged_for_deletion"] is True
    # But the helper was called twice — and the SECOND time the SQL guard
    # would return rowcount=0, which is what makes the operation idempotent
    # at the DB layer (asserted in test_idempotent_second_run_does_not_re_update).
    assert len(call_log) == 2


# --------------------------------------------------------------------------- #
# _has_contact_channel — direct unit coverage
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(
    "contact, expected",
    [
        ({"email": "x@y.z"}, True),
        ({"linkedin_url": "https://linkedin.com/in/x"}, True),
        ({"github_handle": "octocat"}, True),
        ({}, False),
        ({"email": "", "linkedin_url": "", "github_handle": ""}, False),
        ({"email": "  "}, False),  # whitespace-only counts as empty
        ({"email": None, "linkedin_url": None, "github_handle": None}, False),
    ],
)
def test_has_contact_channel_truth_table(contact, expected):
    assert _has_contact_channel(contact) is expected


# --------------------------------------------------------------------------- #
# Injected-db code path — the test-friendly entry point
# --------------------------------------------------------------------------- #


def test_flag_helper_with_injected_db():
    """When ``db`` is passed, helper uses it directly (no psycopg.connect)."""
    fake_cursor = MagicMock()
    fake_cursor.rowcount = 1
    fake_cursor_ctx = MagicMock()
    fake_cursor_ctx.__enter__.return_value = fake_cursor
    fake_cursor_ctx.__exit__.return_value = False

    fake_db = MagicMock()
    fake_db.cursor.return_value = fake_cursor_ctx

    with patch(
        "leadgen_agent.contact_enrich_paper_author_graph.psycopg.connect"
    ) as mock_connect:
        result = _flag_contact_for_deletion(7, "why", db=fake_db)

    assert result is True
    fake_cursor.execute.assert_called_once()
    # The injected-db path must not open a real connection.
    mock_connect.assert_not_called()
