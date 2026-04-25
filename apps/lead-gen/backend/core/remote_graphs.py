"""RemoteGraph adapters for cross-container boundaries in ``leadgen-core``.

Every cross-container call from core into ``leadgen-ml`` or ``leadgen-research``
is wrapped here. Each adapter:

* Validates its input dict against the matching ``*Input`` Pydantic contract
  (from ``leadgen_agent.contracts``) **before** the HTTP round-trip.
* Validates the returned dict against the matching ``*Output`` contract
  **after** the HTTP round-trip.
* Raises ``contracts.ContractsVersionMismatch`` when the remote side responds
  with a ``schema_version`` the caller does not recognize. This surfaces
  shape drift at the very first call instead of at the leaf of some deep
  response stream.

The public surface of every adapter is ``ainvoke(state, config=...)`` — the
same shape a compiled in-process StateGraph exposes — so a core graph can
register a remote node with::

    from core.remote_graphs import get_jobbert_ner_adapter
    builder.add_node("extract_skills", get_jobbert_ner_adapter())

URLs are read from the environment at adapter-build time:

* ``ML_URL``        — base URL for ``lead-gen-ml``       (e.g. ``http://lead-gen-ml``)
* ``RESEARCH_URL``  — base URL for ``lead-gen-research`` (e.g. ``http://lead-gen-research``)

The outer dispatcher Worker / service binding handles routing; the core
container only needs an HTTP-reachable hostname. Bearer auth is forwarded
via ``ML_INTERNAL_AUTH_TOKEN`` / ``RESEARCH_INTERNAL_AUTH_TOKEN``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import threading
import time
from typing import Any, AsyncIterator, Callable

import httpx
from langgraph_sdk import get_client
from pydantic import BaseModel, ValidationError

from langgraph.pregel.remote import RemoteGraph

from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    AgenticSearchInput,
    AgenticSearchOutput,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
    CommonCrawlInput,
    CommonCrawlOutput,
    ContractsVersionMismatch,
    GhPatternsInput,
    GhPatternsOutput,
    JobbertNerInput,
    JobbertNerOutput,
    LeadPapersInput,
    LeadPapersOutput,
    ResearchAgentInput,
    ResearchAgentOutput,
    ScholarInput,
    ScholarOutput,
    validate_remote_call,
)

log = logging.getLogger(__name__)


# ─── HTTP client lifetime / timeout defaults ──────────────────────────────
#
# httpx ``Timeout`` is constructed from a 4-tuple ``(connect, read, write, pool)``
# (see ``langgraph_sdk.get_client``). The SDK default is (5, 300, 300, 5)
# which leaves a hung remote able to wedge a graph node for five minutes.
# The values below are the hard ceiling; per-adapter overrides bump ``read``
# for endpoints that legitimately stream big payloads.

# (connect, read, write, pool) in seconds.
TimeoutTuple = tuple[float, float, float, float]

DEFAULT_TIMEOUT: TimeoutTuple = (5.0, 60.0, 10.0, 5.0)
# ML adapters can stream embedding batches; bump read to 90 s.
ML_TIMEOUT: TimeoutTuple = (5.0, 90.0, 10.0, 5.0)
# Research adapters do agentic web crawls; allow 120 s read.
RESEARCH_TIMEOUT: TimeoutTuple = (5.0, 120.0, 10.0, 5.0)


# ─── Retry / circuit breaker primitives ───────────────────────────────────


class RemoteUnavailable(RuntimeError):
    """Raised when the circuit breaker is open and short-circuits a call.

    Distinct from network/HTTP errors so callers can choose to degrade rather
    than retry: while the breaker is open every adapter call fails fast with
    this exception until the cool-down elapses.
    """


class RemoteGraphProtocolError(RuntimeError):
    """Raised when ``RemoteGraph.ainvoke`` returns something that is not a state
    dict.

    LangGraph Server always emits a state dict on success; a bare string or
    ``None`` indicates a bad deploy on the remote side. Surfacing a typed
    error keeps that signal loud instead of letting it silently validate as
    an empty default-filled Output (which used to happen for any contract
    whose fields all have defaults, masking the real problem).
    """


class _CircuitBreaker:
    """Per-adapter consecutive-failure breaker.

    State is keyed by adapter name on the class so multiple adapter instances
    pointing at the same remote share one breaker (cold-start outages tend to
    affect every adapter routed at the same container). Opens after
    ``failure_threshold`` consecutive failures and stays open for
    ``cool_down_s`` seconds, after which the next call is allowed through as a
    half-open probe; success closes the breaker, another failure re-opens it.
    """

    _registry: dict[str, "_CircuitBreaker"] = {}

    def __init__(self, name: str, failure_threshold: int, cool_down_s: float) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.cool_down_s = cool_down_s
        self.consecutive_failures = 0
        self.opened_at: float | None = None

    @classmethod
    def for_name(
        cls, name: str, failure_threshold: int, cool_down_s: float
    ) -> "_CircuitBreaker":
        existing = cls._registry.get(name)
        if existing is None:
            existing = cls(name, failure_threshold, cool_down_s)
            cls._registry[name] = existing
        else:
            # Allow newer adapter instances to update thresholds; primarily
            # useful for tests that tweak knobs between cases.
            existing.failure_threshold = failure_threshold
            existing.cool_down_s = cool_down_s
        return existing

    @classmethod
    def reset_all(cls) -> None:
        """Test hook: clear all breaker state."""
        cls._registry.clear()

    def allow(self) -> bool:
        if self.opened_at is None:
            return True
        if (time.monotonic() - self.opened_at) >= self.cool_down_s:
            # Half-open probe: let one call through. We do NOT reset
            # consecutive_failures here — only ``record_success`` does.
            self.opened_at = None
            return True
        return False

    def record_success(self) -> None:
        self.consecutive_failures = 0
        self.opened_at = None

    def record_failure(self) -> None:
        self.consecutive_failures += 1
        if self.consecutive_failures >= self.failure_threshold and self.opened_at is None:
            self.opened_at = time.monotonic()
            log.error(
                "circuit OPEN: adapter=%s consecutive_failures=%d cool_down_s=%.1f",
                self.name,
                self.consecutive_failures,
                self.cool_down_s,
            )


def _is_retryable(exc: BaseException) -> bool:
    """Decide whether a failure from ``RemoteGraph.ainvoke`` is transient.

    Retryable: connection errors, timeouts, generic transport errors, HTTP 5xx,
    HTTP 429.
    Non-retryable (fail fast): Pydantic ``ValidationError``,
    ``ContractsVersionMismatch``, and any non-429 4xx HTTP status.
    """
    # Permanent errors — never retry.
    if isinstance(exc, (ValidationError, ContractsVersionMismatch)):
        return False

    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code if exc.response is not None else 0
        if status == 429:
            return True
        if 500 <= status < 600:
            return True
        return False

    # httpx.RequestError covers connect / read / write / pool timeouts and
    # transport-level network failures.
    if isinstance(exc, httpx.RequestError):
        return True

    if isinstance(exc, (asyncio.TimeoutError, ConnectionError)):
        return True

    # Anything else — surface immediately so unknown errors don't get masked
    # behind silent retries.
    return False


async def _sleep_backoff(attempt: int, base: float, cap: float) -> None:
    """Exponential backoff with full jitter. ``attempt`` is 1-indexed."""
    expo = min(cap, base * (2 ** (attempt - 1)))
    delay = random.uniform(0, expo)
    await asyncio.sleep(delay)


# ─── Env helpers ──────────────────────────────────────────────────────────


def _ml_url() -> str:
    url = os.environ.get("ML_URL", "").strip()
    if not url:
        raise RuntimeError(
            "ML_URL env var is required for RemoteGraph → lead-gen-ml adapters"
        )
    return url.rstrip("/")


def _research_url() -> str:
    url = os.environ.get("RESEARCH_URL", "").strip()
    if not url:
        raise RuntimeError(
            "RESEARCH_URL env var is required for RemoteGraph → lead-gen-research "
            "adapters"
        )
    return url.rstrip("/")


# Set of env-var names we've already logged a "token unset" warning for —
# without this, every adapter build would re-warn and the production logs
# would drown in a repeat that conveys nothing new. Cleared by
# ``reset_adapter_cache()`` so tests that monkeypatch env can re-observe.
_WARNED_AUTH: set[str] = set()


def _resolve_auth_token(env_var: str, scope: str) -> str | None:
    """Read ``env_var`` and warn-once if it's unset/blank.

    Returns the token (None if absent). Misconfigured deploys would otherwise
    silently 401-loop with no signal in core logs — emit one WARNING per env
    var so it shows up immediately.
    """
    token = os.environ.get(env_var, "").strip()
    if token:
        return token
    if env_var not in _WARNED_AUTH:
        log.warning(
            "auth token unset: env=%s scope=%s — calls into %s will be unauthenticated",
            env_var,
            scope,
            scope,
        )
        _WARNED_AUTH.add(env_var)
    return None


def _ml_headers() -> dict[str, str]:
    headers: dict[str, str] = {"X-Internal-Caller": "core"}
    token = _resolve_auth_token("ML_INTERNAL_AUTH_TOKEN", "lead-gen-ml")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _research_headers() -> dict[str, str]:
    headers: dict[str, str] = {"X-Internal-Caller": "core"}
    token = _resolve_auth_token("RESEARCH_INTERNAL_AUTH_TOKEN", "lead-gen-research")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


# ─── Base adapter ─────────────────────────────────────────────────────────


class _ValidatedRemoteGraph[InT: BaseModel, OutT: BaseModel]:
    """Wraps a ``RemoteGraph`` with Pydantic input/output validation.

    Generic over the input/output Pydantic contract types so callers retain
    precise type information when they hold an adapter reference (e.g.
    ``_ValidatedRemoteGraph[JobbertNerInput, JobbertNerOutput]``). The
    by-name ``get_remote_adapter`` lookup intentionally erases the parameters
    to ``BaseModel`` — callers that need precise types should call the
    individual builders.

    Drops into ``builder.add_node("foo", adapter)`` exactly like a compiled
    subgraph thanks to ``.ainvoke(state, config=...)``.
    """

    def __init__(
        self,
        name: str,
        url: str,
        headers: dict[str, str],
        input_cls: type[InT],
        output_cls: type[OutT],
        *,
        timeout: TimeoutTuple = DEFAULT_TIMEOUT,
        max_attempts: int = 3,
        backoff_base_s: float = 0.5,
        backoff_cap_s: float = 8.0,
        breaker_failure_threshold: int = 5,
        breaker_cool_down_s: float = 30.0,
    ) -> None:
        self._name = name
        self._input_cls: type[InT] = input_cls
        self._output_cls: type[OutT] = output_cls
        self._timeout: TimeoutTuple = timeout
        # Build a LangGraphClient with our explicit (connect, read, write, pool)
        # timeout, then hand it to RemoteGraph via ``client=`` so the SDK does
        # not silently fall back to its 300-second read default. Without this
        # a hung remote can wedge a long-running graph node indefinitely.
        sdk_client = get_client(url=url, headers=headers, timeout=timeout)
        self._remote = RemoteGraph(
            name, url=url, headers=headers, client=sdk_client
        )
        self._max_attempts = max(1, max_attempts)
        self._backoff_base_s = backoff_base_s
        self._backoff_cap_s = backoff_cap_s
        self._breaker = _CircuitBreaker.for_name(
            name,
            failure_threshold=breaker_failure_threshold,
            cool_down_s=breaker_cool_down_s,
        )

    async def aclose(self) -> None:
        """Close the pooled httpx client owned by the underlying RemoteGraph.

        Idempotent and exception-tolerant: safe to call multiple times and
        from a shutdown hook where partial errors should not block teardown.
        Wired by :func:`aclose_all_adapters` from the FastAPI lifespan.
        """
        client = getattr(self._remote, "client", None)
        # The async httpx.AsyncClient lives at LangGraphClient.http.client —
        # see langgraph_sdk.client.LangGraphClient / HttpClient.
        http = getattr(client, "http", None)
        async_httpx = getattr(http, "client", None)
        if async_httpx is None:
            return
        try:
            await async_httpx.aclose()
        except Exception:  # noqa: BLE001 — never block shutdown on close errors
            log.warning(
                "aclose() on adapter %s raised — ignoring during shutdown",
                self._name,
                exc_info=True,
            )

    async def _invoke_remote_with_retry(
        self, state: dict[str, Any], config: dict[str, Any] | None
    ) -> Any:
        """Call ``_remote.ainvoke`` with exponential backoff + circuit breaker.

        Only the network call is wrapped — input/output validation happens in
        the caller and is intentionally outside the retry loop so transient
        retries cannot mask permanent contract failures.
        """
        if not self._breaker.allow():
            raise RemoteUnavailable(
                f"{self._name}: circuit breaker open; refusing call until cool-down elapses"
            )

        last_exc: BaseException | None = None
        for attempt in range(1, self._max_attempts + 1):
            try:
                result = await self._remote.ainvoke(state, config=config)
            except BaseException as exc:  # noqa: BLE001 — re-raised below
                last_exc = exc
                if not _is_retryable(exc):
                    self._breaker.record_failure()
                    raise
                if attempt >= self._max_attempts:
                    self._breaker.record_failure()
                    raise
                log.warning(
                    "remote retry: adapter=%s attempt=%d/%d reason=%s: %s",
                    self._name,
                    attempt,
                    self._max_attempts,
                    type(exc).__name__,
                    exc,
                )
                await _sleep_backoff(
                    attempt, self._backoff_base_s, self._backoff_cap_s
                )
                continue
            else:
                self._breaker.record_success()
                return result

        # Defensive: loop above either returns or raises. This is unreachable.
        assert last_exc is not None
        raise last_exc

    def _coerce_state(self, state: InT | dict[str, Any]) -> dict[str, Any]:
        """Accept either a typed Input model or a legacy dict; return a dict.

        This is the only place that bridges the two call styles — keep it
        narrow so the rest of the adapter speaks dicts (the wire format).
        """
        if isinstance(state, BaseModel):
            return state.model_dump()
        return state

    async def ainvoke(
        self,
        state: InT | dict[str, Any],
        config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Invoke the remote graph and return the validated output as a dict.

        Backwards-compatible: existing callers that destructure the return
        value as ``result["foo"]`` continue to work. For typed model access,
        use :meth:`ainvoke_typed` which returns the Pydantic ``OutT`` instance.
        """
        state_dict = self._coerce_state(state)
        # Validate input shape before paying for the HTTP round-trip.
        validate_remote_call(self._input_cls, self._output_cls, state_dict, None)
        log.debug("remote invoke → %s (keys=%s)", self._name, list(state_dict))

        raw_output = await self._invoke_remote_with_retry(state_dict, config=config)
        if not isinstance(raw_output, dict):
            # Defensive: LangGraph Server always returns a state dict; a bare
            # string / None means the remote side served a broken deploy. We
            # used to wrap it in ``{"__raw__": raw_output}`` and let Pydantic
            # complain, but for any Output whose fields all default that
            # silently validated to an empty success — a false positive that
            # hid the real problem. A typed error surfaces the protocol
            # violation regardless of the Output schema.
            raise RemoteGraphProtocolError(
                f"{self._name}: expected a state dict, got {type(raw_output).__name__}"
            )

        # Validates both shape and schema_version; raises ContractsVersionMismatch
        # on drift so the next deploy fails fast instead of corrupting state.
        _, out = validate_remote_call(
            self._input_cls, self._output_cls, state_dict, raw_output
        )
        if out is None:
            # validate_remote_call only returns None when raw_output is None,
            # which we already guarded against above.
            raise RuntimeError(f"{self._name}: unexpected None output after validation")
        return out.model_dump()

    async def ainvoke_typed(
        self,
        state: InT | dict[str, Any],
        config: dict[str, Any] | None = None,
    ) -> OutT:
        """Like :meth:`ainvoke` but returns the parsed ``OutT`` model instance.

        Prefer this in new code where you want static type checkers to see
        the precise output shape (e.g. ``JobbertNerOutput.spans``).
        """
        state_dict = self._coerce_state(state)
        validate_remote_call(self._input_cls, self._output_cls, state_dict, None)
        log.debug("remote invoke (typed) → %s (keys=%s)", self._name, list(state_dict))

        raw_output = await self._invoke_remote_with_retry(state_dict, config=config)
        if not isinstance(raw_output, dict):
            raise RemoteGraphProtocolError(
                f"{self._name}: expected a state dict, got {type(raw_output).__name__}"
            )

        _, out = validate_remote_call(
            self._input_cls, self._output_cls, state_dict, raw_output
        )
        if out is None:
            raise RuntimeError(f"{self._name}: unexpected None output after validation")
        return out

    # LangGraph's StateGraph.add_node accepts any awaitable callable; expose a
    # plain __call__ delegate so older code paths that call ``node(state)``
    # still work.
    async def __call__(
        self,
        state: InT | dict[str, Any],
        config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self.ainvoke(state, config=config)

    async def astream(
        self,
        state: InT | dict[str, Any],
        config: dict[str, Any] | None = None,
        stream_mode: str = "updates",
    ) -> AsyncIterator[Any]:
        """Stream incremental events from the underlying ``RemoteGraph``.

        Long-running research nodes (``agentic_search``, ``research_agent``)
        otherwise block end-to-end before any partial state reaches the caller.
        ``astream`` lets the dispatcher emit interim progress as each node
        finishes inside the remote graph.

        Validation contract:

        * Input is validated against ``input_cls`` **before** the stream is
          opened. A ``ValidationError`` raises pre-flight; the underlying
          ``_remote.astream`` is never called.
        * The final accumulated state is validated against ``output_cls``
          **after** the stream closes — yielding ``ContractsVersionMismatch``
          on schema drift, exactly like ``ainvoke``.

        Streaming itself is *not* wrapped by the retry/circuit-breaker layer
        used by ``ainvoke``: a half-streamed response cannot be safely
        replayed mid-flight without producing duplicate events to the caller.

        Args:
            state: Initial state dict; validated against ``input_cls``.
            config: Optional ``RunnableConfig`` forwarded untouched.
            stream_mode: One of:

                * ``"updates"`` (default) — only the keys changed by each
                  node. Each yielded payload looks like
                  ``{node_name: {key: value, ...}}``. Used for accumulation.
                * ``"values"`` — the full state after each step.
                * ``"messages"`` — token-level LLM stream (LangChain
                  ``messages`` events). Skips end-of-stream output validation
                  because the payload shape is messages, not state.

        Yields:
            Each event from ``RemoteGraph.astream`` is forwarded byte-identical.

        Raises:
            pydantic.ValidationError: pre-flight on bad input, or post-stream
                if the accumulated final state does not match ``output_cls``.
            ContractsVersionMismatch: post-stream if the final state's
                ``schema_version`` disagrees with the caller's
                ``SCHEMA_VERSION``.
        """
        state_dict = self._coerce_state(state)
        # Pre-flight input validation — never open a stream we can't trust.
        validate_remote_call(self._input_cls, self._output_cls, state_dict, None)
        log.debug(
            "remote astream → %s (keys=%s, mode=%s)",
            self._name,
            list(state_dict),
            stream_mode,
        )

        accumulated: dict[str, Any] = {}
        async for event in self._remote.astream(
            state_dict, config=config, stream_mode=stream_mode
        ):
            # Pass-through: the dispatcher sees exactly what RemoteGraph emits.
            yield event

            # Accumulate the running final state for post-stream validation.
            # ``updates`` mode payloads are ``{node_name: partial_state_dict}``;
            # ``values`` mode payloads are the full state dict per step.
            if stream_mode == "updates" and isinstance(event, dict):
                for node_partial in event.values():
                    if isinstance(node_partial, dict):
                        accumulated.update(node_partial)
            elif stream_mode == "values" and isinstance(event, dict):
                accumulated = dict(event)
            # ``messages`` mode emits LLM tokens, not state — skip validation
            # below by leaving ``accumulated`` empty.

        if stream_mode == "messages":
            return

        # Post-stream output validation. Mirrors the ainvoke path: schema
        # drift surfaces here as ContractsVersionMismatch instead of silently
        # corrupting downstream state.
        if not accumulated:
            # Empty stream — nothing to validate. A graph that legitimately
            # emits no updates also has nothing to drift, so we let it pass.
            return

        sv = accumulated.get("schema_version")
        if isinstance(sv, str) and sv != SCHEMA_VERSION:
            raise ContractsVersionMismatch(
                f"{self._output_cls.__name__} schema_version={sv!r} "
                f"does not match caller {SCHEMA_VERSION!r}"
            )

        # Final shape check — re-uses the same validator path as ainvoke.
        validate_remote_call(
            self._input_cls, self._output_cls, state_dict, accumulated
        )


# ─── Adapter cache + lifecycle ────────────────────────────────────────────
#
# Adapters are cached per name so a long-running graph node that calls
# ``get_jobbert_ner_adapter()`` repeatedly reuses one ``RemoteGraph`` (and
# therefore one httpx connection pool + TLS session) instead of paying the
# handshake cost on every invocation. ``build_all_remote_adapters`` warms
# the cache from ``app.py`` at startup; ``reset_adapter_cache`` is the
# test-only escape hatch; ``aclose_all_adapters`` is the shutdown hook.


_ADAPTER_SPECS: dict[str, dict[str, Any]] = {
    "jobbert_ner": {
        "url_fn": _ml_url,
        "headers_fn": _ml_headers,
        "input_cls": JobbertNerInput,
        "output_cls": JobbertNerOutput,
        "timeout": ML_TIMEOUT,
    },
    "bge_m3_embed": {
        "url_fn": _ml_url,
        "headers_fn": _ml_headers,
        "input_cls": BgeM3EmbedInput,
        "output_cls": BgeM3EmbedOutput,
        "timeout": ML_TIMEOUT,
    },
    "research_agent": {
        "url_fn": _research_url,
        "headers_fn": _research_headers,
        "input_cls": ResearchAgentInput,
        "output_cls": ResearchAgentOutput,
        "timeout": RESEARCH_TIMEOUT,
    },
    "lead_papers": {
        "url_fn": _research_url,
        "headers_fn": _research_headers,
        "input_cls": LeadPapersInput,
        "output_cls": LeadPapersOutput,
        "timeout": RESEARCH_TIMEOUT,
    },
    "scholar": {
        "url_fn": _research_url,
        "headers_fn": _research_headers,
        "input_cls": ScholarInput,
        "output_cls": ScholarOutput,
        "timeout": RESEARCH_TIMEOUT,
    },
    "common_crawl": {
        "url_fn": _research_url,
        "headers_fn": _research_headers,
        "input_cls": CommonCrawlInput,
        "output_cls": CommonCrawlOutput,
        "timeout": RESEARCH_TIMEOUT,
    },
    "agentic_search": {
        "url_fn": _research_url,
        "headers_fn": _research_headers,
        "input_cls": AgenticSearchInput,
        "output_cls": AgenticSearchOutput,
        "timeout": RESEARCH_TIMEOUT,
    },
    "gh_patterns": {
        "url_fn": _research_url,
        "headers_fn": _research_headers,
        "input_cls": GhPatternsInput,
        "output_cls": GhPatternsOutput,
        "timeout": RESEARCH_TIMEOUT,
    },
}


_ADAPTER_CACHE: dict[str, _ValidatedRemoteGraph[BaseModel, BaseModel]] = {}

# Defense-in-depth against concurrent first-call builds. A single asyncio
# event loop cannot interleave inside ``_get_or_build`` (it has no ``await``),
# but any caller that reaches the factories from a thread — ``run_in_executor``,
# a sync background helper, a test ThreadPoolExecutor — could race the
# check-then-set and leak the loser's ``_ValidatedRemoteGraph`` (and therefore
# its httpx pool + TLS session) until process shutdown.
_BUILD_LOCK = threading.Lock()


def _build_adapter_from_spec(
    name: str, spec: dict[str, Any]
) -> _ValidatedRemoteGraph[BaseModel, BaseModel]:
    return _ValidatedRemoteGraph(
        name=name,
        url=spec["url_fn"](),
        headers=spec["headers_fn"](),
        input_cls=spec["input_cls"],
        output_cls=spec["output_cls"],
        timeout=spec["timeout"],
    )


def _get_or_build(name: str) -> _ValidatedRemoteGraph[BaseModel, BaseModel]:
    cached = _ADAPTER_CACHE.get(name)
    if cached is not None:
        return cached
    with _BUILD_LOCK:
        # Re-check under the lock: another caller may have built it while we
        # were waiting. Without this, the lock just serialises N concurrent
        # builds instead of collapsing them to one.
        cached = _ADAPTER_CACHE.get(name)
        if cached is not None:
            return cached
        spec = _ADAPTER_SPECS.get(name)
        if spec is None:
            raise KeyError(
                f"unknown remote adapter {name!r}; available: {sorted(_ADAPTER_SPECS)}"
            )
        adapter = _build_adapter_from_spec(name, spec)
        _ADAPTER_CACHE[name] = adapter
        return adapter


def reset_adapter_cache() -> None:
    """Drop every cached adapter so the next ``get_*_adapter()`` rebuilds.

    Tests rely on this when they monkeypatch ``ML_URL`` / ``RESEARCH_URL`` —
    without it, the cached adapter from a previous test would mask the env
    change. The warn-once auth-token set is cleared too so a subsequent test
    that swaps the token env var can re-observe the warning. Production
    callers should use :func:`aclose_all_adapters` instead, which also
    closes pooled connections before clearing.
    """
    _ADAPTER_CACHE.clear()
    _WARNED_AUTH.clear()


async def aclose_all_adapters() -> None:
    """Close pooled httpx clients on every cached adapter, then drop the cache.

    Wired into the FastAPI ``lifespan`` teardown in ``core/app.py`` so the
    container exits without leaking connections / TLS sessions.
    """
    # Snapshot before clear: aclose may raise on one adapter and we still
    # want every other cached adapter to be closed and the dict to be empty.
    adapters = list(_ADAPTER_CACHE.values())
    _ADAPTER_CACHE.clear()
    for adapter in adapters:
        await adapter.aclose()


# ─── ML adapters ──────────────────────────────────────────────────────────
#
# All factories return *cached* singletons. Repeated calls within a process
# return the same object (and therefore the same httpx connection pool).


def get_jobbert_ner_adapter() -> _ValidatedRemoteGraph[JobbertNerInput, JobbertNerOutput]:
    return _get_or_build("jobbert_ner")  # type: ignore[return-value]


def get_bge_m3_embed_adapter() -> _ValidatedRemoteGraph[BgeM3EmbedInput, BgeM3EmbedOutput]:
    return _get_or_build("bge_m3_embed")  # type: ignore[return-value]


# ─── Research adapters ────────────────────────────────────────────────────


def get_research_agent_adapter() -> _ValidatedRemoteGraph[
    ResearchAgentInput, ResearchAgentOutput
]:
    return _get_or_build("research_agent")  # type: ignore[return-value]


def get_lead_papers_adapter() -> _ValidatedRemoteGraph[
    LeadPapersInput, LeadPapersOutput
]:
    return _get_or_build("lead_papers")  # type: ignore[return-value]


def get_scholar_adapter() -> _ValidatedRemoteGraph[ScholarInput, ScholarOutput]:
    return _get_or_build("scholar")  # type: ignore[return-value]


def get_common_crawl_adapter() -> _ValidatedRemoteGraph[
    CommonCrawlInput, CommonCrawlOutput
]:
    return _get_or_build("common_crawl")  # type: ignore[return-value]


def get_agentic_search_adapter() -> _ValidatedRemoteGraph[
    AgenticSearchInput, AgenticSearchOutput
]:
    return _get_or_build("agentic_search")  # type: ignore[return-value]


def get_gh_patterns_adapter() -> _ValidatedRemoteGraph[
    GhPatternsInput, GhPatternsOutput
]:
    return _get_or_build("gh_patterns")  # type: ignore[return-value]


# ─── Convenience lookup ───────────────────────────────────────────────────


_ADAPTER_BUILDERS: dict[
    str, Callable[[], _ValidatedRemoteGraph[BaseModel, BaseModel]]
] = {
    # Static type erasure: at runtime each builder still returns its precise
    # ``_ValidatedRemoteGraph[FooInput, FooOutput]`` instance. We widen here so
    # ``get_remote_adapter`` can return them under a uniform key/value type.
    "jobbert_ner": get_jobbert_ner_adapter,  # type: ignore[dict-item]
    "bge_m3_embed": get_bge_m3_embed_adapter,  # type: ignore[dict-item]
    "research_agent": get_research_agent_adapter,  # type: ignore[dict-item]
    "lead_papers": get_lead_papers_adapter,  # type: ignore[dict-item]
    "scholar": get_scholar_adapter,  # type: ignore[dict-item]
    "common_crawl": get_common_crawl_adapter,  # type: ignore[dict-item]
    "agentic_search": get_agentic_search_adapter,  # type: ignore[dict-item]
    "gh_patterns": get_gh_patterns_adapter,  # type: ignore[dict-item]
}


def get_remote_adapter(name: str) -> _ValidatedRemoteGraph[BaseModel, BaseModel]:
    """Return a RemoteGraph adapter by registered name, or raise KeyError.

    Note: the by-name lookup intentionally erases the precise generic
    parameters — callers that need ``_ValidatedRemoteGraph[FooInput, FooOutput]``
    typing should call the corresponding ``get_*_adapter()`` builder directly.
    The adapter still validates with the exact contract classes registered at
    build time; only the static type is loosened to ``BaseModel``.
    """
    if name not in _ADAPTER_SPECS:
        raise KeyError(
            f"unknown remote adapter {name!r}; available: {sorted(_ADAPTER_SPECS)}"
        )
    return _get_or_build(name)


def build_all_remote_adapters() -> dict[str, _ValidatedRemoteGraph[BaseModel, BaseModel]]:
    """Build every registered adapter — useful for startup wiring in app.py.

    Populates the module-level cache so subsequent ``get_*_adapter()`` calls
    return the warmed instances. Raises at startup if ``ML_URL`` /
    ``RESEARCH_URL`` are missing, which is what we want: failing the
    container boot beats silently hanging on the first cross-container call.
    """
    return {name: _get_or_build(name) for name in _ADAPTER_SPECS}


__all__ = [
    "DEFAULT_TIMEOUT",
    "ML_TIMEOUT",
    "RESEARCH_TIMEOUT",
    "RemoteGraphProtocolError",
    "RemoteUnavailable",
    "TimeoutTuple",
    "aclose_all_adapters",
    "build_all_remote_adapters",
    "get_agentic_search_adapter",
    "get_bge_m3_embed_adapter",
    "get_common_crawl_adapter",
    "get_gh_patterns_adapter",
    "get_jobbert_ner_adapter",
    "get_lead_papers_adapter",
    "get_remote_adapter",
    "get_research_agent_adapter",
    "get_scholar_adapter",
    "reset_adapter_cache",
]
