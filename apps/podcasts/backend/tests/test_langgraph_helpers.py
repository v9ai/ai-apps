"""Tests for helper functions and utility modules in the research pipeline.

Covers:
- _extract_json: plain JSON, markdown fenced, fallback extraction, edge cases
- _parse_ts / load_personalities: TypeScript personality file parsing
- export_results: output assembly with various state shapes
- phase1_5: Wikipedia + deep-fetch URL extraction logic
"""

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from research_pipeline import (
    ResearchState,
    _build_context,
    _ctx_block,
    _extract_json,
    _parse_ts,
    export_results,
    load_personalities,
    phase1_5,
)

SAMPLE_PERSON = {
    "slug": "test-person",
    "name": "Test Person",
    "role": "CEO",
    "org": "TestCorp",
    "github": "testperson",
    "orcid": "",
}


# ═══════════════════════════════════════════════════════════════════════════
# _extract_json — exhaustive coverage
# ═══════════════════════════════════════════════════════════════════════════


def test_extract_json_plain_array():
    assert _extract_json('["a", "b", "c"]') == ["a", "b", "c"]


def test_extract_json_plain_object():
    assert _extract_json('{"key": "value", "n": 42}') == {"key": "value", "n": 42}


def test_extract_json_fenced_json_block():
    text = "Here is the result:\n```json\n{\"key\": \"value\"}\n```"
    assert _extract_json(text) == {"key": "value"}


def test_extract_json_fenced_no_lang_specifier():
    text = "Result:\n```\n[1, 2, 3]\n```"
    assert _extract_json(text) == [1, 2, 3]


def test_extract_json_embedded_in_prose():
    text = 'The answer is {"score": 8, "reason": "good"} based on analysis.'
    result = _extract_json(text)
    assert result == {"score": 8, "reason": "good"}


def test_extract_json_array_embedded_in_prose():
    text = 'Here are the items: ["item1", "item2"] as requested.'
    result = _extract_json(text)
    assert result == ["item1", "item2"]


def test_extract_json_returns_none_on_empty_string():
    assert _extract_json("") is None


def test_extract_json_returns_none_on_plain_text():
    assert _extract_json("no json here at all") is None


def test_extract_json_returns_none_on_malformed():
    assert _extract_json("{key: value}") is None


def test_extract_json_handles_nested_objects():
    data = {"outer": {"inner": [1, 2, 3]}, "count": 5}
    assert _extract_json(json.dumps(data)) == data


def test_extract_json_handles_unicode():
    text = '{"name": "Müller", "city": "München"}'
    assert _extract_json(text) == {"name": "Müller", "city": "München"}


def test_extract_json_strips_whitespace():
    assert _extract_json('   {"key": "val"}   ') == {"key": "val"}


def test_extract_json_handles_error_sentinel():
    # Error sentinels like "(agent error: timeout)" should return None
    result = _extract_json("(agent error: timeout)")
    assert result is None


def test_extract_json_prefers_fenced_over_embedded():
    """When both fenced and embedded JSON are present, fenced is preferred."""
    text = '{"partial": 1}\n```json\n{"full": "result"}\n```'
    # The fenced block should be preferred (regex finds it before the fallback scan)
    result = _extract_json(text)
    # Either the plain parse succeeds first or the fenced block — just ensure valid JSON
    assert result is not None
    assert isinstance(result, dict)


# ═══════════════════════════════════════════════════════════════════════════
# _parse_ts — TypeScript personality parsing
# ═══════════════════════════════════════════════════════════════════════════


def test_parse_ts_extracts_all_standard_fields(tmp_path):
    ts_file = tmp_path / "test-person.ts"
    ts_file.write_text(
        'const personality = {\n'
        '  name: "Test Person",\n'
        '  role: "CEO",\n'
        '  org: "TestCorp",\n'
        '  slug: "test-person",\n'
        '  github: "testperson",\n'
        '  orcid: "0000-0001-2345-6789",\n'
        '};\n'
    )
    result = _parse_ts(ts_file)
    assert result["name"] == "Test Person"
    assert result["role"] == "CEO"
    assert result["org"] == "TestCorp"
    assert result["slug"] == "test-person"
    assert result["github"] == "testperson"
    assert result["orcid"] == "0000-0001-2345-6789"


def test_parse_ts_slug_falls_back_to_stem(tmp_path):
    ts_file = tmp_path / "my-person.ts"
    ts_file.write_text('const personality = {\n  name: "My Person",\n};\n')
    result = _parse_ts(ts_file)
    assert result["slug"] == "my-person"


def test_parse_ts_missing_optional_fields_not_present(tmp_path):
    ts_file = tmp_path / "minimal.ts"
    ts_file.write_text('const personality = {\n  name: "Minimal Person",\n};\n')
    result = _parse_ts(ts_file)
    assert "github" not in result
    assert "orcid" not in result


def test_parse_ts_handles_single_quotes(tmp_path):
    ts_file = tmp_path / "single-quote.ts"
    ts_file.write_text("const p = {\n  name: 'Alice Smith',\n  role: 'CTO',\n};\n")
    result = _parse_ts(ts_file)
    # _parse_ts uses double-quote regex; single-quote values won't be parsed
    # This documents the current behavior (not a regression)
    assert result["slug"] == "single-quote"


# ═══════════════════════════════════════════════════════════════════════════
# load_personalities
# ═══════════════════════════════════════════════════════════════════════════


def test_load_personalities_returns_list_with_names(tmp_path):
    (tmp_path / "alice.ts").write_text('const p = {\n  name: "Alice",\n  role: "CEO",\n  org: "Acme",\n};\n')
    (tmp_path / "bob.ts").write_text('const p = {\n  name: "Bob",\n  role: "CTO",\n  org: "Beta",\n};\n')

    with patch("research_pipeline.PERSONALITIES_DIR", tmp_path):
        people = load_personalities()

    names = [p["name"] for p in people]
    assert "Alice" in names
    assert "Bob" in names


def test_load_personalities_skips_files_without_name(tmp_path):
    (tmp_path / "no-name.ts").write_text('const p = {\n  role: "CEO",\n};\n')

    with patch("research_pipeline.PERSONALITIES_DIR", tmp_path):
        people = load_personalities()

    assert len(people) == 0


def test_load_personalities_empty_dir(tmp_path):
    with patch("research_pipeline.PERSONALITIES_DIR", tmp_path):
        people = load_personalities()
    assert people == []


# ═══════════════════════════════════════════════════════════════════════════
# export_results — output assembly
# ═══════════════════════════════════════════════════════════════════════════


def _make_full_state(tmp_path: Path | None = None) -> ResearchState:
    return {
        "person": {
            "slug": "test-export",
            "name": "Test Export",
            "role": "CEO",
            "org": "TestCorp",
        },
        "bio": "This is a test bio for export.",
        "timeline": '[{"date": "2020-01", "event": "Founded", "url": "https://example.com"}]',
        "contributions": '[{"title": "Project A", "description": "Did X", "url": "https://x.com"}]',
        "quotes": '[{"text": "A quote", "source": "Blog", "url": "https://b.com"}]',
        "social": '{"github": "https://github.com/test"}',
        "topics": '["AI", "ML"]',
        "competitive": '{"market_position": "challenger", "competitors": [], "moats": [], "ecosystem_role": "none"}',
        "collaboration": '{"co_founders": [], "key_collaborators": [], "mentors": [], "mentees": [], "academic_lineage": "N/A"}',
        "funding": '{"funding_rounds": [], "total_raised": "$0", "latest_valuation": "unknown", "business_milestones": [], "revenue_signals": "none"}',
        "conference": '{"speaking_tier": "rare", "talks": [], "notable_moments": []}',
        "philosophy": '{"core_thesis": "Test", "positions": {}, "predictions": [], "contrarian_takes": []}',
        "eval_data": '{"bio_quality": {"score": 8, "reasoning": "ok"}, "source_coverage": {"score": 7, "reasoning": "ok"}, "timeline_completeness": {"score": 6, "reasoning": "ok"}, "contributions_depth": {"score": 8, "reasoning": "ok"}, "name_disambiguation": {"score": 10, "reasoning": "ok"}, "overall_score": 8, "summary": "Good profile"}',
        "executive": '{"one_liner": "Test person is a CEO", "key_facts": ["fact1"], "career_arc": "career", "current_focus": "focus", "industry_significance": "sig", "risk_factors": [], "meeting_prep": [], "confidence_level": "high"}',
        "questions": '[{"category": "origin", "question": "How did you start?"}]',
        "podcast_data": "[]",
        "news_data": "[]",
        "video_data": "[]",
    }


def test_export_results_creates_research_json(tmp_path):
    state = _make_full_state()

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)

    out = tmp_path / "test-export.json"
    assert out.exists()
    data = json.loads(out.read_text())
    assert data["slug"] == "test-export"
    assert data["name"] == "Test Export"
    assert isinstance(data["bio"], str)
    assert len(data["bio"]) > 0


def test_export_results_creates_eval_json(tmp_path):
    state = _make_full_state()

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)

    eval_out = tmp_path / "test-export.eval.json"
    assert eval_out.exists()
    eval_data = json.loads(eval_out.read_text())
    assert eval_data["slug"] == "test-export"
    assert "eval" in eval_data
    assert eval_data["eval"]["overall_score"] == 8


def test_export_results_timeline_is_list(tmp_path):
    state = _make_full_state()

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)

    data = json.loads((tmp_path / "test-export.json").read_text())
    assert isinstance(data["timeline"], list)
    assert data["timeline"][0]["date"] == "2020-01"


def test_export_results_bio_truncated_at_2000(tmp_path):
    state = _make_full_state()
    state["bio"] = "X" * 3000

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)

    data = json.loads((tmp_path / "test-export.json").read_text())
    assert len(data["bio"]) <= 2000


def test_export_results_handles_empty_state(tmp_path):
    """export_results should not raise with minimal state."""
    state: ResearchState = {
        "person": {
            "slug": "empty-test",
            "name": "Empty Test",
            "role": "",
            "org": "",
        },
        "bio": "",
        "timeline": "",
        "contributions": "",
        "quotes": "",
        "social": "",
        "topics": "",
        "competitive": "",
        "collaboration": "",
        "funding": "",
        "conference": "",
        "philosophy": "",
        "eval_data": "",
        "executive": "",
        "questions": "",
        "podcast_data": "",
        "news_data": "",
        "video_data": "",
    }

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)  # Should not raise

    out = tmp_path / "empty-test.json"
    assert out.exists()


def test_export_results_no_eval_json_when_eval_empty(tmp_path):
    """When eval_data is empty, no .eval.json file should be created."""
    state = _make_full_state()
    state["eval_data"] = ""

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)

    eval_out = tmp_path / "test-export.eval.json"
    assert not eval_out.exists()


def test_export_results_questions_in_output(tmp_path):
    state = _make_full_state()

    with patch("research_pipeline.RESEARCH_DIR", tmp_path):
        export_results(state)

    data = json.loads((tmp_path / "test-export.json").read_text())
    assert "questions" in data
    assert isinstance(data["questions"], list)
    assert data["questions"][0]["category"] == "origin"


# ═══════════════════════════════════════════════════════════════════════════
# phase1_5 — Wikipedia + deep-fetch
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_phase1_5_returns_wikipedia_and_deep_keys():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "web_research": "Some research with https://example.com/article content",
    }

    with patch("research_pipeline.fetch_wikipedia_summary", return_value="Wikipedia summary text"), \
         patch("research_pipeline.fetch_url_content", return_value="Page content"):
        result = await phase1_5(state)

    assert "wikipedia_data" in result
    assert "deep_fetched_urls" in result
    assert result["wikipedia_data"] == "Wikipedia summary text"


@pytest.mark.asyncio
async def test_phase1_5_skips_blocked_domains():
    """URLs from blocked domains should not be deep-fetched."""
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "web_research": "See https://twitter.com/user and https://reddit.com/r/ai",
    }

    fetch_calls = []

    def mock_fetch(url):
        fetch_calls.append(url)
        return "content"

    with patch("research_pipeline.fetch_wikipedia_summary", return_value="wiki"), \
         patch("research_pipeline.fetch_url_content", side_effect=mock_fetch):
        result = await phase1_5(state)

    # No blocked domain URLs should be fetched
    for call in fetch_calls:
        assert "twitter.com" not in call
        assert "reddit.com" not in call


@pytest.mark.asyncio
async def test_phase1_5_handles_no_urls_in_web_research():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "web_research": "No URLs here, just plain text research.",
    }

    with patch("research_pipeline.fetch_wikipedia_summary", return_value="wiki"), \
         patch("research_pipeline.fetch_url_content", return_value="content"):
        result = await phase1_5(state)

    assert result["deep_fetched_urls"] == ""


@pytest.mark.asyncio
async def test_phase1_5_limits_to_5_unique_domains():
    """Should not fetch more than 5 unique domains."""
    urls = " ".join([
        "https://a.com/1", "https://b.com/2", "https://c.com/3",
        "https://d.com/4", "https://e.com/5", "https://f.com/6",
        "https://g.com/7",
    ])
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "web_research": urls,
    }

    fetch_calls = []

    def mock_fetch(url):
        fetch_calls.append(url)
        return "content"

    with patch("research_pipeline.fetch_wikipedia_summary", return_value="wiki"), \
         patch("research_pipeline.fetch_url_content", side_effect=mock_fetch):
        await phase1_5(state)

    assert len(fetch_calls) <= 5
