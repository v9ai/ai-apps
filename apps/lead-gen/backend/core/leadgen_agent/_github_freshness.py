"""GitHub-activity freshness multiplier for vertical lead scoring.

Pure functions — no DB, no network — so the staleness math can be
unit-tested in isolation. The caller (``score_verticals`` in
``company_enrichment_graph``) loads the inputs from ``companies`` and
applies the returned multiplier to the per-vertical composite score
before re-deriving the tier.

Bumping ``FRESHNESS_VERSION`` invalidates prior ``company_product_signals``
rows (the value is folded into the per-row idempotency hash) so the
next enrichment pass recomputes them with the current rules.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

# Bump when the multiplier table or rules below change. Folded into the
# weights_hash idempotency check so existing rows are recomputed.
FRESHNESS_VERSION = "1"

# (months_since_push_min, multiplier) — first matching band wins; bands are
# checked top-to-bottom against the integer floor of months_since_push.
_STALENESS_BANDS: tuple[tuple[int, float], ...] = (
    (24, 0.3),
    (18, 0.5),
    (12, 0.7),
)
_ARCHIVED_MULT = 0.2
_FRESH_MULT = 1.0


def _parse_iso(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _months_between(then: datetime, now: datetime) -> float:
    return (now - then).days / 30.4375


def _coerce_patterns(github_patterns: Any) -> dict[str, Any]:
    if github_patterns is None:
        return {}
    if isinstance(github_patterns, dict):
        return github_patterns
    if isinstance(github_patterns, str):
        try:
            parsed = json.loads(github_patterns)
        except (TypeError, ValueError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def freshness_multiplier(
    *,
    github_analyzed_at: Any,
    github_patterns: Any,
    github_activity_score: float | None,
    now: datetime | None = None,
) -> tuple[float, dict[str, Any]]:
    """Return ``(multiplier, repo_activity)``.

    - ``multiplier`` ∈ [0, 1] — caller multiplies the composite score by
      this value before re-deriving the tier.
    - ``repo_activity`` is a dict suitable for embedding in the
      ``signals`` jsonb so the penalty is auditable from the UI.

    Rules:
      * ``github_analyzed_at IS NULL`` → 1.0 (no data; don't penalize).
      * ``patterns.archived == True`` → 0.2 (forced cold).
      * Else by ``months_since_push``: ≥24 → 0.3, ≥18 → 0.5, ≥12 → 0.7,
        else 1.0.
      * Soft floor: ``max(multiplier, github_activity_score)`` so an
        actively-developed org is never demoted below its measured
        activity score (``score_activity`` already returns ∈ [0, 1]).
    """
    if not github_analyzed_at:
        return 1.0, {"analyzed": False, "multiplier": 1.0}

    now = now or datetime.now(timezone.utc)
    patterns = _coerce_patterns(github_patterns)
    activity = patterns.get("activity") if isinstance(patterns.get("activity"), dict) else {}

    archived = bool(patterns.get("archived"))
    last_push_dt = _parse_iso(activity.get("last_push"))
    months_since_push: float | None = None
    if last_push_dt is not None:
        months_since_push = _months_between(last_push_dt, now)

    if archived:
        base_mult = _ARCHIVED_MULT
    elif months_since_push is None:
        # Repo metadata present but no last_push — no penalty either way.
        base_mult = _FRESH_MULT
    else:
        base_mult = _FRESH_MULT
        for threshold, mult in _STALENESS_BANDS:
            if months_since_push >= threshold:
                base_mult = mult
                break

    activity_floor: float | None = None
    if github_activity_score is not None:
        try:
            activity_floor = max(0.0, min(1.0, float(github_activity_score)))
        except (TypeError, ValueError):
            activity_floor = None

    multiplier = base_mult
    if activity_floor is not None and activity_floor > multiplier:
        multiplier = activity_floor

    repo_activity: dict[str, Any] = {
        "analyzed": True,
        "archived": archived,
        "last_push": last_push_dt.isoformat() if last_push_dt else None,
        "months_since_push": (
            round(months_since_push, 1) if months_since_push is not None else None
        ),
        "activity_score": activity_floor,
        "base_multiplier": round(base_mult, 3),
        "multiplier": round(multiplier, 3),
    }
    return multiplier, repo_activity


__all__ = ["FRESHNESS_VERSION", "freshness_multiplier"]
