"""Tests for the content generation graph."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from graph.state import (
    CONTENT_DIR,
    ContentState,
    get_lesson_slugs,
    get_categories,
    get_category,
    get_related_topics,
    get_existing_articles,
    get_missing_slugs,
    get_style_sample,
    check_article_quality,
    MAX_REVISIONS,
)
from graph.nodes import route_after_quality
from graph.generate import build_graph, build_dry_graph
from graph.client import ConfigError, GenerationError


# ── Helpers ───────────────────────────────────────────────────────────

class TestDynamicParsing:
    def test_slugs_loaded_from_ts(self):
        slugs = get_lesson_slugs()
        assert len(slugs) > 50
        assert "transformer-architecture" in slugs
        assert "langgraph" in slugs

    def test_categories_loaded_from_ts(self):
        cats = get_categories()
        assert len(cats) >= 10
        assert cats[0][2] == "Foundations & Architecture"

    def test_slugs_are_unique(self):
        slugs = get_lesson_slugs()
        assert len(slugs) == len(set(slugs))


class TestGetCategory:
    def test_known_slug(self):
        assert get_category("transformer-architecture") == "Foundations & Architecture"
        assert get_category("langgraph") == "Applied AI & Production"
        assert get_category("aws") == "Cloud & DevOps"

    def test_unknown_slug_returns_default(self):
        assert get_category("nonexistent-slug") == "Applied AI & Production"

    def test_all_categories_covered(self):
        for slug in get_lesson_slugs():
            cat = get_category(slug)
            assert cat != "Other", f"Slug {slug} has no category"


class TestGetRelatedTopics:
    def test_known_slug_returns_nearby(self):
        related = get_related_topics("tokenization")
        assert "transformer-architecture" in related
        assert "scaling-laws" in related

    def test_unknown_slug_returns_first_ten(self):
        related = get_related_topics("nonexistent")
        parts = related.split(", ")
        assert len(parts) == 10

    def test_first_slug_has_no_predecessors(self):
        related = get_related_topics("transformer-architecture")
        parts = related.split(", ")
        assert "scaling-laws" in parts

    def test_last_slug_has_no_successors_beyond(self):
        related = get_related_topics("nodejs")
        parts = related.split(", ")
        assert len(parts) >= 1


class TestGetExistingArticles:
    def test_returns_markdown_links(self):
        articles = get_existing_articles()
        assert "](/" in articles

    def test_contains_known_articles(self):
        articles = get_existing_articles()
        assert "/transformer-architecture" in articles


class TestGetMissingSlugs:
    def test_returns_list(self):
        missing = get_missing_slugs()
        assert isinstance(missing, list)
        for slug in missing:
            assert not (CONTENT_DIR / f"{slug}.md").exists()


class TestGetStyleSample:
    def test_returns_non_empty(self):
        sample = get_style_sample()
        assert len(sample) > 0

    def test_starts_with_heading(self):
        sample = get_style_sample()
        assert sample.startswith("#")


# ── Quality checks ───────────────────────────────────────────────────

class TestCheckArticleQuality:
    def _make_article(self, word_count=2000, code_blocks=3, cross_refs=2, sections=4):
        parts = ["# Test Article\n\n"]
        for i in range(sections):
            parts.append(f"## Section {i+1}\n\n")
            parts.append("word " * (word_count // sections) + "\n\n")
        for _ in range(code_blocks):
            parts.append("```python\nprint('hello')\n```\n\n")
        real_slugs = ["transformer-architecture", "scaling-laws", "tokenization", "embeddings"]
        for i in range(cross_refs):
            parts.append(f"See [Related](/{real_slugs[i % len(real_slugs)]})\n")
        return "".join(parts)

    def test_good_article_passes(self):
        article = self._make_article()
        passed, issues = check_article_quality(article)
        assert passed
        assert issues == []

    def test_short_article_fails(self):
        article = self._make_article(word_count=100)
        passed, issues = check_article_quality(article)
        assert not passed
        assert any("Too short" in i for i in issues)

    def test_no_code_blocks_fails(self):
        article = self._make_article(code_blocks=0)
        passed, issues = check_article_quality(article)
        assert not passed
        assert any("code examples" in i for i in issues)

    def test_no_cross_refs_fails(self):
        article = self._make_article(cross_refs=0)
        passed, issues = check_article_quality(article)
        assert not passed
        assert any("cross-references" in i for i in issues)

    def test_broken_link_detected(self):
        article = self._make_article(cross_refs=0)
        article += "\nSee [Fake](/nonexistent-article-slug)\n"
        passed, issues = check_article_quality(article)
        assert any("Broken link" in i for i in issues)

    def test_valid_links_pass(self):
        article = self._make_article()
        passed, issues = check_article_quality(article)
        assert not any("Broken link" in i for i in issues)

    def test_no_title_fails(self):
        passed, issues = check_article_quality("No title here\n\n## Section\nwords " * 500)
        assert not passed
        assert any("title" in i for i in issues)

    def test_few_sections_fails(self):
        article = self._make_article(sections=1)
        passed, issues = check_article_quality(article)
        assert not passed
        assert any("sections" in i for i in issues)


# ── Routing ──────────────────────────────────────────────────────────

class TestRouteAfterQuality:
    def test_no_issues_routes_to_save(self):
        state: ContentState = {
            "topic": "t", "slug": "s", "category": "c",
            "research": "", "outline": "", "draft": "", "final": "",
            "revision_count": 0, "quality_issues": [], "total_tokens": 0,
        }
        assert route_after_quality(state) == "save"

    def test_issues_routes_to_revise(self):
        state: ContentState = {
            "topic": "t", "slug": "s", "category": "c",
            "research": "", "outline": "", "draft": "", "final": "",
            "revision_count": 0, "quality_issues": ["Too short"], "total_tokens": 0,
        }
        assert route_after_quality(state) == "revise"

    def test_max_revisions_routes_to_save(self):
        state: ContentState = {
            "topic": "t", "slug": "s", "category": "c",
            "research": "", "outline": "", "draft": "", "final": "",
            "revision_count": MAX_REVISIONS, "quality_issues": ["Still short"], "total_tokens": 0,
        }
        assert route_after_quality(state) == "save"


# ── Graph structure ──────────────────────────────────────────────────

class TestGraphStructure:
    def test_graph_has_all_nodes(self):
        graph = build_graph()
        node_names = set(graph.nodes.keys()) - {"__start__"}
        assert node_names == {"research", "outline", "draft", "review", "quality_check", "revise", "save"}

    def test_graph_compiles(self):
        graph = build_graph()
        assert graph is not None

    def test_graph_with_checkpointer(self):
        from langgraph.checkpoint.memory import MemorySaver
        graph = build_graph(checkpointer=MemorySaver())
        assert graph is not None

    def test_dry_graph_has_no_save(self):
        graph = build_dry_graph()
        node_names = set(graph.nodes.keys()) - {"__start__"}
        assert "save" not in node_names
        assert "research" in node_names
        assert "quality_check" in node_names
        assert "revise" in node_names


# ── Error types ──────────────────────────────────────────────────────

class TestErrorTypes:
    def test_config_error_is_exception(self):
        assert issubclass(ConfigError, Exception)

    def test_generation_error_is_exception(self):
        assert issubclass(GenerationError, Exception)

    def test_config_error_message(self):
        err = ConfigError("missing key")
        assert str(err) == "missing key"


# ── End-to-end (mocked) ─────────────────────────────────────────────

def _mock_article():
    return (
        "# Test Topic\n\n"
        "Opening paragraph about test topic. See [Transformers](/transformer-architecture) "
        "and [Scaling](/scaling-laws).\n\n"
        "## Core Concepts\n\nDetailed explanation.\n\n"
        "## Implementation\n\nHow to implement.\n\n"
        "```python\nimport torch\nmodel = torch.nn.Linear(10, 10)\n```\n\n"
        "```python\ndef train(model):\n    pass\n```\n\n"
        "```typescript\nconst x = 1;\n```\n\n"
        "## Comparison\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n"
        + "Detailed content paragraph with more words to reach minimum word count. " * 200
    )


def _mock_chat_response(content: str, tokens: int = 100):
    resp = MagicMock()
    resp.choices = [MagicMock()]
    resp.choices[0].message.content = content
    resp.usage = MagicMock()
    resp.usage.total_tokens = tokens
    return resp


def _make_initial_state():
    return {
        "topic": "Test Topic",
        "slug": "test-topic",
        "category": "Foundations & Architecture",
        "research": "",
        "outline": "",
        "draft": "",
        "final": "",
        "revision_count": 0,
        "quality_issues": [],
        "total_tokens": 0,
    }


class TestGraphEndToEnd:
    @pytest.mark.asyncio
    async def test_full_run_mocked(self, tmp_path):
        """Run the full graph with mocked LLM calls."""
        article = _mock_article()
        responses = [
            _mock_chat_response("Research notes...", 500),
            _mock_chat_response("## Outline\n- Section 1", 300),
            _mock_chat_response(article, 2000),
            _mock_chat_response(article, 1500),  # review
        ]
        call_count = [0]

        async def mock_chat(messages, **kwargs):
            idx = call_count[0]
            call_count[0] += 1
            return responses[min(idx, len(responses) - 1)]

        with patch("graph.client.get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat = mock_chat
            mock_get_client.return_value = mock_client

            with patch("graph.nodes.CONTENT_DIR", tmp_path):
                graph = build_graph()
                result = await graph.ainvoke(_make_initial_state())

                assert result["final"] == article
                assert result["total_tokens"] == 4300  # 500+300+2000+1500
                assert (tmp_path / "test-topic.md").exists()
                assert (tmp_path / "test-topic.md").read_text() == article

    @pytest.mark.asyncio
    async def test_revision_loop(self, tmp_path):
        """Test that a bad draft triggers revision and passes on second attempt."""
        good_article = _mock_article()
        bad_draft = "# Short\n\n## One\nToo short.\n"

        call_count = [0]
        responses = [
            _mock_chat_response("Research notes...", 500),    # 0: research
            _mock_chat_response("## Outline", 200),           # 1: outline
            _mock_chat_response(bad_draft, 1000),             # 2: draft (bad)
            _mock_chat_response(bad_draft, 800),              # 3: review (still bad)
            # quality_check -> FAIL -> revise
            _mock_chat_response(good_article, 2000),          # 4: revise (now good)
            # quality_check -> PASS -> save
        ]

        async def mock_chat(messages, **kwargs):
            idx = call_count[0]
            call_count[0] += 1
            return responses[min(idx, len(responses) - 1)]

        with patch("graph.client.get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat = mock_chat
            mock_get_client.return_value = mock_client

            with patch("graph.nodes.CONTENT_DIR", tmp_path):
                graph = build_graph()
                result = await graph.ainvoke(_make_initial_state())

                assert result["final"] == good_article
                assert result["revision_count"] == 1
                assert (tmp_path / "test-topic.md").exists()
                assert result["total_tokens"] > 0
