"""Live end-to-end smoke tests against the deployed Cloudflare LangGraph stack.

Hits ``LANGGRAPH_BASE_URL`` (default ``https://lead-gen-langgraph.eeeew.workers.dev``)
with a real bearer token from ``LANGGRAPH_AUTH_TOKEN``. The whole module is
skipped unless ``RUN_LIVE_E2E=1`` — same gating convention as
``test_webhook_integration.py`` — so a normal ``pytest`` invocation never spends
DeepSeek budget or touches production.

Coverage spans four bands:

    1. Public surface (with bearer): /health, /ready — proves the dispatcher's
       service binding to core works and that lifespan finished compiling the
       graphs (i.e. AsyncPostgresSaver connected to Neon).
    2. Auth boundary (no LLM): bearer enforcement on /runs/wait + 403 on the
       internal-only /_ml/* and /_research/* prefixes. Catches a SHA-256 hash
       drift between dispatcher vars and core's secret.
    3. Single-graph e2e (real DeepSeek): /runs/wait with text_to_sql — the
       cheapest LLM-driven core graph. Asserts HTTP 200 + a SQL-shaped result.
    4. Async thread lifecycle: /threads -> /threads/{tid}/runs -> poll
       /threads/{tid}/runs/{rid} — the path Next.js uses for long graphs.

Run locally:

    RUN_LIVE_E2E=1 LANGGRAPH_AUTH_TOKEN=... \\
        uv run pytest tests/test_remote_langgraph_e2e.py -v

Or via the Makefile target (loads .env.local):

    make backend-test-live
"""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any, AsyncIterator

import httpx
import pytest

DEFAULT_BASE_URL = "https://lead-gen-langgraph.eeeew.workers.dev"

# Generous read timeout to absorb CF Container cold-start (uvicorn boot +
# AsyncPostgresSaver.setup() + graph compilation can take 30-60s on a cold
# instance). Connect/write/pool stay tight so a true network hang fails fast.
_LIVE_TIMEOUT = httpx.Timeout(connect=10.0, read=240.0, write=10.0, pool=10.0)

# ── module-level skip ───────────────────────────────────────────────────

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_LIVE_E2E") != "1",
    reason="set RUN_LIVE_E2E=1 to run live e2e against the deployed CF URL",
)


# ── fixtures ────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def base_url() -> str:
    return os.environ.get("LANGGRAPH_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


@pytest.fixture(scope="module")
def token() -> str:
    tok = os.environ.get("LANGGRAPH_AUTH_TOKEN", "").strip()
    if not tok:
        pytest.skip(
            "LANGGRAPH_AUTH_TOKEN not set — required for authenticated probes "
            "(load via .env.local or `make backend-test-live`)"
        )
    return tok


@pytest.fixture
async def client(base_url: str, token: str) -> AsyncIterator[httpx.AsyncClient]:
    """Authenticated client with the bearer header pre-set."""
    async with httpx.AsyncClient(
        base_url=base_url,
        timeout=_LIVE_TIMEOUT,
        headers={"Authorization": f"Bearer {token}"},
    ) as c:
        yield c


@pytest.fixture
async def anon_client(base_url: str) -> AsyncIterator[httpx.AsyncClient]:
    """Client with NO Authorization header — used for auth-failure tests."""
    async with httpx.AsyncClient(
        base_url=base_url, timeout=_LIVE_TIMEOUT
    ) as c:
        yield c


# ── helpers ─────────────────────────────────────────────────────────────


async def _warm_get_health(client: httpx.AsyncClient) -> httpx.Response:
    """First call to a cold container can 502/503 while DO is starting.

    Retry up to 3 times with backoff so the rest of the suite isn't punished
    for cold-start. After this returns, subsequent calls hit a warm instance.
    """
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            r = await client.get("/health")
            if r.status_code in (502, 503):
                # Container is booting — wait and retry.
                await asyncio.sleep(2 + 3 * attempt)
                continue
            return r
        except (httpx.ConnectError, httpx.ReadTimeout) as exc:
            last_exc = exc
            await asyncio.sleep(2 + 3 * attempt)
    if last_exc is not None:
        raise last_exc
    return r  # type: ignore[return-value]


# ── Band 1: public surface (with bearer) ────────────────────────────────


@pytest.mark.live
async def test_health_returns_ok(client: httpx.AsyncClient) -> None:
    """Liveness — proves dispatcher → service binding → core uvicorn works."""
    r = await _warm_get_health(client)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "ok"


@pytest.mark.live
async def test_ready_reports_graphs_compiled(client: httpx.AsyncClient) -> None:
    """Readiness — proves lifespan finished, AsyncPostgresSaver is connected,
    and graphs are compiled. Returns 503 until lifespan completes; with the
    /health warm-up earlier in the suite, lifespan is already done."""
    r = await client.get("/ready")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "ready"
    assert isinstance(body.get("graphs"), int) and body["graphs"] > 0


# ── Band 2: auth boundary (no LLM) ──────────────────────────────────────


@pytest.mark.live
async def test_runs_wait_rejects_missing_bearer(
    anon_client: httpx.AsyncClient,
) -> None:
    """No Authorization header → dispatcher returns 401 before reaching core."""
    r = await anon_client.post(
        "/runs/wait",
        json={"assistant_id": "text_to_sql", "input": {"question": "ping"}},
    )
    assert r.status_code == 401, r.text


@pytest.mark.live
async def test_runs_wait_rejects_wrong_bearer(
    anon_client: httpx.AsyncClient,
) -> None:
    """Wrong bearer → 401. Confirms the dispatcher's SHA-256 hash compare and
    that constant-time comparison doesn't accidentally accept a bad token."""
    r = await anon_client.post(
        "/runs/wait",
        json={"assistant_id": "text_to_sql", "input": {"question": "ping"}},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401, r.text


@pytest.mark.live
async def test_internal_ml_path_forbidden(
    anon_client: httpx.AsyncClient,
) -> None:
    """``/_ml/*`` is internal-only (core → ML via service binding). The
    dispatcher must reject it on the public surface even with a valid bearer,
    so we don't bother sending one — the prefix check happens before auth."""
    r = await anon_client.get("/_ml/health")
    assert r.status_code == 403, r.text


@pytest.mark.live
async def test_internal_research_path_forbidden(
    anon_client: httpx.AsyncClient,
) -> None:
    r = await anon_client.get("/_research/health")
    assert r.status_code == 403, r.text


# ── Band 3: single-graph e2e (real DeepSeek) ────────────────────────────


@pytest.mark.live
async def test_text_to_sql_runs_wait_returns_select(
    client: httpx.AsyncClient,
) -> None:
    """Drives the cheapest LLM-backed core graph end-to-end through the whole
    Cloudflare stack: dispatcher auth → service binding → core uvicorn →
    text_to_sql graph → DeepSeek → AsyncPostgresSaver checkpoint write → 200.

    Asserts shape, not LLM content quality (that lives in deepeval suites).
    A non-SELECT/WITH start signals either a model regression or a graph
    routing change.
    """
    r = await client.post(
        "/runs/wait",
        json={
            "assistant_id": "text_to_sql",
            "input": {
                "question": "How many companies were created this year?",
                "database_schema": (
                    "TABLE companies (id INT, name TEXT, "
                    "created_at TIMESTAMP);"
                ),
            },
        },
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:500]}"
    body = r.json()
    sql = (body.get("sql") or "").strip().upper()
    assert sql, f"no sql in response: {body}"
    assert sql.startswith("SELECT") or sql.startswith("WITH"), (
        f"expected SELECT/WITH, got: {sql[:120]}"
    )
    assert "companies" in (body.get("sql") or "").lower(), (
        f"expected the table name in the generated SQL: {body.get('sql')}"
    )


# ── Band 4: async thread lifecycle ──────────────────────────────────────


@pytest.mark.live
async def test_thread_run_lifecycle(client: httpx.AsyncClient) -> None:
    """Mint a thread, fire a background run, poll until success.

    Mirrors what ``startGraphRun`` in src/lib/langgraph-client.ts does for
    long graphs that exceed Cloudflare's response wall-time. A regression in
    the in-process ``_async_runs`` registry or the ``/threads/{tid}/runs/{rid}``
    polling endpoint would surface here as a stuck "running" status or a 404.
    """
    # 1. Mint a thread.
    r = await client.post("/threads", json={})
    assert r.status_code == 200, r.text
    thread_id = r.json().get("thread_id")
    assert isinstance(thread_id, str) and thread_id, r.text

    # 2. Schedule a run.
    r = await client.post(
        f"/threads/{thread_id}/runs",
        json={
            "assistant_id": "text_to_sql",
            "input": {
                "question": "List the latest 5 companies by created_at.",
                "database_schema": (
                    "TABLE companies (id INT, name TEXT, "
                    "created_at TIMESTAMP);"
                ),
            },
        },
    )
    assert r.status_code == 200, r.text
    run = r.json()
    run_id = run.get("run_id")
    assert isinstance(run_id, str) and run_id, run
    assert run.get("status") in ("pending", "running"), run

    # 3. Poll for terminal status. 90s budget — text_to_sql runs in ~5-15s
    # against DeepSeek; anything over 90s indicates a stall or a stuck graph.
    deadline = time.monotonic() + 90.0
    last_body: dict[str, Any] = {}
    while time.monotonic() < deadline:
        r = await client.get(f"/threads/{thread_id}/runs/{run_id}")
        assert r.status_code == 200, r.text
        last_body = r.json()
        status = last_body.get("status")
        if status in ("success", "error"):
            break
        await asyncio.sleep(2.0)
    else:
        pytest.fail(
            f"run {run_id} did not finish within 90s (last status: "
            f"{last_body.get('status')!r})"
        )

    assert last_body.get("status") == "success", (
        f"run failed: {last_body.get('error') or last_body}"
    )
    output = last_body.get("output") or {}
    assert (output.get("sql") or "").strip(), f"empty sql in output: {output}"
