"""Tests for embeddings.py — FastEmbed integration and fallback behaviour."""

import importlib
import sys

import pytest


def test_fastembed_available_returns_bool():
    from embeddings import fastembed_available
    result = fastembed_available()
    assert isinstance(result, bool)


def test_backend_name_is_string():
    from embeddings import backend_name
    name = backend_name()
    assert name in ("fastembed", "chroma_default")


def test_get_embedding_function_returns_callable_or_none():
    from embeddings import get_embedding_function
    fn = get_embedding_function()
    assert fn is None or callable(fn)


@pytest.mark.skipif(
    not __import__("embeddings").fastembed_available(),
    reason="fastembed not installed",
)
def test_fastembed_fn_has_supported_spaces():
    """supported_spaces() suppresses ChromaDB deprecation warnings."""
    from embeddings import get_embedding_function
    fn = get_embedding_function()
    assert fn is not None
    spaces = fn.supported_spaces()
    assert isinstance(spaces, list)
    assert "cosine" in spaces


@pytest.mark.skipif(
    not __import__("embeddings").fastembed_available(),
    reason="fastembed not installed",
)
def test_fastembed_fn_chroma_interface():
    """All ChromaDB ≥0.6 interface methods are present."""
    from embeddings import get_embedding_function
    fn = get_embedding_function()
    assert fn is not None
    assert callable(fn.embed_documents)
    assert callable(fn.embed_query)
    assert callable(fn.name)
    assert callable(fn.is_legacy)
    assert callable(fn.supported_spaces)
    assert callable(fn.get_config)
    assert fn.is_legacy() is True
    assert isinstance(fn.name(), str)
    assert isinstance(fn.get_config(), dict)


def test_get_embedding_function_is_cached():
    """Calling twice returns the exact same object."""
    from embeddings import get_embedding_function
    fn1 = get_embedding_function()
    fn2 = get_embedding_function()
    assert fn1 is fn2


def test_reset_cache_allows_reinitialize(monkeypatch):
    import embeddings
    embeddings._reset_cache()
    fn1 = embeddings.get_embedding_function()
    embeddings._reset_cache()
    fn2 = embeddings.get_embedding_function()
    # Both should be either None or callable (the class is re-created per call
    # so identity check is inappropriate here)
    assert (fn1 is None) == (fn2 is None), "Both should be None or both callable"
    if fn1 is not None and fn2 is not None:
        assert callable(fn1) and callable(fn2)


@pytest.mark.skipif(
    not __import__("embeddings").fastembed_available(),
    reason="fastembed not installed",
)
def test_fastembed_embedding_output_shape():
    """FastEmbed embeddings should be a list of float vectors."""
    from embeddings import get_embedding_function
    fn = get_embedding_function()
    assert fn is not None
    result = fn(["hello world", "foo bar"])
    assert len(result) == 2
    assert all(isinstance(v, list) for v in result)
    assert all(isinstance(x, float) for x in result[0])
    # bge-small-en-v1.5 has 384 dims
    assert len(result[0]) > 0


@pytest.mark.skipif(
    not __import__("embeddings").fastembed_available(),
    reason="fastembed not installed",
)
def test_fastembed_similar_texts_closer_than_dissimilar():
    """Semantically similar texts should have higher cosine similarity."""
    import math

    from embeddings import get_embedding_function

    fn = get_embedding_function()
    assert fn is not None

    embeddings_list = fn([
        "the cat sat on the mat",
        "a cat is sitting on a mat",
        "quantum physics is complex",
    ])

    def cosine(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x ** 2 for x in a))
        nb = math.sqrt(sum(x ** 2 for x in b))
        return dot / (na * nb) if na and nb else 0.0

    sim_similar = cosine(embeddings_list[0], embeddings_list[1])
    sim_dissimilar = cosine(embeddings_list[0], embeddings_list[2])
    assert sim_similar > sim_dissimilar, (
        f"Expected similar texts to be closer: {sim_similar:.3f} vs {sim_dissimilar:.3f}"
    )


def test_fallback_when_fastembed_missing(monkeypatch):
    """When fastembed is not importable, get_embedding_function returns None."""
    import embeddings
    monkeypatch.setattr(embeddings, "fastembed_available", lambda: False)
    embeddings._reset_cache()
    fn = embeddings.get_embedding_function()
    assert fn is None
    embeddings._reset_cache()


def test_backend_name_chroma_default_when_no_fastembed(monkeypatch):
    import embeddings
    monkeypatch.setattr(embeddings, "fastembed_available", lambda: False)
    embeddings._reset_cache()
    assert embeddings.backend_name() == "chroma_default"
    embeddings._reset_cache()
