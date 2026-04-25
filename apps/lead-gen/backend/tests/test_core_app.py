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
    # /health is in _PUBLIC_PATHS and does not need ``app.state.graphs``.
    async with AsyncClient(
        transport=ASGITransport(app=patched_core_app.app), base_url="http://test"
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


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


async def test_request_id_minted_when_missing(patched_core_app: Any) -> None:
    """Every response must echo an ``x-request-id`` even if none was sent.

    The request-id middleware mints ``uuid4().hex`` when the inbound header
    is absent so a CF dispatcher Worker that forgot to forward an id still
    produces correlatable log lines.
    """
    async with AsyncClient(
        transport=ASGITransport(app=patched_core_app.app), base_url="http://test"
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    rid = r.headers.get("x-request-id")
    assert rid is not None and len(rid) >= 8


async def test_request_id_propagated_when_present(patched_core_app: Any) -> None:
    """An inbound ``x-request-id`` is preserved untouched in the response.

    Critical for the dispatcher → sub-Worker → LangSmith stitch: if the
    middleware overwrote a parent id, every log line below the dispatcher
    would carry a different id and joins would fail.
    """
    incoming = "abc123-trace-xyz"
    async with AsyncClient(
        transport=ASGITransport(app=patched_core_app.app), base_url="http://test"
    ) as client:
        r = await client.get("/health", headers={"x-request-id": incoming})
    assert r.status_code == 200
    assert r.headers.get("x-request-id") == incoming
