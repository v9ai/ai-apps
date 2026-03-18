"""Embedding generation and vector operations.

Replaces Cloudflare Workers AI embeddings with OpenAI embeddings,
and Cloudflare Vectorize with Neon pgvector.
"""

from __future__ import annotations

import os
from typing import Sequence

import httpx


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding using OpenAI API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    client = httpx.Client(timeout=30.0)
    resp = client.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "text-embedding-3-small",
            "input": text,
        },
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]


def generate_embeddings_batch(texts: Sequence[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts in one API call."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    client = httpx.Client(timeout=60.0)
    resp = client.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "text-embedding-3-small",
            "input": list(texts),
        },
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    # Sort by index to preserve order
    data.sort(key=lambda x: x["index"])
    return [d["embedding"] for d in data]


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks, respecting section boundaries."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size

        # Try to break at a section boundary or paragraph
        if end < len(text):
            # Look for double newline (paragraph break)
            break_pos = text.rfind("\n\n", start + chunk_size // 2, end)
            if break_pos == -1:
                # Look for single newline
                break_pos = text.rfind("\n", start + chunk_size // 2, end)
            if break_pos != -1:
                end = break_pos + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - overlap
        if start >= len(text):
            break

    return chunks
