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

import asyncio
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
from starlette.middleware.base import BaseHTTPMiddleware

from leadgen_agent.admin_chat_graph import build_graph as build_admin_chat
from leadgen_agent.classify_paper_graph import build_graph as build_classify_paper
from leadgen_agent.competitors_team_graph import build_graph as build_competitors_team
from leadgen_agent.contact_enrich_graph import build_graph as build_contact_enrich
from leadgen_agent.contact_enrich_paper_author_graph import (
    build_batch_graph as build_contact_enrich_paper_authors_batch,
    build_graph as build_contact_enrich_paper_author,
)
from leadgen_agent.contact_enrich_sales_graph import build_graph as build_contact_enrich_sales
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

    async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
        # Idempotent: creates the checkpointer tables on first run, no-ops after.
        await checkpointer.setup()
        app.state.graphs = {
            "admin_chat": build_admin_chat(checkpointer),
            "classify_paper": build_classify_paper(checkpointer),
            "competitors_team": build_competitors_team(checkpointer),
            "contact_enrich": build_contact_enrich(checkpointer),
            "contact_enrich_sales": build_contact_enrich_sales(checkpointer),
            "contact_enrich_paper_author": build_contact_enrich_paper_author(checkpointer),
            "contact_enrich_paper_authors_batch": build_contact_enrich_paper_authors_batch(checkpointer),
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
    graph = app.state.graphs.get("positioning") if hasattr(app.state, "graphs") else None
    if graph is None:
        log.error("positioning graph not compiled — dropping product_id=%s", product_id)
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
async def dispatch_positioning_all(req: DispatchPositioningRequest) -> dict[str, Any]:
    """Fire-and-forget positioning runs for every product.

    Returns immediately after scheduling; each run executes in a background
    asyncio task against the in-process ``positioning`` graph and persists its
    output to ``products.positioning_analysis`` via the graph's own terminal
    node. Concurrency is bounded by ``POSITIONING_CONCURRENCY`` (default 3) and
    each run is capped at ``POSITIONING_TIMEOUT_S`` seconds (default 600).
    """
    if req.limit is not None and req.limit <= 0:
        raise HTTPException(status_code=400, detail="limit must be positive")

    if not hasattr(app.state, "graphs") or "positioning" not in app.state.graphs:
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
        task = asyncio.create_task(_run_positioning_bg(int(product_id), thread_id))
        _positioning_inflight.add(task)
        task.add_done_callback(_positioning_inflight.discard)
        dispatched.append(
            {"product_id": int(product_id), "name": name, "thread_id": thread_id}
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


async def _run_lead_gen_bg(product_id: int, segment_index: int, thread_id: str) -> None:
    graph = app.state.graphs.get("lead_gen_team") if hasattr(app.state, "graphs") else None
    if graph is None:
        log.error("lead_gen_team graph not compiled — dropping product_id=%s", product_id)
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
async def dispatch_lead_gen_teams(req: DispatchLeadGenRequest) -> dict[str, Any]:
    """Fire-and-forget lead-gen team runs.

    Default behavior: for every product that has ``icp_analysis.segments``, fire
    one run per segment (capped at ``segments_per_product``, default 3). That
    means the typical payload is ``{}`` → 3 products × 3 segments = 9 runs.
    Narrow the scope by passing ``product_ids`` and/or lowering
    ``segments_per_product`` for smoke tests.
    """
    if req.segments_per_product <= 0 or req.segments_per_product > 10:
        raise HTTPException(status_code=400, detail="segments_per_product must be 1..10")

    if not hasattr(app.state, "graphs") or "lead_gen_team" not in app.state.graphs:
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
        segments = (icp_obj or {}).get("segments") if isinstance(icp_obj, dict) else None
        if not isinstance(segments, list) or not segments:
            skipped.append({"product_id": int(product_id), "reason": "no icp_analysis.segments"})
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
                segments[i].get("name")
                if isinstance(segments[i], dict)
                else None
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
