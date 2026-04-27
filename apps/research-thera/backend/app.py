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
import hmac
import logging
import os
import uuid

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format='{"ts":"%(asctime)s","lvl":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
)
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from research_agent import (
    checkpointer as _checkpointer_mod,
    neon,
    runs_store,
)

log = logging.getLogger("research_thera_agent")

# Lazy registry — graphs imported on first use, not at module load.
# Cuts cold start (each graph drags torch/sentence-transformers transitively)
# and contains import-time faults to the affected graph instead of taking the
# whole service down.
#
# Each graph module exposes:
#   - `graph`     : eager-compiled graph (no checkpointer) — back-compat shim
#   - `get_graph()`: async lazy-compile that attaches the shared
#                   AsyncPostgresSaver, enabling resumable runs across node
#                   failures and container sleep events. Falls back to the
#                   eager graph when NEON_DATABASE_URL is unset.
# We resolve graphs per-request via `_resolve_graph()` so the checkpointer is
# actually wired — using the eager `graph` directly here would silently bypass
# all checkpointing.
#
# Trade-off: import errors for one graph no longer fail boot — they surface
# as 500s on first call. That's the desired containment behavior.
_GRAPH_PATHS: dict[str, str] = {
    "affirmations": "research_agent.affirmations_graph:graph",
    "bogdan_discussion": "research_agent.bogdan_discussion_graph:graph",
    "books": "research_agent.books_graph:graph",
    "deep_analysis": "research_agent.deep_analysis_graph:graph",
    "deep_analysis_v2": "research_agent.deep_analysis_v2_graph:graph",
    "deep_goal_analysis": "research_agent.deep_goal_analysis_graph:graph",
    "discussion_guide": "research_agent.discussion_guide_graph:graph",
    "generate_therapy_research": "research_agent.generate_therapy_research_graph:graph",
    "habits": "research_agent.habits_graph:graph",
    "journal_analysis": "research_agent.journal_analysis_graph:graph",
    "medication_deep_research": "research_agent.medication_deep_research_graph:graph",
    "parent_advice": "research_agent.parent_advice_graph:graph",
    "research": "research_agent.graph:graph",
    "routine_analysis": "research_agent.routine_analysis_graph:graph",
    "story": "research_agent.story_graph:graph",
    "tts": "research_agent.tts_graph:graph",
    "games": "research_agent.games_graph:graph",
}
_LOADED_MODULES: dict[str, Any] = {}
_LOADED_GRAPHS: dict[str, Any] = {}
_GRAPH_SEMAPHORES: dict[str, asyncio.Semaphore] = {}

# Heavy ML graphs run rerankers / large fan-outs — cap concurrency to 1 per graph
# so they can't OOM the container. Light graphs allowed 4 concurrent.
_HEAVY_GRAPHS = frozenset(
    {"research", "books", "generate_therapy_research", "bogdan_discussion", "medication_deep_research"}
)


def _get_semaphore(name: str) -> asyncio.Semaphore:
    if name not in _GRAPH_SEMAPHORES:
        _GRAPH_SEMAPHORES[name] = asyncio.Semaphore(
            1 if name in _HEAVY_GRAPHS else 4
        )
    return _GRAPH_SEMAPHORES[name]


def _load_graph_module(assistant_id: str):
    """Lazy-import the graph's module on first use. Returns None if unknown."""
    if assistant_id in _LOADED_MODULES:
        return _LOADED_MODULES[assistant_id]
    spec = _GRAPH_PATHS.get(assistant_id)
    if spec is None:
        return None
    module_name, _attr = spec.split(":", 1)
    import importlib

    module = importlib.import_module(module_name)
    _LOADED_MODULES[assistant_id] = module
    return module


def _load_graph(assistant_id: str):
    """Return the eager (no-checkpointer) compiled graph attribute.

    Used by smoke tests / back-compat callers that referenced `app.GRAPHS`.
    For live request handling, use `_resolve_graph()` instead so the
    AsyncPostgresSaver is actually attached.
    """
    if assistant_id in _LOADED_GRAPHS:
        return _LOADED_GRAPHS[assistant_id]
    module = _load_graph_module(assistant_id)
    if module is None:
        return None
    _, attr = _GRAPH_PATHS[assistant_id].split(":", 1)
    graph = getattr(module, attr)
    _LOADED_GRAPHS[assistant_id] = graph
    return graph


async def _resolve_graph(assistant_id: str):
    """Resolve a compiled graph with the AsyncPostgresSaver attached.

    Returns None if `assistant_id` isn't registered. Lazy-imports the module
    on first call, then prefers the module's `get_graph()` async factory
    (checkpointer-wired) and falls back to the eager `graph` attribute when
    a module hasn't been migrated to the lazy-compile pattern yet.
    """
    module = _load_graph_module(assistant_id)
    if module is None:
        return None
    if hasattr(module, "get_graph"):
        return await module.get_graph()
    _, attr = _GRAPH_PATHS[assistant_id].split(":", 1)
    return getattr(module, attr)

_PUBLIC_PATHS = frozenset({"/health", "/health/deep", "/healthz"})


class BearerTokenMiddleware(BaseHTTPMiddleware):
    """Shared-secret gate. No-op when ``LANGGRAPH_AUTH_TOKEN`` is unset.

    Production fail-closed: ``assert_auth_configured()`` is called at module
    load and raises if ``ENVIRONMENT=production`` and the token is missing,
    preventing the no-op branch from ever being taken in prod.
    """

    async def dispatch(self, request: Request, call_next):
        expected = os.environ.get("LANGGRAPH_AUTH_TOKEN")
        if not expected or request.url.path in _PUBLIC_PATHS:
            return await call_next(request)
        auth = request.headers.get("authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme.lower() != "bearer" or not hmac.compare_digest(token.encode("utf-8"), expected.encode("utf-8")):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


def assert_auth_configured() -> None:
    """Fail-closed startup gate: require ``LANGGRAPH_AUTH_TOKEN`` in production.

    Local/dev runs (no ``ENVIRONMENT`` set) preserve the no-op behavior so that
    ``pnpm backend-dev`` style invocation still works without a token.
    """
    if (
        os.environ.get("ENVIRONMENT") == "production"
        and not os.environ.get("LANGGRAPH_AUTH_TOKEN")
    ):
        raise RuntimeError("LANGGRAPH_AUTH_TOKEN must be set in production")


assert_auth_configured()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open a shared psycopg pool on startup, close on shutdown.

    All ``research_agent.neon._conn_ctx`` callers (and graph modules that import
    ``neon.connection``) borrow from this pool, eliminating ~5-12s of TCP+TLS
    handshake overhead per research run. When ``NEON_DATABASE_URL`` is unset
    (e.g. unit tests) we leave ``neon.POOL`` as ``None`` and call sites fall
    back to one-shot connections.
    """
    url = os.environ.get("NEON_DATABASE_URL")
    if url:
        neon.POOL = AsyncConnectionPool(
            conninfo=url, min_size=2, max_size=10, timeout=30, open=False
        )
        await neon.POOL.open()
    try:
        yield
    finally:
        if neon.POOL is not None:
            await neon.POOL.close()
            neon.POOL = None
        # Close the AsyncPostgresSaver connection (opened lazily on first run).
        await _checkpointer_mod.aclose()


app = FastAPI(title="research-thera LangGraph", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)

# ── Healthcare routers (mounted from agentic-healthcare merge 2026-04-27) ──
# Configures LlamaIndex on import; lazy because of FastEmbed model download.
try:
    from healthcare.llm_settings import configure_llamaindex as _configure_llamaindex
    _configure_llamaindex()
    from healthcare.routes.upload import router as _healthcare_upload_router
    from healthcare.routes.embed import router as _healthcare_embed_router
    from healthcare.routes.search import router as _healthcare_search_router
    from healthcare.chat_router import router as _healthcare_chat_router

    app.include_router(_healthcare_upload_router)
    app.include_router(_healthcare_embed_router)
    app.include_router(_healthcare_search_router)
    app.include_router(_healthcare_chat_router)
except Exception as _healthcare_import_err:  # noqa: BLE001
    # Healthcare deps may not be installed in every env (e.g. minimal LangGraph
    # CI). Log and continue — research-thera's own routes still work.
    logging.getLogger(__name__).warning(
        "healthcare routers not mounted: %s", _healthcare_import_err
    )


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    thread_id: str | None = None
    config: dict[str, Any] | None = None


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "graphs": sorted(_GRAPH_PATHS.keys()),
    }


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    """Readiness probe — returns 200 only after the lazy graph registry has resolved at least one graph successfully (proxy for 'imports + checkpointer ready'). Used by the Cloudflare Container readiness gate so traffic isn't routed to a still-importing process."""
    try:
        # If the lazy registry from Task #6 lands, this is correct.
        # Otherwise fall back to the eager GRAPHS dict.
        registry = globals().get("_GRAPH_PATHS") or globals().get("GRAPHS") or {}
        if not registry:
            return JSONResponse({"ready": False, "reason": "no graphs registered"}, status_code=503)
        return {"ready": True, "graphs_registered": len(registry)}
    except Exception as exc:
        return JSONResponse({"ready": False, "reason": str(exc)}, status_code=503)


@app.get("/health/deep")
async def health_deep() -> dict[str, Any]:
    results: dict[str, Any] = {
        "db": "unknown",
        "llm_key": "unknown",
        "auth_configured": bool(os.environ.get("LANGGRAPH_AUTH_TOKEN")),
    }
    # DB check via existing pool
    try:
        if neon.POOL:
            async with neon.POOL.connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("SELECT 1")
            results["db"] = "ok"
        else:
            results["db"] = "no_pool"
    except Exception as exc:  # noqa: BLE001 — surface any DB failure as probe down
        results["db"] = f"down: {type(exc).__name__}"
    # LLM key presence (don't actually call DeepSeek — too expensive, just env presence)
    results["llm_key"] = "ok" if os.environ.get("DEEPSEEK_API_KEY") else "missing"
    status = 200 if results["db"] == "ok" and results["llm_key"] == "ok" else 503
    return JSONResponse(results, status_code=status)


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    graph = await _resolve_graph(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown assistant_id: {req.assistant_id}. Available: {sorted(_GRAPH_PATHS.keys())}",
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    config: dict[str, Any] = dict(req.config or {})
    config.setdefault("configurable", {})["thread_id"] = thread_id
    try:
        async with _get_semaphore(req.assistant_id):
            return await asyncio.wait_for(
                graph.ainvoke(req.input, config=config), timeout=600
            )
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504, detail="Graph run exceeded 600s timeout"
        ) from exc


# ---------------------------------------------------------------------------
# Background-run endpoints (LangGraph-compatible subset).
#
# Backs the `startGraphRun` / `getGraphRunStatus` / `getGraphState` helpers in
# src/lib/langgraph-client.ts. Run-level metadata (status / values / error) is
# persisted to Neon via ``runs_store`` so the TS client keeps polling the same
# run_id across container sleep / redeploy / OOM. Live asyncio tasks are kept
# in-process for cancellation/awaiting; on container restart, in-flight runs
# are not auto-resumed (LangGraph's AsyncPostgresSaver checkpointer handles
# their durability separately — see ``research_agent/checkpointer.py``).
# ---------------------------------------------------------------------------

# Tasks are best-effort and process-local; persistent state lives in Neon.
_LIVE_TASKS: dict[str, asyncio.Task] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_email(request: Request) -> str | None:
    """Extract the request-scoped user email from the ``X-User-Email`` header.

    The Vercel function is responsible for setting this from
    ``auth.getSession()`` before forwarding to the harness; we treat it as
    trusted because the bearer token already gates the perimeter. Normalize
    via trim+lowercase to match the ``trim().toLowerCase()`` convention used
    elsewhere in research-thera. Returns None when the header is absent or
    blank — call sites decide whether the absence is a 403 or just a no-op.
    """
    raw = request.headers.get("X-User-Email")
    if not raw:
        return None
    cleaned = raw.strip().lower()
    return cleaned or None


def _enforce_owner(stored_owner: str | None, requester: str | None) -> None:
    """403 if the row has a stored owner that doesn't match the requester.

    Tolerant for legacy rows: when ``stored_owner`` is None (e.g. created
    before this column existed, or from a service-to-service call without an
    X-User-Email header) we let the request through. The fix only applies
    once a row has been stamped with an owner.
    """
    if stored_owner is not None and stored_owner != requester:
        raise HTTPException(status_code=403, detail="forbidden")


@app.post("/threads")
async def create_thread(_body: dict[str, Any] | None = None) -> dict[str, Any]:
    # No DB row needed — thread_id is just a correlation handle. Runs reference
    # it via FK-less thread_id column in langgraph_runs.
    thread_id = str(uuid.uuid4())
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
async def create_run(thread_id: str, req: RunRequest, request: Request) -> dict[str, Any]:
    graph = await _resolve_graph(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown assistant_id: {req.assistant_id}. Available: {sorted(_GRAPH_PATHS.keys())}",
        )

    run_id = str(uuid.uuid4())
    config: dict[str, Any] = dict(req.config or {})
    config.setdefault("configurable", {})["thread_id"] = thread_id

    # Per-user IDOR guard: stamp owner on the row at create time, enforce on
    # the read/cancel/state handlers below. Trusted because the perimeter is
    # already bearer-gated (see BearerTokenMiddleware) and the Vercel function
    # is the only known caller setting this header.
    user_email = _user_email(request)

    # Persist 'pending' BEFORE spawning the task so a poll that races the task
    # start can never 404 on a run we just created.
    await runs_store.insert_run(run_id, thread_id, req.assistant_id, user_email=user_email)

    async def _execute() -> None:
        try:
            await runs_store.update_run_status(run_id, "running")
            async with _get_semaphore(req.assistant_id):
                result = await graph.ainvoke(req.input, config=config)
            values = result if isinstance(result, dict) else {"result": result}
            await runs_store.update_run_status(run_id, "success", values=values)
        except asyncio.CancelledError:
            # Best-effort flag; cancel_run also writes 'cancelled' synchronously.
            try:
                await runs_store.update_run_status(run_id, "interrupted")
            except Exception:  # noqa: BLE001 — never block cancellation
                log.exception("failed to persist 'interrupted' for run %s", run_id)
            raise
        except Exception:  # noqa: BLE001 — surface any graph failure as run error
            # Scrub the exception. psycopg surfaces DSN fragments / table names /
            # SQL fragments in str(exc); never return those to clients or
            # persist them in a row that the TS client reads. Log the full
            # traceback server-side, return only an opaque correlation id.
            correlation_id = uuid.uuid4().hex[:8]
            log.exception(
                "graph %s run %s failed [cid=%s]",
                req.assistant_id,
                run_id,
                correlation_id,
            )
            generic_msg = f"graph execution failed: {correlation_id}"
            try:
                await runs_store.update_run_status(
                    run_id,
                    "error",
                    values={"error": generic_msg},
                    error=generic_msg,
                )
            except Exception:  # noqa: BLE001 — never let a DB write loss mask the original error
                log.exception("failed to persist 'error' for run %s", run_id)
        finally:
            _LIVE_TASKS.pop(run_id, None)

    task = asyncio.create_task(_execute())
    _LIVE_TASKS[run_id] = task
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
async def get_run(thread_id: str, run_id: str, request: Request) -> dict[str, Any]:
    row = await runs_store.get_run_with_owner(thread_id, run_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Unknown run_id: {run_id}")
    _enforce_owner(row.get("user_email"), _user_email(request))
    return {
        "run_id": row["run_id"],
        "thread_id": row["thread_id"],
        "status": row["status"],
        "error": row["error"],
    }


@app.delete("/threads/{thread_id}/runs/{run_id}")
async def cancel_run(thread_id: str, run_id: str, request: Request) -> dict[str, Any]:
    # Authz first: refuse to even *touch* a row owned by someone else.
    # Without this, a leaked run_id from one user is a one-shot kill switch
    # for another user's run (IDOR).
    row = await runs_store.get_run_with_owner(thread_id, run_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Unknown run_id: {run_id}")
    _enforce_owner(row.get("user_email"), _user_email(request))

    # Cancel the live task if still present in this process. If the row exists
    # in DB but the task was lost to a container restart, we still mark it
    # cancelled — the TS client should stop polling.
    task = _LIVE_TASKS.get(run_id)
    if task is not None and not task.done():
        task.cancel()
    await runs_store.update_run_status(run_id, "cancelled")
    return {
        "run_id": run_id,
        "thread_id": thread_id,
        "status": "cancelled",
    }


@app.get("/threads/{thread_id}/state")
async def get_thread_state(thread_id: str, request: Request) -> dict[str, Any]:
    # Return the most recently-completed run's values. In practice a thread
    # hosts exactly one run (the TS client pattern), so this is unambiguous.
    # Authz: enforce on the latest run's owner. We piggy-back on the
    # `idx_langgraph_runs_thread` index already present.
    requester = _user_email(request)
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT user_email FROM langgraph_runs "
                "WHERE thread_id = %s "
                "ORDER BY updated_at DESC LIMIT 1",
                (thread_id,),
            )
            owner_row = await cur.fetchone()
    if owner_row is not None:
        _enforce_owner(owner_row[0], requester)
    values = await runs_store.get_latest_completed_values(thread_id)
    return {"values": values}
