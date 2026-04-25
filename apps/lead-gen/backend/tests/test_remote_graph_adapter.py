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
async def test_invalid_input_extra_fields_allowed_by_default() -> None:
    """Pydantic v2 BaseModel ignores unknown keys by default — the contract
    classes do not set ``model_config = ConfigDict(extra="forbid")`` so an
    unexpected ``garbage`` key is silently dropped by the validator and the
    call still goes through. This documents the actual current behaviour.
    """
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter(fake)

    out = await adapter.ainvoke({"text": "react", "garbage": "ignored"})
    assert out["schema_version"] == SCHEMA_VERSION
    assert len(fake.calls) == 1


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
async def test_non_dict_output_raises_protocol_error() -> None:
    """A bare string from the remote (bad deploy) must raise
    ``RemoteGraphProtocolError`` — not silently validate as a default-filled
    empty Output, which used to happen for any contract whose fields all
    default (e.g. ``JobbertNerOutput``). Surfacing the protocol violation is
    the real safety property: an empty success would hide the deploy bug
    and corrupt downstream state until someone noticed missing data.
    """
    from core.remote_graphs import RemoteGraphProtocolError

    fake = FakeRemote("hello")  # a bare string is not a state dict
    adapter = _build_adapter(fake)

    with pytest.raises(RemoteGraphProtocolError) as exc_info:
        await adapter.ainvoke({"text": "react"})

    msg = str(exc_info.value)
    assert "jobbert_ner" in msg
    assert "str" in msg


@pytest.mark.asyncio
async def test_non_dict_output_with_strict_output_raises_protocol_error() -> None:
    """Same protocol-violation path for an Output with required fields. Used
    to surface as a Pydantic ValidationError mentioning the synthetic
    ``__raw__`` key — confusing for operators trying to chase the deploy
    bug. ``RemoteGraphProtocolError`` says exactly what's wrong."""
    from core.remote_graphs import RemoteGraphProtocolError
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

    with pytest.raises(RemoteGraphProtocolError) as exc_info:
        await adapter.ainvoke({"texts": ["x"]})

    msg = str(exc_info.value)
    assert "bge_m3_embed" in msg
    assert "str" in msg


@pytest.mark.asyncio
async def test_none_output_raises_protocol_error() -> None:
    """``None`` is also non-dict; same protocol-violation path."""
    from core.remote_graphs import RemoteGraphProtocolError

    fake = FakeRemote(None)
    adapter = _build_adapter(fake)

    with pytest.raises(RemoteGraphProtocolError) as exc_info:
        await adapter.ainvoke({"text": "react"})

    msg = str(exc_info.value)
    assert "NoneType" in msg


@pytest.mark.asyncio
async def test_protocol_error_is_not_retried() -> None:
    """A non-dict response is a deploy bug, not transient — the retry loop
    must not re-issue the call. Today ``_is_retryable`` doesn't classify
    ``RemoteGraphProtocolError`` because the error fires *after* the retry
    loop returns; this test pins that boundary so a later refactor that
    moves the check inside the loop also keeps the protocol error
    non-retryable."""
    from core.remote_graphs import RemoteGraphProtocolError

    fake = FakeRemote("hello")
    adapter = _build_adapter(fake)

    with pytest.raises(RemoteGraphProtocolError):
        await adapter.ainvoke({"text": "react"})

    # Exactly one HTTP call — no retry loop firing on the bad response.
    assert len(fake.calls) == 1


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
