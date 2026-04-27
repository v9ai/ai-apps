"""Entity embedding routes — condition, medication, symptom, appointment.

All embedding operations are centralised in Python so every vector in the
database comes from the same FastEmbed model (bge-large-en-v1.5, 1024-dim).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..db import (
    upsert_appointment_embedding,
    upsert_condition_embedding,
    upsert_medication_embedding,
    upsert_symptom_embedding,
)
from ..embeddings import (
    format_appointment_for_embedding,
    format_condition_for_embedding,
    format_medication_for_embedding,
    format_symptom_for_embedding,
    generate_embedding,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/embed", tags=["embed"])


def _check_api_key(x_api_key: str | None) -> None:
    if settings.internal_api_key and x_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Request / response models ────────────────────────────────────────


class EmbedTextRequest(BaseModel):
    text: str


class EmbedTextResponse(BaseModel):
    embedding: list[float]


class ConditionRequest(BaseModel):
    condition_id: str
    user_id: str
    name: str
    notes: str | None = None


class MedicationRequest(BaseModel):
    medication_id: str
    user_id: str
    name: str
    dosage: str | None = None
    frequency: str | None = None
    notes: str | None = None


class SymptomRequest(BaseModel):
    symptom_id: str
    user_id: str
    description: str
    severity: str | None = None
    logged_at: str | None = None


class AppointmentRequest(BaseModel):
    appointment_id: str
    user_id: str
    title: str
    provider: str | None = None
    notes: str | None = None
    appointment_date: str | None = None


class EmbedResult(BaseModel):
    ok: bool


# ── Raw text → vector ────────────────────────────────────────────────


@router.post("/text", response_model=EmbedTextResponse)
async def embed_text(
    req: EmbedTextRequest,
    x_api_key: str | None = Header(None),
) -> EmbedTextResponse:
    """Generate an embedding vector for arbitrary text (e.g. search queries)."""
    _check_api_key(x_api_key)
    return EmbedTextResponse(embedding=generate_embedding(req.text))


# ── Condition ────────────────────────────────────────────────────────


@router.post("/condition", response_model=EmbedResult)
async def embed_condition(
    req: ConditionRequest,
    x_api_key: str | None = Header(None),
) -> EmbedResult:
    _check_api_key(x_api_key)
    content = format_condition_for_embedding(req.name, req.notes)
    embedding = generate_embedding(content)
    upsert_condition_embedding(
        condition_id=req.condition_id,
        user_id=req.user_id,
        content=content,
        embedding=embedding,
    )
    return EmbedResult(ok=True)


# ── Medication ───────────────────────────────────────────────────────


@router.post("/medication", response_model=EmbedResult)
async def embed_medication(
    req: MedicationRequest,
    x_api_key: str | None = Header(None),
) -> EmbedResult:
    _check_api_key(x_api_key)
    content = format_medication_for_embedding(
        req.name, dosage=req.dosage, frequency=req.frequency, notes=req.notes,
    )
    embedding = generate_embedding(content)
    upsert_medication_embedding(
        medication_id=req.medication_id,
        user_id=req.user_id,
        content=content,
        embedding=embedding,
    )
    return EmbedResult(ok=True)


# ── Symptom ──────────────────────────────────────────────────────────


@router.post("/symptom", response_model=EmbedResult)
async def embed_symptom(
    req: SymptomRequest,
    x_api_key: str | None = Header(None),
) -> EmbedResult:
    _check_api_key(x_api_key)
    content = format_symptom_for_embedding(
        req.description, severity=req.severity, logged_at=req.logged_at,
    )
    embedding = generate_embedding(content)
    upsert_symptom_embedding(
        symptom_id=req.symptom_id,
        user_id=req.user_id,
        content=content,
        embedding=embedding,
    )
    return EmbedResult(ok=True)


# ── Appointment ──────────────────────────────────────────────────────


@router.post("/appointment", response_model=EmbedResult)
async def embed_appointment(
    req: AppointmentRequest,
    x_api_key: str | None = Header(None),
) -> EmbedResult:
    _check_api_key(x_api_key)
    content = format_appointment_for_embedding(
        req.title,
        provider=req.provider,
        notes=req.notes,
        appointment_date=req.appointment_date,
    )
    embedding = generate_embedding(content)
    upsert_appointment_embedding(
        appointment_id=req.appointment_id,
        user_id=req.user_id,
        content=content,
        embedding=embedding,
    )
    return EmbedResult(ok=True)


# ── Re-embed blood test (from existing markers) ─────────────────────


class ReembedRequest(BaseModel):
    test_id: str
    user_id: str
    file_name: str
    test_date: str | None = None
    marker_ids: list[str]
    elements: list[dict]


@router.post("/reembed", response_model=EmbedResult)
async def reembed_blood_test(
    req: ReembedRequest,
    x_api_key: str | None = Header(None),
) -> EmbedResult:
    """Re-embed an existing blood test through the LlamaIndex IngestionPipeline."""
    _check_api_key(x_api_key)

    from routes.upload import _run_ingestion

    _run_ingestion(
        req.elements,
        req.test_id,
        req.user_id,
        req.file_name,
        req.test_date,
        req.marker_ids,
    )
    return EmbedResult(ok=True)
