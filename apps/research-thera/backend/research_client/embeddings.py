"""Paper embeddings — all-MiniLM-L6-v2 (384D, local, no API key needed).

Requires the ``ml`` extra: ``pip install research-client[ml]``

Mirrors the Rust local embedding engine in crates/research/src/local_embeddings.rs
(same model, same dimensionality).
"""
from __future__ import annotations

import asyncio

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMS = 384

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_text(text: str) -> list[float]:
    """Embed a single text string, returning a 384-dim vector."""
    return _get_model().encode(text).tolist()


async def aembed_text(text: str) -> list[float]:
    """Async wrapper — runs embedding in a thread to avoid blocking the event loop."""
    return await asyncio.to_thread(embed_text, text)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in a single batch call."""
    if not texts:
        return []
    return [v.tolist() for v in _get_model().encode(texts)]


async def aembed_texts(texts: list[str]) -> list[list[float]]:
    """Async wrapper — runs batch embedding in a thread."""
    return await asyncio.to_thread(embed_texts, texts)
