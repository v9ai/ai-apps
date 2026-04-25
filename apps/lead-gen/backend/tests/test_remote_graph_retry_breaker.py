"""Direct tests for the retry loop and circuit breaker in core/remote_graphs.

Coverage gap before this file: ``_invoke_remote_with_retry`` (the exponential
backoff + retryable-error classification) and ``_CircuitBreaker`` (consecutive
failure threshold, half-open probe) had no direct unit tests — they only ran
implicitly through the success-path HTTP tests in ``test_remote_graph_http``.

Strategy: build a real ``_ValidatedRemoteGraph`` and swap ``_remote`` for a
``FakeRemote`` whose ``ainvoke`` is driven from a queue of canned outcomes.
Sleep is monkeypatched to a no-op so the file stays sub-second even with
several attempts per case.
"""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest

from core import remote_graphs
from core.remote_graphs import (
    RemoteUnavailable,
    _CircuitBreaker,
    _ValidatedRemoteGraph,
    reset_adapter_cache,
)
from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    JobbertNerInput,
    JobbertNerOutput,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _reset_breaker_and_cache(monkeypatch: pytest.MonkeyPatch) -> Any:
    """Per-adapter breaker state lives in ``_CircuitBreaker._registry`` and
    leaks across tests if not reset; the adapter cache is reset for the same
    reason. Sleep is replaced with an awaitable no-op so backoff doesn't add
    real latency to the suite.
    """
    _CircuitBreaker.reset_all()
    reset_adapter_cache()
    monkeypatch.setattr(remote_graphs, "_sleep_backoff", AsyncMock(return_value=None))
    yield
    _CircuitBreaker.reset_all()
    reset_adapter_cache()


# ─── Stub remote ──────────────────────────────────────────────────────────


class FakeRemote:
    """Stand-in for ``langgraph.pregel.remote.RemoteGraph``.

    ``responses`` is a queue: each ``ainvoke`` pops the head and either
    returns it or raises it (if it's an Exception). When the queue empties
    the next call raises ``IndexError`` to make over-call bugs loud.
    """

    def __init__(self, responses: list[Any]) -> None:
        self._responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> Any:
        self.calls.append(state)
        if not self._responses:
            raise IndexError("FakeRemote: ran out of canned responses")
        nxt = self._responses.pop(0)
        if isinstance(nxt, Exception):
            raise nxt
        return nxt


def _ok_response() -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "spans": []}


def _http_error(status: int) -> httpx.HTTPStatusError:
    """Build an ``httpx.HTTPStatusError`` with the requested status code."""
    request = httpx.Request("POST", "http://stub/runs/wait")
    response = httpx.Response(status_code=status, request=request)
    return httpx.HTTPStatusError(f"{status}", request=request, response=response)


def _build_adapter(
    fake: FakeRemote,
    *,
    name: str = "jobbert_ner",
    max_attempts: int = 3,
    breaker_failure_threshold: int = 5,
    breaker_cool_down_s: float = 30.0,
) -> _ValidatedRemoteGraph[JobbertNerInput, JobbertNerOutput]:
    adapter: _ValidatedRemoteGraph[JobbertNerInput, JobbertNerOutput] = (
        _ValidatedRemoteGraph(
            name=name,
            url="http://stub",
            headers={},
            input_cls=JobbertNerInput,
            output_cls=JobbertNerOutput,
            max_attempts=max_attempts,
            breaker_failure_threshold=breaker_failure_threshold,
            breaker_cool_down_s=breaker_cool_down_s,
        )
    )
    adapter._remote = fake  # type: ignore[assignment]
    return adapter


# ─── Retry classification ─────────────────────────────────────────────────


async def test_retry_on_500_then_succeeds() -> None:
    """Two 500s then a success: retry loop must consume all three slots and
    return the final dict; the breaker must NOT count this as a failure once
    the call ultimately succeeded."""
    fake = FakeRemote([_http_error(500), _http_error(500), _ok_response()])
    adapter = _build_adapter(fake, max_attempts=3)

    out = await adapter.ainvoke({"text": "react"})

    assert out["spans"] == []
    assert len(fake.calls) == 3
    assert adapter._breaker.consecutive_failures == 0


async def test_retry_on_429_uses_backoff() -> None:
    """429 (rate-limited) is retryable; the backoff sleep must fire on the
    failed attempt so we don't hammer past a Retry-After window."""
    fake = FakeRemote([_http_error(429), _ok_response()])
    adapter = _build_adapter(fake, max_attempts=3)

    out = await adapter.ainvoke({"text": "react"})

    assert out["spans"] == []
    assert len(fake.calls) == 2
    # _sleep_backoff is the AsyncMock from the fixture — called once between
    # the failed attempt and the successful one.
    assert remote_graphs._sleep_backoff.await_count == 1  # type: ignore[attr-defined]


async def test_400_is_not_retried() -> None:
    """A 4xx (other than 429) is a permanent client error: no retry, breaker
    records one failure, the original exception bubbles up."""
    fake = FakeRemote([_http_error(400)])
    adapter = _build_adapter(fake, max_attempts=3)

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await adapter.ainvoke({"text": "react"})

    assert exc_info.value.response.status_code == 400
    assert len(fake.calls) == 1
    assert adapter._breaker.consecutive_failures == 1
    assert remote_graphs._sleep_backoff.await_count == 0  # type: ignore[attr-defined]


async def test_max_attempts_exhausted_raises_last() -> None:
    """Three consecutive 503s with max_attempts=3: every slot is used, the
    final exception propagates, the breaker records exactly one failure
    (one logical call, regardless of attempts)."""
    fake = FakeRemote([_http_error(503), _http_error(503), _http_error(503)])
    adapter = _build_adapter(fake, max_attempts=3)

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await adapter.ainvoke({"text": "react"})

    assert exc_info.value.response.status_code == 503
    assert len(fake.calls) == 3
    assert adapter._breaker.consecutive_failures == 1


async def test_connection_error_is_retried() -> None:
    """Transport-level errors (DNS, refused, reset) are always retryable."""
    fake = FakeRemote(
        [
            httpx.ConnectError(
                "connection refused",
                request=httpx.Request("POST", "http://stub"),
            ),
            _ok_response(),
        ]
    )
    adapter = _build_adapter(fake, max_attempts=3)

    out = await adapter.ainvoke({"text": "react"})

    assert out["spans"] == []
    assert len(fake.calls) == 2


# ─── Circuit breaker ──────────────────────────────────────────────────────


async def test_breaker_opens_after_threshold() -> None:
    """After ``failure_threshold`` consecutive logical-call failures, the next
    call short-circuits with ``RemoteUnavailable`` *without* invoking the
    underlying stub at all."""
    # Build the failing pile: each call fails after max_attempts attempts,
    # so 5 logical failures × 1 attempt each = 5 5xx responses.
    fake = FakeRemote([_http_error(503) for _ in range(5)])
    adapter = _build_adapter(
        fake, max_attempts=1, breaker_failure_threshold=5, breaker_cool_down_s=30.0
    )

    # Five back-to-back failures.
    for _ in range(5):
        with pytest.raises(httpx.HTTPStatusError):
            await adapter.ainvoke({"text": "react"})

    assert len(fake.calls) == 5
    assert adapter._breaker.opened_at is not None

    # The sixth call must short-circuit: no stub call, RemoteUnavailable raised.
    with pytest.raises(RemoteUnavailable, match="circuit breaker open"):
        await adapter.ainvoke({"text": "react"})

    assert len(fake.calls) == 5  # untouched


async def test_breaker_half_open_probe_closes_on_success() -> None:
    """Once the cool-down elapses, the next call goes through as a half-open
    probe; on success the breaker fully closes and consecutive_failures resets.
    """
    fake = FakeRemote([_ok_response()])
    adapter = _build_adapter(
        fake, max_attempts=1, breaker_failure_threshold=5, breaker_cool_down_s=1.0
    )

    # Manually open the breaker as if we just exhausted the threshold and the
    # cool-down has already elapsed.
    adapter._breaker.consecutive_failures = 5
    adapter._breaker.opened_at = time.monotonic() - 2.0  # past cool_down=1.0

    out = await adapter.ainvoke({"text": "react"})

    assert out["spans"] == []
    assert adapter._breaker.opened_at is None
    assert adapter._breaker.consecutive_failures == 0


async def test_breaker_half_open_probe_failure_re_opens() -> None:
    """Half-open probe failure must re-open the breaker so the next call is
    again short-circuited until another cool-down passes."""
    fake = FakeRemote([_http_error(503)])
    adapter = _build_adapter(
        fake, max_attempts=1, breaker_failure_threshold=5, breaker_cool_down_s=1.0
    )

    # Open breaker as if just past cool-down.
    adapter._breaker.consecutive_failures = 5
    adapter._breaker.opened_at = time.monotonic() - 2.0

    # Probe fails.
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "react"})

    # Failure increments + re-opens.
    assert adapter._breaker.consecutive_failures == 6
    assert adapter._breaker.opened_at is not None

    # Next call short-circuits without invoking the stub (queue is empty
    # anyway — IndexError would have fired if the call leaked through).
    with pytest.raises(RemoteUnavailable):
        await adapter.ainvoke({"text": "react"})


async def test_breaker_shared_across_adapter_instances_by_name() -> None:
    """Two adapters with the same ``name`` share one breaker — important for
    cold-start outages where every adapter routed at the same container is
    failing simultaneously and we want one global cool-down, not eight."""
    fake_a = FakeRemote([_http_error(503), _http_error(503)])
    fake_b = FakeRemote([_http_error(503), _http_error(503)])
    a = _build_adapter(
        fake_a,
        name="shared_breaker_test",
        max_attempts=1,
        breaker_failure_threshold=4,
    )
    b = _build_adapter(
        fake_b,
        name="shared_breaker_test",
        max_attempts=1,
        breaker_failure_threshold=4,
    )

    # Two failures via adapter a, two via adapter b → 4 total → opens.
    for _ in range(2):
        with pytest.raises(httpx.HTTPStatusError):
            await a.ainvoke({"text": "x"})
    for _ in range(2):
        with pytest.raises(httpx.HTTPStatusError):
            await b.ainvoke({"text": "x"})

    # Both adapter instances see the breaker as open.
    assert a._breaker is b._breaker
    assert a._breaker.opened_at is not None


# ─── astream pass-through (regression guard) ──────────────────────────────


async def test_astream_path_is_not_wrapped_by_retry() -> None:
    """The ``astream`` path is intentionally NOT wrapped by the retry loop —
    a half-streamed response cannot be safely replayed mid-flight (would
    duplicate events). This regression-guards the documented decision at
    ``remote_graphs.py:470-472``.
    """

    class StreamingFakeRemote:
        def __init__(self) -> None:
            self.ainvoke_calls = 0
            self.astream_calls = 0

        async def ainvoke(self, *_a: Any, **_k: Any) -> Any:
            self.ainvoke_calls += 1
            raise AssertionError("astream must not delegate to ainvoke")

        async def astream(self, *_a: Any, **_k: Any):  # type: ignore[no-untyped-def]
            self.astream_calls += 1
            yield {"some_node": {"schema_version": SCHEMA_VERSION, "spans": []}}

    fake = StreamingFakeRemote()
    adapter = _build_adapter(FakeRemote([]), max_attempts=3)
    adapter._remote = fake  # type: ignore[assignment]

    events = [event async for event in adapter.astream({"text": "react"})]

    assert len(events) == 1
    assert fake.astream_calls == 1
    # _sleep_backoff must not have been called: astream isn't retried.
    assert remote_graphs._sleep_backoff.await_count == 0  # type: ignore[attr-defined]
