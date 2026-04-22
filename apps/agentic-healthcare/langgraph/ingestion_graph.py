"""
LangGraph ingestion pipeline — port of the imperative FastAPI upload flow
(`routes/upload.py`) into a `StateGraph` with typed state and conditional
edges.

Topology:

    upload_to_r2 ──> partition_pdf ──> extract_markers ──> store_in_db ──> embed_and_index ──> END
           │                │                  │                 │
           │                │                  │                 └─[failure]─> abort
           │                │                  └─[no markers / parse error]──> abort
           │                └─[parse failure]────────────────────────────────> abort
           └─[upload failure]───────────────────────────────────────────────── END (error)

All nodes delegate to the existing helper modules — `storage.py`,
`parsers.py`, `db.py`, `ingestion_pipeline.py` — so the 3-tier parser
logic and LlamaIndex IngestionPipeline wiring are preserved untouched.

The "background" aspect of embed+index belongs to the FastAPI caller
(via `BackgroundTasks`). Inside the graph itself, `embed_and_index`
runs synchronously after `store_in_db`. The route can still choose to
invoke only the subgraph `upload_to_r2 → store_in_db` in the request
and defer `embed_and_index` to a background task — see `routes/upload.py`.

TODO(team): register this graph in `langgraph.json` under the key
`"ingestion": "ingestion_graph:compiled_graph"` when that file is
updated by the sibling team. Currently the file only exposes `chat`.

Exports:
  - `GraphState` — pydantic state model
  - `compiled_graph` — the compiled StateGraph ready for `.ainvoke(...)`
  - `run_ingestion_graph(...)` — async convenience wrapper matching the
    legacy imperative signature
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from db import (
    insert_blood_markers,
    insert_blood_test,
    update_blood_test_status,
)
from parsers import parse_markers
from storage import delete_file, upload_file

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# State
# ═══════════════════════════════════════════════════════════════════════════


class GraphState(BaseModel):
    """Typed state flowing through the ingestion graph.

    Inputs are set by the caller; intermediate fields are populated by
    the graph nodes. `error` / `aborted` drive the abort routing.
    """

    # Input
    pdf_bytes: bytes = b""
    file_name: str = ""
    user_id: str = ""
    content_type: str = "application/pdf"
    test_date: str | None = None

    # Populated by nodes
    blood_test_id: str = ""
    r2_key: str = ""
    elements: list[dict] = Field(default_factory=list)
    markers: list[dict] = Field(default_factory=list)
    marker_ids: list[str] = Field(default_factory=list)
    embedding_status: str = "pending"  # pending | running | done | failed | skipped

    # Failure handling
    error: str = ""
    aborted: bool = False


# ═══════════════════════════════════════════════════════════════════════════
# Nodes
# ═══════════════════════════════════════════════════════════════════════════


def upload_to_r2(state: GraphState) -> dict[str, Any]:
    """Upload PDF bytes to Cloudflare R2 and insert a blood_tests row.

    Calls: `storage.upload_file`, `db.insert_blood_test`.

    Preserves the existing R2 object-key format: `{user_id}/{ts_ms}_{file_name}`.
    """
    if not state.pdf_bytes or not state.file_name:
        return {"error": "missing pdf_bytes or file_name", "aborted": True}

    r2_key = f"{state.user_id}/{int(time.time() * 1000)}_{state.file_name}"

    try:
        upload_file(r2_key, state.pdf_bytes, state.content_type or "application/pdf")
    except Exception as exc:
        logger.exception("R2 upload failed for user %s", state.user_id)
        return {"error": f"r2_upload_failed: {exc}", "aborted": True}

    try:
        test_id = insert_blood_test(
            user_id=state.user_id,
            file_name=state.file_name,
            file_path=r2_key,
            status="processing",
            test_date=state.test_date,
        )
    except Exception as exc:
        logger.exception("DB insert_blood_test failed, cleaning up R2 object")
        try:
            delete_file(r2_key)
        except Exception:
            logger.warning("R2 cleanup failed for %s (non-blocking)", r2_key)
        return {"error": f"db_insert_failed: {exc}", "aborted": True}

    return {"r2_key": r2_key, "blood_test_id": test_id}


def partition_pdf(state: GraphState) -> dict[str, Any]:
    """Parse PDF/image via LlamaParse into element dicts.

    Imports the existing `_partition_pdf` helper from `routes.upload`
    to avoid duplicating the LlamaParse configuration. Keeps LlamaParse
    called directly (not via LlamaIndex wrapper) per the architecture
    note in memory.
    """
    try:
        from routes.upload import _partition_pdf
        elements = _partition_pdf(state.pdf_bytes, state.file_name)
    except Exception as exc:
        logger.exception("PDF partitioning failed for test %s", state.blood_test_id)
        return {"error": f"partition_failed: {exc}", "aborted": True}

    return {"elements": elements}


def extract_markers(state: GraphState) -> dict[str, Any]:
    """Run the 3-tier marker parser. Calls `parsers.parse_markers`.

    Tier 1: HTML table → Tier 2: Title + form-key-values → Tier 3: free text.
    An empty marker list is NOT a failure — some reports are narrative-only.
    """
    try:
        markers = parse_markers(state.elements)
    except Exception as exc:
        logger.exception("Marker extraction failed for test %s", state.blood_test_id)
        return {"error": f"extract_markers_failed: {exc}", "aborted": True}

    return {"markers": [m.to_dict() for m in markers]}


def store_in_db(state: GraphState) -> dict[str, Any]:
    """Persist parsed markers to PG and mark the test `done`.

    Calls: `db.insert_blood_markers`, `db.update_blood_test_status`.
    """
    marker_ids: list[str] = []
    try:
        if state.markers:
            marker_ids = insert_blood_markers(state.blood_test_id, state.markers)
        update_blood_test_status(state.blood_test_id, "done")
    except Exception as exc:
        logger.exception("DB persist failed for test %s", state.blood_test_id)
        return {"error": f"store_in_db_failed: {exc}", "aborted": True}

    return {"marker_ids": marker_ids}


def embed_and_index(state: GraphState) -> dict[str, Any]:
    """Run LlamaIndex IngestionPipeline (`BloodTestNodeParser` + FastEmbed)
    and persist embeddings.

    Delegates to the existing `_run_ingestion` helper in `routes.upload`,
    which wires up `ingestion_pipeline.build_ingestion_pipeline()` and
    writes to the three embedding tables via `db.upsert_*_embedding`.

    Exceptions here are non-fatal: the blood test row is already `done`
    and markers are persisted. We record `embedding_status="failed"` and
    continue to END rather than routing to `abort` (we do NOT want to
    delete the R2 object after a successful upload just because embeddings
    failed).
    """
    if not state.markers:
        return {"embedding_status": "skipped"}

    try:
        from routes.upload import _run_ingestion
        _run_ingestion(
            state.elements,
            state.blood_test_id,
            state.user_id,
            state.file_name,
            state.test_date,
            state.marker_ids,
        )
        return {"embedding_status": "done"}
    except Exception as exc:
        logger.exception("Embedding pipeline failed for test %s (non-fatal)", state.blood_test_id)
        return {"embedding_status": f"failed: {exc}"}


def abort(state: GraphState) -> dict[str, Any]:
    """Cleanup on failure: delete the R2 object (if uploaded) and mark
    the blood_tests row as `error`.

    Called from conditional edges when any upstream node sets `aborted=True`.
    """
    if state.r2_key:
        try:
            delete_file(state.r2_key)
        except Exception:
            logger.warning("R2 cleanup failed for %s (non-blocking)", state.r2_key)

    if state.blood_test_id:
        try:
            update_blood_test_status(
                state.blood_test_id, "error", state.error or "aborted"
            )
        except Exception:
            logger.warning("Failed to mark test %s as error", state.blood_test_id)

    return {"aborted": True}


# ═══════════════════════════════════════════════════════════════════════════
# Routing
# ═══════════════════════════════════════════════════════════════════════════


def _route_after(state: GraphState, next_node: str) -> str:
    """Generic conditional: route to `abort` if the previous node set
    `aborted=True`, otherwise proceed to `next_node`.
    """
    if state.aborted:
        return "abort"
    return next_node


def route_after_upload(state: GraphState) -> str:
    return _route_after(state, "partition_pdf")


def route_after_partition(state: GraphState) -> str:
    return _route_after(state, "extract_markers")


def route_after_extract(state: GraphState) -> str:
    return _route_after(state, "store_in_db")


def route_after_store(state: GraphState) -> str:
    return _route_after(state, "embed_and_index")


# ═══════════════════════════════════════════════════════════════════════════
# Graph assembly
# ═══════════════════════════════════════════════════════════════════════════


def build_graph() -> StateGraph:
    """Build and compile the ingestion StateGraph."""
    graph = StateGraph(GraphState)

    graph.add_node("upload_to_r2", upload_to_r2)
    graph.add_node("partition_pdf", partition_pdf)
    graph.add_node("extract_markers", extract_markers)
    graph.add_node("store_in_db", store_in_db)
    graph.add_node("embed_and_index", embed_and_index)
    graph.add_node("abort", abort)

    graph.set_entry_point("upload_to_r2")

    graph.add_conditional_edges("upload_to_r2", route_after_upload)
    graph.add_conditional_edges("partition_pdf", route_after_partition)
    graph.add_conditional_edges("extract_markers", route_after_extract)
    graph.add_conditional_edges("store_in_db", route_after_store)

    graph.add_edge("embed_and_index", END)
    graph.add_edge("abort", END)

    return graph


# Compiled graph — import this in routes/upload.py
compiled_graph = build_graph().compile()


async def run_ingestion_graph(
    *,
    pdf_bytes: bytes,
    file_name: str,
    user_id: str,
    content_type: str = "application/pdf",
    test_date: str | None = None,
    skip_embedding: bool = False,
) -> dict[str, Any]:
    """Execute the ingestion graph and return the final state dict.

    `skip_embedding=True` stops after `store_in_db` — useful when the
    caller wants to defer `embed_and_index` to a FastAPI background task.
    """
    initial_state = GraphState(
        pdf_bytes=pdf_bytes,
        file_name=file_name,
        user_id=user_id,
        content_type=content_type,
        test_date=test_date,
    )
    if skip_embedding:
        # Drive the graph manually up to store_in_db by invoking nodes
        # sequentially — keeps the graph definition single-sourced while
        # letting the route defer embedding. `compiled_graph.ainvoke`
        # always runs through to END; for the deferred case we fall
        # back to direct node calls.
        state = initial_state
        for step in (upload_to_r2, partition_pdf, extract_markers, store_in_db):
            update = step(state)
            state = state.model_copy(update=update)
            if state.aborted:
                abort(state)
                break
        return state.model_dump()

    result = await compiled_graph.ainvoke(initial_state.model_dump())
    return result
