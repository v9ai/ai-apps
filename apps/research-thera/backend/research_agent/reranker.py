"""Cross-encoder reranker for academic paper candidates.

Uses cross-encoder/ms-marco-MiniLM-L-6-v2 (22M params, ~15ms/pair on CPU)
to score (query, document) pairs with true semantic relevance — not embedding
distance, but a trained classifier that reads both texts together.

Sits between search and extraction to ensure the top-K papers sent to the
(expensive) LLM extraction step are actually the most relevant.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Optional

from sentence_transformers import CrossEncoder

MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_model: CrossEncoder | None = None


def _get_model() -> CrossEncoder:
    global _model
    if _model is None:
        _model = CrossEncoder(MODEL_NAME)
    return _model


@dataclass
class RankedPaper:
    """A paper candidate with its cross-encoder relevance score."""
    paper: dict
    score: float


def _paper_to_passage(paper: dict) -> str:
    """Build a passage string from a normalized paper dict for scoring."""
    parts = []
    title = paper.get("title") or ""
    if title:
        parts.append(title)
    abstract = (paper.get("abstract") or "")[:1000]
    if abstract:
        parts.append(abstract)
    if not parts:
        return ""
    return " ".join(parts)


def rerank_sync(
    query: str,
    papers: list[dict],
    top_k: Optional[int] = None,
) -> list[RankedPaper]:
    """Score and sort papers by cross-encoder relevance to query.

    Args:
        query: The research query (e.g. clinical goal or search terms).
        papers: Normalized paper dicts (must have at least 'title').
        top_k: If set, return only the top K results.

    Returns:
        Papers sorted by descending cross-encoder score.
    """
    if not papers:
        return []

    model = _get_model()

    # Build (query, passage) pairs — skip papers with no text
    pairs: list[tuple[str, str]] = []
    indices: list[int] = []
    for i, paper in enumerate(papers):
        passage = _paper_to_passage(paper)
        if passage:
            pairs.append((query, passage))
            indices.append(i)

    if not pairs:
        return []

    scores = model.predict(pairs)

    ranked = [
        RankedPaper(paper=papers[idx], score=float(score))
        for idx, score in zip(indices, scores)
    ]
    ranked.sort(key=lambda r: r.score, reverse=True)

    if top_k is not None:
        ranked = ranked[:top_k]

    return ranked


async def rerank(
    query: str,
    papers: list[dict],
    top_k: Optional[int] = None,
) -> list[RankedPaper]:
    """Async wrapper — runs cross-encoder in a thread to avoid blocking the event loop."""
    return await asyncio.to_thread(rerank_sync, query, papers, top_k)
