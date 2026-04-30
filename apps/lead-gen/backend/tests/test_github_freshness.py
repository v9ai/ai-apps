"""Unit tests for ``_github_freshness.freshness_multiplier``.

The multiplier is the only knob through which an inactive GitHub project
demotes its lead tier in ``score_verticals`` — a regression here silently
re-promotes dead repos to Hot, which is exactly what this module exists
to prevent (Palico.ai 2026-04-30 incident).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from leadgen_agent._github_freshness import freshness_multiplier


_NOW = datetime(2026, 4, 30, tzinfo=timezone.utc)


def _push(months_ago: float) -> str:
    # Add a one-day buffer so the integer-day truncation in
    # ``_months_between`` doesn't land us just under the band threshold.
    return (_NOW - timedelta(days=months_ago * 30.4375 + 1)).isoformat()


def test_no_analyzed_at_returns_full_multiplier() -> None:
    mult, info = freshness_multiplier(
        github_analyzed_at=None,
        github_patterns={"activity": {"last_push": _push(36)}},
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == 1.0
    assert info == {"analyzed": False, "multiplier": 1.0}


def test_archived_repo_forced_to_lowest_multiplier() -> None:
    mult, info = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"archived": True, "activity": {"last_push": _push(2)}},
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == pytest.approx(0.2)
    assert info["archived"] is True


def test_last_push_24_months_ago_demotes_to_0_3() -> None:
    mult, _ = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {"last_push": _push(24)}},
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == pytest.approx(0.3)


def test_last_push_18_months_ago_demotes_to_0_5() -> None:
    mult, _ = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {"last_push": _push(18)}},
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == pytest.approx(0.5)


def test_last_push_12_months_ago_demotes_to_0_7() -> None:
    mult, _ = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {"last_push": _push(12)}},
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == pytest.approx(0.7)


def test_recent_push_keeps_multiplier_at_1() -> None:
    mult, _ = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {"last_push": _push(2)}},
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == pytest.approx(1.0)


def test_activity_score_acts_as_floor() -> None:
    # 24mo stale → base 0.3, but a high activity_score floor keeps it up.
    mult, _ = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {"last_push": _push(24)}},
        github_activity_score=0.85,
        now=_NOW,
    )
    assert mult == pytest.approx(0.85)


def test_activity_score_floor_clamped_to_one() -> None:
    mult, _ = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {"last_push": _push(24)}},
        github_activity_score=2.5,  # bad input; clamp to 1.0
        now=_NOW,
    )
    assert mult == pytest.approx(1.0)


def test_archived_overrides_activity_score_floor_only_when_lower() -> None:
    # Archived = 0.2 base; if a stale activity score is below that, archive wins.
    mult, info = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"archived": True, "activity": {"last_push": _push(2)}},
        github_activity_score=0.05,
        now=_NOW,
    )
    assert mult == pytest.approx(0.2)
    assert info["archived"] is True


def test_patterns_as_json_string_is_accepted() -> None:
    mult, info = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns='{"activity": {"last_push": "%s"}}' % _push(24),
        github_activity_score=0.0,
        now=_NOW,
    )
    assert mult == pytest.approx(0.3)
    assert info["analyzed"] is True
    assert info["months_since_push"] == pytest.approx(24.0, abs=0.5)


def test_missing_last_push_does_not_penalize() -> None:
    # Repo analyzed but the activity payload is empty — give benefit of the
    # doubt (1.0) rather than punishing the company for missing GH metadata.
    mult, info = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"activity": {}},
        github_activity_score=None,
        now=_NOW,
    )
    assert mult == pytest.approx(1.0)
    assert info["analyzed"] is True
    assert info["months_since_push"] is None


def test_repo_activity_payload_shape() -> None:
    _, info = freshness_multiplier(
        github_analyzed_at="2026-04-01T00:00:00Z",
        github_patterns={"archived": False, "activity": {"last_push": _push(20)}},
        github_activity_score=0.4,
        now=_NOW,
    )
    assert info["analyzed"] is True
    assert info["archived"] is False
    assert info["months_since_push"] == pytest.approx(20.0, abs=0.2)
    assert info["activity_score"] == pytest.approx(0.4)
    assert info["base_multiplier"] == pytest.approx(0.5)
    # 0.5 base vs 0.4 floor → multiplier stays at 0.5
    assert info["multiplier"] == pytest.approx(0.5)
    assert "last_push" in info
