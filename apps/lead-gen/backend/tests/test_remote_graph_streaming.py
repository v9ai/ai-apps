"""Unit tests for `_ValidatedRemoteGraph.astream` in core/remote_graphs.py.

The adapter exposes ``astream`` as an additive surface alongside ``ainvoke``:
it lets the dispatcher emit interim progress while a long-running remote
research node is still mid-flight. The semantics under test:

* Pre-flight input validation runs **before** the underlying ``astream`` is
  called. Bad input never opens a network stream.
* Each event emitted by the underlying ``RemoteGraph.astream`` is forwarded
  byte-identical (no rewrapping, no filtering).
* When the stream closes, the adapter validates the *accumulated* final
  state against ``output_cls`` — same shape and ``schema_version`` checks
  as ``ainvoke``. Drift raises ``ContractsVersionMismatch`` post-stream.

We never hit the network — a ``FakeStreamingRemote`` substitutes for the
real ``RemoteGraph`` after construction, exactly like the
``FakeRemote`` pattern in ``test_remote_graph_adapter.py``.
"""

from __future__ import annotations

from typing import Any, AsyncIterator

import pytest
from pydantic import ValidationError

from core.remote_graphs import _ValidatedRemoteGraph
from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    ContractsVersionMismatch,
    JobbertNerInput,
    JobbertNerOutput,
)


class FakeStreamingRemote:
    """Stand-in for ``langgraph.pregel.remote.RemoteGraph`` with both
    ``ainvoke`` and ``astream``. Records calls for inspection.

    ``stream_events`` is the sequence of payloads ``astream`` will yield.
    For ``stream_mode="updates"`` each item is a ``{node_name: partial_state}``
    dict — that's exactly what ``RemoteGraph.astream`` emits when called
    with a single string mode (see langgraph/pregel/remote.py: it yields
    ``chunk.data`` directly when ``req_single`` is true).
    """

    def __init__(
        self,
        ainvoke_response: Any = None,
        stream_events: list[Any] | None = None,
    ) -> None:
        self._ainvoke_response = ainvoke_response
        self._stream_events = list(stream_events or [])
        self.ainvoke_calls: list[dict[str, Any]] = []
        self.astream_calls: list[tuple[dict[str, Any], dict[str, Any] | None, str]] = []

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> Any:
        self.ainvoke_calls.append(state)
        if isinstance(self._ainvoke_response, Exception):
            raise self._ainvoke_response
        return self._ainvoke_response

    async def astream(
        self,
        state: dict[str, Any],
        config: dict[str, Any] | None = None,
        *,
        stream_mode: str = "updates",
        **_kwargs: Any,
    ) -> AsyncIterator[Any]:
        self.astream_calls.append((state, config, stream_mode))
        for event in self._stream_events:
            if isinstance(event, Exception):
                raise event
            yield event


def _build_adapter(fake: FakeStreamingRemote) -> _ValidatedRemoteGraph:
    adapter = _ValidatedRemoteGraph(
        name="jobbert_ner",
        url="http://stub",
        headers={"X-Internal-Caller": "core"},
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )
    adapter._remote = fake  # type: ignore[assignment]
    return adapter


# ─── Pass-through fidelity ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_astream_passes_events_through_byte_identical() -> None:
    """Every event from the underlying astream must surface unchanged."""
    events = [
        {"node_a": {"spans": []}},
        {"node_b": {"spans": [{"span": "react", "label": "SKILL",
                               "score": 0.9, "start": 0, "end": 5}]}},
        {"node_final": {"schema_version": SCHEMA_VERSION,
                        "spans": [{"span": "react", "label": "SKILL",
                                   "score": 0.9, "start": 0, "end": 5}]}},
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    received: list[Any] = []
    async for event in adapter.astream({"text": "react developer"}):
        received.append(event)

    # Byte-identical pass-through — same Python objects, same order.
    assert received == events
    assert all(a is b for a, b in zip(received, events))
    assert len(fake.astream_calls) == 1
    state, _config, mode = fake.astream_calls[0]
    assert state == {"text": "react developer"}
    assert mode == "updates"


@pytest.mark.asyncio
async def test_astream_default_mode_is_updates() -> None:
    fake = FakeStreamingRemote(stream_events=[])
    adapter = _build_adapter(fake)

    async for _ in adapter.astream({"text": "x"}):
        pass

    assert fake.astream_calls[0][2] == "updates"


@pytest.mark.asyncio
async def test_astream_forwards_config() -> None:
    fake = FakeStreamingRemote(stream_events=[])
    adapter = _build_adapter(fake)

    cfg = {"configurable": {"thread_id": "t1"}}
    async for _ in adapter.astream({"text": "x"}, config=cfg):
        pass

    assert fake.astream_calls[0][1] == cfg


# ─── Input validation runs pre-flight ──────────────────────────────────────


@pytest.mark.asyncio
async def test_astream_invalid_input_rejected_before_stream_opens() -> None:
    """Bad input must raise ValidationError before _remote.astream is called."""
    fake = FakeStreamingRemote(stream_events=[
        {"node": {"schema_version": SCHEMA_VERSION, "spans": []}}
    ])
    adapter = _build_adapter(fake)

    with pytest.raises(ValidationError):
        # ``text`` must be non-empty str — int does not coerce.
        async for _ in adapter.astream({"text": 123}):  # type: ignore[arg-type]
            pass

    # Critical: the underlying astream was never opened.
    assert fake.astream_calls == []


@pytest.mark.asyncio
async def test_astream_empty_text_rejected_before_stream_opens() -> None:
    fake = FakeStreamingRemote(stream_events=[
        {"node": {"schema_version": SCHEMA_VERSION, "spans": []}}
    ])
    adapter = _build_adapter(fake)

    with pytest.raises(ValidationError):
        async for _ in adapter.astream({"text": ""}):
            pass

    assert fake.astream_calls == []


# ─── End-of-stream validation ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_astream_valid_final_state_no_error() -> None:
    """Accumulated final state matches the contract → stream completes clean."""
    events = [
        {"node_a": {"spans": []}},
        {"node_b": {"schema_version": SCHEMA_VERSION,
                    "spans": [{"span": "react", "label": "SKILL",
                               "score": 0.5, "start": 0, "end": 5}]}},
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    # Should drain to completion without raising.
    received = [e async for e in adapter.astream({"text": "react"})]
    assert received == events


@pytest.mark.asyncio
async def test_astream_bad_schema_version_raises_post_stream() -> None:
    """Drift in the final accumulated state surfaces AFTER the stream closes,
    not mid-stream — the dispatcher needs to receive every interim event
    before the failure is raised.
    """
    events = [
        {"node_a": {"spans": []}},
        {"node_final": {"schema_version": "1999-01-01.0", "spans": []}},
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    received: list[Any] = []
    with pytest.raises(ContractsVersionMismatch):
        async for event in adapter.astream({"text": "react"}):
            received.append(event)

    # All events were yielded BEFORE the post-stream check fired.
    assert received == events


@pytest.mark.asyncio
async def test_astream_bad_final_shape_raises_validation_error() -> None:
    """Final state failing Pydantic shape (wrong type for ``spans``) raises
    ValidationError post-stream, after every event has been forwarded.
    """
    events = [
        {"node_a": {"spans": []}},
        {"node_final": {"schema_version": SCHEMA_VERSION,
                        "spans": "not-a-list"}},
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    received: list[Any] = []
    with pytest.raises(ValidationError):
        async for event in adapter.astream({"text": "react"}):
            received.append(event)

    assert received == events


@pytest.mark.asyncio
async def test_astream_empty_stream_passes() -> None:
    """A remote graph that emits no updates has nothing to validate — and
    nothing to drift. Must not raise.
    """
    fake = FakeStreamingRemote(stream_events=[])
    adapter = _build_adapter(fake)

    received = [e async for e in adapter.astream({"text": "react"})]
    assert received == []


# ─── values mode ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_astream_values_mode_validates_last_full_state() -> None:
    """``values`` mode emits the full state per step. The adapter takes the
    LAST event as the final state for validation.
    """
    events = [
        {"schema_version": SCHEMA_VERSION, "spans": []},
        {"schema_version": SCHEMA_VERSION,
         "spans": [{"span": "react", "label": "SKILL",
                    "score": 0.5, "start": 0, "end": 5}]},
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    received = [
        e async for e in adapter.astream({"text": "react"}, stream_mode="values")
    ]
    assert received == events
    assert fake.astream_calls[0][2] == "values"


@pytest.mark.asyncio
async def test_astream_values_mode_bad_version_raises() -> None:
    events = [
        {"schema_version": "1999-01-01.0", "spans": []},
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    with pytest.raises(ContractsVersionMismatch):
        async for _ in adapter.astream({"text": "react"}, stream_mode="values"):
            pass


# ─── messages mode skips state validation ──────────────────────────────────


@pytest.mark.asyncio
async def test_astream_messages_mode_skips_validation() -> None:
    """``messages`` mode emits LLM token chunks, not state dicts. The
    accumulated-state check is intentionally skipped — otherwise every token
    stream would fail validation as missing fields.
    """
    # Token-style events (tuple of (message_chunk, metadata) is what
    # LangGraph emits in messages mode); we use plain dicts here because
    # the adapter just forwards them.
    events = [
        ("msg-chunk-1", {"langgraph_node": "agent"}),
        ("msg-chunk-2", {"langgraph_node": "agent"}),
    ]
    fake = FakeStreamingRemote(stream_events=events)
    adapter = _build_adapter(fake)

    received = [
        e async for e in adapter.astream({"text": "react"}, stream_mode="messages")
    ]
    assert received == events
    # No ContractsVersionMismatch / ValidationError despite no schema_version.


# ─── ainvoke / __call__ remain unchanged ───────────────────────────────────


@pytest.mark.asyncio
async def test_ainvoke_still_works_alongside_astream() -> None:
    """Adding ``astream`` must not regress ``ainvoke``."""
    fake = FakeStreamingRemote(
        ainvoke_response={"schema_version": SCHEMA_VERSION, "spans": []},
        stream_events=[],
    )
    adapter = _build_adapter(fake)

    out = await adapter.ainvoke({"text": "react"})
    assert out["schema_version"] == SCHEMA_VERSION
    assert out["spans"] == []
    assert len(fake.ainvoke_calls) == 1
    assert fake.astream_calls == []


@pytest.mark.asyncio
async def test_dunder_call_still_works_alongside_astream() -> None:
    fake = FakeStreamingRemote(
        ainvoke_response={"schema_version": SCHEMA_VERSION, "spans": []},
        stream_events=[],
    )
    adapter = _build_adapter(fake)

    out = await adapter({"text": "react"})
    assert out["schema_version"] == SCHEMA_VERSION
    assert len(fake.ainvoke_calls) == 1


# ─── Cleanup + empty-stream observability ─────────────────────────────────


@pytest.mark.asyncio
async def test_astream_empty_stream_emits_warning(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Zero events in a non-``messages`` stream is suspicious — a healthy
    graph emits at least one update. We surface a WARNING so a misbehaving
    remote that opens the stream and yields nothing shows up in production
    logs instead of silently passing."""
    import logging

    fake = FakeStreamingRemote(stream_events=[])
    adapter = _build_adapter(fake)

    with caplog.at_level(logging.WARNING, logger="core.remote_graphs"):
        events = [e async for e in adapter.astream({"text": "react"})]

    assert events == []
    matches = [r for r in caplog.records if "emitted zero events" in r.message]
    assert len(matches) == 1
    assert "adapter=jobbert_ner" in matches[0].message


@pytest.mark.asyncio
async def test_astream_messages_mode_does_not_warn_on_empty(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """``messages`` mode is allowed to emit zero events (no LLM tokens) — no
    warning, since the absence of state validation is by design."""
    import logging

    fake = FakeStreamingRemote(stream_events=[])
    adapter = _build_adapter(fake)

    with caplog.at_level(logging.WARNING, logger="core.remote_graphs"):
        events = [
            e async for e in adapter.astream({"text": "react"}, stream_mode="messages")
        ]

    assert events == []
    assert not [r for r in caplog.records if "emitted zero events" in r.message]


@pytest.mark.asyncio
async def test_astream_calls_aclose_on_underlying_iterator_after_normal_completion() -> None:
    """The astream wrapper now mirrors ``_subgraph_stream`` and explicitly
    holds the inner async-iterator so it can ``aclose()`` it on exit. This
    closes the httpx chunked-transfer connection immediately instead of
    waiting for GC, which matters under parent-task cancellation."""
    aclose_called = {"count": 0}

    class _RecordingAsyncGen:
        def __init__(self, events: list[Any]) -> None:
            self._events = list(events)

        def __aiter__(self) -> Any:
            return self

        async def __anext__(self) -> Any:
            if not self._events:
                raise StopAsyncIteration
            return self._events.pop(0)

        async def aclose(self) -> None:
            aclose_called["count"] += 1

    class _Remote:
        def astream(self, *_a: Any, **_k: Any) -> _RecordingAsyncGen:
            return _RecordingAsyncGen(
                [{"node": {"schema_version": SCHEMA_VERSION, "spans": []}}]
            )

    adapter = _ValidatedRemoteGraph(
        name="jobbert_ner",
        url="http://stub",
        headers={},
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )
    adapter._remote = _Remote()  # type: ignore[assignment]

    events = [e async for e in adapter.astream({"text": "react"})]

    assert len(events) == 1
    assert aclose_called["count"] == 1, (
        "astream must call aclose on the underlying async iterator on exit"
    )
