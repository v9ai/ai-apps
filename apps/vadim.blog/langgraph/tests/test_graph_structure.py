"""Graph structure tests — verify nodes, edges, and routing without running LLM calls."""

from unittest.mock import AsyncMock

from press.graphs.article import build_article_graph, _is_deep_dive, _topic_or_title
from press.graphs.counter_article import build_counter_article_graph, _counter_queries
from press.graphs.blog import build_blog_graph
from press.graphs.review import build_review_graph
from press.graphs.main import build_main_graph


def _mock_pool():
    pool = AsyncMock()
    pool.for_role.return_value = AsyncMock()
    return pool


# ── Article helpers ───────────────────────────────────────────────────────────


class TestArticleHelpers:

    def test_is_deep_dive_with_input_file(self):
        assert _is_deep_dive({"input_file": "source.md"}) is True

    def test_is_deep_dive_with_source_content(self):
        assert _is_deep_dive({"source_content": "text"}) is True

    def test_is_not_deep_dive(self):
        assert _is_deep_dive({"topic": "some topic"}) is False

    def test_is_not_deep_dive_empty(self):
        assert _is_deep_dive({}) is False

    def test_topic_or_title_prefers_title(self):
        assert _topic_or_title({"title": "T", "topic": "X"}) == "T"

    def test_topic_or_title_falls_back(self):
        assert _topic_or_title({"topic": "X"}) == "X"

    def test_topic_or_title_empty(self):
        assert _topic_or_title({}) == ""


# ── Counter queries ───────────────────────────────────────────────────────────


class TestCounterQueries:

    def test_generates_three_queries(self):
        queries = _counter_queries("AI safety")
        assert len(queries) == 3

    def test_all_contain_topic(self):
        queries = _counter_queries("remote work")
        for q in queries:
            assert "remote work" in q

    def test_includes_research_variant(self):
        queries = _counter_queries("deep learning")
        assert any("empirical research" in q for q in queries)


# ── Graph structure: article ─────────────────────────────────────────────────


class TestArticleGraphStructure:

    def test_compiles(self):
        graph = build_article_graph(_mock_pool())
        assert graph is not None

    def test_has_expected_nodes(self):
        graph = build_article_graph(_mock_pool())
        node_names = set(graph.get_graph().nodes.keys())
        expected = {
            "__start__", "__end__",
            "read_source", "research_and_seo", "write",
            "check_references", "edit", "revise",
            "linkedin_approved", "linkedin_final",
            "publish", "save_final",
        }
        assert expected.issubset(node_names), f"Missing: {expected - node_names}"


# ── Graph structure: counter ─────────────────────────────────────────────────


class TestCounterGraphStructure:

    def test_compiles(self):
        graph = build_counter_article_graph(_mock_pool())
        assert graph is not None

    def test_has_expected_nodes(self):
        graph = build_counter_article_graph(_mock_pool())
        node_names = set(graph.get_graph().nodes.keys())
        expected = {
            "__start__", "__end__",
            "fetch_source", "research_and_seo", "write",
            "check_references", "edit", "revise",
            "linkedin_approved", "linkedin_final",
            "publish", "save_final",
        }
        assert expected.issubset(node_names), f"Missing: {expected - node_names}"


# ── Graph structure: blog ─────────────────────────────────────────────────────


class TestBlogGraphStructure:

    def test_compiles(self):
        graph = build_blog_graph(_mock_pool())
        assert graph is not None

    def test_has_expected_nodes(self):
        graph = build_blog_graph(_mock_pool())
        node_names = set(graph.get_graph().nodes.keys())
        expected = {"__start__", "__end__", "scout", "pick", "process_topics"}
        assert expected.issubset(node_names), f"Missing: {expected - node_names}"


# ── Graph structure: review ───────────────────────────────────────────────────


class TestReviewGraphStructure:

    def test_compiles(self):
        graph = build_review_graph(_mock_pool())
        assert graph is not None

    def test_has_expected_nodes(self):
        graph = build_review_graph(_mock_pool())
        node_names = set(graph.get_graph().nodes.keys())
        expected = {
            "__start__", "__end__",
            "read_files", "check_references",
            "score_publication_fit", "run_evals",
            "editorial_review", "synthesize_report",
        }
        assert expected.issubset(node_names), f"Missing: {expected - node_names}"

    def test_parallel_fan_out_after_check_references(self):
        """check_references should fan out to both score_publication_fit and run_evals."""
        graph = build_review_graph(_mock_pool())
        drawn = graph.get_graph()
        check_ref_edges = [
            e for e in drawn.edges
            if e.source == "check_references"
        ]
        targets = {e.target for e in check_ref_edges}
        assert "score_publication_fit" in targets
        assert "run_evals" in targets


# ── Graph structure: main orchestrator ────────────────────────────────────────


class TestMainGraphStructure:

    def test_compiles(self):
        graph = build_main_graph(_mock_pool())
        assert graph is not None

    def test_has_pipeline_nodes(self):
        graph = build_main_graph(_mock_pool())
        node_names = set(graph.get_graph().nodes.keys())
        for pipeline in ("blog", "article", "counter", "review"):
            assert pipeline in node_names, f"Missing pipeline node: {pipeline}"
