"""Embedding generation + text formatters via local FastEmbed.

Uses BAAI/bge-large-en-v1.5 (1024-dim) running locally via ONNX Runtime.
Provides a LlamaIndex-compatible FastEmbedEmbedding so the
IngestionPipeline can use it as a transformation.
"""

from __future__ import annotations

import logging
import math
from typing import Any

from fastembed import TextEmbedding
from llama_index.core.schema import Document, MetadataMode, TextNode
from llama_index.embeddings.fastembed import FastEmbedEmbedding

from .parsers import Marker

logger = logging.getLogger(__name__)

# ── Local embedding model (ONNX, 1024-dim) ────────────────────────────

_LOCAL_MODEL = "BAAI/bge-large-en-v1.5"

_text_embed: TextEmbedding | None = None


def _get_local_model() -> TextEmbedding:
    """Lazy-init the local FastEmbed model (downloads on first use)."""
    global _text_embed
    if _text_embed is None:
        _text_embed = TextEmbedding(model_name=_LOCAL_MODEL)
        logger.info("FastEmbed model loaded: %s", _LOCAL_MODEL)
    return _text_embed


# ── Public helpers (used by graph.py, routes, etc.) ────────────────────


def generate_embedding(text: str) -> list[float]:
    model = _get_local_model()
    return [float(x) for x in next(model.embed([text]))]


async def agenerate_embedding(text: str) -> list[float]:
    return generate_embedding(text)


# ── LlamaIndex-compatible embed model ─────────────────────────────────

_li_embed: FastEmbedEmbedding | None = None


def get_embed_model() -> FastEmbedEmbedding:
    """Return a LlamaIndex-compatible FastEmbedEmbedding singleton."""
    global _li_embed
    if _li_embed is None:
        _li_embed = FastEmbedEmbedding(model_name=_LOCAL_MODEL)
    return _li_embed


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
    "triglyceride_hdl_ratio": {
        "label": "TG/HDL Ratio",
        "formula": "Triglycerides / HDL",
        "unit": "ratio",
        "optimal": (0, 2.0),
        "borderline": (2.0, 3.5),
        "significance": "Insulin resistance surrogate — correlates with small dense LDL particle count",
        "author": "McLaughlin et al.",
    },
    "total_cholesterol_hdl_ratio": {
        "label": "TC/HDL Ratio",
        "formula": "Total Cholesterol / HDL",
        "unit": "ratio",
        "optimal": (0, 4.0),
        "borderline": (4.0, 5.0),
        "significance": "Cardiovascular risk index — better predictor than LDL alone",
        "author": "Castelli et al.",
    },
    "hdl_ldl_ratio": {
        "label": "HDL/LDL Ratio",
        "formula": "HDL / LDL",
        "unit": "ratio",
        "optimal": (0.4, float("inf")),
        "borderline": (0.3, 0.4),
        "significance": "Atherogenic risk — inversely tracks plaque progression",
        "author": "Millán et al.",
    },
    "neutrophil_lymphocyte_ratio": {
        "label": "NLR",
        "formula": "Neutrophils / Lymphocytes",
        "unit": "ratio",
        "optimal": (1.0, 3.0),
        "borderline": (3.0, 5.0),
        "significance": "Systemic inflammation index — elevated in infection, stress, malignancy",
        "author": "Fest et al.",
    },
    "ast_alt_ratio": {
        "label": "De Ritis Ratio (AST/ALT)",
        "formula": "AST / ALT",
        "unit": "ratio",
        "optimal": (0.8, 1.5),
        "borderline": (1.5, 2.0),
        "significance": "Liver damage differentiation — high values suggest alcoholic or cardiac origin",
        "author": "De Ritis et al.",
    },
    "bun_creatinine_ratio": {
        "label": "BUN/Creatinine",
        "formula": "BUN / Creatinine",
        "unit": "ratio",
        "optimal": (10, 20),
        "borderline": (20, 25),
        "significance": "Renal function — distinguishes pre-renal from intrinsic kidney injury",
        "author": "Hosten et al.",
    },
    "glucose_triglyceride_index": {
        "label": "TyG Index",
        "formula": "ln(TG × Glucose × 0.5)",
        "unit": "index",
        "optimal": (0, 8.5),
        "borderline": (8.5, 9.0),
        "significance": "Metabolic syndrome predictor — validated against HOMA-IR gold standard",
        "author": "Simental-Mendía et al.",
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
