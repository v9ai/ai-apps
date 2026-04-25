# ml container — FastAPI harness for the two leaf ML LangGraph graphs.
"""FastAPI wrapper for ``bge_m3_embed`` and ``jobbert_ner`` leaf graphs.

Deployed behind a Cloudflare Durable Object Container (see ``wrangler.jsonc``).
Not publicly routable — the dispatcher Worker reaches it via service binding.
The bearer token (``ML_INTERNAL_AUTH_TOKEN``) is belt-and-suspenders since the
container has no public ingress.

Endpoints:
    GET  /health    — cheap liveness; never touches DB/models.
    POST /runs/wait — {assistant_id, input, thread_id?} → final graph state.

Persistence uses Neon via ``AsyncPostgresSaver`` so threads survive container
sleep/wake. The two ml graphs are stateless by nature (pure compute leaves),
but we wire the checkpointer anyway for shape-parity with the core container.
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

# CF Container has no MPS/CUDA hardware; lock to CPU and enable the MPS-fallback
# hint BEFORE any torch / sentence-transformers import sees the env. This must
# precede the graph imports below (which transitively import torch). Setting
# PYTORCH_ENABLE_MPS_FALLBACK after torch import is a no-op on some builds.
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

from fastapi import FastAPI, HTTPException  # noqa: E402
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from leadgen_agent.auth import make_bearer_token_middleware  # noqa: E402
from leadgen_agent.observability import make_request_id_middleware  # noqa: E402

# Import the compiled graphs. Each module eagerly loads its model at import
# time (gated by ML_EAGER_LOAD) so the first request is fast.
from ml_graphs.bge_m3_embed import graph as bge_m3_embed_graph  # noqa: E402
from ml_graphs.jobbert_ner import graph as jobbert_ner_graph  # noqa: E402

log = logging.getLogger("leadgen_ml")

# Module-level readiness flag flipped by the lifespan after model warm-up
# completes. /health reports it so CF / load balancers don't route traffic to
# a Container whose JobBERT singletons are still downloading multi-GB weights.
_models_ready: bool = False

# Uses its own env var (``ML_INTERNAL_AUTH_TOKEN``) distinct from the core
# container's ``LANGGRAPH_AUTH_TOKEN`` — the dispatcher Worker holds both,
# letting one container's secret rotate without invalidating the other.
BearerTokenMiddleware = make_bearer_token_middleware("ML_INTERNAL_AUTH_TOKEN")

# Module-level readiness flag flipped by the lifespan after model warm-up
# completes. /health reports it so CF / load balancers don't route traffic to
# a Container whose JobBERT singletons are still downloading multi-GB weights.
_models_ready: bool = False


async def _warm_models() -> None:
    """Force singleton load for both model stacks before /health reports OK.

    bge_m3_embed already eager-loads on import (gated by ML_EAGER_LOAD), but
    jobbert_ner is purely lazy — the first /runs/wait pays the JobBERT-v3 +
    skill-classifier load cost (multi-GB on a cold image with no baked
    weights). Run both warmups off the event loop so the lifespan stays
    snappy and exceptions surface in logs without aborting startup (the
    Container should still come up; first request will retry the load).
    """
    global _models_ready
    if os.environ.get("ML_EAGER_LOAD", "1") != "1":
        log.info("ML_EAGER_LOAD=0 — skipping model warm-up")
        _models_ready = True
        return

    import anyio  # local import keeps lifespan import graph slim

    def _warm_bge() -> None:
        from ml_graphs.bge_m3_embed import _get_model

        _get_model()

    def _warm_jobbert() -> None:
        # Touch both the embedder and the NER classifier singletons.
        from leadgen_agent.jobbert_infer import _get_classifier, _get_embedder

        _get_embedder()
        _get_classifier()

    try:
        await anyio.to_thread.run_sync(_warm_bge)
        await anyio.to_thread.run_sync(_warm_jobbert)
        _models_ready = True
        log.info("ml model singletons warm")
    except Exception:  # noqa: BLE001 — surface in logs, don't kill the process
        log.exception("model warm-up failed; first request will retry")


async def _warm_models() -> None:
    """Force singleton load for both model stacks before /health reports OK.

    bge_m3_embed already eager-loads on import (gated by ML_EAGER_LOAD), but
    jobbert_ner is purely lazy — the first /runs/wait pays the JobBERT-v3 +
    skill-classifier load cost (multi-GB on a cold image with no baked
    weights). Run both warmups off the event loop so the lifespan stays
    snappy and exceptions surface in logs without aborting startup (the
    Container should still come up; first request will retry the load).
    """
    global _models_ready
    if os.environ.get("ML_EAGER_LOAD", "1") != "1":
        log.info("ML_EAGER_LOAD=0 — skipping model warm-up")
        _models_ready = True
        return

    import anyio  # local import keeps lifespan import graph slim

    def _warm_bge() -> None:
        from ml_graphs.bge_m3_embed import _get_model

        _get_model()

    def _warm_jobbert() -> None:
        # Touch both the embedder and the NER classifier singletons.
        from leadgen_agent.jobbert_infer import _get_classifier, _get_embedder

        _get_embedder()
        _get_classifier()

    try:
        await anyio.to_thread.run_sync(_warm_bge)
        await anyio.to_thread.run_sync(_warm_jobbert)
        _models_ready = True
        log.info("ml model singletons warm")
    except Exception:  # noqa: BLE001 — surface in logs, don't kill the process
        log.exception("model warm-up failed; first request will retry")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_url = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not db_url:
        # ML graphs are pure compute and do not strictly need a checkpointer.
        # Running without one keeps local dev simple; log loudly in prod.
        log.warning(
            "NEON_DATABASE_URL/DATABASE_URL unset — running ml graphs without "
            "a Postgres checkpointer. Threads will not persist across restarts."
        )
        app.state.graphs = {
            "bge_m3_embed": bge_m3_embed_graph,
            "jobbert_ner": jobbert_ner_graph,
        }
        await _warm_models()
        yield
        return

    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        await checkpointer.setup()
        # The graphs were compiled at module import without a checkpointer.
        # Re-wiring the checkpointer in-place on a compiled graph isn't
        # supported in LangGraph; since these leaves are stateless, we simply
        # expose the pre-compiled graphs. The checkpointer context is kept
        # open for shape-parity with the core container and for future
        # graphs that may want it.
        app.state.graphs = {
            "bge_m3_embed": bge_m3_embed_graph,
            "jobbert_ner": jobbert_ner_graph,
        }
        await _warm_models()
        log.info("ml graphs ready: %s", list(app.state.graphs))
        yield


app = FastAPI(title="lead-gen ML LangGraph", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)
# Added after bearer so it runs first (LIFO) — correlation id is attached to
# every response, including 401s that never reach a handler.
app.add_middleware(make_request_id_middleware())


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    thread_id: str | None = None


@app.get("/health")
async def health() -> dict[str, bool]:
    # Liveness only — never touches DB/models. ``ready`` reflects whether the
    # lifespan warm-up has finished loading model singletons; CF / load
    # balancers can route on it to avoid serving cold instances.
    return {"ok": True, "ready": _models_ready}


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    if not _models_ready:
        # Fail fast with 503 so the dispatcher Worker can retry, rather than
        # letting the request block on a multi-GB HF download mid-flight.
        raise HTTPException(
            status_code=503, detail="ml models not ready; warm-up in progress"
        )
    graph = app.state.graphs.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown assistant_id: {req.assistant_id}"
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    try:
        return await graph.ainvoke(req.input, config=config)
    except Exception as exc:  # noqa: BLE001 — surface validation/model errors
        log.exception("ml run failed (assistant=%s)", req.assistant_id)
        raise HTTPException(status_code=500, detail=f"run failed: {exc}") from exc
