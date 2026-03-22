"""Validate the test fixture content — no LLM calls."""

import re

from press import extract_seo_slug, strip_frontmatter
from press.evals import word_count
from press._fixtures import (
    GOOD_ARTICLE,
    BAD_ARTICLE,
    SAMPLE_RESEARCH_BRIEF,
    SAMPLE_SEO_STRATEGY,
    SAMPLE_SEO_DISCOVERY,
    SAMPLE_SEO_BLUEPRINT,
)


class TestGoldenSamples:

    def test_good_article_has_frontmatter(self):
        assert GOOD_ARTICLE.lstrip().startswith("---")

    def test_good_article_has_inline_links(self):
        assert re.search(r"\[.+?\]\(https?://", GOOD_ARTICLE), "Good article has no inline links"

    def test_good_article_has_h2_sections(self):
        h2s = re.findall(r"^##\s.+", GOOD_ARTICLE, re.MULTILINE)
        assert len(h2s) >= 4, f"Good article has only {len(h2s)} H2 sections"

    def test_good_article_word_count_in_range(self):
        body = strip_frontmatter(GOOD_ARTICLE)
        wc = word_count(body)
        assert 300 < wc < 3000, f"Good article word count {wc} out of expected range"

    def test_bad_article_has_no_links(self):
        links = re.findall(r"\[.+?\]\(https?://", BAD_ARTICLE)
        assert len(links) == 0, "Bad article should have no inline links (it's the negative fixture)"

    def test_bad_article_contains_filler_phrases(self):
        fillers = ["in today's", "as we all know", "it is worth noting", "in conclusion"]
        found = [f for f in fillers if f in BAD_ARTICLE.lower()]
        assert len(found) >= 2, f"Bad article should have filler phrases; found: {found}"

    def test_research_brief_has_key_facts(self):
        assert "## Key Facts" in SAMPLE_RESEARCH_BRIEF
        assert "Stanford" in SAMPLE_RESEARCH_BRIEF

    # ── Combined strategy (backwards-compat) ────────────────────────────────

    def test_seo_strategy_has_primary_keyword(self):
        assert "remote work productivity" in SAMPLE_SEO_STRATEGY.lower()

    def test_seo_strategy_has_url_slug(self):
        assert "URL Slug" in SAMPLE_SEO_STRATEGY

    def test_seo_strategy_url_slug_is_extractable(self):
        slug = extract_seo_slug(SAMPLE_SEO_STRATEGY)
        assert slug is not None, "extract_seo_slug returned None for SAMPLE_SEO_STRATEGY"
        assert "remote-work-productivity" in slug

    # ── Discovery fixture ────────────────────────────────────────────────────

    def test_seo_discovery_has_keywords_table(self):
        assert "## Target Keywords" in SAMPLE_SEO_DISCOVERY

    def test_seo_discovery_has_serp_features(self):
        assert "## SERP Features" in SAMPLE_SEO_DISCOVERY

    def test_seo_discovery_has_semantic_clusters(self):
        assert "Semantic Topic Clusters" in SAMPLE_SEO_DISCOVERY

    def test_seo_discovery_has_differentiation(self):
        assert "Content Differentiation" in SAMPLE_SEO_DISCOVERY

    def test_seo_discovery_no_url_slug(self):
        """Discovery output should NOT contain structural blueprint fields."""
        assert "URL Slug" not in SAMPLE_SEO_DISCOVERY
        assert "Title tag" not in SAMPLE_SEO_DISCOVERY

    # ── Blueprint fixture ────────────────────────────────────────────────────

    def test_seo_blueprint_has_url_slug(self):
        assert "URL Slug" in SAMPLE_SEO_BLUEPRINT

    def test_seo_blueprint_slug_is_extractable(self):
        slug = extract_seo_slug(SAMPLE_SEO_BLUEPRINT)
        assert slug is not None
        assert "remote-work-productivity" in slug

    def test_seo_blueprint_has_faq_section(self):
        assert "## FAQ" in SAMPLE_SEO_BLUEPRINT

    def test_seo_blueprint_has_social_metadata(self):
        assert "og:title" in SAMPLE_SEO_BLUEPRINT

    def test_seo_blueprint_has_eeat_section(self):
        assert "E-E-A-T" in SAMPLE_SEO_BLUEPRINT

    def test_seo_blueprint_title_tag_within_60_chars(self):
        m = re.search(r'\*\*Title tag[^*]*\*\*[^"]*"([^"]+)"', SAMPLE_SEO_BLUEPRINT)
        assert m is not None, "No title tag found in SAMPLE_SEO_BLUEPRINT"
        assert len(m.group(1)) <= 60, (
            f"Title tag '{m.group(1)}' is {len(m.group(1))} chars — must be <=60"
        )

    def test_seo_blueprint_meta_description_length(self):
        m = re.search(r'\*\*Meta description[^*]*\*\*[^"]*"([^"]+)"', SAMPLE_SEO_BLUEPRINT)
        assert m is not None, "No meta description found in SAMPLE_SEO_BLUEPRINT"
        length = len(m.group(1))
        assert 140 <= length <= 165, (
            f"Meta description is {length} chars — target 150-160"
        )

    def test_seo_blueprint_no_keywords_table(self):
        """Blueprint should NOT contain discovery-phase keyword tables."""
        assert "## Target Keywords" not in SAMPLE_SEO_BLUEPRINT
        assert "## Search Intent" not in SAMPLE_SEO_BLUEPRINT
