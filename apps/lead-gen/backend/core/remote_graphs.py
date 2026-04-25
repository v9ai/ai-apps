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
import hashlib
import json
import logging
import os
import random
import time
from typing import Any, AsyncIterator, Callable

import httpx
from cachetools import TTLCache
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


# ─── Retry / circuit breaker primitives ───────────────────────────────────


class RemoteUnavailable(RuntimeError):
    """Raised when the circuit breaker is open and short-circuits a call.

    Distinct from network/HTTP errors so callers can choose to degrade rather
    than retry: while the breaker is open every adapter call fails fast with
    this exception until the cool-down elapses.
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


def _ml_headers() -> dict[str, str]:
    token = os.environ.get("ML_INTERNAL_AUTH_TOKEN", "").strip()
    headers: dict[str, str] = {"X-Internal-Caller": "core"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _research_headers() -> dict[str, str]:
    token = os.environ.get("RESEARCH_INTERNAL_AUTH_TOKEN", "").strip()
    headers: dict[str, str] = {"X-Internal-Caller": "core"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


# ─── Base adapter ─────────────────────────────────────────────────────────


class _ValidatedRemoteGraph:
    """Wraps a ``RemoteGraph`` with Pydantic input/output validation.

    Drops into ``builder.add_node("foo", adapter)`` exactly like a compiled
    subgraph thanks to ``.ainvoke(state, config=...)``.
    """

    def __init__(
        self,
        name: str,
        url: str,
        headers: dict[str, str],
        input_cls: type[BaseModel],
        output_cls: type[BaseModel],
        *,
        max_attempts: int = 3,
        backoff_base_s: float = 0.5,
        backoff_cap_s: float = 8.0,
        breaker_failure_threshold: int = 5,
        breaker_cool_down_s: float = 30.0,
    ) -> None:
        self._name = name
        self._input_cls = input_cls
        self._output_cls = output_cls
        self._remote = RemoteGraph(name, url=url, headers=headers)
        self._max_attempts = max(1, max_attempts)
        self._backoff_base_s = backoff_base_s
        self._backoff_cap_s = backoff_cap_s
        self._breaker = _CircuitBreaker.for_name(
            name,
            failure_threshold=breaker_failure_threshold,
            cool_down_s=breaker_cool_down_s,
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

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        # Validate input shape before paying for the HTTP round-trip.
        validate_remote_call(self._input_cls, self._output_cls, state, None)
        log.debug("remote invoke → %s (keys=%s)", self._name, list(state))

        raw_output = await self._invoke_remote_with_retry(state, config=config)
        if not isinstance(raw_output, dict):
            # Defensive — LangGraph Server always returns a state dict, but a
            # bad deploy could return a raw string/null. Wrap so the Pydantic
            # error has a useful payload instead of a silent TypeError.
            raw_output = {"__raw__": raw_output}

        # Validates both shape and schema_version; raises ContractsVersionMismatch
        # on drift so the next deploy fails fast instead of corrupting state.
        _, out = validate_remote_call(
            self._input_cls, self._output_cls, state, raw_output
        )
        if out is None:
            # validate_remote_call only returns None when raw_output is None,
            # which we already guarded against above.
            raise RuntimeError(f"{self._name}: unexpected None output after validation")
        return out.model_dump()

    # LangGraph's StateGraph.add_node accepts any awaitable callable; expose a
    # plain __call__ delegate so older code paths that call ``node(state)``
    # still work.
    async def __call__(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        return await self.ainvoke(state, config=config)

    async def astream(
        self,
        state: dict[str, Any],
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
        # Pre-flight input validation — never open a stream we can't trust.
        validate_remote_call(self._input_cls, self._output_cls, state, None)
        log.debug(
            "remote astream → %s (keys=%s, mode=%s)",
            self._name,
            list(state),
            stream_mode,
        )

        accumulated: dict[str, Any] = {}
        async for event in self._remote.astream(
            state, config=config, stream_mode=stream_mode
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
            self._input_cls, self._output_cls, state, accumulated
        )


# ─── ML adapters ──────────────────────────────────────────────────────────


def get_jobbert_ner_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="jobbert_ner",
        url=_ml_url(),
        headers=_ml_headers(),
        input_cls=JobbertNerInput,
        output_cls=JobbertNerOutput,
    )


def get_bge_m3_embed_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="bge_m3_embed",
        url=_ml_url(),
        headers=_ml_headers(),
        input_cls=BgeM3EmbedInput,
        output_cls=BgeM3EmbedOutput,
    )


# ─── Research adapters ────────────────────────────────────────────────────


def get_research_agent_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="research_agent",
        url=_research_url(),
        headers=_research_headers(),
        input_cls=ResearchAgentInput,
        output_cls=ResearchAgentOutput,
    )


def get_lead_papers_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="lead_papers",
        url=_research_url(),
        headers=_research_headers(),
        input_cls=LeadPapersInput,
        output_cls=LeadPapersOutput,
    )


def get_scholar_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="scholar",
        url=_research_url(),
        headers=_research_headers(),
        input_cls=ScholarInput,
        output_cls=ScholarOutput,
    )


def get_common_crawl_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="common_crawl",
        url=_research_url(),
        headers=_research_headers(),
        input_cls=CommonCrawlInput,
        output_cls=CommonCrawlOutput,
    )


def get_agentic_search_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="agentic_search",
        url=_research_url(),
        headers=_research_headers(),
        input_cls=AgenticSearchInput,
        output_cls=AgenticSearchOutput,
    )


def get_gh_patterns_adapter() -> _ValidatedRemoteGraph:
    return _ValidatedRemoteGraph(
        name="gh_patterns",
        url=_research_url(),
        headers=_research_headers(),
        input_cls=GhPatternsInput,
        output_cls=GhPatternsOutput,
    )


# ─── Convenience lookup ───────────────────────────────────────────────────


_ADAPTER_BUILDERS = {
    "jobbert_ner": get_jobbert_ner_adapter,
    "bge_m3_embed": get_bge_m3_embed_adapter,
    "research_agent": get_research_agent_adapter,
    "lead_papers": get_lead_papers_adapter,
    "scholar": get_scholar_adapter,
    "common_crawl": get_common_crawl_adapter,
    "agentic_search": get_agentic_search_adapter,
    "gh_patterns": get_gh_patterns_adapter,
}


def get_remote_adapter(name: str) -> _ValidatedRemoteGraph:
    """Return a RemoteGraph adapter by registered name, or raise KeyError."""
    builder = _ADAPTER_BUILDERS.get(name)
    if builder is None:
        raise KeyError(
            f"unknown remote adapter {name!r}; available: {sorted(_ADAPTER_BUILDERS)}"
        )
    return builder()


def build_all_remote_adapters() -> dict[str, _ValidatedRemoteGraph]:
    """Build every registered adapter — useful for startup wiring in app.py.

    Raises at startup if ``ML_URL`` / ``RESEARCH_URL`` are missing, which is
    what we want: failing the container boot beats silently hanging on the
    first cross-container call.
    """
    return {name: build() for name, build in _ADAPTER_BUILDERS.items()}


__all__ = [
    "RemoteUnavailable",
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
]
