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

import logging
import os
from typing import Any

from pydantic import BaseModel

from langgraph.pregel.remote import RemoteGraph

from leadgen_agent.contracts import (
    AgenticSearchInput,
    AgenticSearchOutput,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
    CommonCrawlInput,
    CommonCrawlOutput,
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
    ) -> None:
        self._name = name
        self._input_cls = input_cls
        self._output_cls = output_cls
        self._remote = RemoteGraph(name, url=url, headers=headers)

    async def ainvoke(
        self, state: dict[str, Any], config: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        # Validate input shape before paying for the HTTP round-trip.
        validate_remote_call(self._input_cls, self._output_cls, state, None)
        log.debug("remote invoke → %s (keys=%s)", self._name, list(state))

        raw_output = await self._remote.ainvoke(state, config=config)
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
