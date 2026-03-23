#!/usr/bin/env python3
"""CrossEncoder reranking for the iterate pipeline.

Reranks candidate documents using a cross-encoder model for more accurate
relevance scoring than embedding-based cosine similarity alone.

Uses sentence-transformers CrossEncoder (ONNX-optimized when available).
Falls back gracefully if the model or library is unavailable.
"""

import os

RERANK_MODEL = os.environ.get(
    "ITERATE_RERANK_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"
)
RERANK_CACHE = os.environ.get(
    "ITERATE_RERANK_CACHE", "/tmp/claude-iterate/reranker-cache"
)

# Module-level cache: model loads once per process (same pattern as embeddings.py)
_cached_model = None
_initialized = False


def reranker_available() -> bool:
    """Return True if CrossEncoder is importable."""
    try:
        from sentence_transformers import CrossEncoder  # noqa: F401

        return True
    except ImportError:
        return False


def _get_model():
    """Load and cache the CrossEncoder model. Returns None on failure."""
    global _cached_model, _initialized
    if _initialized:
        return _cached_model

    _initialized = True

    if not reranker_available():
        _cached_model = None
        return None

    try:
        from sentence_transformers import CrossEncoder

        os.makedirs(RERANK_CACHE, exist_ok=True)
        _cached_model = CrossEncoder(RERANK_MODEL, cache_folder=RERANK_CACHE)
    except Exception:
        _cached_model = None

    return _cached_model


def rerank(
    query: str,
    docs: list[tuple[str, dict, float]],
    top_k: int = 8,
) -> list[tuple[str, dict, float]]:
    """Rerank documents using CrossEncoder relevance scoring.

    Args:
        query: The search query.
        docs: List of (doc_text, metadata, distance) tuples from retrieval.
        top_k: Number of top documents to return.

    Returns:
        Top-k documents sorted by cross-encoder score, with scores converted
        to pseudo-distances (1 - normalized_score) for compatibility with the
        existing pipeline.

    Falls back to returning docs[:top_k] unchanged if the model is unavailable.
    """
    if not docs:
        return docs

    model = _get_model()
    if model is None:
        return docs[:top_k]

    try:
        pairs = [(query, doc_text) for doc_text, _, _ in docs]
        scores = model.predict(pairs)

        # Normalize scores to [0, 1] range for pseudo-distance conversion
        scores_list = [float(s) for s in scores]
        min_score = min(scores_list)
        max_score = max(scores_list)
        score_range = max_score - min_score

        scored_docs = []
        for i, (doc_text, meta, original_dist) in enumerate(docs):
            if score_range > 0:
                normalized = (scores_list[i] - min_score) / score_range
            else:
                normalized = 1.0
            # Convert to pseudo-distance: higher score = lower distance
            pseudo_dist = 1.0 - normalized
            scored_docs.append((doc_text, meta, pseudo_dist))

        # Sort by pseudo-distance (ascending = most relevant first)
        scored_docs.sort(key=lambda x: x[2])
        return scored_docs[:top_k]

    except Exception:
        # Any failure in scoring: fall back to original order
        return docs[:top_k]


def _reset_cache() -> None:
    """Reset module-level cache. Used in tests only."""
    global _cached_model, _initialized
    _cached_model = None
    _initialized = False
