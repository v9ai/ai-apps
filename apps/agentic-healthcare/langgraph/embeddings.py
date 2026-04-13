"""Embedding generation + text formatters via OpenAI-compatible API.

Uses httpx to call an OpenAI-compatible /v1/embeddings endpoint.
Provides a LlamaIndex-compatible BaseEmbedding subclass so the
IngestionPipeline can use it as a transformation.
"""

from __future__ import annotations

import logging
import math
from typing import Any, List

import httpx
from llama_index.core.base.embeddings.base import BaseEmbedding, Embedding
from llama_index.core.schema import Document, MetadataMode, TextNode

from config import settings as app_settings
from parsers import Marker

logger = logging.getLogger(__name__)

# ── httpx clients (lazy singletons) ────────────────────────────────────

_sync_client: httpx.Client | None = None
_async_client: httpx.AsyncClient | None = None


def _embed_url() -> str:
    url = app_settings.embed_api_url.rstrip("/")
    if not url.endswith("/v1"):
        url += "/v1"
    return url


def _embed_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {app_settings.embed_api_key}",
        "Content-Type": "application/json",
    }


def _get_sync_client() -> httpx.Client:
    global _sync_client
    if _sync_client is None:
        _sync_client = httpx.Client(
            base_url=_embed_url(),
            headers=_embed_headers(),
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0),
        )
    return _sync_client


def _get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None:
        _async_client = httpx.AsyncClient(
            base_url=_embed_url(),
            headers=_embed_headers(),
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0),
        )
    return _async_client


# ── Raw embedding calls ────────────────────────────────────────────────


def _call_embed_api(texts: list[str]) -> list[list[float]]:
    payload: dict[str, Any] = {
        "model": app_settings.embed_api_model,
        "input": texts,
    }
    if app_settings.embed_dimensions:
        payload["dimensions"] = app_settings.embed_dimensions
    resp = _get_sync_client().post("/embeddings", json=payload)
    resp.raise_for_status()
    data = resp.json()["data"]
    data.sort(key=lambda x: x["index"])
    return [d["embedding"] for d in data]


async def _acall_embed_api(texts: list[str]) -> list[list[float]]:
    payload: dict[str, Any] = {
        "model": app_settings.embed_api_model,
        "input": texts,
    }
    if app_settings.embed_dimensions:
        payload["dimensions"] = app_settings.embed_dimensions
    resp = await _get_async_client().post("/embeddings", json=payload)
    resp.raise_for_status()
    data = resp.json()["data"]
    data.sort(key=lambda x: x["index"])
    return [d["embedding"] for d in data]


# ── Public helpers (used by graph.py, routes, etc.) ────────────────────


def generate_embedding(text: str) -> list[float]:
    return _call_embed_api([text])[0]


async def agenerate_embedding(text: str) -> list[float]:
    return (await _acall_embed_api([text]))[0]


# ── LlamaIndex-compatible embed model ─────────────────────────────────


class APIEmbedding(BaseEmbedding):
    """LlamaIndex BaseEmbedding backed by an OpenAI-compatible API."""

    model_name: str = app_settings.embed_api_model

    def _get_query_embedding(self, query: str) -> Embedding:
        return generate_embedding(query)

    async def _aget_query_embedding(self, query: str) -> Embedding:
        return await agenerate_embedding(query)

    def _get_text_embedding(self, text: str) -> Embedding:
        return generate_embedding(text)

    async def _aget_text_embedding(self, text: str) -> Embedding:
        return await agenerate_embedding(text)

    def _get_text_embeddings(self, texts: List[str]) -> List[Embedding]:
        return _call_embed_api(texts)

    async def _aget_text_embeddings(self, texts: List[str]) -> List[Embedding]:
        return await _acall_embed_api(texts)


_embed_model: APIEmbedding | None = None


def get_embed_model() -> APIEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = APIEmbedding()
    return _embed_model


# ── Document / Node builders ────────────────────────────────────────


def build_test_document(
    markers: list[Marker],
    meta: dict[str, str],
    test_id: str,
    user_id: str,
) -> Document:
    """Build a LlamaIndex Document for an entire blood test."""
    content = format_test_for_embedding(markers, meta)
    return Document(
        doc_id=f"test:{test_id}",
        text=content,
        metadata={
            "test_id": test_id,
            "user_id": user_id,
            "file_name": meta["fileName"],
            "uploaded_at": meta["uploadedAt"],
            "marker_count": len(markers),
            "abnormal_count": sum(1 for m in markers if m.flag != "normal"),
            "node_type": "blood_test",
        },
    )


def build_marker_nodes(
    markers: list[Marker],
    marker_ids: list[str],
    test_id: str,
    user_id: str,
    meta: dict[str, str],
) -> list[TextNode]:
    """Build a LlamaIndex TextNode per individual marker."""
    nodes: list[TextNode] = []
    for marker, mid in zip(markers, marker_ids):
        content = format_marker_for_embedding(marker, meta)
        nodes.append(TextNode(
            id_=f"marker:{mid}",
            text=content,
            metadata={
                "marker_id": mid,
                "test_id": test_id,
                "user_id": user_id,
                "marker_name": marker.name,
                "flag": marker.flag,
                "node_type": "blood_marker",
            },
        ))
    return nodes


def build_health_state_node(
    markers: list[Marker],
    test_id: str,
    user_id: str,
    meta: dict[str, str],
) -> TextNode:
    """Build a LlamaIndex TextNode for the health-state embedding."""
    derived = compute_derived_metrics(markers)
    content = format_health_state_for_embedding(markers, derived, meta)
    return TextNode(
        id_=f"health_state:{test_id}",
        text=content,
        metadata={
            "test_id": test_id,
            "user_id": user_id,
            "derived_metrics": {k: v for k, v in derived.items() if v is not None},
            "node_type": "health_state",
        },
    )


# ── Text formatters ──────────────────────────────────────────────────


def format_test_for_embedding(
    markers: list[Marker],
    meta: dict[str, str],
) -> str:
    flagged = [m for m in markers if m.flag != "normal"]
    summary = (
        f"{len(flagged)} abnormal marker(s): {', '.join(f'{m.name} ({m.flag})' for m in flagged)}"
        if flagged
        else "All markers within normal range"
    )
    lines = [
        f"{m.name}: {m.value} {m.unit} (ref: {m.reference_range or 'N/A'}) [{m.flag}]"
        for m in markers
    ]
    return "\n".join([
        f"Blood test: {meta['fileName']}",
        f"Date: {meta['uploadedAt']}",
        f"Summary: {summary}",
        "",
        *lines,
    ])


def format_marker_for_embedding(
    marker: Marker,
    meta: dict[str, str],
) -> str:
    return "\n".join([
        f"Marker: {marker.name}",
        f"Value: {marker.value} {marker.unit}",
        f"Reference range: {marker.reference_range or 'N/A'}",
        f"Flag: {marker.flag}",
        f"Test: {meta['fileName']}",
        f"Date: {meta['testDate']}",
    ])


def format_condition_for_embedding(name: str, notes: str | None) -> str:
    return f"Health condition: {name}\nNotes: {notes}" if notes else f"Health condition: {name}"


def format_medication_for_embedding(
    name: str,
    *,
    dosage: str | None = None,
    frequency: str | None = None,
    notes: str | None = None,
) -> str:
    lines = [f"Medication: {name}"]
    if dosage:
        lines.append(f"Dosage: {dosage}")
    if frequency:
        lines.append(f"Frequency: {frequency}")
    if notes:
        lines.append(f"Notes: {notes}")
    return "\n".join(lines)


def format_symptom_for_embedding(
    description: str,
    *,
    severity: str | None = None,
    logged_at: str | None = None,
) -> str:
    lines = [f"Symptom: {description}"]
    if severity:
        lines.append(f"Severity: {severity}")
    if logged_at:
        lines.append(f"Date: {logged_at}")
    return "\n".join(lines)


def format_appointment_for_embedding(
    title: str,
    *,
    provider: str | None = None,
    notes: str | None = None,
    appointment_date: str | None = None,
) -> str:
    lines = [f"Appointment: {title}"]
    if provider:
        lines.append(f"Provider: {provider}")
    if appointment_date:
        lines.append(f"Date: {appointment_date}")
    if notes:
        lines.append(f"Notes: {notes}")
    return "\n".join(lines)


# ── Derived metrics ──────────────────────────────────────────────────

MARKER_ALIAS_MAP: dict[str, list[str]] = {
    "hdl": ["hdl", "hdl cholesterol", "hdl-c", "hdl-cholesterol"],
    "ldl": ["ldl", "ldl cholesterol", "ldl-c", "ldl-cholesterol"],
    "total_cholesterol": ["total cholesterol", "cholesterol total", "cholesterol"],
    "triglycerides": ["triglycerides", "triglyceride", "trig"],
    "glucose": ["glucose", "fasting glucose", "blood glucose"],
    "neutrophils": ["neutrophils", "neutrophil", "neutrophil count", "neut"],
    "lymphocytes": ["lymphocytes", "lymphocyte", "lymphocyte count", "lymph"],
    "bun": ["bun", "blood urea nitrogen", "urea nitrogen"],
    "creatinine": ["creatinine", "creat"],
    "ast": ["ast", "aspartate aminotransferase", "sgot"],
    "alt": ["alt", "alanine aminotransferase", "sgpt"],
}

METRIC_REFERENCES: dict[str, dict[str, Any]] = {
    "hdl_ldl_ratio": {
        "label": "HDL/LDL Ratio",
        "unit": "ratio",
        "optimal": (0.4, float("inf")),
        "borderline": (0.3, 0.4),
    },
    "total_cholesterol_hdl_ratio": {
        "label": "TC/HDL Ratio",
        "unit": "ratio",
        "optimal": (0, 4.5),
        "borderline": (4.5, 5.5),
    },
    "triglyceride_hdl_ratio": {
        "label": "TG/HDL Ratio",
        "unit": "ratio",
        "optimal": (0, 2.0),
        "borderline": (2.0, 3.5),
    },
    "glucose_triglyceride_index": {
        "label": "TyG Index",
        "unit": "index",
        "optimal": (0, 8.5),
        "borderline": (8.5, 9.0),
    },
    "neutrophil_lymphocyte_ratio": {
        "label": "NLR",
        "unit": "ratio",
        "optimal": (1.0, 3.0),
        "borderline": (3.0, 5.0),
    },
    "bun_creatinine_ratio": {
        "label": "BUN/Creatinine",
        "unit": "ratio",
        "optimal": (10, 20),
        "borderline": (20, 25),
    },
    "ast_alt_ratio": {
        "label": "De Ritis Ratio (AST/ALT)",
        "unit": "ratio",
        "optimal": (0.8, 1.2),
        "borderline": (1.2, 2.0),
    },
}


def classify_metric_risk(
    metric_key: str, value: float
) -> str:
    ref = METRIC_REFERENCES.get(metric_key)
    if not ref:
        return "optimal"
    opt_lo, opt_hi = ref["optimal"]
    bord_lo, bord_hi = ref["borderline"]
    if value < opt_lo:
        # Check if value falls in the borderline range below optimal
        if value >= bord_lo:
            return "borderline"
        return "low"
    if value <= opt_hi:
        return "optimal"
    if value <= bord_hi:
        return "borderline"
    return "elevated"


def compute_derived_metrics(markers: list[Marker]) -> dict[str, float | None]:
    lookup: dict[str, float] = {}
    for m in markers:
        try:
            lookup[m.name.lower().strip()] = float(m.value.replace(",", "."))
        except (ValueError, AttributeError):
            pass

    def resolve(key: str) -> float | None:
        aliases = MARKER_ALIAS_MAP.get(key)
        if not aliases:
            return None
        for alias in aliases:
            val = lookup.get(alias)
            if val is not None:
                return val
        return None

    def ratio(a: str, b: str) -> float | None:
        va, vb = resolve(a), resolve(b)
        if va is None or vb is None or vb == 0:
            return None
        return va / vb

    trig = resolve("triglycerides")
    gluc = resolve("glucose")
    gti = (
        math.log(trig * gluc * 0.5)
        if trig is not None and gluc is not None and trig > 0 and gluc > 0
        else None
    )

    return {
        "hdl_ldl_ratio": ratio("hdl", "ldl"),
        "total_cholesterol_hdl_ratio": ratio("total_cholesterol", "hdl"),
        "triglyceride_hdl_ratio": ratio("triglycerides", "hdl"),
        "glucose_triglyceride_index": gti,
        "neutrophil_lymphocyte_ratio": ratio("neutrophils", "lymphocytes"),
        "bun_creatinine_ratio": ratio("bun", "creatinine"),
        "ast_alt_ratio": ratio("ast", "alt"),
    }


def format_health_state_for_embedding(
    markers: list[Marker],
    derived_metrics: dict[str, float | None],
    meta: dict[str, str],
) -> str:
    flagged = [m for m in markers if m.flag != "normal"]
    summary = (
        f"{len(flagged)} abnormal marker(s): {', '.join(f'{m.name} ({m.flag})' for m in flagged)}"
        if flagged
        else "All markers within normal range"
    )

    metric_lines = []
    for k, v in derived_metrics.items():
        if v is not None:
            risk = classify_metric_risk(k, v)
            ref = METRIC_REFERENCES.get(k)
            label = ref["label"] if ref else k
            metric_lines.append(f"{label}: {v:.4f} [{risk}]")

    marker_lines = [
        f"{m.name}: {m.value} {m.unit} (ref: {m.reference_range or 'N/A'}) [{m.flag}]"
        for m in markers
    ]

    return "\n".join([
        f"Health state: {meta['fileName']}",
        f"Date: {meta['uploadedAt']}",
        f"Total markers: {len(markers)}",
        f"Summary: {summary}",
        "",
        "Derived metrics (with risk classification):",
        *(metric_lines if metric_lines else ["none computed"]),
        "",
        "All markers:",
        *marker_lines,
    ])
