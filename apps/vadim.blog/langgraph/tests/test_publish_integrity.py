"""Validate published output structural integrity — no LLM calls."""

from press.evals import validate_published_output
from press._fixtures import (
    CLEAN_ARTICLE,
    DOUBLE_FM_ARTICLE,
    FEW_LINKS_ARTICLE,
    GOOD_ARTICLE,
    NO_LINKS_ARTICLE,
    SLUG_TAGS_ARTICLE,
    WELL_LINKED_ARTICLE,
)


class TestPublishIntegrity:

    def test_clean_article_passes(self):
        issues = validate_published_output(CLEAN_ARTICLE)
        assert issues == [], f"Clean article should have no issues: {issues}"

    def test_double_frontmatter_detected(self):
        issues = validate_published_output(DOUBLE_FM_ARTICLE)
        assert any("double_frontmatter" in i for i in issues), (
            f"Should detect double frontmatter: {issues}"
        )

    def test_bad_description_detected(self):
        issues = validate_published_output(DOUBLE_FM_ARTICLE)
        assert any("bad_description" in i for i in issues), (
            f"Should detect '---' as bad description: {issues}"
        )

    def test_slug_word_tags_detected(self):
        issues = validate_published_output(SLUG_TAGS_ARTICLE)
        assert any("slug_word_tags" in i for i in issues), (
            f"Should detect slug-fragment tags: {issues}"
        )

    def test_missing_frontmatter_detected(self):
        issues = validate_published_output("# No frontmatter\n\nJust body.")
        assert any("missing_frontmatter" in i for i in issues)

    def test_no_inline_links_detected(self):
        issues = validate_published_output(NO_LINKS_ARTICLE)
        assert any("no_inline_links" in i for i in issues), (
            f"Should detect missing inline links: {issues}"
        )

    def test_few_inline_links_detected(self):
        issues = validate_published_output(FEW_LINKS_ARTICLE)
        assert any("few_inline_links" in i for i in issues), (
            f"Should detect too few inline links: {issues}"
        )

    def test_well_linked_article_passes_link_check(self):
        issues = validate_published_output(WELL_LINKED_ARTICLE)
        link_issues = [i for i in issues if "inline_links" in i]
        assert link_issues == [], f"Well-linked article should pass link checks: {link_issues}"

    def test_good_article_fixture_passes(self):
        issues = validate_published_output(GOOD_ARTICLE)
        assert issues == [], f"GOOD_ARTICLE fixture should pass: {issues}"
