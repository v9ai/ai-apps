"""Vector search routes — embed query via LlamaIndex + pgvector similarity search.

All embedding generation is done here using FastEmbedEmbedding (bge-large-en-v1.5,
1024-dim) so TypeScript never touches vector math.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..db import (
    search_appointments,
    search_blood_tests,
    search_conditions,
    search_marker_trend,
    search_markers_hybrid,
    search_medications,
    search_symptoms,
)
from ..embeddings import generate_embedding

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


def _check_api_key(x_api_key: str | None) -> None:
    if settings.internal_api_key and x_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


class SearchRequest(BaseModel):
    query: str
    user_id: str


class TrendRequest(BaseModel):
    query: str
    user_id: str
    marker_name: str | None = None


@router.post("/tests")
async def search_tests(
    req: SearchRequest,
    x_api_key: str | None = Header(None),
) -> dict:
    _check_api_key(x_api_key)
    embedding = generate_embedding(req.query)
    return {"results": search_blood_tests(embedding, req.user_id)}


@router.post("/markers")
async def search_markers(
    req: SearchRequest,
    x_api_key: str | None = Header(None),
) -> dict:
    _check_api_key(x_api_key)
    embedding = generate_embedding(req.query)
    return {"results": search_markers_hybrid(req.query, embedding, req.user_id)}


@router.post("/multi")
async def search_multi(
    req: SearchRequest,
    x_api_key: str | None = Header(None),
) -> dict:
    """Embed once, search all entity tables — returns combined results for RAG context."""
    _check_api_key(x_api_key)
    embedding = generate_embedding(req.query)
    return {
        "tests": search_blood_tests(embedding, req.user_id),
        "markers": search_markers_hybrid(req.query, embedding, req.user_id, limit=5),
        "conditions": search_conditions(embedding, req.user_id),
        "medications": search_medications(embedding, req.user_id),
        "symptoms": search_symptoms(embedding, req.user_id),
        "appointments": search_appointments(embedding, req.user_id),
    }


@router.post("/trend")
async def search_trend(
    req: TrendRequest,
    x_api_key: str | None = Header(None),
) -> dict:
    _check_api_key(x_api_key)
    embedding = generate_embedding(req.query)
    return {"results": search_marker_trend(embedding, req.user_id, req.marker_name)}
