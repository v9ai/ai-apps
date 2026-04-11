"""Generic deterministic evals for LangGraph pipeline output.

Parametrizes over every research profile JSON on disk, validating:
1. Profile schema & required keys
2. Bio quality (not chain-of-thought, min length, no JSON artifacts)
3. Timeline quality (min events, chronological, valid URLs)
4. Key contributions (min count, substantive descriptions, valid URLs)
5. Social links (min platforms, valid URLs)
6. Sources (min count, valid URLs)
7. Eval file (.eval.json) — dimension scores in range, overall threshold
8. Enriched timeline (-timeline.json) — merged sources, chronological

No API calls needed — all tests are deterministic and run against on-disk JSON.

Run all:
    pytest tests/test_eval_pipeline_output.py -v

Single profile:
    pytest tests/test_eval_pipeline_output.py -k "joshua-mo" -v
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

import pytest

# ── Paths ────────────────────────────────────────────────────────────────

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"

EVAL_DIMENSIONS = [
    "bio_quality",
    "source_coverage",
    "timeline_completeness",
    "contributions_depth",
    "name_disambiguation",
]


# ── Loaders ──────────────────────────────────────────────────────────────

def _load_profiles() -> list[dict]:
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


def _load_eval_files() -> list[dict]:
    evals = []
    if not RESEARCH_DIR.exists():
        return evals
    for f in sorted(RESEARCH_DIR.glob("*.eval.json")):
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data:
                evals.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return evals


def _load_timelines() -> list[dict]:
    timelines = []
    if not RESEARCH_DIR.exists():
        return timelines
    for f in sorted(RESEARCH_DIR.glob("*-timeline.json")):
        try:
            data = json.loads(f.read_text())
            data["slug"] = f.name.replace("-timeline.json", "")
            timelines.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return timelines


def _pid(p: dict) -> str:
    return p.get("slug", "?")


def _pad_date(d: str) -> str:
    if len(d) == 4:
        return d + "-12-31"
    if len(d) == 7:
        return d + "-31"
    return d


# ═══════════════════════════════════════════════════════════════════════════
# 1. PROFILE SCHEMA
# ═══════════════════════════════════════════════════════════════════════════

REQUIRED_KEYS = [
    "slug", "name", "generated_at", "bio", "topics",
    "timeline", "key_contributions", "social", "sources",
]


class TestProfileSchema:
    """Every profile JSON must have required keys with correct types."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_required_keys_present(self, profile):
        missing = [k for k in REQUIRED_KEYS if k not in profile]
        assert not missing, (
            f"{profile['slug']} missing required keys: {missing}"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_slug_is_kebab_case(self, profile):
        slug = profile["slug"]
        assert re.fullmatch(r"[a-z][a-z0-9]*(-[a-z0-9]+)*", slug), (
            f"slug '{slug}' is not valid kebab-case"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_generated_at_is_iso(self, profile):
        raw = profile["generated_at"]
        try:
            datetime.fromisoformat(raw)
        except (ValueError, TypeError):
            pytest.fail(f"{profile['slug']} generated_at '{raw}' is not valid ISO 8601")

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_timeline_is_list(self, profile):
        assert isinstance(profile["timeline"], list)

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_key_contributions_is_list(self, profile):
        assert isinstance(profile["key_contributions"], list)

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_social_is_dict(self, profile):
        assert isinstance(profile["social"], dict)

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_topics_is_list_of_strings(self, profile):
        topics = profile["topics"]
        assert isinstance(topics, list)
        for item in topics:
            assert isinstance(item, str), (
                f"{profile['slug']} has non-string topic: {item!r}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 2. BIO QUALITY
# ═══════════════════════════════════════════════════════════════════════════

class TestBioQuality:
    """Bio must be a proper biography, not placeholder or chain-of-thought."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_non_empty(self, profile):
        bio = profile.get("bio", "")
        assert isinstance(bio, str) and len(bio.strip()) > 0, (
            f"{profile['slug']} has empty bio"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_min_word_count(self, profile):
        words = profile.get("bio", "").split()
        assert len(words) >= 30, (
            f"{profile['slug']} bio too short: {len(words)} words (need ≥30)"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_not_chain_of_thought(self, profile):
        """Bio must not start with DeepSeek chain-of-thought preamble."""
        bio = profile.get("bio", "").lower()
        bad_starts = [
            "let me", "i'll", "thinking:", "okay, so", "first, i",
            "step 1", "i need to", "let's start", "alright,",
        ]
        for phrase in bad_starts:
            assert not bio.startswith(phrase), (
                f"{profile['slug']} bio starts with chain-of-thought: '{phrase}'"
            )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_no_json_artifacts(self, profile):
        """Bio must not contain raw JSON or code fences."""
        bio = profile.get("bio", "")
        assert "```" not in bio, (
            f"{profile['slug']} bio contains code fence artifacts"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_mentions_person_name(self, profile):
        """Bio should mention the person's name (first or last)."""
        bio = profile.get("bio", "").lower()
        name_parts = profile["name"].lower().split()
        assert any(part in bio for part in name_parts if len(part) > 2), (
            f"{profile['slug']} bio does not mention any part of '{profile['name']}'"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 3. TIMELINE QUALITY
# ═══════════════════════════════════════════════════════════════════════════

class TestTimelineQuality:
    """Timeline must have enough events, correct keys, and chronological order."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_timeline_min_events(self, profile):
        events = profile.get("timeline", [])
        if not events:
            pytest.skip(f"{profile['slug']} has empty timeline")
        assert len(events) >= 3, (
            f"{profile['slug']} timeline has only {len(events)} events (need ≥3)"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_timeline_events_have_required_keys(self, profile):
        for i, event in enumerate(profile.get("timeline", [])):
            for key in ("date", "event", "url"):
                assert key in event, (
                    f"{profile['slug']} timeline[{i}] missing '{key}'"
                )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_timeline_urls_are_valid(self, profile):
        for i, event in enumerate(profile.get("timeline", [])):
            url = event.get("url", "")
            assert url.startswith("http"), (
                f"{profile['slug']} timeline[{i}] invalid URL: '{url}'"
            )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_timeline_is_ordered(self, profile):
        """Timeline must be consistently ordered (ascending or descending)."""
        dates = [e["date"] for e in profile.get("timeline", []) if e.get("date")]
        if len(dates) < 2:
            return
        padded = [_pad_date(d) for d in dates]
        is_asc = all(padded[i] <= padded[i + 1] for i in range(len(padded) - 1))
        is_desc = all(padded[i] >= padded[i + 1] for i in range(len(padded) - 1))
        assert is_asc or is_desc, (
            f"{profile['slug']} timeline is neither ascending nor descending"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_timeline_dates_valid_format(self, profile):
        """Dates must start with a 4-digit year."""
        for i, event in enumerate(profile.get("timeline", [])):
            date = event.get("date", "")
            assert re.match(r"^\d{4}", date), (
                f"{profile['slug']} timeline[{i}] date '{date}' missing year"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 4. KEY CONTRIBUTIONS QUALITY
# ═══════════════════════════════════════════════════════════════════════════

class TestContributionsQuality:
    """Key contributions must have structure and substance."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_contributions_min_count(self, profile):
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"{profile['slug']} has no contributions")
        assert len(contribs) >= 2, (
            f"{profile['slug']} has only {len(contribs)} contributions (need ≥2)"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_contributions_have_required_keys(self, profile):
        for i, c in enumerate(profile.get("key_contributions", [])):
            for key in ("title", "description", "url"):
                assert key in c, (
                    f"{profile['slug']} key_contributions[{i}] missing '{key}'"
                )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_contributions_urls_valid(self, profile):
        for i, c in enumerate(profile.get("key_contributions", [])):
            url = c.get("url", "")
            assert url.startswith("http"), (
                f"{profile['slug']} key_contributions[{i}] invalid URL: '{url}'"
            )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_contribution_descriptions_substantive(self, profile):
        """Each contribution description should be at least 10 words."""
        for i, c in enumerate(profile.get("key_contributions", [])):
            desc = c.get("description", "")
            word_count = len(desc.split())
            assert word_count >= 10, (
                f"{profile['slug']} key_contributions[{i}] description "
                f"too short: {word_count} words (need ≥10)"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 5. SOCIAL LINKS
# ═══════════════════════════════════════════════════════════════════════════

class TestSocialLinks:
    """Social links must be valid URLs on at least 2 platforms."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_social_min_platforms(self, profile):
        social = profile.get("social", {})
        if not social:
            pytest.skip(f"{profile['slug']} has empty social")
        assert len(social) >= 2, (
            f"{profile['slug']} has only {len(social)} social link (need ≥2)"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_social_values_valid(self, profile):
        for platform, value in profile.get("social", {}).items():
            is_url = value.startswith("http")
            is_email = "@" in value and "." in value
            assert is_url or is_email, (
                f"{profile['slug']} social['{platform}'] is not a URL or email: '{value}'"
            )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_social_keys_lowercase(self, profile):
        for key in profile.get("social", {}):
            assert key == key.lower(), (
                f"{profile['slug']} social key '{key}' is not lowercase"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 6. SOURCES
# ═══════════════════════════════════════════════════════════════════════════

class TestSources:
    """Research sources must exist and have valid URLs."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_sources_min_count(self, profile):
        sources = profile.get("sources", [])
        if not sources:
            pytest.skip(f"{profile['slug']} has no sources")
        assert len(sources) >= 3, (
            f"{profile['slug']} has only {len(sources)} sources (need ≥3)"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_sources_have_url(self, profile):
        for i, s in enumerate(profile.get("sources", [])):
            assert "url" in s, f"{profile['slug']} sources[{i}] missing 'url'"
            assert s["url"].startswith("http"), (
                f"{profile['slug']} sources[{i}] invalid URL: '{s['url']}'"
            )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_sources_have_title(self, profile):
        for i, s in enumerate(profile.get("sources", [])):
            assert "title" in s and s["title"].strip(), (
                f"{profile['slug']} sources[{i}] missing or empty 'title'"
            )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_sources_span_multiple_domains(self, profile):
        """Sources should come from at least 2 distinct domains."""
        sources = profile.get("sources", [])
        if len(sources) < 2:
            pytest.skip(f"{profile['slug']} has <2 sources")
        domains = set()
        for s in sources:
            m = re.search(r"https?://(?:www\.)?([^/]+)", s.get("url", ""))
            if m:
                domains.add(m.group(1))
        assert len(domains) >= 2, (
            f"{profile['slug']} sources all from {domains} (need ≥2 domains)"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 7. EVAL FILE (.eval.json)
# ═══════════════════════════════════════════════════════════════════════════

class TestEvalFile:
    """Validate .eval.json dimension scores and overall threshold."""

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_eval_has_required_top_level_keys(self, eval_data):
        slug = eval_data["slug"]
        for key in ("slug", "name", "generated_at", "eval"):
            assert key in eval_data, f"{slug} eval.json missing '{key}'"

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_all_dimensions_present(self, eval_data):
        slug = eval_data["slug"]
        e = eval_data.get("eval", {})
        missing = [d for d in EVAL_DIMENSIONS if d not in e]
        assert not missing, f"{slug} eval missing dimensions: {missing}"

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_dimension_scores_in_range(self, eval_data):
        slug = eval_data["slug"]
        e = eval_data.get("eval", {})
        for dim in EVAL_DIMENSIONS:
            entry = e.get(dim, {})
            score = entry.get("score")
            assert isinstance(score, (int, float)), (
                f"{slug} eval.{dim}.score is not numeric: {score!r}"
            )
            assert 1 <= score <= 10, (
                f"{slug} eval.{dim}.score = {score} outside [1, 10]"
            )

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_dimensions_have_reasoning(self, eval_data):
        slug = eval_data["slug"]
        e = eval_data.get("eval", {})
        for dim in EVAL_DIMENSIONS:
            reasoning = e.get(dim, {}).get("reasoning", "")
            assert isinstance(reasoning, str) and len(reasoning.strip()) > 10, (
                f"{slug} eval.{dim}.reasoning is empty or too short"
            )

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_overall_score_in_range(self, eval_data):
        slug = eval_data["slug"]
        overall = eval_data.get("eval", {}).get("overall_score")
        assert isinstance(overall, (int, float)), (
            f"{slug} eval.overall_score is not numeric"
        )
        assert 1 <= overall <= 10, (
            f"{slug} eval.overall_score = {overall} outside [1, 10]"
        )

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_overall_score_meets_threshold(self, eval_data):
        slug = eval_data["slug"]
        overall = eval_data.get("eval", {}).get("overall_score", 0)
        assert overall >= 6, (
            f"{slug} overall_score {overall}/10 below threshold (need ≥6)"
        )

    @pytest.mark.parametrize("eval_data", _load_eval_files(), ids=_pid)
    def test_eval_summary_non_empty(self, eval_data):
        slug = eval_data["slug"]
        summary = eval_data.get("eval", {}).get("summary", "")
        assert isinstance(summary, str) and len(summary.strip()) > 20, (
            f"{slug} eval.summary is missing or too short"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 8. ENRICHED TIMELINE (-timeline.json)
# ═══════════════════════════════════════════════════════════════════════════

class TestEnrichedTimeline:
    """Validate enriched -timeline.json files that override page timelines."""

    @pytest.mark.parametrize("tl", _load_timelines(), ids=_pid)
    def test_has_events_key(self, tl):
        slug = tl["slug"]
        assert "events" in tl, f"{slug} timeline JSON missing 'events' key"

    @pytest.mark.parametrize("tl", _load_timelines(), ids=_pid)
    def test_events_have_required_fields(self, tl):
        slug = tl["slug"]
        events = tl.get("events", [])
        if not events:
            pytest.skip(f"{slug} enriched timeline is empty")
        for i, ev in enumerate(events):
            for key in ("date", "event", "url", "source"):
                assert key in ev, f"{slug} events[{i}] missing '{key}'"

    @pytest.mark.parametrize("tl", _load_timelines(), ids=_pid)
    def test_source_types_are_valid(self, tl):
        """Source must be one of the known types."""
        slug = tl["slug"]
        events = tl.get("events", [])
        if not events:
            pytest.skip(f"{slug} enriched timeline is empty")
        valid = {"research", "github", "paper", "huggingface"}
        for i, ev in enumerate(events):
            source = ev.get("source", "")
            assert source in valid, (
                f"{slug} events[{i}] source '{source}' not in {valid}"
            )

    @pytest.mark.parametrize("tl", _load_timelines(), ids=_pid)
    def test_chronological_order(self, tl):
        slug = tl["slug"]
        events = tl.get("events", [])
        if len(events) < 2:
            pytest.skip(f"{slug} enriched timeline has <2 events")
        dates = [ev["date"] for ev in events if ev.get("date")]
        padded = [_pad_date(d) for d in dates]
        is_asc = all(padded[i] <= padded[i + 1] for i in range(len(padded) - 1))
        is_desc = all(padded[i] >= padded[i + 1] for i in range(len(padded) - 1))
        assert is_asc or is_desc, (
            f"{slug} enriched timeline is neither ascending nor descending"
        )

    @pytest.mark.parametrize("tl", _load_timelines(), ids=_pid)
    def test_urls_are_valid(self, tl):
        slug = tl["slug"]
        events = tl.get("events", [])
        if not events:
            pytest.skip(f"{slug} enriched timeline is empty")
        for i, ev in enumerate(events):
            url = ev.get("url", "")
            assert url.startswith("http"), (
                f"{slug} events[{i}] invalid URL: '{url}'"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 9. CROSS-SECTION CONSISTENCY
# ═══════════════════════════════════════════════════════════════════════════

class TestCrossSectionConsistency:
    """Bio, timeline, and contributions should reference each other."""

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_mentions_at_least_one_contribution(self, profile):
        """Bio should reference at least one key contribution by name."""
        bio = profile.get("bio", "").lower()
        contribs = profile.get("key_contributions", [])
        if not contribs:
            pytest.skip(f"{profile['slug']} has no contributions")

        matches = 0
        for c in contribs:
            title = c.get("title", "").lower()
            words = [w for w in re.split(r"[\s\-/&]+", title) if len(w) >= 4]
            if any(w in bio for w in words):
                matches += 1
        assert matches >= 1, (
            f"{profile['slug']} bio doesn't mention any contribution: "
            f"{[c.get('title') for c in contribs]}"
        )

    @pytest.mark.parametrize("profile", _load_profiles(), ids=_pid)
    def test_bio_aligns_with_topics(self, profile):
        """Bio should mention at least one listed topic."""
        bio = profile.get("bio", "").lower()
        topics = profile.get("topics", [])
        if not topics:
            pytest.skip(f"{profile['slug']} has no topics")

        matches = sum(
            1 for t in topics
            if any(word in bio for word in t.lower().split() if len(word) > 3)
        )
        assert matches >= 1, (
            f"{profile['slug']} bio has no overlap with topics: {topics}"
        )
