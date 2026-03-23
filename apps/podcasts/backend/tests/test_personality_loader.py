"""Tests for personality loading functions: _parse_ts and load_personalities."""

from pathlib import Path

import pytest

from research_pipeline import _parse_ts, load_personalities

PERSONALITIES_DIR = Path(__file__).resolve().parent.parent.parent / "personalities"


# ── _parse_ts unit tests ─────────────────────────────────────────────────


class TestParseTs:
    """Unit tests for _parse_ts against a known personality file."""

    @pytest.fixture()
    def harrison(self) -> dict[str, str]:
        return _parse_ts(PERSONALITIES_DIR / "harrison-chase.ts")

    def test_extracts_name(self, harrison: dict[str, str]) -> None:
        assert harrison["name"] == "Harrison Chase"

    def test_extracts_role(self, harrison: dict[str, str]) -> None:
        assert harrison["role"] == "CEO"

    def test_extracts_org(self, harrison: dict[str, str]) -> None:
        assert harrison["org"] == "LangChain"

    def test_extracts_github(self, harrison: dict[str, str]) -> None:
        assert harrison["github"] == "hwchase17"

    def test_extracts_slug_from_filename(self, harrison: dict[str, str]) -> None:
        assert harrison["slug"] == "harrison-chase"

    def test_missing_optional_field_orcid(self, harrison: dict[str, str]) -> None:
        """harrison-chase.ts has no orcid field; key should be absent."""
        assert "orcid" not in harrison

    def test_present_optional_field_orcid(self) -> None:
        """athos-georgiou.ts has an orcid field; it should be extracted."""
        result = _parse_ts(PERSONALITIES_DIR / "athos-georgiou.ts")
        assert result.get("orcid") == "0009-0004-3081-2883"

    def test_missing_optional_field_github(self) -> None:
        """geoffrey-hinton.ts has no github field; key should be absent."""
        result = _parse_ts(PERSONALITIES_DIR / "geoffrey-hinton.ts")
        assert "github" not in result

    def test_slug_always_set(self) -> None:
        """Every parsed file should have a slug derived from the filename."""
        for ts in PERSONALITIES_DIR.glob("*.ts"):
            result = _parse_ts(ts)
            assert "slug" in result
            assert result["slug"] == ts.stem


# ── load_personalities integration tests ─────────────────────────────────


class TestLoadPersonalities:
    """Integration tests for load_personalities against the real directory."""

    @pytest.fixture()
    def people(self) -> list[dict[str, str]]:
        return load_personalities()

    def test_returns_non_empty_list(self, people: list[dict[str, str]]) -> None:
        assert len(people) > 0

    def test_all_have_name(self, people: list[dict[str, str]]) -> None:
        for p in people:
            assert "name" in p and p["name"], f"Missing name for slug={p.get('slug')}"

    def test_all_have_slug(self, people: list[dict[str, str]]) -> None:
        for p in people:
            assert "slug" in p and p["slug"], f"Missing slug for {p.get('name')}"

    def test_no_duplicate_slugs(self, people: list[dict[str, str]]) -> None:
        slugs = [p["slug"] for p in people]
        assert len(slugs) == len(set(slugs)), f"Duplicate slugs: {[s for s in slugs if slugs.count(s) > 1]}"

    def test_slug_matches_filename(
        self, people: list[dict[str, str]], all_personality_slugs: list[str]
    ) -> None:
        """Every loaded slug must correspond to an actual .ts filename stem."""
        for p in people:
            assert p["slug"] in all_personality_slugs, (
                f"Slug '{p['slug']}' does not match any .ts file"
            )

    def test_loaded_count_matches_ts_files(
        self, people: list[dict[str, str]], all_personality_slugs: list[str]
    ) -> None:
        """load_personalities should return one entry per .ts file that has a name."""
        assert len(people) == len(all_personality_slugs)
