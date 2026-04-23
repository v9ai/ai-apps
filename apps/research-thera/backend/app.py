"""FastAPI harness for research-thera LangGraph graphs.

Hosts the compiled graphs behind LangGraph-compatible endpoints so a Cloudflare
Container (see wrangler.jsonc) or any other container host can serve them
without running ``langgraph dev``. Matches the request shapes used by
``src/lib/langgraph-client.ts``:
  - ``POST /runs/wait``                            — blocking run
  - ``POST /threads``                              — open a background thread
  - ``POST /threads/{tid}/runs``                   — start a background run
  - ``GET  /threads/{tid}/runs/{rid}``             — poll run status
  - ``GET  /threads/{tid}/state``                  — fetch final graph state

Run locally:
    uvicorn app:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from research_agent.books_graph import graph as books_graph
from research_agent.deep_analysis_graph import graph as deep_analysis_graph
from research_agent.discussion_guide_graph import graph as discussion_guide_graph
from research_agent.generate_therapy_research_graph import (
    graph as generate_therapy_research_graph,
)
from research_agent.graph import graph as research_graph
from research_agent.habits_graph import graph as habits_graph
from research_agent.journal_analysis_graph import graph as journal_analysis_graph
from research_agent.parent_advice_graph import graph as parent_advice_graph
from research_agent.routine_analysis_graph import graph as routine_analysis_graph
from research_agent.story_graph import graph as story_graph
from research_agent.tts_graph import graph as tts_graph

log = logging.getLogger("research_thera_agent")

GRAPHS: dict[str, Any] = {
    "books": books_graph,
    "deep_analysis": deep_analysis_graph,
    "discussion_guide": discussion_guide_graph,
    "generate_therapy_research": generate_therapy_research_graph,
    "habits": habits_graph,
    "journal_analysis": journal_analysis_graph,
    "parent_advice": parent_advice_graph,
    "research": research_graph,
    "routine_analysis": routine_analysis_graph,
    "story": story_graph,
    "tts": tts_graph,
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


# ---------------------------------------------------------------------------
# Background-run endpoints (LangGraph-compatible subset).
#
# Backs the `startGraphRun` / `getGraphRunStatus` / `getGraphState` helpers in
# src/lib/langgraph-client.ts. State is kept in-process — fine for the
# single-instance Cloudflare Container (max_instances=1, sleepAfter=10m) where
# the calling Vercel function polls every 2s, keeping the container warm.
# ---------------------------------------------------------------------------


class _Thread:
    __slots__ = ("id", "runs")

    def __init__(self, thread_id: str) -> None:
        self.id = thread_id
        self.runs: dict[str, _Run] = {}


class _Run:
    __slots__ = ("id", "status", "task", "values", "error")

    def __init__(self, run_id: str, task: asyncio.Task) -> None:
        self.id = run_id
        self.status = "pending"
        self.task = task
        self.values: dict[str, Any] = {}
        self.error: str | None = None


_THREADS: dict[str, _Thread] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.post("/threads")
async def create_thread(_body: dict[str, Any] | None = None) -> dict[str, Any]:
    thread_id = str(uuid.uuid4())
    _THREADS[thread_id] = _Thread(thread_id)
    now = _now_iso()
    return {
        "thread_id": thread_id,
        "created_at": now,
        "updated_at": now,
        "metadata": {},
        "status": "idle",
        "config": {},
        "values": None,
    }


@app.post("/threads/{thread_id}/runs")
async def create_run(thread_id: str, req: RunRequest) -> dict[str, Any]:
    thread = _THREADS.get(thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail=f"Unknown thread_id: {thread_id}")
    graph = GRAPHS.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown assistant_id: {req.assistant_id}. Available: {sorted(GRAPHS.keys())}",
        )

    run_id = str(uuid.uuid4())
    config: dict[str, Any] = dict(req.config or {})
    config.setdefault("configurable", {})["thread_id"] = thread_id

    async def _execute() -> None:
        run = thread.runs[run_id]
        run.status = "running"
        try:
            result = await graph.ainvoke(req.input, config=config)
            run.values = result if isinstance(result, dict) else {"result": result}
            run.status = "success"
        except asyncio.CancelledError:
            run.status = "interrupted"
            raise
        except Exception as exc:  # noqa: BLE001 — surface any graph failure as run error
            log.exception("graph %s run %s failed", req.assistant_id, run_id)
            run.error = str(exc)
            run.values = {"error": str(exc)}
            run.status = "error"

    task = asyncio.create_task(_execute())
    thread.runs[run_id] = _Run(run_id, task)
    now = _now_iso()
    return {
        "run_id": run_id,
        "thread_id": thread_id,
        "assistant_id": req.assistant_id,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }


@app.get("/threads/{thread_id}/runs/{run_id}")
async def get_run(thread_id: str, run_id: str) -> dict[str, Any]:
    thread = _THREADS.get(thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail=f"Unknown thread_id: {thread_id}")
    run = thread.runs.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Unknown run_id: {run_id}")
    return {
        "run_id": run.id,
        "thread_id": thread_id,
        "status": run.status,
        "error": run.error,
    }


@app.get("/threads/{thread_id}/state")
async def get_thread_state(thread_id: str) -> dict[str, Any]:
    thread = _THREADS.get(thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail=f"Unknown thread_id: {thread_id}")
    # Return the most recently-completed run's values. In practice a thread
    # hosts exactly one run (the TS client pattern), so this is unambiguous.
    values: dict[str, Any] = {}
    for run in thread.runs.values():
        if run.status == "success" or run.status == "error":
            values = run.values
    return {"values": values}
