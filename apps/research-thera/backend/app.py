"""FastAPI harness for research-thera LangGraph graphs.

Hosts the compiled graphs behind a LangGraph-compatible ``/runs/wait`` endpoint
so a Cloudflare Container (see wrangler.jsonc) or any other container host can
serve them without running ``langgraph dev``. Matches the request shape used by
``src/lib/langgraph-client.ts`` (``{assistant_id, input, config?}``).

Run locally:
    uvicorn app:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from research_agent.books_graph import graph as books_graph

log = logging.getLogger("research_thera_agent")

# Only graphs whose deps ship in the container image are registered here.
# `books` is self-contained (psycopg + openai). The research / story / tts /
# deep_analysis / parent_advice / habits graphs pull in `research-client[ml]`
# (torch, scipy, tokenizers) and the shared pypackages/deepseek module — add
# them here once the image is extended to vendor them.
GRAPHS: dict[str, Any] = {
    "books": books_graph,
}

_PUBLIC_PATHS = frozenset({"/health", "/ok"})


class BearerTokenMiddleware(BaseHTTPMiddleware):
    """Shared-secret gate. No-op when ``LANGGRAPH_AUTH_TOKEN`` is unset."""

    async def dispatch(self, request: Request, call_next):
        expected = os.environ.get("LANGGRAPH_AUTH_TOKEN")
        if not expected or request.url.path in _PUBLIC_PATHS:
            return await call_next(request)
        auth = request.headers.get("authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme.lower() != "bearer" or token != expected:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


app = FastAPI(title="research-thera LangGraph")
app.add_middleware(BearerTokenMiddleware)


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    thread_id: str | None = None
    config: dict[str, Any] | None = None


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "graphs": sorted(GRAPHS.keys())}


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    graph = GRAPHS.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown assistant_id: {req.assistant_id}. Available: {sorted(GRAPHS.keys())}",
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    config: dict[str, Any] = dict(req.config or {})
    config.setdefault("configurable", {})["thread_id"] = thread_id
    return await graph.ainvoke(req.input, config=config)
