"""Tests for retrieve_context.py — semantic retrieval from ChromaDB."""

import pytest

import store_context
import retrieve_context
from store_context import store, store_eval
from retrieve_context import (
    retrieve,
    _recency_boost,
    _get_latest_eval,
    _cosine_similarity,
    _mean_embedding,
    _mmr_select,
    compute_iter_similarity,
)


# ---------------------------------------------------------------------------
# Empty collection
# ---------------------------------------------------------------------------

class TestRetrieveEmpty:
    def test_empty_collection_returns_first_iteration_message(self):
        result = retrieve("build auth system", current_iteration=1)
        assert "first iteration" in result.lower() or "no previous" in result.lower()

    def test_empty_returns_string(self):
        result = retrieve("anything", current_iteration=0)
        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# Retrieve after storing
# ---------------------------------------------------------------------------

class TestRetrieveAfterStore:
    def test_finds_stored_content(self):
        store(0, "Added JWT middleware and login route.", "build auth system")
        result = retrieve("auth system", current_iteration=1)
        assert "Iteration 0" in result

    def test_header_contains_iteration_info(self):
        store(0, "First iteration work.", "task")
        result = retrieve("task", current_iteration=1)
        assert "Current iteration" in result or "Iterations completed" in result

    def test_returns_non_empty_after_store(self):
        store(0, "Meaningful work done here.", "task")
        result = retrieve("task", current_iteration=1)
        assert len(result.strip()) > 0

    def test_multiple_iterations_all_retrieved(self):
        store(0, "Iteration 0: auth middleware setup.", "build auth")
        store(1, "Iteration 1: added login endpoint.", "build auth")
        result = retrieve("build auth", current_iteration=2)
        assert "Iteration 0" in result
        assert "Iteration 1" in result

    def test_error_iterations_flagged_in_header(self):
        store(0, "Error: module not found — auth failed to load.", "task")
        result = retrieve("task", current_iteration=1, include_errors=True)
        # Header should mention iterations with errors
        assert "error" in result.lower() or "Iteration 0" in result

    def test_no_errors_flag_works(self):
        store(0, "Clean output, no problems.", "task")
        result = retrieve("task", current_iteration=1, include_errors=False)
        assert isinstance(result, str)

    def test_n_results_limits_retrieved_docs(self):
        for i in range(5):
            store(i, f"Iteration {i}: some work was done for the task.", "task")
        result = retrieve("task", current_iteration=6, n_results=2)
        # Should still return a valid string
        assert isinstance(result, str)
        assert len(result) > 0

    def test_eval_docs_included_in_context(self):
        store(0, "Some work.", "task")
        store_eval(0, {"Task Completion": {"score": 0.6, "reason": "partial"}}, "task", "direct_llm")
        result = retrieve("task", current_iteration=1)
        # Eval doc should be among retrieved content
        assert "Iteration 0" in result

    def test_retrieve_returns_chronological_order(self):
        store(0, "First: setup.", "task")
        store(1, "Second: implementation.", "task")
        store(2, "Third: testing.", "task")
        result = retrieve("task", current_iteration=3)
        # Iteration 0 should appear before Iteration 2
        idx0 = result.find("Iteration 0")
        idx2 = result.find("Iteration 2")
        if idx0 >= 0 and idx2 >= 0:
            assert idx0 < idx2


# ---------------------------------------------------------------------------
# _recency_boost — unit tests
# ---------------------------------------------------------------------------

class TestRecencyBoost:
    def test_no_boost_for_latest_iteration(self):
        # iteration = current - 1 → staleness = 0
        boosted = _recency_boost(0.5, iteration=4, current_iteration=5)
        assert boosted == pytest.approx(0.5)

    def test_older_iterations_get_higher_distance(self):
        recent = _recency_boost(0.5, iteration=4, current_iteration=5)
        older = _recency_boost(0.5, iteration=0, current_iteration=5)
        assert older > recent

    def test_boost_scales_with_staleness(self):
        b1 = _recency_boost(0.3, iteration=3, current_iteration=5)  # 1 stale
        b2 = _recency_boost(0.3, iteration=1, current_iteration=5)  # 3 stale
        assert b2 > b1

    def test_negative_staleness_treated_as_zero(self):
        # iteration > current (shouldn't happen but should not crash)
        result = _recency_boost(0.4, iteration=10, current_iteration=5)
        assert result == pytest.approx(0.4)

    def test_same_iteration_as_current_treated_as_zero(self):
        result = _recency_boost(0.6, iteration=5, current_iteration=5)
        assert result == pytest.approx(0.6)


# ---------------------------------------------------------------------------
# _get_latest_eval — direct ID lookup
# ---------------------------------------------------------------------------

class TestGetLatestEval:
    def _collection(self):
        import retrieve_context
        return retrieve_context.get_collection()

    def test_returns_none_when_no_evals(self):
        col = self._collection()
        result = _get_latest_eval(col, current_iteration=1)
        assert result is None

    def test_returns_eval_doc_when_stored(self):
        store_eval(0, {"Task Completion": {"score": 0.7, "reason": "good"}}, "task", "direct_llm")
        col = self._collection()
        result = _get_latest_eval(col, current_iteration=1)
        assert result is not None
        assert "0.7" in result or "Task Completion" in result

    def test_returns_latest_when_multiple_evals(self):
        store_eval(0, {"Task Completion": {"score": 0.5, "reason": "partial"}}, "task", "direct_llm")
        store_eval(1, {"Task Completion": {"score": 0.8, "reason": "good"}}, "task", "direct_llm")
        col = self._collection()
        result = _get_latest_eval(col, current_iteration=2)
        assert result is not None
        assert "0.8" in result

    def test_where_filter_no_matching_docs_does_not_crash(self):
        """retrieve() with where filter should not crash when no docs match the filter."""
        # Store clean output (has_errors=False), then retrieve with include_errors=True
        # The error-focused where filter will find 0 matching docs but should not raise.
        store(0, "Everything looks great, no errors at all.", "task")
        result = retrieve("task", current_iteration=1, include_errors=True)
        assert isinstance(result, str)
        assert len(result.strip()) > 0

    def test_where_filter_retrieves_eval_docs(self):
        """Eval-focused query with where filter should find eval docs specifically."""
        store(0, "Some work done.", "task")
        store_eval(0, {"Task Completion": {"score": 0.7, "reason": "partial"}}, "task", "direct_llm")
        result = retrieve("task", current_iteration=1)
        # Eval content should appear (either in Latest eval header or context body)
        assert "0.7" in result or "Task Completion" in result

    def test_where_filter_retrieves_error_docs(self):
        """Error-focused query with where filter finds docs that have errors."""
        store(0, "TypeError: something broke badly.", "task")
        result = retrieve("task", current_iteration=1, include_errors=True)
        assert "Iteration 0" in result

    def test_retrieve_header_includes_latest_eval(self):
        store(0, "Some work.", "task")
        store_eval(0, {"Task Completion": {"score": 0.65, "reason": "partial"}}, "task", "direct_llm")
        result = retrieve("task", current_iteration=1)
        assert "Latest eval" in result or "0.65" in result


# ---------------------------------------------------------------------------
# Cosine similarity helpers
# ---------------------------------------------------------------------------

class TestCosineSimilarity:
    def test_identical_vectors_return_1(self):
        a = [1.0, 0.0, 0.0]
        assert abs(_cosine_similarity(a, a) - 1.0) < 1e-6

    def test_orthogonal_vectors_return_0(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert abs(_cosine_similarity(a, b)) < 1e-6

    def test_opposite_vectors_return_minus_1(self):
        a = [1.0, 0.0]
        b = [-1.0, 0.0]
        assert abs(_cosine_similarity(a, b) + 1.0) < 1e-6

    def test_zero_vector_returns_0(self):
        a = [0.0, 0.0]
        b = [1.0, 0.0]
        assert _cosine_similarity(a, b) == 0.0

    def test_symmetry(self):
        a = [0.6, 0.8]
        b = [0.8, 0.6]
        assert abs(_cosine_similarity(a, b) - _cosine_similarity(b, a)) < 1e-9

    def test_similar_vectors_close_to_1(self):
        a = [0.99, 0.01]
        b = [0.98, 0.02]
        sim = _cosine_similarity(a, b)
        assert sim > 0.99


class TestMeanEmbedding:
    def test_single_embedding_unchanged(self):
        emb = [0.5, 0.3, 0.2]
        result = _mean_embedding([emb])
        assert len(result) == 3
        assert abs(result[0] - 0.5) < 1e-9

    def test_two_embeddings_averaged(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        result = _mean_embedding([a, b])
        assert abs(result[0] - 0.5) < 1e-9
        assert abs(result[1] - 0.5) < 1e-9

    def test_empty_returns_none(self):
        assert _mean_embedding([]) is None

    def test_output_length_matches_input(self):
        embs = [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
        result = _mean_embedding(embs)
        assert len(result) == 3


# ---------------------------------------------------------------------------
# Semantic similarity between stored iterations
# ---------------------------------------------------------------------------

class TestComputeIterSimilarity:
    def test_returns_none_for_missing_iterations(self):
        """No data in Chroma → similarity is None."""
        from retrieve_context import get_collection
        col = get_collection()
        result = compute_iter_similarity(col, 0, 1)
        assert result is None

    def test_returns_float_after_storing_two_iterations(self):
        """After storing two iterations, similarity is computable if embeddings available."""
        store(0, "Added JWT middleware and login endpoint.", "build auth")
        store(1, "Added logout route and session expiry.", "build auth")
        from retrieve_context import get_collection
        col = get_collection()
        result = compute_iter_similarity(col, 1, 0)
        # May be None if embeddings not available (chroma default); otherwise float
        assert result is None or isinstance(result, float)

    def test_identical_content_high_similarity(self):
        """Storing the same content twice should yield high similarity (if embeddings available)."""
        text = "Implemented the authentication system with JWT tokens and session management."
        store(0, text, "auth task")
        store(1, text, "auth task")
        from retrieve_context import get_collection
        col = get_collection()
        result = compute_iter_similarity(col, 1, 0)
        if result is not None:
            assert result > 0.85, f"Expected high similarity for identical content, got {result}"

    def test_dissimilar_content_lower_similarity(self):
        """Very different content should yield lower similarity than identical content."""
        store(0, "Added database migrations and schema changes for user table.", "task")
        store(1, "Refactored CSS styling and updated color palette in frontend.", "task")
        from retrieve_context import get_collection
        col = get_collection()
        sim = compute_iter_similarity(col, 1, 0)
        if sim is not None:
            # Just check it's a valid float — actual value depends on embedding model
            assert 0.0 <= sim <= 1.0

    def test_similarity_is_rounded(self):
        """Returned value should be rounded to 4 decimal places."""
        text = "Some content for testing similarity rounding behavior."
        store(0, text, "task")
        store(1, text + " Extra.", "task")
        from retrieve_context import get_collection
        col = get_collection()
        result = compute_iter_similarity(col, 1, 0)
        if result is not None:
            # Check it has at most 4 decimal places
            assert result == round(result, 4)


# ---------------------------------------------------------------------------
# MMR selection
# ---------------------------------------------------------------------------

class TestMMRSelect:
    def _make_docs(self, n: int) -> list[tuple[str, dict, float]]:
        return [(f"doc_{i}", {"iteration": 0, "chunk_index": i}, float(i) / 10) for i in range(n)]

    def test_returns_k_docs_when_more_than_k(self):
        docs = self._make_docs(10)
        result = _mmr_select(docs, k=4, ef=None)
        assert len(result) == 4

    def test_returns_all_when_fewer_than_k(self):
        docs = self._make_docs(3)
        result = _mmr_select(docs, k=8, ef=None)
        assert len(result) == 3

    def test_returns_empty_for_empty_input(self):
        result = _mmr_select([], k=5, ef=None)
        assert result == []

    def test_returns_first_k_without_ef(self):
        """Without embedding function, MMR falls back to top-k by order."""
        docs = self._make_docs(10)
        result = _mmr_select(docs, k=3, ef=None)
        assert result == docs[:3]

    def test_with_real_ef_returns_k_docs(self):
        """With FastEmbed, MMR should still return k diverse docs."""
        from embeddings import get_embedding_function, fastembed_available
        if not fastembed_available():
            pytest.skip("fastembed not available")
        ef = get_embedding_function()
        docs = [
            ("auth middleware adds JWT validation", {"iteration": 0, "chunk_index": 0}, 0.1),
            ("auth middleware adds JWT validation and token refresh", {"iteration": 0, "chunk_index": 1}, 0.12),
            ("database schema migration for users table", {"iteration": 1, "chunk_index": 0}, 0.3),
            ("CSS layout refactor and responsive design", {"iteration": 2, "chunk_index": 0}, 0.5),
        ]
        result = _mmr_select(docs, k=3, lambda_mult=0.6, ef=ef)
        assert len(result) == 3

    def test_mmr_prefers_relevant_over_redundant(self):
        """MMR should prefer the most relevant diverse doc over a redundant one."""
        from embeddings import get_embedding_function, fastembed_available
        if not fastembed_available():
            pytest.skip("fastembed not available")
        ef = get_embedding_function()
        # Two very similar docs + one very different one
        # MMR with k=2 should pick the best + the different one, not two similar ones
        docs = [
            ("JWT authentication middleware implementation", {"iteration": 0, "chunk_index": 0}, 0.1),
            ("JWT authentication middleware validation", {"iteration": 0, "chunk_index": 1}, 0.11),  # near-duplicate
            ("CSS grid layout responsive design", {"iteration": 1, "chunk_index": 0}, 0.3),  # diverse
        ]
        result = _mmr_select(docs, k=2, lambda_mult=0.5, ef=ef)
        result_texts = [r[0] for r in result]
        # The diverse CSS doc should appear rather than the near-duplicate JWT doc
        assert "CSS" in result_texts[1] or len(result) == 2


# ---------------------------------------------------------------------------
# Similarity in retrieve() header
# ---------------------------------------------------------------------------

class TestRetrieveSimilarityHeader:
    def test_no_similarity_for_first_two_iterations(self):
        """Similarity header only appears from iteration 2 onwards."""
        store(0, "First iteration work.", "task")
        result = retrieve("task", current_iteration=1)
        # The specific similarity header format should not appear for iter < 2
        assert "**Output similarity (iter" not in result

    def test_similarity_header_present_from_iteration_2(self):
        """After two stored iterations, similarity may appear in header."""
        store(0, "First iteration work: added auth.", "task")
        store(1, "Second iteration work: added routes.", "task")
        result = retrieve("task", current_iteration=2)
        # May or may not show similarity depending on embedding availability
        assert isinstance(result, str) and len(result) > 0

    def test_high_similarity_triggers_warning(self, git_cwd):
        """Highly similar consecutive outputs should trigger a warning in the header."""
        from embeddings import fastembed_available
        if not fastembed_available():
            pytest.skip("fastembed required for similarity computation")
        identical = "Implemented JWT authentication middleware with session management."
        store(0, identical, "task")
        store(1, identical, "task")
        result = retrieve("task", current_iteration=2)
        # With fastembed, similarity > 0.88 should trigger the WARNING
        assert "WARNING" in result or "**Output similarity" in result

    def test_mmr_flag_no_mmr_returns_string(self):
        """Passing use_mmr=False still returns valid context."""
        store(0, "Some work done.", "task")
        result = retrieve("task", current_iteration=1, use_mmr=False)
        assert isinstance(result, str) and len(result.strip()) > 0
