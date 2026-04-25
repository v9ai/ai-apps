"""Smoke tests for ``research/app.py`` — boots the research FastAPI app in-process.

Mirrors the ``test_core_app.py`` strategy: patch ``AsyncPostgresSaver`` with an
in-memory checkpointer wrapper and drive the lifespan ourselves around an
``httpx.AsyncClient``.

The research package lives at ``backend/research/`` and is not on
``sys.path`` by default — its ``research_graphs/`` subpackage is imported via
absolute name from inside ``research/app.py``. We prepend ``research/`` to
``sys.path`` so ``import research_graphs.scholar`` resolves.
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from langgraph.checkpoint.memory import InMemorySaver

_RESEARCH_DIR = Path(__file__).parent.parent / "research"
if str(_RESEARCH_DIR) not in sys.path:
    sys.path.insert(0, str(_RESEARCH_DIR))


class _FakeAsyncSaver(InMemorySaver):
    async def setup(self) -> None:
        return None


@pytest.fixture
def patched_research_app(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv(
        "NEON_DATABASE_URL",
        "postgresql://fake:fake@localhost:1/fake?sslmode=require",
    )
    monkeypatch.setenv("DATABASE_URL", os.environ["NEON_DATABASE_URL"])

    import research.app as ra

    # Drop both bearer tokens — backend/.env loads LANGGRAPH_AUTH_TOKEN at
    # import time via leadgen_agent.llm; the research middleware checks the
    # research-specific token instead.
    monkeypatch.delenv("LANGGRAPH_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("RESEARCH_INTERNAL_AUTH_TOKEN", raising=False)

    fake_saver = _FakeAsyncSaver()

    @asynccontextmanager
    async def _fake_from_conn_string(_url: str):
        yield fake_saver

    monkeypatch.setattr(
        ra.AsyncPostgresSaver,
        "from_conn_string",
        staticmethod(_fake_from_conn_string),
    )
    return ra


@asynccontextmanager
async def _booted_app(ra: Any):
    async with ra.lifespan(ra.app):
        async with AsyncClient(
            transport=ASGITransport(app=ra.app), base_url="http://test"
        ) as client:
            yield client


async def test_app_imports_and_starts(patched_research_app: Any) -> None:
    from fastapi import FastAPI

    assert isinstance(patched_research_app.app, FastAPI)
    assert patched_research_app.app.title == "lead-gen research"


async def test_health_endpoint(patched_research_app: Any) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=patched_research_app.app),
        base_url="http://test",
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_research_graphs_registered(patched_research_app: Any) -> None:
    async with _booted_app(patched_research_app) as _client:
        graphs = patched_research_app.app.state.graphs
        assert len(graphs) >= 6, f"expected >= 6 research graphs, got {len(graphs)}"
        for required in (
            "research_agent",
            "scholar",
            "lead_papers",
            "common_crawl",
            "agentic_search",
            "gh_patterns",
        ):
            assert required in graphs, f"missing required graph: {required}"


async def test_runs_wait_unknown_assistant_returns_404(
    patched_research_app: Any,
) -> None:
    async with _booted_app(patched_research_app) as client:
        r = await client.post(
            "/runs/wait",
            json={"assistant_id": "definitely_not_a_real_graph", "input": {}},
        )
    assert r.status_code == 404
    assert "Unknown assistant_id" in r.text


async def test_runs_wait_validates_input_shape(patched_research_app: Any) -> None:
    """Missing ``assistant_id`` field trips the Pydantic ``RunRequest`` model."""
    async with _booted_app(patched_research_app) as client:
        r = await client.post("/runs/wait", json={"input": {}})
    assert r.status_code == 422
    body = r.json()
    locations = {tuple(err["loc"]) for err in body["detail"]}
    assert ("body", "assistant_id") in locations
