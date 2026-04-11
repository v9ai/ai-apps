"""Evaluate whether research profiles focus on the person vs their company.

The pipeline sometimes fills thin personal profiles with company data —
funding rounds, competitive landscape, and timeline events from before
the person even joined. These tests catch that pattern generically.

Usage:
    pytest tests/test_eval_person_vs_company.py -v
"""

import json
import re
from pathlib import Path

import pytest

RESEARCH_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "lib" / "research"


def _load_all_profiles() -> list[dict]:
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for path in sorted(RESEARCH_DIR.glob("*.json")):
        if path.name.endswith(".eval.json") or path.name.endswith("-timeline.json"):
            continue
        try:
            profiles.append(json.loads(path.read_text()))
        except Exception:
            pass
    return profiles


@pytest.fixture
def all_profiles():
    profiles = _load_all_profiles()
    if not profiles:
        pytest.skip("No profiles — run research_pipeline.py first")
    return profiles


# ── 1. Bio should not start with meta-commentary ────────────────────────

PREAMBLE_PATTERNS = [
    r"^based on",
    r"^here is",
    r"^after reviewing",
    r"^from the (available|provided)",
    r"^according to",
    r"^my (analysis|synthesis|review)",
]


def test_bio_no_meta_preamble(all_profiles):
    """Bio should not start with LLM meta-commentary like 'Based on my synthesis...'."""
    for profile in all_profiles:
        bio = profile.get("bio", "").strip()
        if not bio:
            continue
        for pattern in PREAMBLE_PATTERNS:
            assert not re.match(pattern, bio, re.IGNORECASE), (
                f"{profile['slug']} bio starts with meta-preamble: '{bio[:60]}...'"
            )


# ── 2. Bio should not be truncated mid-sentence ─────────────────────────


def test_bio_ends_cleanly(all_profiles):
    """Bio should end with a period, not be truncated mid-sentence."""
    for profile in all_profiles:
        bio = profile.get("bio", "").strip()
        if not bio:
            continue
        assert bio[-1] in ".!?)", (
            f"{profile['slug']} bio appears truncated: '...{bio[-40:]}'"
        )


# ── 3. Timeline should not have company events predating person's involvement ──


def test_timeline_no_orphan_company_events(all_profiles):
    """Timeline events about the person's org from before they joined are noise.

    Heuristic: if a timeline event names the org but not the person,
    and occurs before the person's earliest role-change event, flag it.
    """
    for profile in all_profiles:
        timeline = profile.get("timeline", [])
        if len(timeline) < 3:
            continue

        # Find the person's name parts and their org from executive_summary
        name = profile.get("name", "")
        name_parts = [p.lower() for p in name.split() if len(p) > 2]

        # Find the earliest event that mentions the person or a role change
        person_events = []
        for e in timeline:
            text = e.get("event", "").lower()
            if any(p in text for p in name_parts) or any(
                kw in text for kw in ["joined", "started role", "hired", "appointed"]
            ):
                person_events.append(e)

        if not person_events:
            continue

        # Get the earliest person event date
        earliest_dates = sorted(
            [e.get("date", "9999") for e in person_events]
        )
        earliest = earliest_dates[0] if earliest_dates else "9999"

        # Check for company-only events before the person's earliest involvement
        # Only flag clearly impersonal company events (funding/launches)
        # "Founded" is ambiguous — could be the person founding it — so excluded
        org_keywords = [r"\braised\b", r"closed.*funding", r"series [a-d]", r"\blaunched\b"]
        personal_keywords = ["co-founded", "co-created", "joined", "started", "left", "completed", "founded"]
        for i, e in enumerate(timeline):
            event_date = e.get("date", "")
            event_text = e.get("event", "").lower()
            if event_date < earliest:
                is_company_event = any(
                    re.search(kw, event_text) for kw in org_keywords
                )
                is_personal = (
                    any(p in event_text for p in name_parts)
                    or any(kw in event_text for kw in personal_keywords)
                )
                if is_company_event and not is_personal:
                    pytest.fail(
                        f"{profile['slug']} timeline[{i}] is a company event "
                        f"('{e['event'][:60]}...') dated {event_date}, before "
                        f"person's earliest involvement ({earliest})"
                    )


# ── 4. Technical philosophy should not be entirely inferred ──────────────


def test_philosophy_not_all_inferred(all_profiles):
    """If technical_philosophy has positions, they should cite real evidence,
    not just 'inferred from company focus'."""
    for profile in all_profiles:
        philosophy = profile.get("technical_philosophy", {})
        if not philosophy or not philosophy.get("positions"):
            continue

        positions = philosophy["positions"]
        if not isinstance(positions, dict):
            continue

        inferred_count = 0
        total = len(positions)
        for key, pos in positions.items():
            evidence = pos.get("evidence", "") if isinstance(pos, dict) else ""
            if any(
                kw in evidence.lower()
                for kw in ["inferred", "implies", "suggests", "no public", "no explicit"]
            ):
                inferred_count += 1

        if total > 0 and inferred_count == total:
            pytest.fail(
                f"{profile['slug']} technical_philosophy has {total} positions, "
                f"ALL are inferred/speculative with no direct evidence"
            )


# ── 5. Predictions should not be fabricated ──────────────────────────────


def test_predictions_not_fabricated(all_profiles):
    """Predictions should have real dates, not 'inferred from company focus'."""
    for profile in all_profiles:
        philosophy = profile.get("technical_philosophy", {})
        if not philosophy:
            continue
        predictions = philosophy.get("predictions", [])
        for i, pred in enumerate(predictions):
            date_made = pred.get("date_made", "")
            assert "inferred" not in date_made.lower(), (
                f"{profile['slug']} predictions[{i}] has fabricated date: '{date_made}'"
            )


# ── 6. Funding data should relate to the person ─────────────────────────


def test_funding_relates_to_person(all_profiles):
    """If funding section has rounds, the person should be a founder/co-founder
    or the executive_summary should mention them as such."""
    for profile in all_profiles:
        funding = profile.get("funding", {})
        if not funding or not funding.get("funding_rounds"):
            continue

        rounds = funding["funding_rounds"]
        if not rounds or not isinstance(rounds, list):
            continue

        # Check if person is a founder
        collab = profile.get("collaboration_network", {})
        co_founders = collab.get("co_founders", []) if isinstance(collab, dict) else []
        exec_summary = profile.get("executive_summary", {})
        one_liner = exec_summary.get("one_liner", "") if isinstance(exec_summary, dict) else ""

        is_founder = (
            len(co_founders) > 0
            or "founder" in one_liner.lower()
            or "co-founder" in one_liner.lower()
            or "ceo" in one_liner.lower()
        )

        if not is_founder and len(rounds) > 0:
            pytest.fail(
                f"{profile['slug']} has {len(rounds)} funding rounds but person "
                f"is not identified as a founder/CEO — likely company data, not personal"
            )
