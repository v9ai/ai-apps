"""Tests for bm25_index.py — BM25 keyword index with persistence."""

import json
import os

import pytest

from bm25_index import BM25Index, _tokenize, bm25_available, build_or_load


# ---------------------------------------------------------------------------
# Skip all if rank-bm25 not installed
# ---------------------------------------------------------------------------

pytestmark = pytest.mark.skipif(
    not bm25_available(), reason="rank-bm25 not installed"
)


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

class TestTokenize:
    def test_lowercases(self):
        assert _tokenize("Hello World") == ["hello", "world"]

    def test_strips_punctuation(self):
        tokens = _tokenize("error: module 'foo' not found!")
        assert "error" in tokens
        assert "foo" in tokens
        assert ":" not in tokens

    def test_empty_string(self):
        assert _tokenize("") == []

    def test_numbers_preserved(self):
        assert "42" in _tokenize("iteration 42 done")

    def test_underscores_preserved(self):
        assert "my_var" in _tokenize("set my_var = 10")


# ---------------------------------------------------------------------------
# BM25Index — add + query
# ---------------------------------------------------------------------------

class TestBM25Index:
    @pytest.fixture
    def index(self, tmp_path):
        return BM25Index(str(tmp_path / "bm25_index.json"))

    def test_add_and_query(self, index):
        docs = [
            "JWT authentication middleware implementation",
            "CSS grid layout responsive design",
            "database schema migration for users",
        ]
        metas = [
            {"iteration": 0, "chunk_index": 0},
            {"iteration": 1, "chunk_index": 0},
            {"iteration": 2, "chunk_index": 0},
        ]
        ids = ["doc-0", "doc-1", "doc-2"]
        index.add_documents(docs, metas, ids)

        results = index.query("JWT authentication", n_results=2)
        assert len(results) >= 1
        # Best match should be the JWT doc
        assert "JWT" in results[0][0]

    def test_query_empty_index(self, index):
        assert index.query("anything") == []

    def test_query_no_match(self, index):
        index.add_documents(
            ["alpha beta gamma"],
            [{"iteration": 0, "chunk_index": 0}],
            ["doc-0"],
        )
        results = index.query("xylophone")
        assert results == []

    def test_size_property(self, index):
        assert index.size == 0
        index.add_documents(
            ["doc one", "doc two"],
            [{"iteration": 0, "chunk_index": 0}, {"iteration": 0, "chunk_index": 1}],
            ["id-0", "id-1"],
        )
        assert index.size == 2

    def test_dedup_ids(self, index):
        index.add_documents(["doc"], [{"iteration": 0, "chunk_index": 0}], ["id-0"])
        index.add_documents(["doc"], [{"iteration": 0, "chunk_index": 0}], ["id-0"])
        assert index.size == 1

    def test_results_sorted_by_score_descending(self, index):
        index.add_documents(
            ["python error handling", "python python python programming"],
            [{"iteration": 0, "chunk_index": 0}, {"iteration": 0, "chunk_index": 1}],
            ["id-0", "id-1"],
        )
        results = index.query("python")
        if len(results) >= 2:
            assert results[0][2] >= results[1][2]

    def test_n_results_limits_output(self, index):
        docs = [f"document number {i} about testing" for i in range(10)]
        metas = [{"iteration": 0, "chunk_index": i} for i in range(10)]
        ids = [f"id-{i}" for i in range(10)]
        index.add_documents(docs, metas, ids)
        results = index.query("testing", n_results=3)
        assert len(results) <= 3


# ---------------------------------------------------------------------------
# Persistence — save / load
# ---------------------------------------------------------------------------

class TestPersistence:
    def test_save_and_load(self, tmp_path):
        path = str(tmp_path / "bm25_index.json")
        idx = BM25Index(path)
        # Need 3+ docs for BM25 IDF to produce non-zero scores
        idx.add_documents(
            ["alpha bravo text", "charlie delta text", "echo foxtrot text"],
            [
                {"iteration": 0, "chunk_index": 0},
                {"iteration": 0, "chunk_index": 1},
                {"iteration": 0, "chunk_index": 2},
            ],
            ["id-0", "id-1", "id-2"],
        )
        idx.save()

        idx2 = BM25Index(path)
        assert idx2.load() is True
        assert idx2.size == 3
        results = idx2.query("alpha")
        assert len(results) >= 1
        assert "alpha" in results[0][0]

    def test_load_missing_file(self, tmp_path):
        idx = BM25Index(str(tmp_path / "nonexistent.json"))
        assert idx.load() is False
        assert idx.size == 0

    def test_load_corrupt_file(self, tmp_path):
        path = str(tmp_path / "corrupt.json")
        with open(path, "w") as f:
            f.write("not valid json{{{")
        idx = BM25Index(path)
        assert idx.load() is False

    def test_save_creates_directory(self, tmp_path):
        path = str(tmp_path / "subdir" / "bm25_index.json")
        idx = BM25Index(path)
        idx.add_documents(["test doc"], [{"iteration": 0, "chunk_index": 0}], ["id-0"])
        idx.save()
        assert os.path.exists(path)


# ---------------------------------------------------------------------------
# build_or_load factory
# ---------------------------------------------------------------------------

class TestBuildOrLoad:
    def test_returns_index_when_available(self, tmp_path):
        idx = build_or_load(str(tmp_path))
        assert idx is not None
        assert idx.size == 0

    def test_loads_existing_data(self, tmp_path):
        chroma_path = str(tmp_path)
        # Pre-populate
        idx = build_or_load(chroma_path)
        idx.add_documents(
            ["hello world"],
            [{"iteration": 0, "chunk_index": 0}],
            ["id-0"],
        )
        idx.save()

        # Re-load
        idx2 = build_or_load(chroma_path)
        assert idx2.size == 1
