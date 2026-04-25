# ml container — bge_m3_embed LangGraph: texts -> 1024-dim L2-normalized vectors.
"""``bge_m3_embed`` leaf graph — BAAI/bge-m3 sentence-transformers encoder.

Single-node StateGraph. Validates input against ``BgeM3EmbedInput`` on entry
and output against ``BgeM3EmbedOutput`` on exit so the core-side
``RemoteGraph`` adapter can trust the shape at the network boundary.

No ``interrupt()`` anywhere: this graph is pure compute and must run to
completion (CI guard enforces this).
"""

from __future__ import annotations

import logging
import os
from typing import Any

import anyio
from langgraph.graph import END, START, StateGraph
from sentence_transformers import SentenceTransformer

from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
)

log = logging.getLogger(__name__)

MODEL_ID = "BAAI/bge-m3"
OUTPUT_DIM = 1024
MAX_SEQ_LEN = 512


def _pick_device() -> str:
    """CUDA > MPS > CPU. Mirrors ``scripts/bge_m3_server.py``.

    Probes MPS with a tiny tensor allocation: on CF Containers (Linux x86) and
    Linux/Intel macs, ``torch.backends.mps.is_available()`` can return True
    when torch was built without functional Metal support, then crash on the
    first real op. Fall back to CPU rather than killing the lifespan warm-up.
    """
    try:
        import torch
    except ImportError:  # pragma: no cover — torch is a hard dep
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        try:
            torch.zeros(1, device="mps")
            return "mps"
        except Exception:  # noqa: BLE001 — any failure → CPU
            log.warning("MPS reported available but probe failed; using CPU")
    return "cpu"


class _ModelHolder:
    """Lazy module-level singleton for the sentence-transformers model."""

    model: SentenceTransformer | None = None
    device: str = "cpu"


def _load_model() -> SentenceTransformer:
    device = _pick_device()
    log.info("Loading %s on device=%s", MODEL_ID, device)
    model = SentenceTransformer(MODEL_ID, device=device)
    model.max_seq_length = MAX_SEQ_LEN
    _ModelHolder.model = model
    _ModelHolder.device = device
    log.info("bge-m3 ready (dim=%d, max_seq=%d)", OUTPUT_DIM, MAX_SEQ_LEN)
    return model


def _get_model() -> SentenceTransformer:
    return _ModelHolder.model or _load_model()


async def _encode(state: dict[str, Any]) -> dict[str, Any]:
    """Validate input, run encoder off the event loop, validate output."""
    inp = BgeM3EmbedInput.model_validate(state)
    model = _get_model()

    batch_size = min(32, len(inp.texts)) or 1

    vectors = await anyio.to_thread.run_sync(
        lambda: model.encode(
            inp.texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
    )

    raw_output: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "vectors": [[float(x) for x in v] for v in vectors],
        "dim": OUTPUT_DIM,
        "model": MODEL_ID,
    }
    out = BgeM3EmbedOutput.model_validate(raw_output)
    return out.model_dump()


def _build() -> Any:
    builder: StateGraph = StateGraph(dict)
    builder.add_node("encode", _encode)
    builder.add_edge(START, "encode")
    builder.add_edge("encode", END)
    return builder.compile()


# Eager-load the model at import time when the container starts so the first
# request does not pay the load cost. Guarded by an env flag so tests can skip.
if os.environ.get("ML_EAGER_LOAD", "1") == "1":
    try:
        _load_model()
    except Exception:  # noqa: BLE001 — log but let /runs/wait surface the failure
        log.exception("eager bge-m3 load failed; first request will retry")


graph = _build()

__all__ = ["graph"]
