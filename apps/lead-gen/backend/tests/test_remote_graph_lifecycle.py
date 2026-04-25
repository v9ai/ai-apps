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


def test_per_adapter_spec_overrides_reach_constructor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``_ADAPTER_SPECS`` carries optional ``max_attempts`` /
    ``breaker_cool_down_s`` per adapter so expensive remotes can retry less
    aggressively without changing the caller surface. Verify the values
    actually reach ``_ValidatedRemoteGraph.__init__``.
    """
    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")
    monkeypatch.setenv("RESEARCH_URL", "http://lead-gen-research")
    reset_adapter_cache()

    # Default knobs on jobbert_ner (no overrides in spec).
    jobbert = remote_graphs.get_jobbert_ner_adapter()
    assert jobbert._max_attempts == 3
    assert jobbert._breaker.cool_down_s == 30.0

    # Tightened knobs on research_agent (max_attempts=2, cool_down=60s).
    research = remote_graphs.get_research_agent_adapter()
    assert research._max_attempts == 2
    assert research._breaker.cool_down_s == 60.0

    # gh_patterns mirrors research_agent.
    gh = remote_graphs.get_gh_patterns_adapter()
    assert gh._max_attempts == 2
    assert gh._breaker.cool_down_s == 60.0


async def test_aclose_all_adapters_timeout_does_not_block_other_adapters(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A hanging adapter (TLS close-notify never lands) used to block the
    whole shutdown indefinitely. Wrapping each aclose in asyncio.wait_for
    bounds it to ``ACLOSE_TIMEOUT_S`` so the next adapter still gets closed.
    """
    import asyncio
    import logging

    # Drop the timeout for the test so we don't actually wait 5 seconds.
    monkeypatch.setattr(remote_graphs, "ACLOSE_TIMEOUT_S", 0.05)

    class _HangingAdapter:
        def __init__(self) -> None:
            self._name = "hanging"
            self.aclose_call_count = 0

        async def aclose(self) -> None:
            self.aclose_call_count += 1
            await asyncio.sleep(10)  # never resolves within the test budget

    class _FastAdapter:
        def __init__(self) -> None:
            self._name = "fast"
            self.aclose_call_count = 0

        async def aclose(self) -> None:
            self.aclose_call_count += 1

    hanging = _HangingAdapter()
    fast = _FastAdapter()
    remote_graphs._ADAPTER_CACHE.clear()
    remote_graphs._ADAPTER_CACHE["hanging"] = hanging  # type: ignore[assignment]
    remote_graphs._ADAPTER_CACHE["fast"] = fast  # type: ignore[assignment]

    with caplog.at_level(logging.WARNING, logger="core.remote_graphs"):
        await aclose_all_adapters()

    # The hanging adapter timed out, but the next one still closed.
    assert hanging.aclose_call_count == 1
    assert fast.aclose_call_count == 1
    assert remote_graphs._ADAPTER_CACHE == {}
    timeouts = [r for r in caplog.records if "aclose timed out" in r.message]
    assert len(timeouts) == 1


# ─── Concurrent build (defense-in-depth) ──────────────────────────────────


def test_concurrent_first_calls_build_once(monkeypatch: pytest.MonkeyPatch) -> None:
    """``_get_or_build`` is wrapped in a ``threading.Lock`` so that N parallel
    threads racing the same first-call do not each construct a ``_Validated``
    instance and leak the losers' httpx pools.

    We instrument ``_build_adapter_from_spec`` with a counter and a tiny
    sleep that widens the check-then-set window, then launch 16 threads
    against ``get_jobbert_ner_adapter()``. Without the lock, the counter
    would land >= 2 nondeterministically; with it, the lock collapses every
    racing thread to one build.
    """
    import time as _time
    from concurrent.futures import ThreadPoolExecutor

    monkeypatch.setenv("ML_URL", "http://lead-gen-ml")

    real_build = remote_graphs._build_adapter_from_spec
    counter = {"n": 0}
    counter_lock = __import__("threading").Lock()

    def _slow_build(name: str, spec: dict[str, Any]) -> Any:
        with counter_lock:
            counter["n"] += 1
        # Widen the check-then-set window so an unlocked impl would
        # nondeterministically see counter > 1.
        _time.sleep(0.01)
        return real_build(name, spec)

    monkeypatch.setattr(remote_graphs, "_build_adapter_from_spec", _slow_build)

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(get_jobbert_ner_adapter) for _ in range(16)]
        results = [f.result() for f in futures]

    assert counter["n"] == 1, (
        f"expected exactly one build under the lock, got {counter['n']}"
    )
    # Every thread observed the same cached singleton.
    first = results[0]
    for r in results[1:]:
        assert r is first
