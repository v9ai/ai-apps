"""Blood test upload & delete — LangGraph `ingestion_graph` over LlamaParse → R2 + PG.

The POST /upload handler invokes the compiled `ingestion_graph.compiled_graph`
which wraps the flow as a StateGraph:

  upload_to_r2 → partition_pdf → extract_markers → store_in_db → embed_and_index
                                                                       │
                                          [failures route to ─> abort]

Embedding (LlamaIndex IngestionPipeline + FastEmbed) still runs in a FastAPI
background task so the HTTP response is returned as soon as markers are
persisted — the graph itself exposes that step as `embed_and_index`, which the
route invokes via a background task rather than as part of the synchronous
ainvoke.

TODO(team): when `langgraph.json` is updated by the sibling team, the new
graph should be registered as `"ingestion": "ingestion_graph:compiled_graph"`.

Delete behavior (`DELETE /blood-tests/{id}`) is unchanged — it bypasses the
graph and operates directly on `db.delete_blood_test` + `storage.delete_file`.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.schema import BaseNode, MetadataMode, TextNode

from config import settings
from db import (
    delete_blood_test,
    get_blood_test_file_path,
    insert_blood_markers,
    insert_blood_test,
    update_blood_test_status,
    upsert_blood_marker_embedding,
    upsert_blood_test_embedding,
    upsert_health_state_embedding,
)
from embeddings import (
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
    compute_derived_metrics,
    get_embed_model,
)
from ingestion_pipeline import BloodTestNodeParser, build_ingestion_pipeline
from parsers import Marker, parse_markers
from storage import delete_file, upload_file

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Auth guard ────────────────────────────────────────────────────────


def _check_api_key(x_api_key: str | None) -> None:
    if settings.internal_api_key and x_api_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Response models ───────────────────────────────────────────────────


class UploadResponse(BaseModel):
    test_id: str
    markers_count: int
    status: str


class DeleteResponse(BaseModel):
    deleted: bool


# ── Background embedding persist ────────────────────────────────────


def _persist_nodes(nodes: list[BaseNode]) -> None:
    """Write embedded nodes to the existing PG tables."""
    for node in nodes:
        if not isinstance(node, (TextNode, Document)):
            continue
        meta = node.metadata
        node_type = meta.get("node_type", "")
        embedding = node.embedding

        if not embedding:
            continue

        if node_type == "blood_test":
            upsert_blood_test_embedding(
                test_id=meta["test_id"],
                user_id=meta["user_id"],
                content=node.get_content(metadata_mode=MetadataMode.NONE),
                embedding=embedding,
            )
        elif node_type == "blood_marker":
            upsert_blood_marker_embedding(
                marker_id=meta["marker_id"],
                test_id=meta["test_id"],
                user_id=meta["user_id"],
                marker_name=meta["marker_name"],
                content=node.get_content(metadata_mode=MetadataMode.NONE),
                embedding=embedding,
            )
        elif node_type == "health_state":
            derived = meta.get("derived_metrics", {})
            upsert_health_state_embedding(
                test_id=meta["test_id"],
                user_id=meta["user_id"],
                content=node.get_content(metadata_mode=MetadataMode.NONE),
                derived_metrics=derived,
                embedding=embedding,
            )


def _run_ingestion(
    elements: list[dict],
    test_id: str,
    user_id: str,
    file_name: str,
    test_date: str | None,
    marker_ids: list[str],
) -> None:
    """Run the LlamaIndex IngestionPipeline and persist embedded nodes."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        doc = Document(
            text="",
            metadata={
                "_raw_elements": elements,
                "_marker_ids": marker_ids,
                "test_id": test_id,
                "user_id": user_id,
                "file_name": file_name,
                "uploaded_at": now_iso,
                "test_date": test_date or now_iso,
            },
            excluded_embed_metadata_keys=[
                "_raw_elements", "_marker_ids", "test_id",
                "user_id", "node_type",
            ],
            excluded_llm_metadata_keys=[
                "_raw_elements", "_marker_ids", "test_id",
                "user_id", "node_type",
            ],
        )

        pipeline = build_ingestion_pipeline()
        nodes = pipeline.run(documents=[doc])
        _persist_nodes(nodes)
    except Exception:
        logger.exception("Ingestion pipeline failed for test %s (non-blocking)", test_id)


# ── PDF parsing via LlamaParse ────────────────────────────────────────


def _partition_pdf(file_bytes: bytes, file_name: str) -> list[dict]:
    """Parse PDF/image with LlamaParse and convert output to element dicts."""
    import os
    import re
    import tempfile

    from llama_parse import LlamaParse

    parser = LlamaParse(
        api_key=settings.llama_cloud_api_key,
        result_type="markdown",
        content_guideline_instruction=(
            "This is a blood test / lab report document. "
            "Extract all biomarker names, numeric values, units of measurement, "
            "reference ranges, and abnormal flags. Preserve the tabular structure "
            "of lab results. Include any physician notes or interpretations."
        ),
        complemental_formatting_instruction=(
            "Format lab results as markdown tables with columns: "
            "| Marker | Value | Unit | Reference Range | Flag |. "
            "Separate different test panels with headers "
            "(e.g., ## Lipid Panel, ## CBC, ## Metabolic Panel)."
        ),
        continuous_mode=True,
        auto_mode=True,
        auto_mode_trigger_on_table_in_page=True,
        auto_mode_trigger_on_image_in_page=True,
    )
    suffix = os.path.splitext(file_name)[1] or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        docs = parser.load_data(tmp_path)
    finally:
        os.unlink(tmp_path)

    elements: list[dict] = []
    for doc in docs:
        elements.extend(_markdown_to_elements(doc.text))
    return elements


def _markdown_to_elements(md: str) -> list[dict]:
    """Convert LlamaParse markdown output to element dicts compatible with parse_markers."""
    import re

    table_re = re.compile(
        r"(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)",
        re.MULTILINE,
    )
    elements: list[dict] = []
    last = 0
    for m in table_re.finditer(md):
        pre = md[last : m.start()].strip()
        if pre:
            elements.append({"type": "NarrativeText", "text": pre, "metadata": {}})
        elements.append({
            "type": "Table",
            "text": "",
            "metadata": {"text_as_html": _md_table_to_html(m.group(0))},
        })
        last = m.end()
    tail = md[last:].strip()
    if tail:
        elements.append({"type": "NarrativeText", "text": tail, "metadata": {}})
    return elements


def _md_table_to_html(md_table: str) -> str:
    """Convert a markdown table to an HTML table string."""
    import re

    rows = []
    for line in md_table.strip().splitlines():
        line = line.strip()
        if not line.startswith("|") or re.match(r"^\|[-: |]+\|$", line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        rows.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
    return "<table>" + "".join(rows) + "</table>"


# ── Routes ────────────────────────────────────────────────────────────


@router.post("/upload", response_model=UploadResponse)
async def upload_blood_test(
    file: UploadFile,
    user_id: str = Form(...),
    test_date: str | None = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    x_api_key: str | None = Header(None),
) -> UploadResponse:
    """Upload a blood-test PDF.

    Invokes `ingestion_graph.compiled_graph` with `skip_embedding=True` so
    that `upload_to_r2 → partition_pdf → extract_markers → store_in_db` run
    synchronously inside the request, and the heavier `embed_and_index` step
    is scheduled as a FastAPI background task — preserving the legacy
    response-time characteristics.
    """
    from ingestion_graph import run_ingestion_graph

    _check_api_key(x_api_key)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()

    result = await run_ingestion_graph(
        pdf_bytes=file_bytes,
        file_name=file.filename,
        user_id=user_id,
        content_type=file.content_type or "application/pdf",
        test_date=test_date,
        skip_embedding=True,
    )

    if result.get("aborted"):
        raise HTTPException(status_code=500, detail=result.get("error") or "ingestion aborted")

    test_id: str = result["blood_test_id"]
    elements: list[dict] = result.get("elements") or []
    markers: list[dict] = result.get("markers") or []
    marker_ids: list[str] = result.get("marker_ids") or []

    # Defer embedding to a FastAPI background task — matches legacy behavior.
    if markers:
        background_tasks.add_task(
            _run_ingestion,
            elements, test_id, user_id, file.filename, test_date, marker_ids,
        )

    return UploadResponse(test_id=test_id, markers_count=len(markers), status="done")


@router.delete("/blood-tests/{test_id}", response_model=DeleteResponse)
async def delete_test(
    test_id: str,
    user_id: str,
    x_api_key: str | None = Header(None),
) -> DeleteResponse:
    _check_api_key(x_api_key)

    file_path = get_blood_test_file_path(test_id)
    delete_blood_test(test_id)

    if file_path:
        try:
            delete_file(file_path)
        except Exception:
            logger.warning("R2 cleanup failed for %s (non-blocking)", file_path)

    return DeleteResponse(deleted=True)
