"""FastAPI harness for the knowledge-app LangGraph graphs.

Mirrors apps/lead-gen/backend/app.py. Deploys to Cloudflare Containers and uses
Neon Postgres as the AsyncPostgresSaver checkpointer so threads persist across
the container's sleep/wake cycle. Bearer-token middleware gates non-public
paths when ``LANGGRAPH_AUTH_TOKEN`` is set.

Endpoints:
    GET  /health    — cheap liveness; does not touch DB/LLM
    POST /runs/wait — {assistant_id, input, thread_id?} → final graph state

``/runs/wait`` matches the shape the Next.js client in
``apps/knowledge/src/lib/langgraph-client.ts`` sends, so flipping
``LANGGRAPH_URL`` at the client is the only change needed to cut over.
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from knowledge_agent.app_prep_graph import build_graph as build_app_prep
from knowledge_agent.article_generate_graph import build_graph as build_article_generate
from knowledge_agent.chat_graph import build_graph as build_chat
from knowledge_agent.course_review_graph import build_graph as build_course_review
from knowledge_agent.memorize_generate_graph import build_graph as build_memorize_generate

log = logging.getLogger("knowledge_agent")

_PUBLIC_PATHS = frozenset({"/health", "/ok"})


class BearerTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        expected = os.environ.get("LANGGRAPH_AUTH_TOKEN")
        if not expected or request.url.path in _PUBLIC_PATHS:
            return await call_next(request)
        auth = request.headers.get("authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme.lower() != "bearer" or token != expected:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError(
            "DATABASE_URL env var is required. Use the Neon pooled connection "
            "string (hostname contains '-pooler') with sslmode=require."
        )

    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        await checkpointer.setup()
        app.state.graphs = {
            "chat": build_chat(checkpointer),
            "app_prep": build_app_prep(checkpointer),
            "memorize_generate": build_memorize_generate(checkpointer),
            "article_generate": build_article_generate(checkpointer),
            "course_review": build_course_review(checkpointer),
        }
        log.info("Graphs compiled: %s", list(app.state.graphs))
        yield


app = FastAPI(title="knowledge LangGraph", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    thread_id: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    graph = app.state.graphs.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown assistant_id: {req.assistant_id}"
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    return await graph.ainvoke(req.input, config=config)
