"""Retry + circuit-breaker tests for ``_ValidatedRemoteGraph``.

These tests follow the same FakeRemote-swap pattern as
``test_remote_graph_adapter.py`` so we never touch the network — only the
retry loop and breaker bookkeeping in ``core.remote_graphs`` are exercised.

Coverage:
* exponential backoff fires on a flaky remote that fails twice then succeeds
* permanent errors (``ValidationError`` from the SDK layer) are NOT retried
* circuit breaker opens after threshold and rejects subsequent calls fast
  with ``RemoteUnavailable``
* circuit closes after the cool-down elapses
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest
from pydantic import ValidationError

from core.remote_graphs import (
    RemoteUnavailable,
    _CircuitBreaker,
    _ValidatedRemoteGraph,
)
from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    JobbertNerInput,
    JobbertNerOutput,
)


# ─── Fakes ────────────────────────────────────────────────────────────────


class ScriptedRemote:
    """Stand-in for ``RemoteGraph`` that returns/raises from a scripted list.

    Each entry is either an Exception (raised) or a value (returned). The
    scripted list is consumed front-to-back; if it runs out, the last entry is
    repeated, which matches the "always-fails" pattern needed for breaker
    tests.
    """

    def __init__(self, script: list[Any]) -> None:
        assert script, "script must have at least one entry"
        self._script = list(script)
        self.calls: list[dict[str, Any]] = []

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> Any:
        self.calls.append(state)
        item = self._script.pop(0) if len(self._script) > 1 else self._script[0]
        if isinstance(item, BaseException):
            raise item
        return item


def _make_http_5xx() -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "http://stub/runs/stream")
    response = httpx.Response(503, request=request, json={"detail": "down"})
    return httpx.HTTPStatusError("503", request=request, response=response)


def _make_http_429() -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "http://stub/runs/stream")
    response = httpx.Response(429, request=request, json={"detail": "slow down"})
    return httpx.HTTPStatusError("429", request=request, response=response)


def _make_http_400() -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "http://stub/runs/stream")
    response = httpx.Response(400, request=request, json={"detail": "bad input"})
    return httpx.HTTPStatusError("400", request=request, response=response)


def _good_output() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "spans": []}


@pytest.fixture(autouse=True)
def _reset_breakers() -> None:
    """Each test starts with a clean breaker registry."""
    _CircuitBreaker.reset_all()


def _build_adapter(
    fake: ScriptedRemote,
    *,
    name: str = "jobbert_ner",
    max_attempts: int = 3,
    backoff_base_s: float = 0.0,  # zero base → near-instant retries in tests
    backoff_cap_s: float = 0.0,
    breaker_failure_threshold: int = 5,
    breaker_cool_down_s: float = 30.0,
) -> _ValidatedRemoteGraph:
    adapter = _ValidatedRemoteGraph(
        name=name,
        url="http://stub",
        headers={"X-Internal-Caller": "core"},
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
        max_attempts=max_attempts,
        backoff_base_s=backoff_base_s,
        backoff_cap_s=backoff_cap_s,
        breaker_failure_threshold=breaker_failure_threshold,
        breaker_cool_down_s=breaker_cool_down_s,
    )
    adapter._remote = fake  # type: ignore[assignment]
    return adapter


# ─── Tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_retries_then_succeeds_on_flaky_remote() -> None:
    """Two transient failures, then a clean response — adapter must retry and
    return the final result. ``ScriptedRemote`` records every attempt."""
    fake = ScriptedRemote(
        [
            _make_http_5xx(),
            httpx.ConnectError("connection refused"),
            _good_output(),
        ]
    )
    adapter = _build_adapter(fake, max_attempts=3)

    out = await adapter.ainvoke({"text": "react developer"})

    assert out["schema_version"] == SCHEMA_VERSION
    assert out["spans"] == []
    # Three attempts total: two failures + one success.
    assert len(fake.calls) == 3


@pytest.mark.asyncio
async def test_retries_on_429() -> None:
    """HTTP 429 (rate-limit) is treated as transient and retried."""
    fake = ScriptedRemote([_make_http_429(), _good_output()])
    adapter = _build_adapter(fake, max_attempts=3)

    out = await adapter.ainvoke({"text": "x"})
    assert out["schema_version"] == SCHEMA_VERSION
    assert len(fake.calls) == 2


@pytest.mark.asyncio
async def test_does_not_retry_4xx() -> None:
    """A 400 is a client bug, not a transient blip — fail fast on the first try."""
    fake = ScriptedRemote([_make_http_400(), _good_output()])
    adapter = _build_adapter(fake, max_attempts=3)

    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "x"})

    assert len(fake.calls) == 1


@pytest.mark.asyncio
async def test_does_not_retry_validation_error_from_remote() -> None:
    """If the SDK layer raises ``ValidationError`` (e.g. the response shape
    breaks pydantic deserialisation inside the SDK), it is permanent and
    must NOT be retried.

    We synthesise a real ``ValidationError`` by validating a bad payload
    against ``JobbertNerOutput``; the type/instance is what matters for the
    retry classifier.
    """
    try:
        JobbertNerOutput.model_validate({"schema_version": SCHEMA_VERSION, "spans": 123})
    except ValidationError as exc:
        validation_exc: ValidationError = exc
    else:  # pragma: no cover — the model validation MUST fail above
        pytest.fail("expected JobbertNerOutput.model_validate to raise ValidationError")

    fake = ScriptedRemote([validation_exc, _good_output()])
    adapter = _build_adapter(fake, max_attempts=3)

    with pytest.raises(ValidationError):
        await adapter.ainvoke({"text": "x"})

    # Only one call — no retry on a permanent error.
    assert len(fake.calls) == 1


@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_threshold() -> None:
    """After ``failure_threshold`` consecutive permanent-or-exhausted failures,
    the breaker opens and the next call short-circuits to
    ``RemoteUnavailable`` without ever invoking the remote.
    """
    # Always fails permanently (4xx) so each ainvoke increments the breaker
    # by exactly one (no retries on 4xx).
    fake = ScriptedRemote([_make_http_400()])
    adapter = _build_adapter(
        fake,
        name="breaker_open_test",
        max_attempts=1,
        breaker_failure_threshold=3,
        breaker_cool_down_s=30.0,
    )

    # Trip the breaker with 3 failures.
    for _ in range(3):
        with pytest.raises(httpx.HTTPStatusError):
            await adapter.ainvoke({"text": "x"})

    pre_calls = len(fake.calls)
    assert pre_calls == 3

    # Next call must short-circuit. No new call hits the remote.
    with pytest.raises(RemoteUnavailable):
        await adapter.ainvoke({"text": "x"})
    assert len(fake.calls) == pre_calls


@pytest.mark.asyncio
async def test_circuit_breaker_closes_after_cool_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Once the cool-down elapses, the next call is allowed through (half-open
    probe). A success then fully closes the breaker.
    """
    # Script: 3 failures (open the breaker), then a success on the probe.
    fake = ScriptedRemote(
        [_make_http_400(), _make_http_400(), _make_http_400(), _good_output()]
    )
    adapter = _build_adapter(
        fake,
        name="breaker_close_test",
        max_attempts=1,
        breaker_failure_threshold=3,
        breaker_cool_down_s=5.0,
    )

    # Trip the breaker.
    for _ in range(3):
        with pytest.raises(httpx.HTTPStatusError):
            await adapter.ainvoke({"text": "x"})

    # While cool-down is active: short-circuit.
    with pytest.raises(RemoteUnavailable):
        await adapter.ainvoke({"text": "x"})

    # Fast-forward the monotonic clock past the cool-down by patching the
    # breaker's ``opened_at`` to a value far enough in the past.
    breaker = adapter._breaker
    assert breaker.opened_at is not None
    breaker.opened_at -= 100.0  # well past the 5s cool-down

    # Half-open probe: the call goes through, hits the success in the script.
    out = await adapter.ainvoke({"text": "x"})
    assert out["schema_version"] == SCHEMA_VERSION

    # Breaker is now fully closed — consecutive_failures reset.
    assert breaker.consecutive_failures == 0
    assert breaker.opened_at is None


@pytest.mark.asyncio
async def test_backoff_sleeps_between_attempts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify that the retry loop calls ``asyncio.sleep`` between attempts
    with non-zero delays drawn from the configured backoff window.
    """
    sleeps: list[float] = []

    real_sleep_module = __import__("asyncio")

    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    monkeypatch.setattr(real_sleep_module, "sleep", fake_sleep)

    fake = ScriptedRemote([_make_http_5xx(), _make_http_5xx(), _good_output()])
    adapter = _build_adapter(
        fake,
        name="backoff_test",
        max_attempts=3,
        backoff_base_s=0.5,
        backoff_cap_s=8.0,
    )

    out = await adapter.ainvoke({"text": "x"})
    assert out["schema_version"] == SCHEMA_VERSION

    # Two failed attempts → two backoff sleeps before the third (success).
    assert len(sleeps) == 2
    # Each sleep is in [0, cap]; first attempt's window is [0, 0.5],
    # second is [0, 1.0]. We don't pin exact jitter values — just ranges.
    assert 0.0 <= sleeps[0] <= 0.5
    assert 0.0 <= sleeps[1] <= 1.0


@pytest.mark.asyncio
async def test_success_resets_failure_counter() -> None:
    """A successful call mid-sequence must reset the breaker's failure count
    so transient flakes don't slowly fill the bucket and trip a false open."""
    # 2 failures, success, 2 failures — should NOT open with threshold=3.
    fake = ScriptedRemote(
        [
            _make_http_400(),
            _make_http_400(),
            _good_output(),
            _make_http_400(),
            _make_http_400(),
        ]
    )
    adapter = _build_adapter(
        fake,
        name="reset_test",
        max_attempts=1,
        breaker_failure_threshold=3,
    )

    # Two failures.
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "x"})
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "x"})

    # Success — resets counter.
    out = await adapter.ainvoke({"text": "x"})
    assert out["schema_version"] == SCHEMA_VERSION

    # Two more failures — still under threshold post-reset.
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "x"})
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "x"})

    # Breaker should not have opened.
    assert adapter._breaker.opened_at is None
