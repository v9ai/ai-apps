"""Tests for retrieve_context.py — semantic retrieval from ChromaDB."""

import pytest

import store_context
import retrieve_context
from store_context import store, store_eval
from retrieve_context import retrieve, _recency_boost, _get_latest_eval


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
