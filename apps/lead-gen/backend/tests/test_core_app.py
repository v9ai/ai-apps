"""Smoke tests for ``core/app.py`` — boots the FastAPI app in-process.

The lifespan handler tries to open a real ``AsyncPostgresSaver`` against Neon
and to run the LinkedIn DDL, which we sidestep with two patches:

* ``core.app.AsyncPostgresSaver`` → returns an in-memory checkpointer wrapper
  that exposes the ``setup()`` coroutine the real saver provides.
* ``core.app.ensure_linkedin_tables`` → no-op (the real one opens psycopg).

That's enough for every ``build_*`` graph factory to compile against the fake
checkpointer; the routes we exercise here never touch the DB themselves.

We also drop ``LANGGRAPH_AUTH_TOKEN`` because the bearer middleware would
otherwise 401 our unauthenticated test calls. The token leaks into the env
when ``leadgen_agent.llm`` runs ``load_dotenv`` at import time.

httpx's ``ASGITransport`` does **not** trigger ASGI ``lifespan`` events, so we
drive the ``@asynccontextmanager`` lifespan ourselves around each test that
needs ``app.state.graphs`` populated.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from langgraph.checkpoint.memory import InMemorySaver


class _FakeAsyncSaver(InMemorySaver):
    """InMemorySaver + the ``setup()`` coroutine ``AsyncPostgresSaver`` exposes.

    ``langgraph.checkpoint.postgres.aio.AsyncPostgresSaver`` is what
    ``core.app.lifespan`` enters; tests substitute this so graph compilation
    stays hermetic and zero-IO.
    """

    async def setup(self) -> None:
        return None


@pytest.fixture
def patched_core_app(monkeypatch: pytest.MonkeyPatch):
    """Yield ``core.app`` module after patching DB-touching boundaries.

    ``LANGGRAPH_AUTH_TOKEN`` is loaded from ``backend/.env`` by
    ``leadgen_agent.llm`` at import time, so we strip it after the import.
    """
    monkeypatch.setenv(
        "NEON_DATABASE_URL",
        "postgresql://fake:fake@localhost:1/fake?sslmode=require",
    )
    monkeypatch.setenv("DATABASE_URL", os.environ["NEON_DATABASE_URL"])

    import core.app as ca

    monkeypatch.delenv("LANGGRAPH_AUTH_TOKEN", raising=False)

    fake_saver = _FakeAsyncSaver()

    @asynccontextmanager
    async def _fake_from_conn_string(_url: str):
        yield fake_saver

    # Patch the ``AsyncPostgresSaver`` symbol as imported into core.app, plus
    # the LinkedIn DDL helper (``ensure_linkedin_tables`` opens psycopg).
    monkeypatch.setattr(
        ca.AsyncPostgresSaver,
        "from_conn_string",
        staticmethod(_fake_from_conn_string),
    )
    monkeypatch.setattr(ca, "ensure_linkedin_tables", lambda: None)

    return ca


@asynccontextmanager
async def _booted_app(ca: Any):
    """Run lifespan + yield an httpx client wired to the FastAPI app."""
    async with ca.lifespan(ca.app):
        async with AsyncClient(
            transport=ASGITransport(app=ca.app), base_url="http://test"
        ) as client:
            yield client


async def test_app_imports_and_starts(patched_core_app: Any) -> None:
    from fastapi import FastAPI

    assert isinstance(patched_core_app.app, FastAPI)
    assert patched_core_app.app.title == "lead-gen-core"


async def test_health_endpoint(patched_core_app: Any) -> None:
    """``/health`` stays liveness-only when the lifespan has not run, so it
    reports ``adapters: []`` and ``adapters_ready: False`` without touching
    ``app.state.graphs``.
    """
    async with AsyncClient(
        transport=ASGITransport(app=patched_core_app.app), base_url="http://test"
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["adapters"] == []
    assert body["adapters_ready"] is False


async def test_health_deep_returns_200_when_no_breaker_open(
    patched_core_app: Any,
) -> None:
    """``/health/deep`` is a readiness probe — green when every adapter's
    breaker is closed, red when any is open. Distinct from ``/health``
    (liveness only) so transient outages don't trigger pod restarts."""

    class _StubAdapter:
        def __init__(self) -> None:
            class _B:
                opened_at: float | None = None

            self._breaker = _B()

    ca = patched_core_app
    ca.app.state.remote_adapters = {
        "jobbert_ner": _StubAdapter(),
        "bge_m3_embed": _StubAdapter(),
    }
    async with AsyncClient(
        transport=ASGITransport(app=ca.app), base_url="http://test"
    ) as client:
        r = await client.get("/health/deep")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["breakers"]["jobbert_ner"] == "closed"
    assert body["breakers"]["bge_m3_embed"] == "closed"


async def test_health_deep_returns_503_when_any_breaker_open(
    patched_core_app: Any,
) -> None:
    """Readiness flips red on any open breaker so a Kubernetes / Cloudflare
    readinessProbe drains traffic until the breaker recovers. Liveness
    (``/health``) stays green so the pod is not restarted."""

    class _ClosedAdapter:
        def __init__(self) -> None:
            class _B:
                opened_at: float | None = None

            self._breaker = _B()

    class _OpenAdapter:
        def __init__(self) -> None:
            class _B:
                opened_at: float = 1.0  # any non-None value means "open"

            self._breaker = _B()

    ca = patched_core_app
    ca.app.state.remote_adapters = {
        "jobbert_ner": _ClosedAdapter(),
        "research_agent": _OpenAdapter(),
    }
    async with AsyncClient(
        transport=ASGITransport(app=ca.app), base_url="http://test"
    ) as client:
        r = await client.get("/health/deep")
    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "degraded"
    assert body["breakers"]["jobbert_ner"] == "closed"
    assert body["breakers"]["research_agent"] == "open"


async def test_health_deep_surfaces_unbuilt_adapters(
    patched_core_app: Any,
) -> None:
    """When a research-only env booted with ``ML_URL`` unset, the partial
    build leaves some adapters in ``app.state.adapter_failures``. The
    readiness route must label those as ``unbuilt:`` (distinct from
    ``open``) so an operator can chase the missing env var without
    confusing it with a circuit-breaker outage."""

    class _ClosedAdapter:
        def __init__(self) -> None:
            class _B:
                opened_at: float | None = None

            self._breaker = _B()

    ca = patched_core_app
    ca.app.state.remote_adapters = {"research_agent": _ClosedAdapter()}
    ca.app.state.adapter_failures = {
        "jobbert_ner": "RuntimeError: ML_URL env var is required",
        "bge_m3_embed": "RuntimeError: ML_URL env var is required",
    }
    async with AsyncClient(
        transport=ASGITransport(app=ca.app), base_url="http://test"
    ) as client:
        r = await client.get("/health/deep")
    assert r.status_code == 503  # any unbuilt adapter flips readiness red
    body = r.json()
    assert body["status"] == "degraded"
    assert body["breakers"]["research_agent"] == "closed"
    assert body["breakers"]["jobbert_ner"].startswith("unbuilt:")
    assert "ML_URL" in body["breakers"]["jobbert_ner"]


async def test_health_endpoint_lists_warmed_adapters(patched_core_app: Any) -> None:
    """When the lifespan has wired adapters, ``/health`` exposes the names so
    a dispatcher can distinguish a clean boot from a degraded one (no
    ML_URL / RESEARCH_URL) without grepping logs."""
    ca = patched_core_app
    ca.app.state.remote_adapters = {
        "jobbert_ner": object(),
        "bge_m3_embed": object(),
    }
    async with AsyncClient(
        transport=ASGITransport(app=ca.app), base_url="http://test"
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["adapters"] == ["bge_m3_embed", "jobbert_ner"]
    assert body["adapters_ready"] is True


async def test_linkedin_router_mounted(patched_core_app: Any) -> None:
    """Verify the /linkedin/* router is mounted by inspecting the route table.

    Calling ``/linkedin/stats`` would open psycopg — what we care about here
    is that the path exists (i.e. ``include_router(prefix='/linkedin')`` ran).
    """
    paths = {route.path for route in patched_core_app.app.routes if hasattr(route, "path")}
    assert "/linkedin/stats" in paths
    assert "/linkedin/contacts" in paths
    assert "/linkedin/posts" in paths
    assert "/linkedin/export" in paths


async def test_graphs_registered(patched_core_app: Any) -> None:
    async with _booted_app(patched_core_app) as _client:
        graphs = patched_core_app.app.state.graphs
        # 22 mandatory + up to 9 optional = expect a healthy chunk. 22 is the
        # floor; optional graphs slip in based on what's currently shipping.
        assert len(graphs) >= 22, f"expected >= 22 graphs, got {len(graphs)}"
        # Required, non-optional names — all of these must be registered.
        for required in (
            "email_compose",
            "email_reply",
            "email_outreach",
            "admin_chat",
            "text_to_sql",
            "classify_paper",
            "contact_enrich",
            "contact_discovery",
            "company_discovery",
            "company_enrichment",
            "score_contact",
            "deep_icp",
            "icp_team",
            "competitors_team",
            "pricing",
            "gtm",
            "product_intel",
            "positioning",
            "lead_gen_team",
        ):
            assert required in graphs, f"missing required graph: {required}"


async def test_runs_wait_unknown_assistant_returns_404(patched_core_app: Any) -> None:
    async with _booted_app(patched_core_app) as client:
        r = await client.post(
            "/runs/wait",
            json={"assistant_id": "definitely_not_a_real_graph", "input": {}},
        )
    # core.app raises HTTPException(404, ...) for unknown assistants.
    assert r.status_code == 404
    assert "Unknown assistant_id" in r.text


async def test_runs_wait_validates_assistant_id_required(patched_core_app: Any) -> None:
    """Empty body trips the Pydantic ``RunRequest`` model → FastAPI 422."""
    async with _booted_app(patched_core_app) as client:
        r = await client.post("/runs/wait", json={})
    assert r.status_code == 422
    body = r.json()
    # Missing assistant_id and input both surface in the error list.
    locations = {tuple(err["loc"]) for err in body["detail"]}
    assert ("body", "assistant_id") in locations


# ─── Adapter injection: parity between sync and async run paths ─────────


def test_build_run_configurable_injects_jobbert_for_contact_enrich(
    patched_core_app: Any,
) -> None:
    """Sync ``/runs/wait`` and async ``_run_graph_bg`` must agree on what
    lands in ``configurable``. Without the shared helper the async path
    silently dropped ``jobbert_ner_adapter`` and ``extract_skills`` returned
    empty skill lists for every background run.
    """
    ca = patched_core_app
    sentinel = object()
    ca.app.state.remote_adapters = {"jobbert_ner": sentinel}

    cfg = ca._build_run_configurable("contact_enrich", "tid-123")

    assert cfg["thread_id"] == "tid-123"
    assert cfg["jobbert_ner_adapter"] is sentinel


def test_build_run_configurable_omits_adapter_for_other_assistants(
    patched_core_app: Any,
) -> None:
    """Only ``contact_enrich`` consumes ``jobbert_ner_adapter`` today; every
    other assistant should get the bare ``thread_id`` so unrelated graphs
    don't see a stray key in ``configurable``."""
    ca = patched_core_app
    ca.app.state.remote_adapters = {"jobbert_ner": object()}

    cfg = ca._build_run_configurable("email_compose", "tid-1")

    assert cfg == {"thread_id": "tid-1"}


def test_build_run_configurable_handles_missing_remote_adapters(
    patched_core_app: Any,
) -> None:
    """If the lifespan boot logged a warning and left ``remote_adapters``
    empty (ML_URL absent in local dev), the helper must not crash — graphs
    that need the adapter will surface ``adapter is None`` themselves."""
    ca = patched_core_app
    ca.app.state.remote_adapters = {}

    cfg = ca._build_run_configurable("contact_enrich", "tid-x")

    assert cfg == {"thread_id": "tid-x"}
    assert "jobbert_ner_adapter" not in cfg


async def test_async_run_path_injects_jobbert_for_contact_enrich(
    patched_core_app: Any,
) -> None:
    """Regression guard: ``POST /threads/{tid}/runs`` for ``contact_enrich``
    must hand the jobbert adapter to the graph. Pre-fix, the async path
    skipped injection and ``extract_skills`` saw ``adapter is None``.

    We patch the compiled ``contact_enrich`` graph with a recorder, fire the
    async route, and assert the recorder saw the adapter in
    ``config["configurable"]``.
    """
    import asyncio as _asyncio

    ca = patched_core_app
    sentinel = object()
    captured: dict[str, Any] = {}

    class _RecordingGraph:
        async def ainvoke(
            self, payload: dict[str, Any], config: dict[str, Any] | None = None
        ) -> dict[str, Any]:
            captured["config"] = config
            captured["payload"] = payload
            return {"ok": True}

    async with _booted_app(ca) as client:
        ca.app.state.remote_adapters = {"jobbert_ner": sentinel}
        ca.app.state.graphs["contact_enrich"] = _RecordingGraph()

        r = await client.post(
            "/threads/tid-async/runs",
            json={"assistant_id": "contact_enrich", "input": {"contact_id": 1}},
        )
        assert r.status_code == 200, r.text
        run_id = r.json()["run_id"]

        # Wait for the background task to record. _async_run_tasks holds a
        # strong ref so we can ``gather`` to await completion deterministically.
        for _ in range(50):
            if ca._async_runs[run_id]["status"] != "running":
                break
            await _asyncio.sleep(0.01)

    assert ca._async_runs[run_id]["status"] == "success"
    cfg = captured["config"]["configurable"]
    assert cfg["thread_id"] == "tid-async"
    assert cfg["jobbert_ner_adapter"] is sentinel
