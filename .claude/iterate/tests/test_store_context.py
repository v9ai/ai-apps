"""Tests for store_context.py — chunking, dedup, error extraction, and ChromaDB storage."""

import json
import os

import pytest

import store_context
from store_context import chunk_content, dedup_chunks, extract_errors, store, store_eval


# ---------------------------------------------------------------------------
# chunk_content
# ---------------------------------------------------------------------------

class TestChunkContent:
    def test_basic_split_on_double_newline(self):
        # max_chars=8 forces a split: "Hello"(5) + "World"(5) > 8
        chunks = chunk_content("Hello\n\nWorld\n\nFoo", max_chars=8)
        assert len(chunks) >= 2

    def test_single_chunk_when_small(self):
        text = "Short content"
        chunks = chunk_content(text, max_chars=500)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_splits_at_boundary_when_over_max_chars(self):
        # Content has double-newline boundaries; small max_chars triggers splitting
        content = "Alpha\n\nBeta\n\nGamma\n\nDelta"
        chunks = chunk_content(content, max_chars=8)
        # Should produce multiple chunks since each word is 5 chars and limit is 8
        assert len(chunks) >= 3

    def test_preserves_code_fences(self):
        code = "Before\n\n```python\nprint('hi')\n```\n\nAfter"
        chunks = chunk_content(code, max_chars=500)
        assert any("```" in c for c in chunks)

    def test_splits_on_headers(self):
        # max_chars=20 forces split: "# Heading 1"(11) + "Content A"(9) = 20, then "## Heading 2" overflows
        text = "# Heading 1\n\nContent A\n\n## Heading 2\n\nContent B"
        chunks = chunk_content(text, max_chars=20)
        assert len(chunks) >= 2

    def test_empty_string_returns_fallback(self):
        chunks = chunk_content("", max_chars=500)
        assert isinstance(chunks, list)

    def test_no_empty_chunks(self):
        text = "\n\n\nSome content\n\n\nMore content\n\n"
        chunks = chunk_content(text, max_chars=500)
        for c in chunks:
            assert c.strip() != ""


# ---------------------------------------------------------------------------
# dedup_chunks
# ---------------------------------------------------------------------------

class TestDedupChunks:
    def test_removes_exact_duplicates(self):
        assert dedup_chunks(["a", "b", "a"]) == ["a", "b"]

    def test_keeps_order(self):
        result = dedup_chunks(["c", "a", "b", "a"])
        assert result == ["c", "a", "b"]

    def test_all_unique(self):
        assert dedup_chunks(["x", "y", "z"]) == ["x", "y", "z"]

    def test_all_same(self):
        assert dedup_chunks(["same", "same", "same"]) == ["same"]

    def test_similar_but_not_identical_kept(self):
        result = dedup_chunks(["abc", "abd"])
        assert len(result) == 2

    def test_empty_list(self):
        assert dedup_chunks([]) == []


# ---------------------------------------------------------------------------
# extract_errors
# ---------------------------------------------------------------------------

class TestExtractErrors:
    def test_captures_error_colon(self):
        assert len(extract_errors("Error: something broke")) > 0

    def test_captures_type_error(self):
        assert len(extract_errors("TypeError: x is not a function")) > 0

    def test_captures_syntax_error(self):
        assert len(extract_errors("SyntaxError: invalid token")) > 0

    def test_captures_import_error(self):
        assert len(extract_errors("ImportError: No module named foo")) > 0

    def test_captures_fail(self):
        assert len(extract_errors("FAIL src/test.ts")) > 0

    def test_captures_exit_code(self):
        assert len(extract_errors("exit code 1")) > 0

    def test_ignores_prose_error(self):
        assert len(extract_errors("error handling is important")) == 0

    def test_ignores_error_callout(self):
        assert len(extract_errors("the error callout component")) == 0

    def test_ignores_no_errors(self):
        assert len(extract_errors("no errors found")) == 0

    def test_ignores_quoted_error_message(self):
        assert len(extract_errors('got `Error: --max requires a number`')) == 0

    def test_ignores_midline_typeerror(self):
        assert len(extract_errors("e.g. TypeError in prose")) == 0

    def test_limits_to_10(self):
        many_errors = "\n".join([f"Error: error {i}" for i in range(20)])
        result = extract_errors(many_errors)
        assert len(result) <= 10

    def test_empty_string(self):
        assert extract_errors("") == []


# ---------------------------------------------------------------------------
# store() — integration with ChromaDB
# ---------------------------------------------------------------------------

class TestStore:
    def test_returns_result_dict(self, tmp_path):
        out = tmp_path / "out.txt"
        out.write_text("Added login endpoint and JWT auth.")
        result = store(0, out.read_text(), "build auth system")
        assert isinstance(result, dict)
        assert result["stored"] > 0
        assert result["iteration"] == 0
        assert result["collection_count"] > 0

    def test_stores_summary_doc(self, tmp_path):
        import chromadb
        result = store(1, "Built the auth middleware.", "build auth system")
        client = chromadb.PersistentClient(path=store_context.CHROMA_PATH)
        col = client.get_or_create_collection("iterate_context")
        doc = col.get(ids=["iter-1-summary"])
        assert len(doc["ids"]) == 1
        assert "summary" in doc["metadatas"][0]["doc_type"]

    def test_increments_collection_count(self):
        store(0, "First iteration output.", "task")
        r1 = store(1, "Second iteration output.", "task")
        assert r1["collection_count"] >= 2

    def test_upsert_is_idempotent(self):
        r1 = store(0, "Same content.", "task")
        r2 = store(0, "Same content.", "task")
        assert r2["collection_count"] == r1["collection_count"]

    def test_reports_errors_count(self):
        result = store(0, "Error: something broke badly.", "task")
        assert result["errors"] >= 1

    def test_no_errors_when_clean(self):
        result = store(0, "Everything worked perfectly.", "task")
        assert result["errors"] == 0

    def test_has_diff_key_in_result(self):
        result = store(0, "Some output.", "task")
        assert "has_diff" in result
        assert isinstance(result["has_diff"], bool)


# ---------------------------------------------------------------------------
# get_git_diff — returns 3-tuple
# ---------------------------------------------------------------------------

class TestGetGitDiff:
    def test_returns_three_tuple(self):
        from store_context import get_git_diff
        result = get_git_diff()
        assert isinstance(result, tuple)
        assert len(result) == 3

    def test_returns_none_or_str_for_each_element(self):
        from store_context import get_git_diff
        stat, files, diff_content = get_git_diff()
        assert stat is None or isinstance(stat, str)
        assert isinstance(files, list)
        assert diff_content is None or isinstance(diff_content, str)

    def test_diff_content_truncated_to_6kb(self, monkeypatch):
        """Even if git produces huge output, diff_content is capped."""
        from store_context import get_git_diff
        import subprocess

        huge_diff = "+" + "x" * 10000
        mock_stat = subprocess.CompletedProcess([], 0, stdout="file.py | 5 ++\n", stderr="")
        mock_diff = subprocess.CompletedProcess([], 0, stdout=huge_diff, stderr="")

        call_count = [0]
        originals = []

        def mock_run(cmd, **kwargs):
            call_count[0] += 1
            if "--stat" in cmd:
                return mock_stat
            return mock_diff

        monkeypatch.setattr("store_context.subprocess.run", mock_run)
        _, _, content = get_git_diff()
        if content is not None:
            assert len(content) <= 6000 + 10  # allow tiny slack


# ---------------------------------------------------------------------------
# store_eval() — eval score storage
# ---------------------------------------------------------------------------

class TestStoreEval:
    def test_stores_eval_doc(self):
        import chromadb
        scores = {"Task Completion": {"score": 0.7, "reason": "partial"}}
        store_eval(5, scores, "my task", "direct_llm")

        client = chromadb.PersistentClient(path=store_context.CHROMA_PATH)
        col = client.get_or_create_collection("iterate_context")
        doc = col.get(ids=["iter-5-eval"])
        assert len(doc["ids"]) == 1
        meta = doc["metadatas"][0]
        assert meta["iteration"] == 5
        assert meta["eval_method"] == "direct_llm"
        assert meta["doc_type"] == "eval"

    def test_eval_content_contains_score(self):
        import chromadb
        scores = {"Task Completion": {"score": 0.85, "reason": "almost done"}}
        store_eval(3, scores, "my task", "deepeval")

        client = chromadb.PersistentClient(path=store_context.CHROMA_PATH)
        col = client.get_or_create_collection("iterate_context")
        doc = col.get(ids=["iter-3-eval"])
        assert "0.85" in doc["documents"][0]
