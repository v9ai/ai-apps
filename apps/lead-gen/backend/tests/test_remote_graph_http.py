"""Full HTTP round-trip tests for ``_ValidatedRemoteGraph``.

Unlike ``test_remote_graph_adapter.py`` (which stubs ``_remote.ainvoke``
directly), this file exercises the *real* ``langgraph.pregel.remote.RemoteGraph``
SDK end-to-end. The flow is:

    _ValidatedRemoteGraph.ainvoke(state)
        → RemoteGraph.ainvoke(state)
            → langgraph_sdk LangGraphClient.runs.stream(...)
                → POST /runs/stream over HTTP   ← intercepted by httpx.MockTransport
                ← text/event-stream response
            ← yields StreamPart chunks (event="values", data={...})
        ← returns last "values" chunk's data dict
    ← validates the dict with the *Output Pydantic contract

We give the adapter a custom ``LangGraphClient`` whose underlying
``httpx.AsyncClient`` is wired to ``httpx.MockTransport`` — so no real socket is
opened, but every layer of the SDK (request encoding, SSE decoding, status
mapping, JSON parsing) actually runs.

Why this matters: stubbing ``RemoteGraph.ainvoke`` lets a buggy SDK upgrade
silently break the integration. These tests catch HTTP-shape regressions
(non-200, malformed JSON, mismatched Content-Type, malformed SSE frames)
before they reach prod.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import httpx
import orjson
import pytest
from langgraph_sdk.client import LangGraphClient
from pydantic import ValidationError

from core.remote_graphs import _ValidatedRemoteGraph
from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
    JobbertNerInput,
    JobbertNerOutput,
)


# ─── Helpers ──────────────────────────────────────────────────────────────


def _sse_frame(event: str, data: Any) -> bytes:
    """Serialize one SSE frame as the LangGraph Server emits them."""
    body = orjson.dumps(data) if data is not None else b""
    return f"event: {event}\ndata: ".encode() + body + b"\n\n"


def _sse_response(events: list[tuple[str, Any]]) -> httpx.Response:
    """Build a streaming text/event-stream response from (event, data) pairs."""
    payload = b"".join(_sse_frame(ev, data) for ev, data in events)
    return httpx.Response(
        200,
        content=payload,
        headers={"content-type": "text/event-stream"},
    )


def _build_adapter_with_mock(
    handler: Callable[[httpx.Request], httpx.Response],
    *,
    name: str,
    input_cls: Any,
    output_cls: Any,
    base_url: str = "http://test-ml.local",
) -> tuple[_ValidatedRemoteGraph, list[httpx.Request]]:
    """Build a ``_ValidatedRemoteGraph`` whose RemoteGraph talks through MockTransport.

    Returns the adapter plus a list that captures every intercepted request, so
    tests can assert *what* hit the wire.
    """
    captured: list[httpx.Request] = []

    def wrapped(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return handler(request)

    transport = httpx.MockTransport(wrapped)
    httpx_client = httpx.AsyncClient(
        transport=transport,
        base_url=base_url,
        headers={"X-Internal-Caller": "core"},
    )
    lg_client = LangGraphClient(httpx_client)

    adapter = _ValidatedRemoteGraph(
        name=name,
        url=base_url,
        headers={"X-Internal-Caller": "core"},
        input_cls=input_cls,
        output_cls=output_cls,
    )
    # Replace the auto-built RemoteGraph client with our MockTransport-backed
    # one. ``RemoteGraph`` stores the LangGraphClient on ``.client`` (see
    # langgraph/pregel/remote.py:169). Setting it here means every subsequent
    # ainvoke routes through the mock.
    adapter._remote.client = lg_client
    return adapter, captured


# ─── Tests ────────────────────────────────────────────────────────────────


async def test_jobbert_ner_full_http_roundtrip(monkeypatch: pytest.MonkeyPatch) -> None:
    """End-to-end: real RemoteGraph serializes the call, MockTransport answers,
    _ValidatedRemoteGraph validates a JobbertNerOutput-shaped response.
    """
    monkeypatch.setenv("ML_URL", "http://test-ml.local")

    final_state = {
        "schema_version": SCHEMA_VERSION,
        "spans": [
            {
                "span": "react",
                "label": "SKILL",
                "score": 0.97,
                "start": 0,
                "end": 5,
            }
        ],
    }

    def handler(request: httpx.Request) -> httpx.Response:
        # The SDK posts to /runs/stream when no thread_id is configured.
        # We don't pin the exact path because the SDK could also start with a
        # thread create on some code paths — but for ainvoke the call is
        # POST /runs/stream.
        assert request.method == "POST"
        assert request.url.path.endswith("/runs/stream")
        # Intermediate "values" frame, then a final one — ainvoke takes the
        # last chunk.
        return _sse_response(
            [
                ("values", {"schema_version": SCHEMA_VERSION, "spans": []}),
                ("values", final_state),
            ]
        )

    adapter, captured = _build_adapter_with_mock(
        handler,
        name="jobbert_ner",
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )

    out = await adapter.ainvoke({"text": "react developer"})

    assert captured, "expected at least one HTTP request to hit MockTransport"
    assert out["schema_version"] == SCHEMA_VERSION
    assert isinstance(out["spans"], list)
    assert out["spans"][0]["span"] == "react"
    assert out["spans"][0]["label"] == "SKILL"
    assert out["spans"][0]["score"] == pytest.approx(0.97)


async def test_bge_m3_full_http_roundtrip(monkeypatch: pytest.MonkeyPatch) -> None:
    """Same idea for BgeM3EmbedInput/Output — vectors round-trip through SSE."""
    monkeypatch.setenv("ML_URL", "http://test-ml.local")

    vectors = [[0.0] * 1024, [1.0] * 1024]
    final_state = {
        "schema_version": SCHEMA_VERSION,
        "vectors": vectors,
        "dim": 1024,
        "model": "BAAI/bge-m3",
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path.endswith("/runs/stream")
        return _sse_response([("values", final_state)])

    adapter, captured = _build_adapter_with_mock(
        handler,
        name="bge_m3_embed",
        input_cls=BgeM3EmbedInput,
        output_cls=BgeM3EmbedOutput,
    )

    out = await adapter.ainvoke({"texts": ["hello", "world"]})

    assert len(captured) >= 1
    assert out["schema_version"] == SCHEMA_VERSION
    assert out["dim"] == 1024
    assert out["model"] == "BAAI/bge-m3"
    assert len(out["vectors"]) == 2
    assert len(out["vectors"][0]) == 1024


async def test_http_5xx_propagates(monkeypatch: pytest.MonkeyPatch) -> None:
    """A 500 from the LangGraph Server must surface as an exception, not a
    silent empty result. The langgraph_sdk maps 5xx to InternalServerError
    (subclass of httpx.HTTPStatusError)."""
    monkeypatch.setenv("ML_URL", "http://test-ml.local")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            500,
            json={"detail": "ml backend exploded"},
        )

    adapter, captured = _build_adapter_with_mock(
        handler,
        name="jobbert_ner",
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )

    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "react developer"})

    assert captured, "request must have been issued before the 500 was raised"


async def test_http_invalid_json_response(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock returns HTML instead of an SSE/JSON response. Must not hang and
    must not return silently — surface a clear error.

    The SDK requires Content-Type to contain ``text/event-stream``; serving HTML
    triggers ``httpx.TransportError: Expected response header Content-Type to
    contain 'text/event-stream', got 'text/html'``.
    """
    monkeypatch.setenv("ML_URL", "http://test-ml.local")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            content=b"<html>not json</html>",
            headers={"content-type": "text/html"},
        )

    adapter, _ = _build_adapter_with_mock(
        handler,
        name="jobbert_ner",
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )

    # Either a TransportError (wrong content-type) or a JSON-decode error
    # depending on SDK behaviour — both are acceptable: the point is no hang
    # and no silent success.
    with pytest.raises((httpx.TransportError, ValueError, orjson.JSONDecodeError)):
        await adapter.ainvoke({"text": "react developer"})


async def test_http_malformed_output_caught_by_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """SSE looks fine, JSON parses, but the *shape* is wrong:
    ``spans`` is a string instead of a list. Pydantic must reject it
    in the post-flight validation gate.
    """
    monkeypatch.setenv("ML_URL", "http://test-ml.local")

    def handler(request: httpx.Request) -> httpx.Response:
        return _sse_response(
            [
                (
                    "values",
                    {"schema_version": SCHEMA_VERSION, "spans": "not a list"},
                )
            ]
        )

    adapter, _ = _build_adapter_with_mock(
        handler,
        name="jobbert_ner",
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )

    with pytest.raises(ValidationError):
        await adapter.ainvoke({"text": "react developer"})


async def test_http_schema_version_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Old/wrong schema_version must fail fast.

    Note: ``JobbertNerOutput.schema_version`` is a plain ``str`` field with a
    default of SCHEMA_VERSION. The explicit ``ContractsVersionMismatch`` branch
    in ``validate_remote_call`` IS reachable here. We accept either
    ``ContractsVersionMismatch`` or ``ValidationError`` — both block the
    drift before it corrupts state.
    """
    monkeypatch.setenv("ML_URL", "http://test-ml.local")

    def handler(request: httpx.Request) -> httpx.Response:
        return _sse_response(
            [
                ("values", {"schema_version": "1999-01-01.0", "spans": []}),
            ]
        )

    adapter, _ = _build_adapter_with_mock(
        handler,
        name="jobbert_ner",
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )

    from leadgen_agent.contracts import ContractsVersionMismatch

    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        await adapter.ainvoke({"text": "react developer"})
