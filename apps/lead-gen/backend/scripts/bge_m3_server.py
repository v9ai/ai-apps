# Requires: fastapi, uvicorn, sentence-transformers, torch
"""BGE-M3 embedding server — local dev shim.

Serves ``BAAI/bge-m3`` as a local HTTP microservice on port
``ICP_EMBED_PORT`` (default ``7799``). Same URL (``POST /embed``), same
request shape (``{"texts": [...]}``), same response shape
(``{"vectors": [[...]], ...}``) consumed by
``backend/leadgen_agent/embeddings.py``.

Vectors are 1024-dim and L2-normalized (sentence-transformers handles
CLS pooling + normalization for ``BAAI/bge-m3``). Callers remain
responsible for adding the ``query:`` / ``passage:`` prefixes per BGE-M3
convention — ``embeddings.py`` already does this.

Run from ``backend/``:
    python scripts/bge_m3_server.py

In production this role is filled by the ml CF Container's
``bge_m3_embed`` LangGraph reachable via ``ICP_EMBED_URL``.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)

MODEL_ID = "BAAI/bge-m3"
OUTPUT_DIM = 1024
MAX_SEQ_LEN = 512


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
    dim: int
    model: str


def _pick_device() -> str:
    try:
        import torch
    except ImportError:  # pragma: no cover - torch is a hard dep
        return "cpu"
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        try:
            torch.zeros(1, device="mps")
            return "mps"
        except Exception:  # noqa: BLE001 — any failure → CPU
            log.warning("MPS reported available but probe failed; using CPU")
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


class _ModelHolder:
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


@asynccontextmanager
async def _lifespan(app: FastAPI):
    _load_model()
    yield


app = FastAPI(title="icp-embed (python)", lifespan=_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> str:
    return "ok"


@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest) -> dict[str, Any]:
    if not req.texts:
        return {"vectors": [], "dim": OUTPUT_DIM, "model": MODEL_ID}

    model = _ModelHolder.model or _load_model()
    try:
        import anyio

        vectors = await anyio.to_thread.run_sync(
            lambda: model.encode(
                req.texts,
                batch_size=min(32, len(req.texts)) or 1,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
        )
    except Exception as exc:  # noqa: BLE001 — surface any model failure as 500
        log.exception("embed failed")
        raise HTTPException(status_code=500, detail=f"embed: {exc}") from exc

    return {
        "vectors": [[float(x) for x in v] for v in vectors],
        "dim": OUTPUT_DIM,
        "model": MODEL_ID,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    import uvicorn

    port = int(os.environ.get("ICP_EMBED_PORT", "7799"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
