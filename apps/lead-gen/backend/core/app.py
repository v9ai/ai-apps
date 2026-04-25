"""FastAPI harness for the lead-gen LangGraph **core** container.

This is the hub of the 3-container split (core / ml / research). It compiles
every in-process graph against a shared Neon ``AsyncPostgresSaver`` and — for
the 8 cross-container boundaries enumerated in
``core.remote_graphs._ADAPTER_BUILDERS`` — exposes thin RemoteGraph adapters
under ``app.state.remote_adapters`` so individual graphs can register a
remote node with::

    from core.remote_graphs import get_jobbert_ner_adapter
    builder.add_node("extract_skills", get_jobbert_ner_adapter())

The ``/runs/wait`` + ``/threads/*`` surface matches what
``src/lib/langgraph-client.ts`` already calls, so flipping ``LANGGRAPH_URL``
client-side is the only cut-over required.

Bearer-token middleware gates every non-public path when
``LANGGRAPH_AUTH_TOKEN`` is set. The dispatcher Worker forwards the header.

The 13 LinkedIn-extension REST routes that used to live in
``scripts/linkedin_posts_server.py`` are mounted at ``/linkedin/*`` so the
core container shares its Neon pool with the extension traffic — one
connection pool, one deploy.

Endpoints:
    GET  /health    — cheap liveness; does not touch DB/LLM
    POST /runs/wait — {assistant_id, input, thread_id?} → final graph state
    POST /threads   — mint a thread_id
    POST /threads/{tid}/runs  — fire-and-forget run; webhook carries the result
    GET  /threads/{tid}/runs/{rid}  — poll run status
    POST /dispatch/positioning-all — fan-out positioning over all products
    POST /dispatch/lead-gen-teams  — fan-out lead_gen_team over products × segments
    ANY  /linkedin/*  — Chrome-extension API (see core.linkedin_api)

Run locally:
    uvicorn app:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

import psycopg
from fastapi import FastAPI, HTTPException
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel

from leadgen_agent.admin_chat_graph import build_graph as build_admin_chat
from leadgen_agent.auth import make_bearer_token_middleware
from leadgen_agent.observability import make_request_id_middleware
from leadgen_agent.classify_paper_graph import build_graph as build_classify_paper
from leadgen_agent.company_discovery_graph import (
    build_graph as build_company_discovery,
)
from leadgen_agent.company_enrichment_graph import (
    build_graph as build_company_enrichment,
)
from leadgen_agent.competitors_team_graph import (
    build_graph as build_competitors_team,
)
from leadgen_agent.contact_discovery_graph import (
    build_graph as build_contact_discovery,
)
from leadgen_agent.contact_enrich_graph import build_graph as build_contact_enrich
from leadgen_agent.contact_enrich_paper_author_graph import (
    build_batch_graph as build_contact_enrich_paper_authors_batch,
    build_graph as build_contact_enrich_paper_author,
)
from leadgen_agent.contact_enrich_sales_graph import (
    build_graph as build_contact_enrich_sales,
)
from leadgen_agent.deep_icp_graph import build_graph as build_deep_icp
from leadgen_agent.email_compose_graph import build_graph as build_email_compose
from leadgen_agent.email_outreach_graph import build_graph as build_email_outreach
from leadgen_agent.email_reply_graph import build_graph as build_email_reply
from leadgen_agent.gtm_graph import build_graph as build_gtm
from leadgen_agent.icp_team_graph import build_graph as build_icp_team
from leadgen_agent.lead_gen_team_graph import build_graph as build_lead_gen_team
from leadgen_agent.positioning_graph import build_graph as build_positioning
from leadgen_agent.pricing_graph import build_graph as build_pricing
from leadgen_agent.product_intel_graph import build_graph as build_product_intel
from leadgen_agent.score_contact_graph import build_graph as build_score_contact
from leadgen_agent.text_to_sql_graph import build_graph as build_text_to_sql

from core.linkedin_api import ensure_linkedin_tables, router as linkedin_router
from core.remote_graphs import aclose_all_adapters, build_all_remote_adapters

log = logging.getLogger("leadgen_agent")

# Paths the bearer middleware lets through so uptime monitors and the
# dispatcher Worker's health probe can run without credentials. Includes
# ``/ready`` (FastAPI readiness probe) on top of the shared default set.
_PUBLIC_PATHS = frozenset({"/health", "/ready", "/ok", "/info"})

# Shared factory — single source of truth lives in ``leadgen_agent/auth.py``.
# We re-export the class name so existing imports/tests keep working.
BearerTokenMiddleware = make_bearer_token_middleware(
    "LANGGRAPH_AUTH_TOKEN", public_paths=_PUBLIC_PATHS
)


def _build_optional_graphs(checkpointer: Any) -> dict[str, Any]:
    """Compile graphs that were only added after the 3-container split.

    These modules land in this container but the imports are done lazily
    inside this helper so a missing-symbol error surfaces as a clear log
    line at boot instead of an ImportError during uvicorn startup — the
    bootstrap logic for the companies_verify / company_cleanup / pipeline /
    vertical_discovery / consultancies_discovery modules is in motion and
    signatures may drift.
    """
    out: dict[str, Any] = {}
    optional_specs = [
        ("analyze_product_v2", "leadgen_agent.product_intel_v2_graph", "build_graph"),
        ("freshness", "leadgen_agent.freshness_graph", "build_graph"),
        ("deep_scrape", "leadgen_agent.deep_scrape_graph", "build_graph"),
        ("deep_competitor", "leadgen_agent.deep_competitor_graph", "build_graph"),
        ("vertical_discovery", "leadgen_agent.vertical_discovery_graph", "build_graph"),
        ("pipeline", "leadgen_agent.pipeline_graph", "build_graph"),
        (
            "consultancies_discovery",
            "leadgen_agent.consultancies_discovery_graph",
            "build_graph",
        ),
        ("companies_verify", "leadgen_agent.companies_verify_graph", "build_graph"),
        ("company_cleanup", "leadgen_agent.company_cleanup_graph", "build_graph"),
    ]
    for assistant_id, module_path, attr in optional_specs:
        try:
            mod = __import__(module_path, fromlist=[attr])
            builder = getattr(mod, attr)
            out[assistant_id] = builder(checkpointer)
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "optional graph %s not compiled (%s: %s); endpoint will 404",
                assistant_id,
                type(exc).__name__,
                exc,
            )
    return out


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_url = (
        os.environ.get("DATABASE_URL", "").strip()
        or os.environ.get("NEON_DATABASE_URL", "").strip()
    )
    if not db_url:
        raise RuntimeError(
            "DATABASE_URL (or NEON_DATABASE_URL) env var is required. Use the "
            "Neon pooled connection string (hostname contains '-pooler') with "
            "sslmode=require."
        )

    # Ensure LinkedIn cache tables exist before the Chrome-extension routes
    # start serving traffic. Idempotent — runs the CREATE TABLE IF NOT EXISTS
    # once per cold start.
    #
    # ``ensure_linkedin_tables`` opens a sync ``psycopg.connect`` which would
    # block the asyncio event loop on cold-start (CF marks the Container
    # "alive" while uvicorn cannot service /health). Push the blocking call
    # into a worker thread so the loop stays responsive.
    try:
        await asyncio.to_thread(ensure_linkedin_tables)
    except Exception:  # noqa: BLE001
        log.exception(
            "ensure_linkedin_tables failed — /linkedin/* endpoints may 500 "
            "until the DDL runs"
        )

    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        # Idempotent: creates the checkpointer tables on first run, no-ops after.
        await checkpointer.setup()
        graphs: dict[str, Any] = {
            "admin_chat": build_admin_chat(checkpointer),
            "classify_paper": build_classify_paper(checkpointer),
            "company_discovery": build_company_discovery(checkpointer),
            "company_enrichment": build_company_enrichment(checkpointer),
            "competitors_team": build_competitors_team(checkpointer),
            "contact_discovery": build_contact_discovery(checkpointer),
            "contact_enrich": build_contact_enrich(checkpointer),
            "contact_enrich_sales": build_contact_enrich_sales(checkpointer),
            "contact_enrich_paper_author": build_contact_enrich_paper_author(
                checkpointer
            ),
            "contact_enrich_paper_authors_batch": build_contact_enrich_paper_authors_batch(
                checkpointer
            ),
            "deep_icp": build_deep_icp(checkpointer),
            "email_compose": build_email_compose(checkpointer),
            "email_outreach": build_email_outreach(checkpointer),
            "email_reply": build_email_reply(checkpointer),
            "gtm": build_gtm(checkpointer),
            "icp_team": build_icp_team(checkpointer),
            "lead_gen_team": build_lead_gen_team(checkpointer),
            "positioning": build_positioning(checkpointer),
            "pricing": build_pricing(checkpointer),
            "product_intel": build_product_intel(checkpointer),
            "score_contact": build_score_contact(checkpointer),
            "text_to_sql": build_text_to_sql(checkpointer),
        }
        graphs.update(_build_optional_graphs(checkpointer))
        app.state.graphs = graphs

        # Build RemoteGraph adapters once at startup so a missing ML_URL /
        # RESEARCH_URL env var fails fast instead of at the first call.
        # Individual graphs that need them read from ``app.state.remote_adapters``
        # or import the helpers from ``core.remote_graphs`` directly.
        try:
            app.state.remote_adapters = build_all_remote_adapters()
            log.info(
                "Remote adapters wired: %s", list(app.state.remote_adapters)
            )
        except Exception as exc:  # noqa: BLE001
            # Don't kill the container if ML_URL/RESEARCH_URL are absent in
            # local dev — log loudly and leave the adapters empty so any graph
            # that tries to invoke one raises a clear error instead.
            log.warning(
                "build_all_remote_adapters failed (%s: %s) — cross-container "
                "graphs will 500 until ML_URL/RESEARCH_URL are set",
                type(exc).__name__,
                exc,
            )
            app.state.remote_adapters = {}

        log.info(
            "Graphs compiled with AsyncPostgresSaver: %s",
            list(app.state.graphs),
        )
        try:
            yield
        finally:
            # Graceful shutdown: drain in-flight background tasks so any
            # AsyncPostgresSaver writes commit before the checkpointer
            # context exits. CF Containers send SIGTERM on abandonment;
            # uvicorn translates that into lifespan-shutdown — without an
            # explicit drain, partially-applied graph state would be lost.
            #
            # Time-bounded so a stuck graph cannot block container teardown
            # past CF's grace period (~30s).
            _GRACEFUL_SHUTDOWN_S = float(
                os.environ.get("GRACEFUL_SHUTDOWN_S", "20")
            )
            inflight = [
                t
                for t in (
                    *_async_run_tasks,
                    *_positioning_inflight,
                    *_lead_gen_inflight,
                )
                if not t.done()
            ]
            if inflight:
                log.info(
                    "draining %d in-flight background tasks (timeout=%.0fs)",
                    len(inflight),
                    _GRACEFUL_SHUTDOWN_S,
                )
                try:
                    await asyncio.wait_for(
                        asyncio.gather(*inflight, return_exceptions=True),
                        timeout=_GRACEFUL_SHUTDOWN_S,
                    )
                except asyncio.TimeoutError:
                    log.warning(
                        "graceful drain timed out after %.0fs — cancelling "
                        "%d remaining tasks",
                        _GRACEFUL_SHUTDOWN_S,
                        sum(1 for t in inflight if not t.done()),
                    )
                    for t in inflight:
                        if not t.done():
                            t.cancel()
                    # Give cancellations a tick to propagate so
                    # ``CancelledError`` raises inside the graph and lets
                    # ``finally`` clauses release pool connections.
                    await asyncio.gather(*inflight, return_exceptions=True)

            # Close pooled httpx connections held by the cached RemoteGraph
            # adapters. Best-effort: each adapter's aclose() already swallows
            # per-client errors so a misbehaving remote can't block shutdown.
            try:
                await aclose_all_adapters()
            except Exception:  # noqa: BLE001
                log.exception("aclose_all_adapters raised during shutdown")


app = FastAPI(title="lead-gen-core", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)
# Request-id middleware is added AFTER the bearer middleware so it executes
# FIRST (Starlette runs middlewares LIFO). That way every request — including
# 401s rejected by the bearer gate — still gets a request id stamped on its
# response, so an operator can correlate "Unauthorized" log lines back to the
# upstream Worker call.
app.add_middleware(make_request_id_middleware())

# Pre-populate ``app.state`` with empty defaults so any handler that imports
# the module before lifespan completes (e.g. a CF Container readiness probe
# arriving while uvicorn is still binding) sees a typed-empty dict instead of
# raising ``AttributeError``. ``lifespan`` will replace these atomically once
# the AsyncPostgresSaver + graph compilation finishes.
app.state.graphs = {}
app.state.remote_adapters = {}

# Mount the 13 Chrome-extension routes under /linkedin/*. They share the
# container's Neon pool; auth is handled at the perimeter.
app.include_router(linkedin_router, prefix="/linkedin")


class RunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    # Optional: pass a stable thread_id to resume/append to an existing thread.
    # When omitted, the server generates a fresh id per call (matches the
    # stateless /runs/wait semantics the Next.js client relies on today).
    thread_id: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    """Cheap liveness — uvicorn is up. Does not touch DB or graphs.

    CF Containers use this to decide whether to keep the instance running;
    a 500 here would trigger a forced restart loop. Use ``/ready`` for a
    deeper readiness probe that fails when graphs are not yet compiled.
    """
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> JSONResponse:
    """Deeper readiness check — graphs compiled and remote adapters built.

    Returns 503 until ``lifespan`` finishes wiring ``app.state.graphs``, so
    the dispatcher Worker (or a fronting LB) can hold traffic off a cold
    instance instead of letting requests 500 inside ``/runs/wait``.
    """
    graphs = getattr(app.state, "graphs", {}) or {}
    if not graphs:
        return JSONResponse(
            {"status": "starting", "graphs": 0},
            status_code=503,
        )
    return JSONResponse(
        {"status": "ready", "graphs": len(graphs)},
        status_code=200,
    )


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    graph = app.state.graphs.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown assistant_id: {req.assistant_id}"
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    configurable: dict[str, Any] = {"thread_id": thread_id}
    # Inject the jobbert NER adapter for the contact_enrich graph so the
    # extract_skills node can call the ML container without a circular import.
    if req.assistant_id == "contact_enrich":
        remote_adapters = getattr(app.state, "remote_adapters", {})
        jobbert = remote_adapters.get("jobbert_ner")
        if jobbert is not None:
            configurable["jobbert_ner_adapter"] = jobbert
    config: dict[str, Any] = {"configurable": configurable}
    return await graph.ainvoke(req.input, config=config)


# ── Async run pattern (LangGraph-compat REST surface) ─────────────────────
#
# Cloudflare Workers cap response wall time well below the 5+ minute runtime
# of product_intel/gtm/pricing. The Next.js client (``startGraphRun``) relies
# on the standard LangGraph routes /threads + /threads/{tid}/runs to schedule
# work in the background and receive the result via the webhook in
# ``leadgen_agent.notify``. We implement a minimal subset of those routes
# here so the same client code runs against this FastAPI shim.

# Tracks { run_id: { thread_id, assistant_id, status, output, error, task } }
# In-process state — adequate because wrangler.jsonc pins max_instances=1 and
# AsyncPostgresSaver is the source of truth for graph progression. A restart
# loses the lookup, but the webhook callback + the GraphQL stale-run sweeper
# handle that case.
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
    # AsyncPostgresSaver creates the underlying checkpoint row lazily on first
    # write, so we only need to mint and return an id here.
    return ThreadCreateResponse(thread_id=str(uuid.uuid4()))


class ThreadRunRequest(BaseModel):
    assistant_id: str
    input: dict[str, Any]
    multitask_strategy: str | None = None  # accepted for client parity, ignored


class ThreadRunResponse(BaseModel):
    run_id: str
    thread_id: str
    status: str


async def _run_graph_bg(
    run_id: str, thread_id: str, assistant_id: str, payload: dict[str, Any]
) -> None:
    record = _async_runs[run_id]
    graph = app.state.graphs.get(assistant_id)
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
    except Exception as e:  # noqa: BLE001 — surface to caller via /runs status
        log.exception(
            "background run failed (run_id=%s assistant=%s)", run_id, assistant_id
        )
        record["status"] = "error"
        record["error"] = str(e)[:1000]
        # Async clients poll /threads/{tid}/runs/{rid} which only sees the
        # status flip; without an explicit webhook fire, callers that opted
        # into ``webhook_url`` would wait forever for an error signal.
        try:
            from leadgen_agent.notify import notify_error

            await notify_error(payload, str(e))
        except Exception:  # noqa: BLE001 — webhook delivery is best-effort
            log.warning("notify_error webhook failed for run_id=%s", run_id)


@app.post("/threads/{thread_id}/runs", response_model=ThreadRunResponse)
async def create_thread_run(
    thread_id: str, req: ThreadRunRequest
) -> ThreadRunResponse:
    if not hasattr(app.state, "graphs") or req.assistant_id not in app.state.graphs:
        raise HTTPException(
            status_code=404, detail=f"Unknown assistant_id: {req.assistant_id}"
        )
    run_id = str(uuid.uuid4())
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
    return ThreadRunResponse(run_id=run_id, thread_id=thread_id, status="pending")


@app.get("/threads/{thread_id}/runs/{run_id}")
async def get_thread_run(thread_id: str, run_id: str) -> dict[str, Any]:
    record = _async_runs.get(run_id)
    if record is None:
        # The run may have been started before a restart — best-effort 'unknown'
        # so the Next.js stale-run sweeper can transition the row to error.
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


class DispatchPositioningRequest(BaseModel):
    force: bool = False
    limit: int | None = None


# Bound positioning fan-out: deepseek-reasoner tolerates a few concurrent
# requests but a 100-product dispatch with no cap would rate-limit us and
# starve other graphs sharing the same LLM pool.
_POSITIONING_CONCURRENCY = int(os.environ.get("POSITIONING_CONCURRENCY", "3"))
_POSITIONING_TIMEOUT_S = float(os.environ.get("POSITIONING_TIMEOUT_S", "600"))
_positioning_sem = asyncio.Semaphore(_POSITIONING_CONCURRENCY)

# Strong refs for fire-and-forget tasks — `asyncio.create_task` only holds a
# weak reference, so without this a GC pass mid-dispatch can cancel a run
# (CPython 3.11+ behavior, see BPO-44665).
_positioning_inflight: set[asyncio.Task[None]] = set()


async def _run_positioning_bg(product_id: int, thread_id: str) -> None:
    graph = (
        app.state.graphs.get("positioning")
        if hasattr(app.state, "graphs")
        else None
    )
    if graph is None:
        log.error(
            "positioning graph not compiled — dropping product_id=%s", product_id
        )
        return
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    async with _positioning_sem:
        try:
            await asyncio.wait_for(
                graph.ainvoke({"product_id": product_id}, config=config),
                timeout=_POSITIONING_TIMEOUT_S,
            )
        except asyncio.TimeoutError:
            log.error(
                "positioning run timed out after %.0fs for product_id=%s (thread=%s)",
                _POSITIONING_TIMEOUT_S,
                product_id,
                thread_id,
            )
        except asyncio.CancelledError:
            # Shutdown / explicit cancel — re-raise so the loop can exit cleanly.
            raise
        except Exception:
            log.exception(
                "positioning run failed for product_id=%s (thread=%s)",
                product_id,
                thread_id,
            )


@app.post("/dispatch/positioning-all")
async def dispatch_positioning_all(
    req: DispatchPositioningRequest,
) -> dict[str, Any]:
    """Fire-and-forget positioning runs for every product."""
    if req.limit is not None and req.limit <= 0:
        raise HTTPException(status_code=400, detail="limit must be positive")

    if (
        not hasattr(app.state, "graphs")
        or "positioning" not in app.state.graphs
    ):
        raise HTTPException(
            status_code=503,
            detail="positioning graph not compiled — check startup logs",
        )

    db_url = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    where_sql = "" if req.force else "WHERE positioning_analysis IS NULL"
    params: tuple[Any, ...] = ()
    limit_sql = ""
    if req.limit is not None:
        limit_sql = "LIMIT %s"
        params = (req.limit,)

    try:
        with psycopg.connect(db_url, autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id, name FROM products {where_sql} ORDER BY id {limit_sql}",
                    params,
                )
                rows = cur.fetchall()
    except psycopg.Error as err:
        log.exception("dispatch_positioning_all: products query failed")
        raise HTTPException(
            status_code=503, detail=f"products query failed: {err}"
        ) from err

    dispatched: list[dict[str, Any]] = []
    for product_id, name in rows:
        thread_id = str(uuid.uuid4())
        task = asyncio.create_task(
            _run_positioning_bg(int(product_id), thread_id)
        )
        _positioning_inflight.add(task)
        task.add_done_callback(_positioning_inflight.discard)
        dispatched.append(
            {
                "product_id": int(product_id),
                "name": name,
                "thread_id": thread_id,
            }
        )

    log.info(
        "dispatched positioning runs for %d products (force=%s, concurrency=%d, timeout=%.0fs)",
        len(dispatched),
        req.force,
        _POSITIONING_CONCURRENCY,
        _POSITIONING_TIMEOUT_S,
    )
    return {
        "dispatched": len(dispatched),
        "concurrency": _POSITIONING_CONCURRENCY,
        "timeout_s": _POSITIONING_TIMEOUT_S,
        "in_flight_before": len(_positioning_inflight) - len(dispatched),
        "runs": dispatched,
    }


class DispatchLeadGenRequest(BaseModel):
    force: bool = False
    product_ids: list[int] | None = None
    segments_per_product: int = 3


_LEAD_GEN_CONCURRENCY = int(os.environ.get("LEAD_GEN_CONCURRENCY", "3"))
_LEAD_GEN_TIMEOUT_S = float(os.environ.get("LEAD_GEN_TIMEOUT_S", "300"))
_lead_gen_sem = asyncio.Semaphore(_LEAD_GEN_CONCURRENCY)
_lead_gen_inflight: set[asyncio.Task[None]] = set()


async def _run_lead_gen_bg(
    product_id: int, segment_index: int, thread_id: str
) -> None:
    graph = (
        app.state.graphs.get("lead_gen_team")
        if hasattr(app.state, "graphs")
        else None
    )
    if graph is None:
        log.error(
            "lead_gen_team graph not compiled — dropping product_id=%s",
            product_id,
        )
        return
    config: dict[str, Any] = {"configurable": {"thread_id": thread_id}}
    async with _lead_gen_sem:
        try:
            await asyncio.wait_for(
                graph.ainvoke(
                    {"product_id": product_id, "segment_index": segment_index},
                    config=config,
                ),
                timeout=_LEAD_GEN_TIMEOUT_S,
            )
        except asyncio.TimeoutError:
            log.error(
                "lead_gen_team timed out after %.0fs for product_id=%s seg=%s (thread=%s)",
                _LEAD_GEN_TIMEOUT_S,
                product_id,
                segment_index,
                thread_id,
            )
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception(
                "lead_gen_team failed for product_id=%s seg=%s (thread=%s)",
                product_id,
                segment_index,
                thread_id,
            )


@app.post("/dispatch/lead-gen-teams")
async def dispatch_lead_gen_teams(
    req: DispatchLeadGenRequest,
) -> dict[str, Any]:
    """Fire-and-forget lead-gen team runs."""
    if req.segments_per_product <= 0 or req.segments_per_product > 10:
        raise HTTPException(
            status_code=400, detail="segments_per_product must be 1..10"
        )

    if (
        not hasattr(app.state, "graphs")
        or "lead_gen_team" not in app.state.graphs
    ):
        raise HTTPException(
            status_code=503,
            detail="lead_gen_team graph not compiled — check startup logs",
        )

    db_url = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not set")

    where_parts: list[str] = ["icp_analysis IS NOT NULL"]
    params: list[Any] = []
    if req.product_ids:
        where_parts.append("id = ANY(%s)")
        params.append(req.product_ids)
    where_sql = " AND ".join(where_parts)

    try:
        with psycopg.connect(db_url, autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id, name, icp_analysis FROM products WHERE {where_sql} ORDER BY id",
                    params,
                )
                rows = cur.fetchall()
    except psycopg.Error as err:
        log.exception("dispatch_lead_gen_teams: products query failed")
        raise HTTPException(
            status_code=503, detail=f"products query failed: {err}"
        ) from err

    dispatched: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []

    for product_id, name, icp_raw in rows:
        icp_obj: Any = icp_raw
        if isinstance(icp_raw, str):
            try:
                icp_obj = json.loads(icp_raw)
            except json.JSONDecodeError:
                icp_obj = None
        segments = (
            (icp_obj or {}).get("segments") if isinstance(icp_obj, dict) else None
        )
        if not isinstance(segments, list) or not segments:
            skipped.append(
                {
                    "product_id": int(product_id),
                    "reason": "no icp_analysis.segments",
                }
            )
            continue

        n = min(len(segments), req.segments_per_product)
        for i in range(n):
            thread_id = str(uuid.uuid4())
            task = asyncio.create_task(
                _run_lead_gen_bg(int(product_id), i, thread_id)
            )
            _lead_gen_inflight.add(task)
            task.add_done_callback(_lead_gen_inflight.discard)
            seg_name = (
                segments[i].get("name") if isinstance(segments[i], dict) else None
            )
            dispatched.append(
                {
                    "product_id": int(product_id),
                    "product_name": name,
                    "segment_index": i,
                    "segment_name": seg_name,
                    "thread_id": thread_id,
                }
            )

    log.info(
        "dispatched lead_gen_team runs: %d (skipped %d, concurrency=%d, timeout=%.0fs)",
        len(dispatched),
        len(skipped),
        _LEAD_GEN_CONCURRENCY,
        _LEAD_GEN_TIMEOUT_S,
    )
    return {
        "dispatched": len(dispatched),
        "skipped": skipped,
        "concurrency": _LEAD_GEN_CONCURRENCY,
        "timeout_s": _LEAD_GEN_TIMEOUT_S,
        "in_flight_before": len(_lead_gen_inflight) - len(dispatched),
        "runs": dispatched,
    }
