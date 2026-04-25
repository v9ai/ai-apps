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

# Import the 6 source graphs. Five have ``build_graph(checkpointer)``; the
# scholar wrapper defined in research_graphs.scholar does too.
from leadgen_agent.agentic_search_graph import (
    build_discovery_graph as _build_agentic_discovery,
    build_search_graph as _build_agentic_search,
)
from leadgen_agent.gh_patterns_graph import graph as _gh_patterns_graph
from leadgen_agent.lead_papers_graph import build_graph as _build_lead_papers
from leadgen_agent.research_agent_graph import build_graph as _build_research_agent

from research_graphs.scholar import build_graph as _build_scholar

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

# CF Container wall-clock is 5 min (default). A WARC fetch over Common Crawl
# averages ~2–4s per record at WARC_CONCURRENCY=8, so anything beyond ~80
# pages cannot reliably finish before the Container is killed — and the
# common_crawl graph has only a single node so the checkpointer cannot
# resume mid-fetch. Cap aggressively here to fail fast instead of silently
# truncating mid-run.
_COMMON_CRAWL_MAX_PAGES_LIMIT = 80

# Bound the in-memory async-run registry to avoid unbounded growth across the
# Container's 30-minute idle window when many fire-and-forget runs are issued.
_ASYNC_RUNS_CAP = 256


def _build_common_crawl(checkpointer: Any) -> Any:
    """common_crawl_graph has no public build_graph; it compiles at import.

    Recompile here with the shared checkpointer so long-running crawls can
    resume across restarts.
    """
    from langgraph.graph import END, START, StateGraph

    from leadgen_agent.common_crawl_graph import fetch_domain

    async def run_node(state: dict[str, Any]) -> dict[str, Any]:
        domain = state.get("domain")
        if not isinstance(domain, str) or not domain:
            raise ValueError("domain is required")
        max_pages = int(state.get("max_pages") or 15)
        if max_pages > _COMMON_CRAWL_MAX_PAGES_LIMIT:
            log.warning(
                "common_crawl: capping max_pages from %s to %s (CF Container wall-clock budget)",
                max_pages,
                _COMMON_CRAWL_MAX_PAGES_LIMIT,
            )
            max_pages = _COMMON_CRAWL_MAX_PAGES_LIMIT
        if max_pages < 1:
            raise ValueError("max_pages must be >= 1")
        dry_run = bool(state.get("dry_run") or False)
        stats = await fetch_domain(domain, max_pages, dry_run)
        return {
            "stats": {
                "domain": stats.domain,
                "crawl_id": stats.crawl_id,
                "pages_fetched": stats.pages_fetched,
                "pages_skipped_dedup": stats.pages_skipped_dedup,
                "persons_found": stats.persons_found,
                "emails_found": stats.emails_found,
                "contacts_upserted": stats.contacts_upserted,
                "snapshots_written": stats.snapshots_written,
            }
        }

    g: StateGraph = StateGraph(dict)
    g.add_node("run", run_node)
    g.add_edge(START, "run")
    g.add_edge("run", END)
    return g.compile(checkpointer=checkpointer)


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
        app.state.graphs = {
            "research_agent": _build_research_agent(checkpointer),
            "scholar": _build_scholar(checkpointer),
            "lead_papers": _build_lead_papers(checkpointer),
            "common_crawl": _build_common_crawl(checkpointer),
            "agentic_search": _build_agentic_search(checkpointer),
            "agentic_discovery": _build_agentic_discovery(checkpointer),
            # gh_patterns_graph.build_graph() doesn't accept a checkpointer
            # argument today; reuse the module-level compiled graph. State is
            # still persisted to Neon by the graph itself (gh_org_patterns /
            # gh_contributor_embeddings tables), so missing checkpoint resume
            # is not a correctness concern here.
            "gh_patterns": _gh_patterns_graph,
        }
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
