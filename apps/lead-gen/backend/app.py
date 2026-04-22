"""FastAPI harness for the 5 lead-gen LangGraph graphs.

Deploys to Hugging Face Spaces (Docker SDK) or any container host. Uses Neon
Postgres as the AsyncPostgresSaver checkpointer so threads persist across
restarts and the free-tier Space's sleep/wake cycle. Bearer-token middleware
gates non-public paths when ``LANGGRAPH_AUTH_TOKEN`` is set.

Run locally:
    uvicorn app:app --host 0.0.0.0 --port 7860

Endpoints:
    GET  /health    — cheap liveness; does not touch DB/LLM
    POST /runs/wait — {assistant_id, input, thread_id?} → final graph state

``/runs/wait`` matches the shape the Next.js client in
``src/lib/langgraph-client.ts`` already sends, so flipping ``LANGGRAPH_URL`` at
the client is the only change needed to cut over.
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

from leadgen_agent.admin_chat_graph import build_graph as build_admin_chat
from leadgen_agent.competitors_team_graph import build_graph as build_competitors_team
from leadgen_agent.contact_enrich_graph import build_graph as build_contact_enrich
from leadgen_agent.deep_icp_graph import build_graph as build_deep_icp
from leadgen_agent.email_compose_graph import build_graph as build_email_compose
from leadgen_agent.email_outreach_graph import build_graph as build_email_outreach
from leadgen_agent.email_reply_graph import build_graph as build_email_reply
from leadgen_agent.icp_team_graph import build_graph as build_icp_team
from leadgen_agent.score_contact_graph import build_graph as build_score_contact
from leadgen_agent.text_to_sql_graph import build_graph as build_text_to_sql

log = logging.getLogger("leadgen_agent")

# Paths the bearer middleware lets through so HF / tunnel providers / uptime
# monitors can probe without a credential.
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError(
            "DATABASE_URL env var is required. Use the Neon pooled connection "
            "string (hostname contains '-pooler') with sslmode=require."
        )

    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        # Idempotent: creates the checkpointer tables on first run, no-ops after.
        await checkpointer.setup()
        app.state.graphs = {
            "admin_chat": build_admin_chat(checkpointer),
            "competitors_team": build_competitors_team(checkpointer),
            "contact_enrich": build_contact_enrich(checkpointer),
            "deep_icp": build_deep_icp(checkpointer),
            "email_compose": build_email_compose(checkpointer),
            "email_outreach": build_email_outreach(checkpointer),
            "email_reply": build_email_reply(checkpointer),
            "icp_team": build_icp_team(checkpointer),
            "score_contact": build_score_contact(checkpointer),
            "text_to_sql": build_text_to_sql(checkpointer),
        }
        log.info("Graphs compiled with AsyncPostgresSaver: %s", list(app.state.graphs))
        yield


app = FastAPI(title="lead-gen LangGraph", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    # Optional: pass a stable thread_id to resume/append to an existing thread.
    # When omitted, the server generates a fresh id per call (matches the
    # stateless /runs/wait semantics the Next.js client relies on today).
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
