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
import time
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

import psycopg
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from pydantic import BaseModel
from leadgen_agent.auth import bearer_middleware_factory

from leadgen_agent.admin_chat_graph import build_graph as build_admin_chat
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
from core.remote_graphs import (
    aclose_all_adapters,
    build_all_remote_adapters,
    probe_remote_adapters,
)

log = logging.getLogger("leadgen_agent")

# Paths the bearer middleware lets through so uptime monitors and the
# dispatcher Worker's health probe can run without credentials.
_PUBLIC_PATHS = frozenset({"/health", "/health/deep", "/ok"})

# Shared bearer-token middleware lives in leadgen_agent/auth.py; this module
# parameterises it with the LANGGRAPH_AUTH_TOKEN env var and the public-path
# allowlist above. Same audit-logging semantics as before.
BearerTokenMiddleware = bearer_middleware_factory(
    env_var="LANGGRAPH_AUTH_TOKEN", public_paths=_PUBLIC_PATHS
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
    try:
        ensure_linkedin_tables()
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
        # RESEARCH_URL env var surfaces in the boot log instead of at the
        # first call. Each adapter builds independently — research adapters
        # still wire when only ML_URL is missing, and vice versa. Failures
        # land in ``app.state.adapter_failures`` so the readiness probe can
        # surface them per-adapter.
        try:
            built, failures = build_all_remote_adapters()
        except Exception as exc:  # noqa: BLE001 — defensive; per-adapter try is inside
            log.warning(
                "build_all_remote_adapters raised (%s: %s) — booting with "
                "no remote adapters wired",
                type(exc).__name__,
                exc,
            )
            built, failures = {}, {"_all_": f"{type(exc).__name__}: {exc}"}
        app.state.remote_adapters = built
        app.state.adapter_failures = failures
        if failures:
            log.warning(
                "Remote adapters partial: built=%s failed=%s",
                list(built),
                list(failures),
            )
        else:
            log.info("Remote adapters wired: %s", list(built))

        # Boot-time reachability probe so a typo in ML_URL / RESEARCH_URL
        # surfaces in the lifespan log instead of at the first user request.
        # Best-effort: a failure here does NOT block boot — the adapter
        # stays wired and the readiness route reports the probe result.
        try:
            app.state.adapter_probes = await probe_remote_adapters(built)
            unreachable = {
                n: r
                for n, r in app.state.adapter_probes.items()
                if r != "reachable"
            }
            if unreachable:
                log.warning(
                    "Remote adapter probes: unreachable=%s reachable=%d",
                    unreachable,
                    len(app.state.adapter_probes) - len(unreachable),
                )
            else:
                log.info(
                    "Remote adapter probes: all %d reachable",
                    len(app.state.adapter_probes),
                )
        except Exception as exc:  # noqa: BLE001 — probe must not block boot
            log.warning(
                "Boot probe raised (%s: %s) — skipping adapter reachability check",
                type(exc).__name__,
                exc,
            )
            app.state.adapter_probes = {}

        log.info(
            "Graphs compiled with AsyncPostgresSaver: %s",
            list(app.state.graphs),
        )
        # Background TTL sweeper for ``_async_runs`` so the in-process index
        # stays bounded across long-lived containers. The eviction in
        # ``get_thread_run`` covers the poll-then-discard happy path; this
        # task covers webhook-only clients and orphaned runs.
        sweeper_task = asyncio.create_task(_sweep_async_runs())
        try:
            yield
        finally:
            sweeper_task.cancel()
            try:
                await sweeper_task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
            # Close pooled httpx connections held by the cached RemoteGraph
            # adapters. Best-effort: each adapter's aclose() already swallows
            # per-client errors so a misbehaving remote can't block shutdown.
            try:
                await aclose_all_adapters()
            except Exception:  # noqa: BLE001
                log.exception("aclose_all_adapters raised during shutdown")


app = FastAPI(title="lead-gen-core", lifespan=lifespan)
app.add_middleware(BearerTokenMiddleware)

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


def _build_run_configurable(assistant_id: str, thread_id: str) -> dict[str, Any]:
    """Build the ``configurable`` dict the FastAPI runtime hands to a graph.

    Single source of truth for adapter injection so both the sync
    ``/runs/wait`` path and the async ``/threads/{tid}/runs`` background
    runner stay aligned. Without this helper the async path silently degrades
    every assistant that needs a remote adapter (the ``extract_skills`` node
    on ``contact_enrich`` was the immediate symptom — no skills extracted in
    background runs because ``configurable["jobbert_ner_adapter"]`` was
    missing).
    """
    configurable: dict[str, Any] = {"thread_id": thread_id}
    if assistant_id == "contact_enrich":
        # extract_skills hits the ML container via the configurable adapter to
        # avoid a circular import of ``core.remote_graphs`` from leadgen_agent.
        remote_adapters = getattr(app.state, "remote_adapters", {})
        jobbert = remote_adapters.get("jobbert_ner")
        if jobbert is not None:
            configurable["jobbert_ner_adapter"] = jobbert
    return configurable


def _build_run_metadata(assistant_id: str, thread_id: str) -> dict[str, Any]:
    """Attach LangSmith trace context so a single user request stitches into
    one trace across the core / ml / research containers.

    Today every container starts a fresh top-level run when LANGCHAIN_TRACING_V2
    is set, fragmenting cross-container observability. Including
    ``thread_id`` and ``assistant_id`` in ``config["metadata"]`` lets the
    LangSmith UI pivot on those keys; each child run records the same pair
    so the parent-child relationship is recoverable from the metadata even
    when LangSmith doesn't auto-propagate. Safe no-op when tracing is
    disabled (the metadata is just ignored by the runtime).
    """
    return {
        "thread_id": thread_id,
        "assistant_id": assistant_id,
    }


@app.get("/health/deep")
async def health_deep() -> JSONResponse:
    """Readiness probe with circuit-breaker awareness.

    Distinct from ``/health`` (a dumb liveness probe that must stay green
    even when a remote is briefly down): ``/health/deep`` returns ``503``
    when any cached adapter's breaker is currently open. Reads the local
    ``_breaker.opened_at`` rather than pinging the remote so the probe
    stays cheap and scales with load — the breaker state is already updated
    on every adapter call, so it IS the real-time signal.

    Kubernetes / Cloudflare ``readinessProbe`` respects 5xx and will drain
    traffic until the breaker recovers; ``livenessProbe`` should stay on
    plain ``/health`` so a transient outage doesn't trigger pod restarts.
    """
    adapters = getattr(app.state, "remote_adapters", {}) or {}
    failures = getattr(app.state, "adapter_failures", {}) or {}
    probes = getattr(app.state, "adapter_probes", {}) or {}
    breakers: dict[str, str] = {}
    any_problem = False
    for name, adapter in adapters.items():
        breaker = getattr(adapter, "_breaker", None)
        if breaker is None:
            breakers[name] = "unknown"
            continue
        if breaker.opened_at is not None:
            breakers[name] = "open"
            any_problem = True
        else:
            breakers[name] = "closed"
    # Partial-build surface: an adapter that never built (missing env var,
    # remote unreachable at boot) is reported distinctly from one whose
    # breaker is open. Both flip the route to 503 so a Kubernetes /
    # Cloudflare readinessProbe drains traffic until the operator
    # intervenes.
    for name, reason in failures.items():
        breakers[name] = f"unbuilt: {reason[:80]}"
        any_problem = True
    body: dict[str, Any] = {
        "status": "degraded" if any_problem else "ok",
        "breakers": breakers,
    }
    if probes:
        body["probes"] = probes
    status_code = 503 if any_problem else 200
    return JSONResponse(content=body, status_code=status_code)


@app.get("/health")
async def health() -> dict[str, Any]:
    """Liveness + remote-adapter readiness.

    The lifespan boot intentionally tolerates a missing ``ML_URL`` /
    ``RESEARCH_URL`` so local dev runs without the cross-container hop. In
    production that same path leaves ``app.state.remote_adapters = {}`` and
    cross-container graphs 500 on first call. Exposing the adapter list on
    ``/health`` lets uptime monitors and the dispatcher Worker distinguish a
    clean boot (8 adapters wired) from a degraded one (0) without grepping
    the lifespan log.

    Status stays ``"ok"`` regardless because the route is also the dumb
    liveness probe — turning it red on missing adapters would force
    rolling-restart loops in environments that legitimately run without the
    ML/research containers.
    """
    adapters = sorted(getattr(app.state, "remote_adapters", {}).keys())
    return {
        "status": "ok",
        "adapters": adapters,
        "adapters_ready": len(adapters) > 0,
    }


# Wall-clock cap on a single ``/runs/wait`` request. Worst-case retry budget
# inside ``_invoke_remote_with_retry`` (3 × 120s read = ~370s) used to be able
# to wedge a request long past the upstream Cloudflare Worker's 30 s ceiling,
# returning 504 to the client. We cap server-side at 28 s so the timeout
# surfaces here as a clean 504 with a meaningful message rather than as a
# Cloudflare-emitted gateway-timeout that the Next.js retry policy mistakes
# for an outage. Long-running graphs (positioning, gtm, pricing,
# product_intel) are required to use the async path ``/threads/{tid}/runs``.
RUNS_WAIT_TIMEOUT_S: float = float(os.environ.get("RUNS_WAIT_TIMEOUT_S", "28"))


@app.post("/runs/wait")
async def runs_wait(req: RunRequest) -> dict[str, Any]:
    graph = app.state.graphs.get(req.assistant_id)
    if graph is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown assistant_id: {req.assistant_id}"
        )
    thread_id = req.thread_id or str(uuid.uuid4())
    configurable = _build_run_configurable(req.assistant_id, thread_id)
    metadata = _build_run_metadata(req.assistant_id, thread_id)
    config: dict[str, Any] = {"configurable": configurable, "metadata": metadata}
    try:
        return await asyncio.wait_for(
            graph.ainvoke(req.input, config=config),
            timeout=RUNS_WAIT_TIMEOUT_S,
        )
    except asyncio.TimeoutError:
        log.warning(
            "/runs/wait timed out: assistant=%s thread=%s budget=%.1fs",
            req.assistant_id,
            thread_id,
            RUNS_WAIT_TIMEOUT_S,
        )
        raise HTTPException(
            status_code=504,
            detail=(
                f"Graph {req.assistant_id} exceeded the {RUNS_WAIT_TIMEOUT_S:.0f}s "
                f"sync budget; use /threads/{{tid}}/runs for long-running graphs."
            ),
        )


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
    config: dict[str, Any] = {
        "configurable": _build_run_configurable(assistant_id, thread_id),
        "metadata": _build_run_metadata(assistant_id, thread_id),
    }
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
        # into ``webhook_url`` would wait forever for an error signal. Try
        # twice (one quick retry after a 1 s backoff) before swallowing —
        # network blips on the customer's webhook endpoint shouldn't lose
        # the error notification entirely. The DB record is already the
        # source of truth so this stays best-effort, just less brittle.
        try:
            from leadgen_agent.notify import notify_error

            try:
                await notify_error(payload, str(e))
            except Exception as werr:  # noqa: BLE001 — falls through to retry
                log.warning(
                    "notify_error webhook attempt 1 failed for run_id=%s: %s — retrying once",
                    run_id,
                    werr,
                )
                await asyncio.sleep(1.0)
                await notify_error(payload, str(e))
        except Exception:  # noqa: BLE001 — webhook delivery is best-effort
            log.warning(
                "notify_error webhook failed twice for run_id=%s — giving up",
                run_id,
            )


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
        # Wall-clock timestamp for the TTL sweeper. Without this the dict grew
        # unbounded — every completed run lived in-process until container
        # restart. The sweeper at the bottom of this module evicts entries
        # past the TTL so a long-lived process stays bounded.
        "_created_at": time.time(),
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
    response = {
        "run_id": run_id,
        "thread_id": thread_id,
        "status": record["status"],
        "output": record.get("output"),
        "error": record.get("error"),
    }
    # Evict on terminal poll so the in-process dict stays bounded for the
    # poll-then-discard happy path. The TTL sweeper covers webhook-only
    # clients that never poll.
    if record["status"] in ("success", "error"):
        _async_runs.pop(run_id, None)
    return response


# In-process index of async runs is bounded by ``_ASYNC_RUN_TTL_S`` plus the
# evict-on-terminal-poll path above. The sweeper below catches webhook-only
# clients (no poll ever happens) and runs that finished but the client
# disconnected before reading the terminal status. Defaults: 1 h TTL,
# 5 min sweeper interval. Both env-overridable for ops tuning.
_ASYNC_RUN_TTL_S: float = float(os.environ.get("ASYNC_RUN_TTL_S", "3600"))
_ASYNC_RUN_SWEEP_INTERVAL_S: float = float(
    os.environ.get("ASYNC_RUN_SWEEP_INTERVAL_S", "300")
)


async def _sweep_async_runs() -> None:
    """Evict entries past ``_ASYNC_RUN_TTL_S`` from ``_async_runs``."""
    while True:
        try:
            await asyncio.sleep(_ASYNC_RUN_SWEEP_INTERVAL_S)
            cutoff = time.time() - _ASYNC_RUN_TTL_S
            stale = [
                rid
                for rid, rec in _async_runs.items()
                if rec.get("_created_at", time.time()) < cutoff
            ]
            for rid in stale:
                _async_runs.pop(rid, None)
            if stale:
                log.info(
                    "async runs sweeper: evicted=%d remaining=%d ttl_s=%.0f",
                    len(stale),
                    len(_async_runs),
                    _ASYNC_RUN_TTL_S,
                )
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 — sweeper must never abort
            log.exception("async runs sweeper iteration failed")


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
