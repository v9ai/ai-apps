"""Cross-encoder reranker for academic paper candidates.

Uses cross-encoder/ms-marco-MiniLM-L-6-v2 (22M params, ~15ms/pair on CPU)
to score (query, document) pairs with true semantic relevance.

Requires the ``ml`` extra: ``pip install research-client[ml]``
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Optional

from .types import Paper

MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import CrossEncoder
        _model = CrossEncoder(MODEL_NAME)
    return _model


@dataclass
class RankedPaper:
    """A paper candidate with its cross-encoder relevance score."""
    paper: Paper
    score: float


def _paper_to_passage(paper: Paper) -> str:
    """Build a passage string from a Paper for scoring."""
    parts = []
    if paper.title:
        parts.append(paper.title)
    abstract = (paper.abstract_text or "")[:1000]
    if abstract:
        parts.append(abstract)
    return " ".join(parts) if parts else ""


def rerank_sync(
    query: str,
    papers: list[Paper],
    top_k: Optional[int] = None,
) -> list[RankedPaper]:
    """Score and sort papers by cross-encoder relevance to query."""
    if not papers:
        return []

    model = _get_model()

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
    papers: list[Paper],
    top_k: Optional[int] = None,
) -> list[RankedPaper]:
    """Async wrapper — runs cross-encoder in a thread."""
    return await asyncio.to_thread(rerank_sync, query, papers, top_k)
