#!/usr/bin/env python3
"""Reciprocal Rank Fusion (RRF) for combining multiple ranked result lists."""


def reciprocal_rank_fusion(
    ranked_lists: list[list[tuple[str, dict, float]]],
    k: int = 60,
    weights: list[float] | None = None,
) -> list[tuple[str, dict, float]]:
    """Fuse multiple ranked lists using RRF.

    Each ranked_list is a list of (doc, metadata, score) tuples sorted
    best-first.  The score field in each input list is ignored for ranking
    purposes — only the *position* matters.

    Args:
        ranked_lists: One list per retrieval leg, each sorted best-first.
        k: Smoothing constant (default 60).
        weights: Optional per-list weight.  Defaults to uniform 1.0.

    Returns:
        Fused list sorted by RRF score descending.  The float in each tuple
        is the RRF score (higher = more relevant).  To make it compatible
        with downstream code that treats lower = better (distance-style),
        callers can negate or invert as needed.
    """
    if not ranked_lists:
        return []

    if weights is None:
        weights = [1.0] * len(ranked_lists)

    # Accumulate RRF scores keyed by (iteration, chunk_index)
    rrf_scores: dict[tuple, float] = {}
    doc_store: dict[tuple, tuple[str, dict]] = {}

    for weight, ranked in zip(weights, ranked_lists):
        for rank_idx, (doc, meta, _score) in enumerate(ranked):
            doc_key = (meta.get("iteration"), meta.get("chunk_index"))
            rrf_scores[doc_key] = rrf_scores.get(doc_key, 0.0) + weight / (k + rank_idx + 1)
            # Keep the first occurrence of the doc content
            if doc_key not in doc_store:
                doc_store[doc_key] = (doc, meta)

    # Sort by RRF score descending (best first)
    fused: list[tuple[str, dict, float]] = []
    for doc_key in sorted(rrf_scores, key=rrf_scores.get, reverse=True):
        doc, meta = doc_store[doc_key]
        fused.append((doc, meta, rrf_scores[doc_key]))

    return fused
