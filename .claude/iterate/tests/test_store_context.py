"""Tests for store_context.py — chunking, dedup, error extraction, and ChromaDB storage."""

import json
import os

import pytest

import store_context
from store_context import chunk_content, dedup_chunks, store, store_eval
from shared import extract_errors


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
        assert len(extract_errors('got `Error: --iterations requires a number`')) == 0

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

        def mock_run(cmd, **kwargs):
            if "--stat" in cmd:
                return mock_stat
            return mock_diff

        monkeypatch.setattr("store_context.subprocess.run", mock_run)
        _, _, content = get_git_diff()
        if content is not None:
            assert len(content) <= 6000 + 10  # allow tiny slack

    def test_prefers_uncommitted_over_committed(self, monkeypatch):
        """Uncommitted changes (HEAD) are preferred over committed diff (HEAD~1..HEAD)."""
        from store_context import get_git_diff
        import subprocess

        uncommitted_stat = subprocess.CompletedProcess([], 0, stdout="new.py | 5 +++\n", stderr="")
        uncommitted_diff = subprocess.CompletedProcess([], 0, stdout="+uncommitted\n", stderr="")
        committed_stat = subprocess.CompletedProcess([], 0, stdout="old.py | 2 ++\n", stderr="")

        def mock_run(cmd, **kwargs):
            if "HEAD~1" in cmd:
                return committed_stat if "--stat" in cmd else committed_stat
            if "--stat" in cmd:
                return uncommitted_stat
            return uncommitted_diff

        monkeypatch.setattr("store_context.subprocess.run", mock_run)
        stat, files, content = get_git_diff()
        assert stat is not None
        assert "new.py" in stat  # uncommitted, not "old.py" from committed
        assert content is not None

    def test_falls_back_to_committed_when_no_uncommitted(self, monkeypatch):
        """When no uncommitted changes, falls back to HEAD~1..HEAD."""
        from store_context import get_git_diff
        import subprocess

        empty = subprocess.CompletedProcess([], 0, stdout="", stderr="")
        committed_stat = subprocess.CompletedProcess([], 0, stdout="app.py | 3 +++\n", stderr="")
        committed_diff = subprocess.CompletedProcess([], 0, stdout="+committed line\n", stderr="")

        def mock_run(cmd, **kwargs):
            if "HEAD~1" in cmd:
                return committed_stat if "--stat" in cmd else committed_diff
            if "--stat" in cmd:
                return empty  # no uncommitted changes
            return empty

        monkeypatch.setattr("store_context.subprocess.run", mock_run)
        stat, files, content = get_git_diff()
        assert stat is not None
        assert "app.py" in stat
        assert content is not None


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


# ---------------------------------------------------------------------------
# Semantic similarity in store() result
# ---------------------------------------------------------------------------

class TestStoreSimilarity:
    def test_first_iteration_similarity_is_none(self):
        """Iteration 0 has no previous iteration to compare against."""
        result = store(0, "Initial work done.", "task")
        assert result["semantic_similarity"] is None

    def test_second_iteration_has_similarity_or_none(self):
        """Iteration 1 may have a similarity score or None (depends on embedding availability)."""
        store(0, "Added auth middleware.", "task")
        result = store(1, "Added logout endpoint.", "task")
        assert result["semantic_similarity"] is None or isinstance(result["semantic_similarity"], float)

    def test_identical_iterations_high_similarity(self):
        """Storing the same content twice should yield high similarity (if embeddings available)."""
        from embeddings import fastembed_available
        if not fastembed_available():
            pytest.skip("fastembed required")
        text = "Implemented authentication system with JWT middleware and session management."
        store(0, text, "task")
        result = store(1, text, "task")
        if result["semantic_similarity"] is not None:
            assert result["semantic_similarity"] > 0.85

    def test_semantic_similarity_key_always_present(self):
        """The semantic_similarity key must always be in the result dict."""
        result = store(0, "Some content.", "task")
        assert "semantic_similarity" in result

    def test_similarity_is_float_or_none(self):
        """semantic_similarity is either None or a float in [0, 1]."""
        store(0, "First iteration content.", "task")
        result = store(1, "Second iteration content.", "task")
        sim = result["semantic_similarity"]
        assert sim is None or (isinstance(sim, float) and 0.0 <= sim <= 1.0)


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestChunkContentEdgeCases:
    def test_only_code_fences(self):
        content = "```python\nprint('hello')\n```\n\n```js\nconsole.log('hi')\n```"
        chunks = chunk_content(content, max_chars=500)
        assert len(chunks) >= 1
        assert any("```" in c for c in chunks)

    def test_very_long_single_line(self):
        content = "x" * 5000
        chunks = chunk_content(content, max_chars=1200)
        # Should return at least the truncated content
        assert len(chunks) >= 1
        assert all(len(c) <= 5000 for c in chunks)

    def test_unicode_content(self):
        content = "Привет мир\n\n日本語テスト\n\nEmoji: 🎉"
        chunks = chunk_content(content, max_chars=500)
        assert len(chunks) >= 1

    def test_nested_code_fences(self):
        content = "Before\n\n```python\ndef foo():\n    pass\n```\n\nMiddle\n\n```rust\nfn main() {}\n```\n\nAfter"
        chunks = chunk_content(content, max_chars=30)
        assert len(chunks) >= 2

    def test_max_chars_1_returns_something(self):
        chunks = chunk_content("Hello World", max_chars=1)
        assert len(chunks) >= 1


class TestExtractErrorsEdgeCases:
    def test_panic_captured(self):
        assert len(extract_errors("panic: runtime error: index out of range")) > 0

    def test_multiple_error_types_in_one(self):
        content = (
            "Error: build failed\n"
            "TypeError: cannot read property\n"
            "FAIL tests/auth.test.js\n"
            "panic: nil pointer\n"
            "exit code 2\n"
        )
        errors = extract_errors(content)
        assert len(errors) >= 4

    def test_exit_code_0_not_captured(self):
        assert len(extract_errors("exit code 0")) == 0

    def test_multiline_with_clean_lines(self):
        content = "All tests passed\nNo errors found\nBuild successful"
        assert extract_errors(content) == []


class TestStoreEdgeCases:
    def test_store_with_errors_in_content(self):
        result = store(0, "TypeError: x is not defined\nError: build failed", "task")
        assert result["errors"] >= 2

    def test_store_empty_content(self):
        result = store(0, "", "task")
        assert result["stored"] >= 1  # at least summary doc
        assert result["errors"] == 0

    def test_store_very_large_content(self):
        large = "Important work. " * 1000
        result = store(0, large, "task")
        assert result["stored"] >= 1

    def test_store_with_diff_mock(self, monkeypatch):
        import subprocess
        stat = subprocess.CompletedProcess([], 0, stdout=" auth.py | 10 ++++\n", stderr="")
        diff = subprocess.CompletedProcess([], 0, stdout="+new line\n", stderr="")

        def mock_run(cmd, **kwargs):
            if "--stat" in cmd:
                return stat
            return diff

        monkeypatch.setattr("store_context.subprocess.run", mock_run)
        result = store(0, "Added auth.", "build auth")
        assert result["has_diff"] is True
        assert result["files_changed"] >= 1

    def test_bm25_update_on_store(self):
        """BM25 index should be updated when storing."""
        from bm25_index import build_or_load, bm25_available
        if not bm25_available():
            pytest.skip("rank-bm25 not installed")
        store(0, "JWT authentication middleware implementation.", "build auth")
        idx = build_or_load(store_context.CHROMA_PATH)
        assert idx is not None
        assert idx.size >= 1
