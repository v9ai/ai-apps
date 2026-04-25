"""Unit tests for `_ValidatedRemoteGraph` in core/remote_graphs.py.

We never actually hit the network — the adapter's ``_remote`` attribute is
swapped for a ``FakeRemote`` after construction so we can assert what the
validator does with valid/invalid input and output payloads.

The adapter constructor builds a real ``RemoteGraph`` instance, but no HTTP
call happens until ``ainvoke`` is awaited; once we replace ``_remote`` the
real RemoteGraph is unreachable.
"""

from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from core.remote_graphs import _ValidatedRemoteGraph
from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    JobbertNerInput,
    JobbertNerOutput,
)


class FakeRemote:
    """Stand-in for ``langgraph.pregel.remote.RemoteGraph``.

    Records every call into ``self.calls`` and returns ``response`` on
    ainvoke, or raises if ``response`` is an Exception instance.
    """

    def __init__(self, response: Any) -> None:
        self._response = response
        self.calls: list[dict[str, Any]] = []

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> Any:
        self.calls.append(state)
        if isinstance(self._response, Exception):
            raise self._response
        return self._response


def _build_adapter(fake: FakeRemote) -> _ValidatedRemoteGraph:
    """Build a JobbertNer adapter and swap in a FakeRemote."""
    adapter = _ValidatedRemoteGraph(
        name="jobbert_ner",
        url="http://stub",
        headers={"X-Internal-Caller": "core"},
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )
    adapter._remote = fake  # type: ignore[assignment]
    return adapter


@pytest.mark.asyncio
async def test_valid_round_trip() -> None:
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    out = await adapter.ainvoke({"text": "react developer"})

    assert isinstance(out, dict)
    assert out["schema_version"] == SCHEMA_VERSION
    assert out["spans"] == []
    assert len(fake.calls) == 1
    assert fake.calls[0]["text"] == "react developer"


@pytest.mark.asyncio
async def test_invalid_input_rejected_before_call() -> None:
    """Bad input must raise ValidationError before paying for the HTTP call."""
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    with pytest.raises(ValidationError):
        # text must be a non-empty str; an int cannot coerce.
        await adapter.ainvoke({"text": 123})  # type: ignore[arg-type]

    # Crucially, the remote must not have been called.
    assert fake.calls == []


@pytest.mark.asyncio
async def test_invalid_input_empty_text() -> None:
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    with pytest.raises(ValidationError):
        await adapter.ainvoke({"text": ""})

    assert fake.calls == []


@pytest.mark.asyncio
async def test_invalid_input_extra_fields_rejected() -> None:
    """Every ``*Input`` model now carries ``extra="forbid"`` (see contracts.py
    SCHEMA_VERSION bump policy) so a stale producer cannot accept a request
    from a newer consumer with extra fields — better to 422 than silently
    drop. The adapter raises ValidationError pre-flight without ever calling
    the remote.
    """
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    with pytest.raises(ValidationError):
        await adapter.ainvoke({"text": "react", "garbage": "ignored"})

    assert fake.calls == []  # rejected pre-flight, remote not called


@pytest.mark.asyncio
async def test_output_missing_required_field() -> None:
    """JobbertNerOutput.spans has a default — but a non-list value triggers
    ValidationError. We test by returning spans=str (wrong type)."""
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": "not-a-list"})
    adapter = _build_adapter(fake)

    with pytest.raises(ValidationError):
        await adapter.ainvoke({"text": "react"})

    assert len(fake.calls) == 1  # remote WAS called; failure happened post-hoc


@pytest.mark.asyncio
async def test_non_dict_output_wrapped() -> None:
    """If the remote returns a bare string (bad deploy), the adapter wraps it
    in ``{"__raw__": ...}`` so the downstream Pydantic validator gets a real
    dict instead of crashing with "TypeError: 'str' object has no attribute".

    NOTE: For ``JobbertNerOutput`` specifically all fields have defaults
    (``schema_version`` defaults, ``spans`` defaults to ``[]``), so the wrapped
    payload validates as an empty Output rather than raising ValidationError.
    Pydantic v2 silently ignores the unknown ``__raw__`` key. This test
    documents that the adapter does NOT crash with TypeError on a non-dict
    response — graceful degradation is the actual safety property.
    """
    fake = FakeRemote("hello")  # a bare string is not a state dict
    adapter = _build_adapter(fake)

    out = await adapter.ainvoke({"text": "react"})
    # No crash — output is a valid (default-filled) JobbertNerOutput dict.
    assert isinstance(out, dict)
    assert out["schema_version"] == SCHEMA_VERSION
    assert out["spans"] == []


@pytest.mark.asyncio
async def test_non_dict_output_with_strict_output() -> None:
    """For an Output with required fields the wrap path DOES surface
    ValidationError, which is the real safety property — no silent TypeError.

    We use ``BgeM3EmbedOutput`` here: ``vectors`` has no default, so wrapping
    a bare string into ``{"__raw__": "hello"}`` triggers a missing-field error.
    """
    from leadgen_agent.contracts import BgeM3EmbedInput, BgeM3EmbedOutput

    adapter = _ValidatedRemoteGraph(
        name="bge_m3_embed",
        url="http://stub",
        headers={},
        input_cls=BgeM3EmbedInput,
        output_cls=BgeM3EmbedOutput,
    )
    fake = FakeRemote("hello")
    adapter._remote = fake  # type: ignore[assignment]

    with pytest.raises(ValidationError) as exc_info:
        await adapter.ainvoke({"texts": ["x"]})

    msg = str(exc_info.value)
    assert "vectors" in msg or "BgeM3EmbedOutput" in msg


@pytest.mark.asyncio
async def test_none_output_wrapped() -> None:
    """``None`` is also non-dict; same wrap path. For JobbertNerOutput (all
    fields default) this validates cleanly to an empty Output. The fact that
    no exception leaks to the caller is the contract we lock in."""
    fake = FakeRemote(None)
    adapter = _build_adapter(fake)

    out = await adapter.ainvoke({"text": "react"})
    assert isinstance(out, dict)
    assert out["schema_version"] == SCHEMA_VERSION
    assert out["spans"] == []


@pytest.mark.asyncio
async def test_schema_version_mismatch_path() -> None:
    """Drift detection: an old version in the output must fail fast.

    JobbertNerOutput.schema_version is a plain ``str`` field, so the explicit
    ContractsVersionMismatch branch in validate_remote_call IS reachable.
    Either ContractsVersionMismatch or ValidationError is acceptable —
    both keep state safe. See test_contracts_validation::test_schema_version_drift_raises.
    """
    fake = FakeRemote({"schema_version": "1999-01-01.0", "spans": []})
    adapter = _build_adapter(fake)

    from leadgen_agent.contracts import ContractsVersionMismatch

    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        await adapter.ainvoke({"text": "react"})

    assert len(fake.calls) == 1


@pytest.mark.asyncio
async def test_dunder_call_delegates_to_ainvoke() -> None:
    """Adapter is callable via __call__ for older code paths."""
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    out = await adapter({"text": "react"})  # __call__ path
    assert out["schema_version"] == SCHEMA_VERSION
    assert len(fake.calls) == 1


@pytest.mark.asyncio
async def test_config_passed_through_to_remote() -> None:
    """The adapter must forward the ``config`` kwarg untouched to RemoteGraph."""

    class ConfigCapturingRemote(FakeRemote):
        def __init__(self, response: Any) -> None:
            super().__init__(response)
            self.configs: list[dict[str, Any] | None] = []

        async def ainvoke(
            self, state: dict[str, Any], config: dict[str, Any] | None = None
        ) -> Any:
            self.configs.append(config)
            return await super().ainvoke(state, config=config)

    fake = ConfigCapturingRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    cfg = {"configurable": {"thread_id": "t1"}}
    await adapter.ainvoke({"text": "react"}, config=cfg)
    assert fake.configs == [cfg]


@pytest.mark.asyncio
async def test_request_id_forwarded_as_header() -> None:
    """A request_id in config.metadata becomes an x-request-id header.

    Closes the observability loop: the inbound request-id middleware stashes
    the id, the calling graph propagates it via ``config.metadata``, and the
    adapter forwards it to the remote container as ``x-request-id`` so the
    same id appears on both sides of the wire.
    """

    class HeaderCapturingRemote(FakeRemote):
        def __init__(self, response: Any) -> None:
            super().__init__(response)
            self.headers_seen: list[dict[str, str] | None] = []

        async def ainvoke(
            self,
            state: dict[str, Any],
            config: dict[str, Any] | None = None,
            *,
            headers: dict[str, str] | None = None,
        ) -> Any:
            self.headers_seen.append(headers)
            return await super().ainvoke(state, config=config)

    fake = HeaderCapturingRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    cfg = {
        "configurable": {"thread_id": "t1"},
        "metadata": {"request_id": "rid-deadbeef"},
    }
    await adapter.ainvoke({"text": "react"}, config=cfg)
    assert fake.headers_seen == [{"x-request-id": "rid-deadbeef"}]


@pytest.mark.asyncio
async def test_request_id_absent_when_metadata_missing() -> None:
    """No metadata.request_id → no per-call headers passed to RemoteGraph.

    Important: the constructor-time ``X-Internal-Caller`` headers must not be
    overridden when there is no caller-provided id, otherwise an adapter
    used outside an HTTP request (background dispatch) would lose its
    bearer-auth header.
    """

    class HeaderCapturingRemote(FakeRemote):
        def __init__(self, response: Any) -> None:
            super().__init__(response)
            self.headers_kw_used: list[bool] = []

        async def ainvoke(
            self,
            state: dict[str, Any],
            config: dict[str, Any] | None = None,
            **kwargs: Any,
        ) -> Any:
            self.headers_kw_used.append("headers" in kwargs)
            return await super().ainvoke(state, config=config)

    fake = HeaderCapturingRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    await adapter.ainvoke({"text": "react"}, config={"configurable": {"thread_id": "t1"}})
    assert fake.headers_kw_used == [False]
