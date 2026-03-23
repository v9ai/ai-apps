"""Tests for reranker.py -- CrossEncoder reranking and fallback behaviour."""

from unittest.mock import MagicMock, patch

import pytest


def test_reranker_available_returns_bool():
    from reranker import reranker_available

    result = reranker_available()
    assert isinstance(result, bool)


def test_rerank_empty_docs():
    """rerank with empty list returns empty list."""
    import reranker
    reranker._reset_cache()

    result = reranker.rerank("test query", [], top_k=5)
    assert result == []
    reranker._reset_cache()


def test_rerank_fallback_when_unavailable(monkeypatch):
    """When CrossEncoder is not importable, rerank returns docs unchanged (truncated to top_k)."""
    import reranker
    monkeypatch.setattr(reranker, "reranker_available", lambda: False)
    reranker._reset_cache()

    docs = [
        ("doc A", {"iteration": 0, "chunk_index": 0}, 0.1),
        ("doc B", {"iteration": 0, "chunk_index": 1}, 0.2),
        ("doc C", {"iteration": 1, "chunk_index": 0}, 0.3),
    ]
    result = reranker.rerank("test query", docs, top_k=2)
    assert len(result) == 2
    assert result[0] == docs[0]
    assert result[1] == docs[1]
    reranker._reset_cache()


def test_rerank_with_mock_crossencoder(monkeypatch):
    """Rerank correctly reorders docs based on mock CrossEncoder scores."""
    import reranker
    reranker._reset_cache()

    # Mock model that returns scores inversely related to original order
    mock_model = MagicMock()
    mock_model.predict.return_value = [0.1, 0.9, 0.5]  # B is most relevant

    monkeypatch.setattr(reranker, "reranker_available", lambda: True)
    monkeypatch.setattr(reranker, "_get_model", lambda: mock_model)
    # Also need to reset so _get_model mock is used
    reranker._initialized = True
    reranker._cached_model = mock_model

    docs = [
        ("doc A", {"iteration": 0, "chunk_index": 0}, 0.1),
        ("doc B", {"iteration": 0, "chunk_index": 1}, 0.2),
        ("doc C", {"iteration": 1, "chunk_index": 0}, 0.3),
    ]
    result = reranker.rerank("test query", docs, top_k=3)

    assert len(result) == 3
    # B should be first (score 0.9 => pseudo-dist 0.0)
    assert result[0][0] == "doc B"
    # C should be second (score 0.5 => pseudo-dist 0.5)
    assert result[1][0] == "doc C"
    # A should be last (score 0.1 => pseudo-dist 1.0)
    assert result[2][0] == "doc A"

    reranker._reset_cache()


def test_rerank_top_k_truncation(monkeypatch):
    """Rerank returns at most top_k docs."""
    import reranker
    reranker._reset_cache()

    mock_model = MagicMock()
    mock_model.predict.return_value = [0.5, 0.9, 0.1, 0.7]

    monkeypatch.setattr(reranker, "reranker_available", lambda: True)
    reranker._initialized = True
    reranker._cached_model = mock_model

    docs = [
        ("doc A", {"iteration": 0, "chunk_index": 0}, 0.1),
        ("doc B", {"iteration": 0, "chunk_index": 1}, 0.2),
        ("doc C", {"iteration": 1, "chunk_index": 0}, 0.3),
        ("doc D", {"iteration": 1, "chunk_index": 1}, 0.4),
    ]
    result = reranker.rerank("test query", docs, top_k=2)
    assert len(result) == 2
    # B has highest score (0.9), D has second highest (0.7)
    assert result[0][0] == "doc B"
    assert result[1][0] == "doc D"

    reranker._reset_cache()


def test_rerank_returns_same_tuple_structure(monkeypatch):
    """Reranked results maintain the (str, dict, float) tuple structure."""
    import reranker
    reranker._reset_cache()

    mock_model = MagicMock()
    mock_model.predict.return_value = [0.8, 0.2]

    monkeypatch.setattr(reranker, "reranker_available", lambda: True)
    reranker._initialized = True
    reranker._cached_model = mock_model

    docs = [
        ("doc A", {"iteration": 0, "chunk_index": 0, "doc_type": "output"}, 0.15),
        ("doc B", {"iteration": 1, "chunk_index": 0, "doc_type": "eval"}, 0.25),
    ]
    result = reranker.rerank("query", docs, top_k=2)

    for doc_text, meta, dist in result:
        assert isinstance(doc_text, str)
        assert isinstance(meta, dict)
        assert isinstance(dist, float)
        assert "iteration" in meta
        assert "chunk_index" in meta

    reranker._reset_cache()


def test_rerank_predict_exception_fallback(monkeypatch):
    """If CrossEncoder.predict raises, fall back to original order."""
    import reranker
    reranker._reset_cache()

    mock_model = MagicMock()
    mock_model.predict.side_effect = RuntimeError("model error")

    monkeypatch.setattr(reranker, "reranker_available", lambda: True)
    reranker._initialized = True
    reranker._cached_model = mock_model

    docs = [
        ("doc A", {"iteration": 0, "chunk_index": 0}, 0.1),
        ("doc B", {"iteration": 0, "chunk_index": 1}, 0.2),
    ]
    result = reranker.rerank("query", docs, top_k=2)
    assert len(result) == 2
    assert result[0] == docs[0]
    assert result[1] == docs[1]

    reranker._reset_cache()


def test_reset_cache():
    """_reset_cache clears the module state."""
    import reranker
    reranker._initialized = True
    reranker._cached_model = "fake"
    reranker._reset_cache()
    assert reranker._initialized is False
    assert reranker._cached_model is None


def test_rerank_equal_scores(monkeypatch):
    """When all scores are equal, all pseudo-distances should be 0.0 (all equally relevant)."""
    import reranker
    reranker._reset_cache()

    mock_model = MagicMock()
    mock_model.predict.return_value = [0.5, 0.5, 0.5]

    monkeypatch.setattr(reranker, "reranker_available", lambda: True)
    reranker._initialized = True
    reranker._cached_model = mock_model

    docs = [
        ("doc A", {"iteration": 0, "chunk_index": 0}, 0.1),
        ("doc B", {"iteration": 0, "chunk_index": 1}, 0.2),
        ("doc C", {"iteration": 1, "chunk_index": 0}, 0.3),
    ]
    result = reranker.rerank("query", docs, top_k=3)
    assert len(result) == 3
    # All should have pseudo-dist 0.0 (1.0 - 1.0 since score_range == 0)
    for _, _, dist in result:
        assert dist == 0.0

    reranker._reset_cache()
