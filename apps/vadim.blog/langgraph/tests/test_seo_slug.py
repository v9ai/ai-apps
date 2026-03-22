"""Tests for SEO slug utilities — no LLM calls."""

from press import extract_seo_slug, slugify_seo


class TestSeoSlugHelpers:

    def test_extract_seo_slug_basic(self):
        strategy = "- **URL Slug**: remote-work-productivity-data \u2014 4 words"
        assert extract_seo_slug(strategy) == "remote-work-productivity-data"

    def test_extract_seo_slug_with_backticks(self):
        strategy = "- **URL Slug**: `langgraph-agent-patterns` \u2014 primary keyword"
        assert extract_seo_slug(strategy) == "langgraph-agent-patterns"

    def test_extract_seo_slug_returns_none_when_absent(self):
        assert extract_seo_slug("No slug here") is None

    def test_extract_seo_slug_lowercase(self):
        strategy = "- **URL Slug**: Remote-Work-Guide"
        slug = extract_seo_slug(strategy)
        assert slug is not None
        assert slug == slug.lower()

    def test_slugify_seo_strips_stop_words(self):
        slug = slugify_seo("How to Build an AI Agent with LangGraph")
        assert "the" not in slug.split("-")
        assert "an" not in slug.split("-")
        assert "with" not in slug.split("-")
        assert "to" not in slug.split("-")
        assert "langgraph" in slug

    def test_slugify_seo_respects_max_words(self):
        slug = slugify_seo("Remote Work Productivity Data Senior Engineers Study Results", max_words=4)
        assert len(slug.split("-")) <= 4

    def test_slugify_seo_fallback_on_all_stop_words(self):
        result = slugify_seo("a the and or")
        assert result  # not empty
