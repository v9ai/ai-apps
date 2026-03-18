"""Blood test upload & delete — LlamaIndex IngestionPipeline over Unstructured → R2 + PG.

The pipeline uses LlamaIndex abstractions end-to-end:
  1. Unstructured partition → LlamaIndex Document
  2. Custom BloodTestNodeParser → TextNode per marker + test summary + health state
  3. FastEmbedEmbedding (via LlamaIndex Settings) for vector generation
  4. IngestionPipeline orchestrates the transform + embed flow
  5. Persist to Neon PG via the db module
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import NodeParser
from llama_index.core.schema import BaseNode, MetadataMode, TextNode, TransformComponent

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


# ── Custom LlamaIndex node parser for blood tests ────────────────────


class BloodTestNodeParser(TransformComponent):
    """Transform a Document of raw Unstructured elements into clinical TextNodes.

    Produces three types of nodes:
      - blood_test: summary of entire test
      - blood_marker: one per extracted marker
      - health_state: derived metrics + risk classification
    """

    def __call__(self, nodes: list[BaseNode], **kwargs) -> list[BaseNode]:
        out: list[BaseNode] = []
        for node in nodes:
            if not isinstance(node, Document):
                out.append(node)
                continue

            meta = node.metadata
            elements = meta.get("_raw_elements", [])
            test_id = meta.get("test_id", "")
            user_id = meta.get("user_id", "")
            file_name = meta.get("file_name", "")
            uploaded_at = meta.get("uploaded_at", "")
            test_date = meta.get("test_date") or uploaded_at
            marker_ids: list[str] = meta.get("_marker_ids", [])

            markers = parse_markers(elements)
            if not markers:
                out.append(node)
                continue

            embed_meta = {"fileName": file_name, "uploadedAt": uploaded_at}
            marker_meta = {"fileName": file_name, "testDate": test_date}

            # 1. Test-level document
            test_doc = build_test_document(markers, embed_meta, test_id, user_id)
            out.append(test_doc)

            # 2. Per-marker nodes
            marker_nodes = build_marker_nodes(markers, marker_ids, test_id, user_id, marker_meta)
            out.extend(marker_nodes)

            # 3. Health-state node
            hs_node = build_health_state_node(markers, test_id, user_id, embed_meta)
            out.append(hs_node)

        return out


# ── LlamaIndex IngestionPipeline ─────────────────────────────────────


def build_ingestion_pipeline() -> IngestionPipeline:
    """Build a LlamaIndex IngestionPipeline with the blood test parser + FastEmbed."""
    return IngestionPipeline(
        transformations=[
            BloodTestNodeParser(),
            get_embed_model(),
        ],
    )


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


# ── PDF parsing via Unstructured ─────────────────────────────────────


def _partition_pdf(file_bytes: bytes, file_name: str) -> list[dict]:
    """Parse PDF/image with Unstructured (API or local)."""
    if settings.unstructured_api_key:
        from unstructured_client import UnstructuredClient
        from unstructured_client.models.shared import Strategy

        client = UnstructuredClient(api_key_auth=settings.unstructured_api_key)
        res = client.general.partition(
            partition_parameters={
                "files": {"content": file_bytes, "file_name": file_name},
                "strategy": Strategy.HI_RES,
            },
        )
        return list(res) if res else []
    else:
        import os
        import tempfile

        from unstructured.partition.auto import partition

        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_name)[1]) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            elements = partition(filename=tmp_path, strategy="hi_res")
            return [el.to_dict() for el in elements]
        finally:
            os.unlink(tmp_path)


# ── Routes ────────────────────────────────────────────────────────────


@router.post("/upload", response_model=UploadResponse)
async def upload_blood_test(
    file: UploadFile,
    user_id: str = Form(...),
    test_date: str | None = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    x_api_key: str | None = Header(None),
) -> UploadResponse:
    _check_api_key(x_api_key)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()
    file_path = f"{user_id}/{int(time.time() * 1000)}_{file.filename}"

    # Upload to R2
    upload_file(file_path, file_bytes, file.content_type or "application/pdf")

    # Insert blood_tests row
    test_id = insert_blood_test(
        user_id=user_id,
        file_name=file.filename,
        file_path=file_path,
        status="processing",
        test_date=test_date,
    )

    try:
        # Parse PDF → structured elements
        elements = _partition_pdf(file_bytes, file.filename)

        # Extract markers with 3-tier strategy
        markers = parse_markers(elements)

        # Store markers in PG
        marker_ids: list[str] = []
        if markers:
            marker_ids = insert_blood_markers(
                test_id, [m.to_dict() for m in markers],
            )

        update_blood_test_status(test_id, "done")

        # Run LlamaIndex IngestionPipeline in background (non-blocking)
        if markers:
            background_tasks.add_task(
                _run_ingestion,
                elements, test_id, user_id, file.filename, test_date, marker_ids,
            )

        return UploadResponse(test_id=test_id, markers_count=len(markers), status="done")

    except Exception as exc:
        update_blood_test_status(test_id, "error", str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


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
