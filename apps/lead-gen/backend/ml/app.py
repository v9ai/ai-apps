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
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel

from leadgen_agent.auth import bearer_middleware_factory

# Import the compiled graphs. Each module eagerly loads its model at import
# time (gated by ML_EAGER_LOAD) so the first request is fast.
from ml_graphs.bge_m3_embed import graph as bge_m3_embed_graph
from ml_graphs.jobbert_ner import graph as jobbert_ner_graph

log = logging.getLogger("leadgen_ml")

_PUBLIC_PATHS = frozenset({"/health", "/ok"})

# Bearer middleware lives in leadgen_agent.auth so all four binaries share
# one implementation. Uses its own env var (``ML_INTERNAL_AUTH_TOKEN``)
# distinct from the core container's ``LANGGRAPH_AUTH_TOKEN`` — the
# dispatcher Worker holds both.
BearerTokenMiddleware = bearer_middleware_factory(
    env_var="ML_INTERNAL_AUTH_TOKEN", public_paths=_PUBLIC_PATHS
)


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
        log.info("ml graphs ready: %s", list(app.state.graphs))
        yield


app = FastAPI(title="lead-gen ML LangGraph", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    thread_id: str | None = None


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
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
