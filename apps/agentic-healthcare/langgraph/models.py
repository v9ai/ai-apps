"""Plain Pydantic models for the ingestion pipeline.

Replaces llama_index Document / TextNode / BaseNode with a single
lightweight model that carries text, metadata, and an optional embedding.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EmbeddingNode(BaseModel):
    """A chunk of text with metadata and an optional embedding vector.

    Drop-in replacement for llama_index TextNode / Document in the
    production ingestion and retrieval paths.
    """

    id_: str = ""
    text: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding: list[float] | None = None
