"""Error-path tests — every graph must terminate via ``notify_error_node``.

Context: before the error-edge wiring, an exception inside any LLM / loader
node would bubble to LangGraph's executor. The run would land in an internal
error state and ``product_intel_runs.status`` would stay ``running`` until a
human (or the stale-run sweeper) noticed. Fire-and-forget is only honest if
failures terminate cleanly too.

This file proves the fix for all three top-level graphs (``pricing``, ``gtm``,
``product_intel``) by:

1. Stubbing ``psycopg.connect`` so the loader node doesn't try to reach Neon.
2. Monkeypatching ``ainvoke_json`` (the LLM entry point) to raise, which is the
   realistic failure mode — DeepSeek times out, a json parse blows up, etc.
3. Capturing the outbound webhook POST via a mocked ``httpx.AsyncClient``.
4. Asserting on three things per graph:
     - the run terminates (``await graph.ainvoke(...)`` returns without raising)
     - exactly one POST is emitted carrying ``status: "error"`` + a signed body
     - ``state["_error"]`` is populated with the truncated ``repr(...)``

Running the full suite with these tests should stay under a second — no real
network, no real DB.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from contextlib import asynccontextmanager
from typing import Any

import pytest

from leadgen_agent import gtm_graph, pricing_graph, product_intel_graph


# ── test helpers ──────────────────────────────────────────────────────────


class _CapturingClient:
    """Minimal httpx.AsyncClient stand-in. Stashes POST args so the test can
    re-derive the signature and assert on the payload."""

    calls: list[dict[str, Any]] = []

    def __init__(self, *_args: Any, **_kwargs: Any) -> None: ...

    async def __aenter__(self) -> "_CapturingClient":
        return self

    async def __aexit__(self, *_args: Any) -> None:
        return None

    async def post(self, url: str, *, content: bytes, headers: dict[str, str]) -> Any:
        _CapturingClient.calls.append({"url": url, "content": content, "headers": headers})

        class _Resp:
            status_code = 200
            text = ""

        return _Resp()


class _FakeCursor:
    """psycopg cursor stub — returns the row we need for the loader path,
    then an empty row for any follow-up SELECT."""

    def __init__(self, rows: list[tuple[Any, ...]], cols: list[str]) -> None:
        self._rows = list(rows)
        self._cols = cols
        # Mirror psycopg3's cursor.description: a list of simple objects with
        # attribute-style access. Tests only need [0].name.
        self.description = [(c,) for c in cols]

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *_args: Any) -> None:
        return None

    def execute(self, sql: str, params: tuple[Any, ...] | None = None) -> None:
        # The third graph under test (product_intel) executes one primary
        # SELECT against products. Pricing + gtm issue a second SELECT for
        # competitor rows — for those, return an empty rowset the next time
        # fetchall() is called.
        if "FROM competitor_analyses" in sql or "FROM competitors" in sql:
            self._rows = []
            self.description = []

    def fetchone(self) -> tuple[Any, ...] | None:
        return self._rows[0] if self._rows else None

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._rows)


class _FakeConn:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor

    def __enter__(self) -> "_FakeConn":
        return self

    def __exit__(self, *_args: Any) -> None:
        return None

    def cursor(self) -> _FakeCursor:
        return self._cursor


def _fake_product_row() -> tuple[list[str], tuple[Any, ...]]:
    """A product row shaped for all three loaders (superset of fields)."""
    cols = [
        "id",
        "name",
        "url",
        "domain",
        "description",
        "highlights",
        "icp_analysis",
        "pricing_analysis",
        "gtm_analysis",
    ]
    row = (
        1,                          # id
        "Acme",                     # name
        "https://acme.test",        # url
        "acme.test",                # domain
        "A product.",               # description
        None,                       # highlights
        None,                       # icp_analysis
        None,                       # pricing_analysis
        None,                       # gtm_analysis
    )
    return cols, row


def _boom(*_args: Any, **_kwargs: Any) -> Any:
    raise RuntimeError("boom-intentional-test-failure")


def _install_common_stubs(monkeypatch: pytest.MonkeyPatch, module: Any) -> None:
    """Patch psycopg.connect on the target module and swap httpx.AsyncClient
    in the shared notify module so every outbound POST is captured."""
    # ``_dsn()`` in deep_icp_graph runs before the psycopg stub we install below
    # and raises if neither NEON_DATABASE_URL nor DATABASE_URL is set. Give it a
    # harmless placeholder so the code path reaches our cursor stub. The stub
    # fake_connect ignores the DSN entirely.
    monkeypatch.setenv("DATABASE_URL", "postgresql://stub:stub@localhost:5432/stub")
    cols, row = _fake_product_row()
    cursor = _FakeCursor([row], cols)
    monkeypatch.setattr(module.psycopg, "connect", lambda *a, **k: _FakeConn(cursor))

    # notify._post reaches for httpx.AsyncClient on the shared module import,
    # so patching it there covers all three graphs.
    from leadgen_agent import notify
    _CapturingClient.calls = []
    monkeypatch.setattr(notify.httpx, "AsyncClient", _CapturingClient)


def _assert_signed_error_post(secret: str, app_run_id: str) -> dict[str, Any]:
    """Exactly one POST must have been captured. Return its decoded body after
    verifying the HMAC and shared headers."""
    assert len(_CapturingClient.calls) == 1, (
        f"expected exactly one webhook POST, got {len(_CapturingClient.calls)}: "
        f"{_CapturingClient.calls!r}"
    )
    call = _CapturingClient.calls[0]
    body: bytes = call["content"]
    headers: dict[str, str] = {k.lower(): v for k, v in call["headers"].items()}

    assert headers.get("content-type") == "application/json"
    assert headers.get("x-app-run-id") == app_run_id

    expected_sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert hmac.compare_digest(headers.get("x-app-signature", ""), expected_sig), (
        "signature mismatch — notify_error body bytes drifted from the HMAC"
    )

    decoded = json.loads(body)
    assert decoded.get("status") == "error", decoded
    assert decoded.get("error"), "error string must be present and non-empty"
    # Truncation guard — notify_error slices to 1000 chars.
    assert len(decoded["error"]) <= 1000
    return decoded


# ── 1. pricing ────────────────────────────────────────────────────────────


async def test_pricing_graph_terminates_on_llm_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_common_stubs(monkeypatch, pricing_graph)
    monkeypatch.setattr(pricing_graph, "ainvoke_json", _boom)

    graph = pricing_graph.build_graph()
    secret = "test-secret"
    app_run_id = "run_pricing_err"
    final = await graph.ainvoke(
        {
            "product_id": 1,
            "webhook_url": "https://example.test/webhook",
            "webhook_secret": secret,
            "app_run_id": app_run_id,
        }
    )

    # 1. Graph returned a terminal state (no exception raised).
    assert isinstance(final, dict)
    # 2. _error is populated with a truncated repr(exc) string.
    assert final.get("_error"), "graph did not route error into state._error"
    assert "RuntimeError" in final["_error"]
    assert "boom-intentional-test-failure" in final["_error"]
    assert len(final["_error"]) <= 1100  # node prefix + repr([:1000])
    # 3. No success payload leaked through.
    assert not final.get("pricing")
    # 4. Signed error webhook was emitted.
    decoded = _assert_signed_error_post(secret, app_run_id)
    assert "boom-intentional-test-failure" in decoded["error"]


# ── 2. gtm ────────────────────────────────────────────────────────────────


async def test_gtm_graph_terminates_on_llm_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_common_stubs(monkeypatch, gtm_graph)
    monkeypatch.setattr(gtm_graph, "ainvoke_json", _boom)

    graph = gtm_graph.build_graph()
    secret = "test-secret-gtm"
    app_run_id = "run_gtm_err"
    final = await graph.ainvoke(
        {
            "product_id": 1,
            "webhook_url": "https://example.test/webhook",
            "webhook_secret": secret,
            "app_run_id": app_run_id,
        }
    )

    assert isinstance(final, dict)
    assert final.get("_error"), "graph did not route error into state._error"
    assert "RuntimeError" in final["_error"]
    assert "boom-intentional-test-failure" in final["_error"]
    assert len(final["_error"]) <= 1100
    assert not final.get("gtm")
    decoded = _assert_signed_error_post(secret, app_run_id)
    assert "boom-intentional-test-failure" in decoded["error"]


# ── 3. product_intel supervisor ───────────────────────────────────────────


async def test_product_intel_graph_terminates_on_loader_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Force ``load_and_profile`` to fail at the LLM call. The supervisor's
    downstream nodes must all short-circuit on ``_error`` and the graph must
    terminate via ``notify_error_node`` — not via an uncaught executor error."""
    _install_common_stubs(monkeypatch, product_intel_graph)
    monkeypatch.setattr(product_intel_graph, "ainvoke_json", _boom)

    graph = product_intel_graph.build_graph()
    secret = "test-secret-intel"
    app_run_id = "run_intel_err"
    final = await graph.ainvoke(
        {
            "product_id": 1,
            "webhook_url": "https://example.test/webhook",
            "webhook_secret": secret,
            "app_run_id": app_run_id,
        }
    )

    assert isinstance(final, dict)
    assert final.get("_error"), "graph did not route error into state._error"
    assert "load_and_profile" in final["_error"]
    assert "boom-intentional-test-failure" in final["_error"]
    assert not final.get("report")
    decoded = _assert_signed_error_post(secret, app_run_id)
    assert "load_and_profile" in decoded["error"]


# ── 4. no-webhook path ────────────────────────────────────────────────────


async def test_pricing_graph_error_is_silent_without_webhook(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When the caller did not set webhook_*, notify_error must no-op silently —
    no POST is attempted. The run still terminates cleanly with _error set.
    Mirrors how sync /runs/wait callers invoke the graph (no webhook config)."""
    _install_common_stubs(monkeypatch, pricing_graph)
    monkeypatch.setattr(pricing_graph, "ainvoke_json", _boom)

    graph = pricing_graph.build_graph()
    final = await graph.ainvoke({"product_id": 1})

    assert isinstance(final, dict)
    assert final.get("_error")
    assert len(_CapturingClient.calls) == 0, (
        "webhook POST must not fire when webhook_* keys are absent from state"
    )
