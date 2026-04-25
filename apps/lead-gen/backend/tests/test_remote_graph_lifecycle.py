"""Lifecycle tests for ``core.remote_graphs``: caching, timeouts, aclose.

These tests cover the HTTP client lifecycle layer that lives **above** the
retry / circuit-breaker / streaming logic exercised in the other
``test_remote_graph_*`` files. The contract under test:

1. ``get_jobbert_ner_adapter()`` (and every sibling factory) returns the same
   instance across calls in a single process.
2. ``reset_adapter_cache()`` produces a fresh instance the next time around.
3. The ``timeout`` constructor kwarg actually reaches the underlying
   ``RemoteGraph`` — checked by monkeypatching ``RemoteGraph.__init__`` to
   capture every call's kwargs.
4. ``aclose_all_adapters()`` calls ``aclose`` on every cached adapter and
   leaves the cache empty.

The tests never hit the network: a custom RemoteGraph stub captures kwargs
without opening a connection, and a stub adapter records aclose calls.
"""

from __future__ import annotations

from typing import Any

import pytest

from core import remote_graphs
from core.remote_graphs import (
    DEFAULT_TIMEOUT,
    ML_TIMEOUT,
    RESEARCH_TIMEOUT,
    _ValidatedRemoteGraph,
    aclose_all_adapters,
    build_all_remote_adapters,
    get_bge_m3_embed_adapter,
    get_jobbert_ner_adapter,
    get_research_agent_adapter,
    reset_adapter_cache,
)


@pytest.fixture(autouse=True)
def _clear_cache_between_tests() -> Any:
    """Every test starts with a clean adapter cache."""
    reset_adapter_cache()
    yield
    reset_adapter_cache()


# ─── Caching ──────────────────────────────────────────────────────────────


def test_get_jobbert_ner_adapter_returns_same_instance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Repeated calls to the factory must return the same cached adapter so
    a long-running graph node doesn't pay the TLS / pool setup cost twice."""
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")

    a = get_jobbert_ner_adapter()
    b = get_jobbert_ner_adapter()
    assert a is b, "expected cached singleton across repeated factory calls"


def test_each_adapter_is_independently_cached(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The cache is keyed by name — different adapters get different instances."""
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")

    jobbert = get_jobbert_ner_adapter()
    bge = get_bge_m3_embed_adapter()
    research = get_research_agent_adapter()

    # All distinct objects, but each one is its own cached singleton.
    assert jobbert is not bge
    assert jobbert is not research
    assert bge is not research
    assert get_jobbert_ner_adapter() is jobbert
    assert get_bge_m3_embed_adapter() is bge
    assert get_research_agent_adapter() is research


def test_reset_adapter_cache_produces_fresh_instance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``reset_adapter_cache()`` must invalidate the cache so the next call
    builds a brand-new adapter — important for tests that change env vars."""
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")

    a = get_jobbert_ner_adapter()
    reset_adapter_cache()
    b = get_jobbert_ner_adapter()
    assert a is not b, "reset_adapter_cache should drop the cached instance"


def test_build_all_warms_the_same_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``build_all_remote_adapters()`` populates the same cache that
    ``get_*_adapter()`` reads from — so app boot warms the pool."""
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")

    built = build_all_remote_adapters()
    # Subsequent factory calls return the warmed instances.
    assert get_jobbert_ner_adapter() is built["jobbert_ner"]
    assert get_research_agent_adapter() is built["research_agent"]


# ─── Timeouts reach RemoteGraph ───────────────────────────────────────────


class _CapturingRemoteGraph:
    """Monkeypatch target for ``RemoteGraph.__init__``.

    Records every constructor kwarg into a class-level list so a test can
    assert that the ``timeout`` we passed to ``_ValidatedRemoteGraph`` made
    it through ``langgraph_sdk.get_client`` and into the underlying httpx
    client (we read the timeout off the client we constructed).
    """

    calls: list[dict[str, Any]] = []

    def __init__(self, assistant_id: str, /, **kwargs: Any) -> None:
        # Stash the assistant id alongside the kwargs to make assertions easier.
        record = {"assistant_id": assistant_id, **kwargs}
        type(self).calls.append(record)
        # Mimic the attributes _ValidatedRemoteGraph reads later. ``client``
        # comes from kwargs (we always pass one); fall back to None for safety.
        self.client = kwargs.get("client")
        self.assistant_id = assistant_id

    async def ainvoke(self, *_: Any, **__: Any) -> dict[str, Any]:
        return {}


def test_timeout_kwargs_reach_underlying_remote_graph(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The ``timeout`` we configure on ``_ValidatedRemoteGraph`` must be
    handed to ``RemoteGraph`` (or applied to the httpx client it ends up
    using). We verify by:

    1. Monkeypatching ``RemoteGraph`` so its constructor records every kwarg.
    2. Building one ML adapter and one research adapter.
    3. Asserting the ``client`` kwarg present on each call has an httpx
       ``Timeout`` matching the ML / research budget.
    """
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")

    # Reset the class-level capture list before patching.
    _CapturingRemoteGraph.calls = []
    monkeypatch.setattr(remote_graphs, "RemoteGraph", _CapturingRemoteGraph)

    jobbert = get_jobbert_ner_adapter()
    research = get_research_agent_adapter()

    # Two RemoteGraph instances were built — one per adapter.
    assert len(_CapturingRemoteGraph.calls) == 2

    by_id = {c["assistant_id"]: c for c in _CapturingRemoteGraph.calls}
    assert "jobbert_ner" in by_id
    assert "research_agent" in by_id

    # Each call must include a pre-built LangGraph client (so RemoteGraph does
    # not silently spin up a new httpx client with the SDK 300 s default).
    for call in _CapturingRemoteGraph.calls:
        assert call.get("client") is not None, (
            f"adapter {call['assistant_id']} must pass an explicit SDK client "
            f"so the timeout we configured is actually applied"
        )

    # The SDK client wraps an httpx.AsyncClient; verify the (connect, read,
    # write, pool) tuple matches the per-adapter budget.
    def _httpx_timeout(client: Any) -> Any:
        # LangGraphClient.http.client is the underlying httpx.AsyncClient.
        return client.http.client.timeout

    ml_timeout = _httpx_timeout(by_id["jobbert_ner"]["client"])
    research_timeout = _httpx_timeout(by_id["research_agent"]["client"])

    # httpx.Timeout exposes connect/read/write/pool attributes.
    assert ml_timeout.connect == ML_TIMEOUT[0]
    assert ml_timeout.read == ML_TIMEOUT[1]
    assert ml_timeout.write == ML_TIMEOUT[2]
    assert ml_timeout.pool == ML_TIMEOUT[3]

    assert research_timeout.connect == RESEARCH_TIMEOUT[0]
    assert research_timeout.read == RESEARCH_TIMEOUT[1]
    assert research_timeout.write == RESEARCH_TIMEOUT[2]
    assert research_timeout.pool == RESEARCH_TIMEOUT[3]

    # Sanity: ML and research budgets are not the same ones (would defeat the
    # whole point of per-class overrides).
    assert ML_TIMEOUT != RESEARCH_TIMEOUT
    # And neither equals the conservative DEFAULT (DEFAULT is for the lower
    # bound; the named tiers exist to widen ``read``).
    assert ML_TIMEOUT[1] > DEFAULT_TIMEOUT[1]
    assert RESEARCH_TIMEOUT[1] > DEFAULT_TIMEOUT[1]

    # And the adapter held the timeout we asked for.
    assert jobbert._timeout == ML_TIMEOUT
    assert research._timeout == RESEARCH_TIMEOUT


def test_explicit_timeout_kwarg_overrides_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``_ValidatedRemoteGraph`` accepts a ``timeout`` kwarg so callers can
    bump budgets per-adapter without touching the spec table."""
    from leadgen_agent.contracts import JobbertNerInput, JobbertNerOutput

    _CapturingRemoteGraph.calls = []
    monkeypatch.setattr(remote_graphs, "RemoteGraph", _CapturingRemoteGraph)

    custom: tuple[float, float, float, float] = (1.0, 2.0, 3.0, 4.0)
    adapter = _ValidatedRemoteGraph(
        name="jobbert_ner",
        url="http://stub",
        headers={},
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
        timeout=custom,
    )

    assert adapter._timeout == custom
    assert len(_CapturingRemoteGraph.calls) == 1
    client = _CapturingRemoteGraph.calls[0]["client"]
    assert client is not None
    t = client.http.client.timeout
    assert (t.connect, t.read, t.write, t.pool) == custom


# ─── aclose_all_adapters ──────────────────────────────────────────────────


class _StubAdapter:
    """Stand-in adapter that records aclose invocations.

    We poke this directly into ``_ADAPTER_CACHE`` so the test exercises the
    real ``aclose_all_adapters`` orchestration without paying for a real
    httpx client.
    """

    def __init__(self, name: str, *, raise_on_close: bool = False) -> None:
        self._name = name
        self.aclose_call_count = 0
        self._raise = raise_on_close

    async def aclose(self) -> None:
        self.aclose_call_count += 1
        if self._raise:
            raise RuntimeError(f"{self._name}: simulated close failure")


async def test_aclose_all_adapters_calls_aclose_on_every_cached_adapter() -> None:
    """Every cached adapter must have its ``aclose()`` invoked exactly once,
    and the cache must be empty afterwards so a process can re-warm cleanly."""
    stub_a = _StubAdapter("a")
    stub_b = _StubAdapter("b")
    stub_c = _StubAdapter("c")
    remote_graphs._ADAPTER_CACHE.clear()
    remote_graphs._ADAPTER_CACHE["a"] = stub_a  # type: ignore[assignment]
    remote_graphs._ADAPTER_CACHE["b"] = stub_b  # type: ignore[assignment]
    remote_graphs._ADAPTER_CACHE["c"] = stub_c  # type: ignore[assignment]

    await aclose_all_adapters()

    assert stub_a.aclose_call_count == 1
    assert stub_b.aclose_call_count == 1
    assert stub_c.aclose_call_count == 1
    assert remote_graphs._ADAPTER_CACHE == {}, (
        "cache must be empty after aclose_all_adapters so a fresh boot rebuilds"
    )


async def test_aclose_all_adapters_is_a_no_op_on_empty_cache() -> None:
    """Shutdown must be safe even if the cache was never populated (e.g. a
    test environment that never built any adapters)."""
    remote_graphs._ADAPTER_CACHE.clear()
    # Must not raise.
    await aclose_all_adapters()
    assert remote_graphs._ADAPTER_CACHE == {}


async def test_aclose_propagates_first_error_but_clears_cache() -> None:
    """Document the current behaviour: ``aclose_all_adapters`` clears the
    cache *before* iterating, so even if one adapter's aclose raises the
    cache is already empty and a re-boot can rebuild fresh adapters."""
    stub_ok = _StubAdapter("ok")
    stub_bad = _StubAdapter("bad", raise_on_close=True)
    remote_graphs._ADAPTER_CACHE.clear()
    remote_graphs._ADAPTER_CACHE["ok"] = stub_ok  # type: ignore[assignment]
    remote_graphs._ADAPTER_CACHE["bad"] = stub_bad  # type: ignore[assignment]

    with pytest.raises(RuntimeError, match="simulated close failure"):
        await aclose_all_adapters()

    # Cache cleared regardless.
    assert remote_graphs._ADAPTER_CACHE == {}


# ─── CF Worker failure modes (522 / 524 / Retry-After / breaker probe) ────
#
# These tests exercise the CF1 fixes that landed alongside the per-route
# timeout work: we already have generic 5xx retry coverage in
# ``test_remote_graph_http.py``; the behaviours below are the CF-specific
# layers that sit on top of that:
#
# * 522 / 524 — CF Worker emits these when the origin Container handshake
#   fails (522) or wall-clock expires (524). They are 5xx, so they MUST be
#   retried (not surfaced as a permanent error like a 4xx would be).
# * Half-open probe — once the breaker has tripped, the cool-down expires,
#   and a fresh call comes in: the CF1 fix limits THAT call to a single
#   attempt (not the full 3-retry budget) so a still-unhealthy CF Container
#   doesn't burn the whole retry budget every recovery probe.
# * ``Retry-After`` — CF rate-limiter emits numeric seconds; HTTP-date form
#   is technically valid per RFC 7231 but CF doesn't emit it for internal
#   rate limits, and the parser intentionally returns ``None`` for that
#   form so date-parsing edge cases can't wedge a graph node.

import httpx

from core.remote_graphs import (
    _ADAPTER_BUILDERS,
    _ADAPTER_SPECS,
    _CircuitBreaker,
    _retry_after_seconds,
    RemoteUnavailable,
)
from leadgen_agent.contracts import SCHEMA_VERSION, JobbertNerInput, JobbertNerOutput


def _make_http_status_error(
    status: int, *, headers: dict[str, str] | None = None
) -> httpx.HTTPStatusError:
    """Build a real ``httpx.HTTPStatusError`` so ``_is_retryable`` /
    ``_retry_after_seconds`` see the same shape they would in production."""
    request = httpx.Request("POST", "http://stub/runs/stream")
    response = httpx.Response(status, headers=headers or {}, request=request)
    return httpx.HTTPStatusError(
        f"HTTP {status}", request=request, response=response
    )


class _SequencingFakeRemote:
    """FakeRemote that yields a queued sequence of side-effects per ainvoke.

    Each call pops the next element off ``responses``: an Exception is raised,
    anything else is returned. Lets a test drive the retry / breaker state
    machine through a deterministic failure → success transition.
    """

    def __init__(self, responses: list[Any]) -> None:
        self._responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> Any:
        self.calls.append(state)
        if not self._responses:
            raise AssertionError("FakeRemote ran out of queued responses")
        nxt = self._responses.pop(0)
        if isinstance(nxt, Exception):
            raise nxt
        return nxt


def _build_adapter_with_fake(
    fake: Any, *, max_attempts: int = 3, breaker_threshold: int = 5
) -> _ValidatedRemoteGraph:
    """Build a JobbertNer adapter, swap in ``fake``, isolate breaker state."""
    # Reset any breaker registered under this name from a prior test so
    # threshold/cool_down updates apply cleanly.
    _CircuitBreaker.reset_all()
    adapter = _ValidatedRemoteGraph(
        name="jobbert_ner",
        url="http://stub",
        headers={},
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
        max_attempts=max_attempts,
        backoff_base_s=0.0,  # zero backoff so the test runs fast
        backoff_cap_s=0.0,
        breaker_failure_threshold=breaker_threshold,
        breaker_cool_down_s=0.01,  # tiny cool-down so half-open opens fast
    )
    adapter._remote = fake  # type: ignore[assignment]
    return adapter


async def test_cf_worker_524_timeout_is_retryable() -> None:
    """CF Worker emits 524 when the origin Container exceeds the wall-clock.

    From the client's perspective this is indistinguishable from a generic
    5xx and MUST be retried — surfacing it as a permanent failure would
    mean every CF cold-start that races the 30 s Worker budget kills the
    graph node on the first attempt. The same applies to 522 (Connection
    timed out) which CF emits when the Container isn't reachable yet.
    """
    # First two attempts fail with CF 524 / 522, third succeeds.
    valid_output = {"schema_version": SCHEMA_VERSION, "spans": []}
    fake = _SequencingFakeRemote(
        [
            _make_http_status_error(524),
            _make_http_status_error(522),
            valid_output,
        ]
    )
    adapter = _build_adapter_with_fake(fake, max_attempts=3)

    out = await adapter.ainvoke({"text": "react developer"})

    assert out["schema_version"] == SCHEMA_VERSION
    # All three attempts hit the remote — proves CF 5xx codes are NOT
    # short-circuited as permanent failures.
    assert len(fake.calls) == 3


async def test_circuit_breaker_half_open_limited_to_one_probe() -> None:
    """Once the breaker trips and the cool-down elapses, the very next call
    is a single-shot probe — not a full ``max_attempts`` retry burst.

    Without this CF1 fix every recovery probe against a still-flaky CF
    Container would burn the whole retry budget AND re-trip the breaker on
    the same call. We test by:
    1. Hammering the adapter with failures until the breaker opens.
    2. Sleeping past the cool-down so ``allow()`` returns True (half-open).
    3. Issuing one more call that also fails — and asserting only ONE
       remote attempt was made on that probe call (not 3).
    """
    import asyncio

    # The breaker is keyed by adapter name on a module-level registry, so
    # state leaks across tests sharing a name. Always reset on the way out
    # too — otherwise the property suite's ``jobbert_ner`` adapters would
    # observe a still-open breaker and short-circuit with RemoteUnavailable.

    threshold = 2  # keep the test fast
    # Pre-load enough failures to (a) trip the breaker, then (b) supply
    # exactly one more failure for the half-open probe call. If the probe
    # made >1 attempts, we'd run out and hit the AssertionError.
    fake = _SequencingFakeRemote(
        [_make_http_status_error(503) for _ in range(threshold + 1)]
    )
    adapter = _build_adapter_with_fake(
        fake, max_attempts=3, breaker_threshold=threshold
    )

    # (1) Trip the breaker. With max_attempts=3 the first call burns 3
    # attempts, but its consecutive_failures becomes 1 (record_failure runs
    # once per call after the retry budget exhausts). So we need ``threshold``
    # calls — each one consumes 3 queued failures via internal retry.
    # To keep the queue minimal we instead set max_attempts=1 here so each
    # call consumes exactly one failure.
    adapter._max_attempts = 1
    for _ in range(threshold):
        with pytest.raises(httpx.HTTPStatusError):
            await adapter.ainvoke({"text": "react"})

    # Breaker should now be open.
    assert adapter._breaker.opened_at is not None
    # Next call must short-circuit with RemoteUnavailable (no remote hit).
    calls_before = len(fake.calls)
    with pytest.raises(RemoteUnavailable):
        await adapter.ainvoke({"text": "react"})
    assert len(fake.calls) == calls_before, (
        "circuit-open call must not reach the remote"
    )

    # (2) Wait past the cool-down so ``allow()`` returns True.
    await asyncio.sleep(0.02)

    # (3) Bump ``max_attempts`` back to 3 so we'd burn the full budget if
    # the half-open probe were not capped. The CF1 fix MUST cap it to 1.
    adapter._max_attempts = 3
    calls_before = len(fake.calls)
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.ainvoke({"text": "react"})
    probe_attempts = len(fake.calls) - calls_before
    assert probe_attempts == 1, (
        f"half-open probe must be a single attempt, not {probe_attempts}"
    )


def test_retry_after_numeric_seconds_honored() -> None:
    """``_retry_after_seconds`` parses CF's numeric-seconds form and caps
    at 60 s so a misbehaving header can't wedge a graph node for hours."""
    # Bog-standard CF rate-limit envelope.
    exc = _make_http_status_error(429, headers={"Retry-After": "5"})
    assert _retry_after_seconds(exc) == 5.0

    # Whitespace-tolerant — CF emits ``Retry-After: 30`` but proxies
    # sometimes pad.
    exc = _make_http_status_error(429, headers={"Retry-After": "  12  "})
    assert _retry_after_seconds(exc) == 12.0

    # Capped at 60 s.
    exc = _make_http_status_error(503, headers={"Retry-After": "3600"})
    assert _retry_after_seconds(exc) == 60.0

    # Floor at 0 (negative would otherwise pass through min/max math).
    exc = _make_http_status_error(429, headers={"Retry-After": "-5"})
    assert _retry_after_seconds(exc) == 0.0


def test_retry_after_http_date_form_treated_as_missing() -> None:
    """RFC 7231 also allows ``Retry-After`` as an HTTP-date. CF Workers do
    NOT emit that form for internal rate limits, and the parser intentionally
    returns ``None`` rather than dragging in a date parser — letting the
    caller fall back to exponential jitter is safer than a date-parse bug
    wedging the node for an unbounded duration.
    """
    exc = _make_http_status_error(
        429, headers={"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"}
    )
    assert _retry_after_seconds(exc) is None

    # No header at all → also None (sanity).
    exc = _make_http_status_error(429, headers={})
    assert _retry_after_seconds(exc) is None

    # Wrong exception type → None (sanity for the type guard).
    assert _retry_after_seconds(RuntimeError("not http")) is None


def test_authorization_bearer_strips_trailing_whitespace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """CF Workers expose env vars as plain strings, and operators routinely
    paste tokens that pick up a trailing newline (``wrangler secret put``
    via ``echo "$T" | wrangler ...`` is the classic offender). The header
    builder MUST strip surrounding whitespace before formatting the Bearer
    string — otherwise CF emits a 401 with a confusing ``invalid bearer``
    body because of the literal ``\\n`` smuggled into the header value.
    """
    # Simulate the trailing-newline / surrounding-whitespace env quirk.
    monkeypatch.setenv("ML_INTERNAL_AUTH_TOKEN", "  cf-token-xyz  \n")
    monkeypatch.setenv("RESEARCH_INTERNAL_AUTH_TOKEN", "\tresearch-token-abc\r\n")

    ml_headers = remote_graphs._ml_headers()
    research_headers = remote_graphs._research_headers()

    assert ml_headers["Authorization"] == "Bearer cf-token-xyz"
    assert research_headers["Authorization"] == "Bearer research-token-abc"
    # X-Internal-Caller stays put — it's a static value, not env-derived.
    assert ml_headers["X-Internal-Caller"] == "core"

    # And: an entirely-whitespace token must be treated as unset, NOT
    # rendered as ``Bearer `` (which CF would 401 with a different error).
    monkeypatch.setenv("ML_INTERNAL_AUTH_TOKEN", "   \n\t  ")
    headers_no_token = remote_graphs._ml_headers()
    assert "Authorization" not in headers_no_token


def test_per_route_timeout_selection_matches_adapter_class(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every adapter in ``_ADAPTER_BUILDERS`` MUST resolve to the timeout
    tier its class warrants:

    * ML adapters (``jobbert_ner``, ``bge_m3_embed``) → ``ML_TIMEOUT`` (90 s)
    * Research adapters (everything else) → ``RESEARCH_TIMEOUT`` (240 s)

    A drift here is the kind of bug you only catch in production: a
    ``research_agent`` accidentally bound to ``DEFAULT_TIMEOUT`` would 524
    after 28 s on every multi-minute crawl. Pin it.
    """
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")

    expected = {
        "jobbert_ner": ML_TIMEOUT,
        "bge_m3_embed": ML_TIMEOUT,
        "research_agent": RESEARCH_TIMEOUT,
        "lead_papers": RESEARCH_TIMEOUT,
        "scholar": RESEARCH_TIMEOUT,
        "common_crawl": RESEARCH_TIMEOUT,
        "agentic_search": RESEARCH_TIMEOUT,
        "gh_patterns": RESEARCH_TIMEOUT,
    }
    # Spec table is the source of truth that the builder reads.
    assert set(_ADAPTER_SPECS.keys()) == set(expected.keys())
    assert set(_ADAPTER_BUILDERS.keys()) == set(expected.keys())

    for name, want in expected.items():
        # 1. Spec-level pin: the table itself encodes the right tier.
        assert _ADAPTER_SPECS[name]["timeout"] == want, (
            f"{name}: spec timeout {_ADAPTER_SPECS[name]['timeout']} "
            f"does not match expected {want}"
        )
        # 2. End-to-end pin: the built adapter actually carries it.
        adapter = _ADAPTER_BUILDERS[name]()
        assert adapter._timeout == want, (
            f"{name}: built adapter timeout {adapter._timeout} "
            f"does not match expected {want}"
        )

    # Sanity: no ML adapter accidentally uses the conservative 28 s default
    # (which would 524 every batch larger than a few hundred items), and
    # no research adapter is on ML_TIMEOUT (which would cap multi-minute
    # crawls at 90 s).
    assert ML_TIMEOUT[1] < RESEARCH_TIMEOUT[1]
    assert DEFAULT_TIMEOUT[1] < ML_TIMEOUT[1]
