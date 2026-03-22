"""Embedding utilities for therapy research papers — uses all-MiniLM-L6-v2 (384 dims, local, no API key needed)."""
from __future__ import annotations

import asyncio
from sentence_transformers import SentenceTransformer

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMS = 384

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
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
    """Async wrapper — runs batch embedding in a thread to avoid blocking the event loop."""
    return await asyncio.to_thread(embed_texts, texts)


def paper_to_embedding_text(
    title: str,
    key_findings: list[str] | None = None,
    therapeutic_techniques: list[str] | None = None,
    abstract: str | None = None,
) -> str:
    """Build the text representation of a paper for embedding."""
    parts = [f"Title: {title}"]
    if abstract:
        parts.append(f"Abstract: {abstract[:1000]}")
    if key_findings:
        parts.append(f"Key findings: {'; '.join(key_findings)}")
    if therapeutic_techniques:
        parts.append(f"Therapeutic techniques: {'; '.join(therapeutic_techniques)}")
    return "\n".join(parts)


def query_to_embedding_text(
    feedback_subject: str | None,
    feedback_content: str | None,
    issues: list[dict] | None = None,
) -> str:
    """Build the query text for similarity search from feedback context."""
    parts = []
    if feedback_subject:
        parts.append(f"Topic: {feedback_subject}")
    if feedback_content:
        parts.append(f"Context: {feedback_content[:500]}")
    if issues:
        issue_descs = []
        for issue in issues:
            desc = f"{issue.get('title', '')} ({issue.get('category', '')}, {issue.get('severity', '')})"
            if issue.get("description"):
                desc += f": {issue['description'][:200]}"
            issue_descs.append(desc)
        parts.append(f"Issues: {'; '.join(issue_descs)}")
    return "\n".join(parts) if parts else "therapeutic intervention children"
