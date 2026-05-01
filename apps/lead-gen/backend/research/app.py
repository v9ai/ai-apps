"""FastAPI harness for the 6 research graphs (CF Container).

Part of the lead-gen LangGraph split: this container owns the *research*
graphs (research_agent, scholar, lead_papers, common_crawl, agentic_search +
agentic_discovery, gh_patterns). The sibling core/ container keeps the hub
graphs and the ml/ container handles tensor-heavy ML inference.

Mirrors ``backend/app.py`` (the HF Spaces harness) but scoped to the research
subset. Same endpoint contract — ``POST /runs/wait`` with
``{assistant_id, input, thread_id?}`` — so the core hub's RemoteGraph client
can point at either backend interchangeably.

Env vars:
  NEON_DATABASE_URL               — pooled Neon URL (sslmode=require)
  RESEARCH_INTERNAL_AUTH_TOKEN    — bearer token for non-public endpoints
  DEEPSEEK_API_KEY / LLM_BASE_URL / LLM_MODEL — for research_agent loops
  SEMANTIC_SCHOLAR_API_KEY        — polite-pool key (optional)
  GITHUB_TOKEN                    — lead_papers + gh_patterns
  OPENALEX_MAILTO                 — polite-pool mailto (optional)
  BRAVE_API_KEY                   — if enabled by downstream graphs

Run locally:
    uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import importlib
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel

from leadgen_agent.auth import make_bearer_token_middleware
from leadgen_agent.observability import make_request_id_middleware

from research_graphs.registry import GRAPHS, GraphSpec

log = logging.getLogger("leadgen_research")

# Only paths actually defined below should bypass auth. `/ok` was listed
# historically but no handler exists, so leaving it in the allow-list is dead
# config that confuses the bearer-token gate's audit surface.
_PUBLIC_PATHS = frozenset({"/health"})

# Shared factory — single source of truth in ``leadgen_agent/auth.py``. The
# class name is re-exported so existing imports keep working.
BearerTokenMiddleware = make_bearer_token_middleware(
    "RESEARCH_INTERNAL_AUTH_TOKEN", public_paths=_PUBLIC_PATHS
)

# Bound the in-memory async-run registry to avoid unbounded growth across the
# Container's 30-minute idle window when many fire-and-forget runs are issued.
_ASYNC_RUNS_CAP = 256


def _compile_one(spec: GraphSpec, checkpointer: Any) -> Any:
    """Compile one research graph from its registry spec.

    A spec with ``builder_attr=None`` references a precompiled graph (e.g.
    ``gh_patterns``); use the module-level instance directly. Otherwise call
    the named builder with the supplied checkpointer.
    """
    mod = importlib.import_module(spec.module)
    if spec.builder_attr is None:
        return getattr(mod, spec.compiled_attr)
    return getattr(mod, spec.builder_attr)(checkpointer)


def _compile_all(checkpointer: Any) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for spec in GRAPHS:
        try:
            out[spec.assistant_id] = _compile_one(spec, checkpointer)
        except Exception:  # noqa: BLE001
            log.exception("research graph compile failed: %s", spec.assistant_id)
    return out


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_url = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not db_url:
        raise RuntimeError(
            "NEON_DATABASE_URL (or DATABASE_URL) is required. Use the pooled "
            "Neon URL (hostname contains '-pooler') with sslmode=require."
        )

    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        await checkpointer.setup()
        app.state.graphs = _compile_all(checkpointer)
        log.info(
            "research container: compiled graphs=%s",
            list(app.state.graphs),
        )
        yield


app = FastAPI(title="lead-gen research", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)
# Added after bearer so it runs first (LIFO) — correlation id is attached to
# every response, including 401s that never reach a handler.
app.add_middleware(make_request_id_middleware())


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    thread_id: str | None = None


@app.get("/health")
async def health() -> dict[str, Any]:
    """Liveness + readiness for the CF Container probe.

    We deliberately do NOT contact Neon here — the lifespan already verified
    ``NEON_DATABASE_URL`` is set and that ``AsyncPostgresSaver.setup()``
    succeeded; if either had failed, the worker process would have exited and
    Cloudflare would not be routing traffic to us anyway. Reporting the
    compiled-graph count is enough to distinguish "process up but lifespan
    crashed" from a healthy container.
    """
    graphs = getattr(app.state, "graphs", None) or {}
    if not graphs:
        # 200 with status=starting so CF doesn't immediately recycle us during
        # cold-start; the readiness signal is graphs_compiled > 0.
        return {"status": "starting", "graphs_compiled": 0}
    return {"status": "ok", "graphs_compiled": len(graphs)}


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    graphs = getattr(app.state, "graphs", None) or {}
    graph = graphs.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown assistant_id: {req.assistant_id}",
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    return await graph.ainvoke(req.input, config=config)


# Minimal async run surface (thread + run) for parity with the core harness.
# Keeps the RemoteGraph client's non-blocking callsites working without having
# to special-case this container.
_async_runs: dict[str, dict[str, Any]] = {}
_async_run_tasks: set[asyncio.Task[None]] = set()


class ThreadCreateRequest(BaseModel):
    metadata: dict[str, Any] | None = None


class ThreadCreateResponse(BaseModel):
    thread_id: str


@app.post("/threads", response_model=ThreadCreateResponse)
async def create_thread(
    req: ThreadCreateRequest | None = None,
) -> ThreadCreateResponse:
    return ThreadCreateResponse(thread_id=str(uuid.uuid4()))


class ThreadRunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    multitask_strategy: str | None = None


class ThreadRunResponse(BaseModel):
    run_id: str
    thread_id: str
    status: str


async def _run_graph_bg(
    run_id: str,
    thread_id: str,
    assistant_id: str,
    payload: dict[str, Any],
) -> None:
    record = _async_runs[run_id]
    graphs = getattr(app.state, "graphs", None) or {}
    graph = graphs.get(assistant_id)
    if graph is None:
        record["status"] = "error"
        record["error"] = f"Unknown assistant_id: {assistant_id}"
        return
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    try:
        result = await graph.ainvoke(payload, config=config)
        record["output"] = result
        record["status"] = "success"
    except asyncio.CancelledError:
        raise
    except Exception as exc:  # noqa: BLE001
        log.exception(
            "background research run failed (run_id=%s assistant=%s)",
            run_id,
            assistant_id,
        )
        record["status"] = "error"
        record["error"] = str(exc)[:1000]
        try:
            from leadgen_agent.notify import notify_error

            await notify_error(payload, str(exc))
        except Exception:  # noqa: BLE001 — webhook delivery is best-effort
            log.warning("notify_error webhook failed for run_id=%s", run_id)


@app.post("/threads/{thread_id}/runs", response_model=ThreadRunResponse)
async def create_thread_run(
    thread_id: str, req: ThreadRunRequest
) -> ThreadRunResponse:
    graphs = getattr(app.state, "graphs", None) or {}
    if req.assistant_id not in graphs:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown assistant_id: {req.assistant_id}",
        )
    run_id = str(uuid.uuid4())
    # Bound the in-memory registry: when over cap, evict the oldest *terminal*
    # entries first (success/error) before touching anything still running. We
    # rely on dict insertion order, which is stable in Python 3.7+.
    if len(_async_runs) >= _ASYNC_RUNS_CAP:
        for stale_id in list(_async_runs.keys()):
            if len(_async_runs) < _ASYNC_RUNS_CAP:
                break
            if _async_runs[stale_id].get("status") in ("success", "error"):
                _async_runs.pop(stale_id, None)
    _async_runs[run_id] = {
        "thread_id": thread_id,
        "assistant_id": req.assistant_id,
        "status": "running",
        "output": None,
        "error": None,
    }
    task = asyncio.create_task(
        _run_graph_bg(run_id, thread_id, req.assistant_id, req.input)
    )
    _async_run_tasks.add(task)
    task.add_done_callback(_async_run_tasks.discard)
    return ThreadRunResponse(
        run_id=run_id, thread_id=thread_id, status="pending"
    )


@app.get("/threads/{thread_id}/runs/{run_id}")
async def get_thread_run(thread_id: str, run_id: str) -> dict[str, Any]:
    record = _async_runs.get(run_id)
    if record is None:
        return {"status": "unknown", "thread_id": thread_id, "run_id": run_id}
    if record["thread_id"] != thread_id:
        raise HTTPException(
            status_code=404, detail="run does not belong to thread"
        )
    return {
        "run_id": run_id,
        "thread_id": thread_id,
        "status": record["status"],
        "output": record.get("output"),
        "error": record.get("error"),
    }
