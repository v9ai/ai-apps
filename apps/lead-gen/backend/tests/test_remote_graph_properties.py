"""Property-based (Hypothesis) tests for `_ValidatedRemoteGraph`.

The example-based tests in ``test_remote_graph_adapter.py`` lock in specific
scenarios. These tests fuzz the adapter against the Pydantic contracts in
``leadgen_agent.contracts`` to verify three structural properties hold for
*any* generated input/output:

1. **Round-trip property** — when input is valid against ``*Input`` and the
   FakeRemote returns a valid ``*Output`` payload, the adapter returns a dict
   that matches the ``*Output`` shape.
2. **Fail-fast property** — when input is invalid, ``ValidationError`` is
   raised and the FakeRemote is *never* called (no wasted HTTP round-trip).
3. **Drift property** — when the remote returns a payload whose
   ``schema_version`` differs from ``SCHEMA_VERSION``, the adapter raises
   ``ContractsVersionMismatch`` (or ``ValidationError``); when it matches,
   the adapter returns cleanly.

We pin Hypothesis to ``max_examples=50, deadline=2000`` so the property
suite stays under ~10s in CI.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from hypothesis import HealthCheck, given, settings, strategies as st
from pydantic import ValidationError

from core.remote_graphs import _ValidatedRemoteGraph
from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    AgenticSearchInput,
    AgenticSearchOutput,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
    ContractsVersionMismatch,
    JobbertNerInput,
    JobbertNerOutput,
    ResearchAgentInput,
    ResearchAgentOutput,
)


pytestmark = [pytest.mark.hypothesis]


# Tighten the property runtime so the suite doesn't blow CI out.
PROPERTY_SETTINGS = settings(
    max_examples=50,
    deadline=2000,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
)


# ─── FakeRemote (mirrors the pattern in test_remote_graph_adapter.py) ─────


class FakeRemote:
    """Stand-in for ``langgraph.pregel.remote.RemoteGraph``."""

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


def _build_adapter(
    name: str, input_cls: Any, output_cls: Any, fake: FakeRemote
) -> _ValidatedRemoteGraph:
    adapter = _ValidatedRemoteGraph(
        name=name,
        url="http://stub",
        headers={"X-Internal-Caller": "core"},
        input_cls=input_cls,
        output_cls=output_cls,
    )
    adapter._remote = fake  # type: ignore[assignment]
    return adapter


# ─── Strategies ───────────────────────────────────────────────────────────

# Reasonable bounded text — Hypothesis defaults to enormous Unicode otherwise.
_safe_text = st.text(min_size=1, max_size=200).filter(lambda s: s.strip() != "")
_short_text = st.text(min_size=1, max_size=80).filter(lambda s: s.strip() != "")


@st.composite
def jobbert_ner_valid_input(draw: st.DrawFn) -> dict[str, Any]:
    return {
        "text": draw(st.text(min_size=1, max_size=4000).filter(lambda s: len(s) >= 1)),
        "max_len": draw(st.integers(min_value=8, max_value=256)),
    }


@st.composite
def jobbert_ner_invalid_input(draw: st.DrawFn) -> dict[str, Any]:
    """Generate inputs guaranteed to fail JobbertNerInput validation."""
    kind = draw(st.sampled_from(["empty_text", "wrong_type", "missing_text",
                                  "max_len_too_low", "max_len_too_high"]))
    if kind == "empty_text":
        return {"text": ""}
    if kind == "wrong_type":
        return {"text": draw(st.integers())}
    if kind == "missing_text":
        return {"max_len": draw(st.integers(min_value=8, max_value=256))}
    if kind == "max_len_too_low":
        return {"text": "valid", "max_len": draw(st.integers(max_value=7))}
    # max_len_too_high
    return {"text": "valid", "max_len": draw(st.integers(min_value=257, max_value=10000))}


@st.composite
def bge_m3_valid_input(draw: st.DrawFn) -> dict[str, Any]:
    return {
        "texts": draw(st.lists(_short_text, min_size=1, max_size=8)),
    }


@st.composite
def bge_m3_invalid_input(draw: st.DrawFn) -> dict[str, Any]:
    kind = draw(st.sampled_from(["empty_list", "wrong_type", "missing"]))
    if kind == "empty_list":
        return {"texts": []}
    if kind == "wrong_type":
        return {"texts": draw(st.text(min_size=1))}  # str, not list
    return {}  # missing required `texts`


_research_modes = st.sampled_from(
    [
        "research",
        "remote_job_search",
        "lead_gen_prompt_1",
        "lead_gen_prompt_2",
        "lead_gen_prompt_all",
    ]
)


@st.composite
def research_agent_valid_input(draw: st.DrawFn) -> dict[str, Any]:
    return {
        "mode": draw(_research_modes),
        "query": draw(st.text(min_size=1, max_size=500).filter(lambda s: len(s) >= 1)),
        "context": draw(
            st.dictionaries(
                keys=st.text(min_size=1, max_size=20),
                values=st.one_of(st.text(max_size=50), st.integers(), st.booleans()),
                max_size=4,
            )
        ),
    }


@st.composite
def research_agent_invalid_input(draw: st.DrawFn) -> dict[str, Any]:
    kind = draw(st.sampled_from(["bad_mode", "empty_query", "missing_mode"]))
    if kind == "bad_mode":
        return {"mode": "not_a_real_mode", "query": "x"}
    if kind == "empty_query":
        return {"mode": "research", "query": ""}
    return {"query": "no mode here"}


@st.composite
def agentic_search_valid_input(draw: st.DrawFn) -> dict[str, Any]:
    payload: dict[str, Any] = {"mode": draw(st.sampled_from(["search", "discover"]))}
    if draw(st.booleans()):
        payload["query"] = draw(_short_text)
    if draw(st.booleans()):
        payload["root"] = draw(_short_text)
    return payload


@st.composite
def agentic_search_invalid_input(draw: st.DrawFn) -> dict[str, Any]:
    kind = draw(st.sampled_from(["bad_mode", "missing_mode", "wrong_query_type"]))
    if kind == "bad_mode":
        return {"mode": "neither_search_nor_discover"}
    if kind == "missing_mode":
        return {"query": "x"}
    return {"mode": "search", "query": draw(st.integers())}


# ─── Output strategies ────────────────────────────────────────────────────


@st.composite
def jobbert_ner_valid_output(draw: st.DrawFn) -> dict[str, Any]:
    n_spans = draw(st.integers(min_value=0, max_value=4))
    spans = []
    for _ in range(n_spans):
        spans.append(
            {
                "span": draw(_short_text),
                "label": "SKILL",
                "score": draw(st.floats(min_value=0.0, max_value=1.0,
                                        allow_nan=False, allow_infinity=False)),
                "start": draw(st.integers(min_value=0, max_value=1000)),
                "end": draw(st.integers(min_value=0, max_value=1000)),
            }
        )
    return {"schema_version": SCHEMA_VERSION, "spans": spans}


@st.composite
def bge_m3_valid_output(draw: st.DrawFn) -> dict[str, Any]:
    """Generate valid BgeM3EmbedOutput payloads.

    The contract pins ``dim=1024`` but does not require ``len(vectors[i]) == 1024``
    (no per-vector length check), so we use small fuzzed vectors with one
    fuzzed scalar to keep the search space tractable. We still vary the
    number of vectors and the scalar value Hypothesis explores.
    """
    n_vecs = draw(st.integers(min_value=1, max_value=3))
    scalar = draw(
        st.floats(
            min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False
        )
    )
    vec_len = draw(st.integers(min_value=1, max_value=8))
    vectors = [[scalar] * vec_len for _ in range(n_vecs)]
    return {
        "schema_version": SCHEMA_VERSION,
        "vectors": vectors,
        "dim": 1024,
        "model": "BAAI/bge-m3",
    }


@st.composite
def research_agent_valid_output(draw: st.DrawFn) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "report": draw(st.text(max_size=400)),
        "citations": draw(st.lists(_short_text, max_size=4)),
    }


@st.composite
def agentic_search_valid_output(draw: st.DrawFn) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "answer": draw(st.one_of(st.none(), st.text(max_size=200))),
        "citations": [],
        "discovery": draw(
            st.one_of(
                st.none(),
                st.dictionaries(
                    keys=st.text(min_size=1, max_size=20),
                    values=st.text(max_size=50),
                    max_size=3,
                ),
            )
        ),
    }


# Schema versions that disagree with current SCHEMA_VERSION.
_drift_versions = st.text(min_size=1, max_size=30).filter(lambda s: s != SCHEMA_VERSION)


# ─── Round-trip property: valid input + valid output → dict matching shape ─


@PROPERTY_SETTINGS
@given(payload=jobbert_ner_valid_input(), output=jobbert_ner_valid_output())
def test_jobbert_ner_valid_round_trip(
    payload: dict[str, Any], output: dict[str, Any]
) -> None:
    fake = FakeRemote(output)
    adapter = _build_adapter("jobbert_ner", JobbertNerInput, JobbertNerOutput, fake)

    out = asyncio.run(adapter.ainvoke(payload))

    assert isinstance(out, dict)
    # Output must validate cleanly through the contract.
    JobbertNerOutput.model_validate(out)
    assert out["schema_version"] == SCHEMA_VERSION
    assert isinstance(out["spans"], list)
    assert len(fake.calls) == 1


@PROPERTY_SETTINGS
@given(payload=bge_m3_valid_input(), output=bge_m3_valid_output())
def test_bge_m3_valid_round_trip(
    payload: dict[str, Any], output: dict[str, Any]
) -> None:
    fake = FakeRemote(output)
    adapter = _build_adapter("bge_m3_embed", BgeM3EmbedInput, BgeM3EmbedOutput, fake)

    out = asyncio.run(adapter.ainvoke(payload))
    BgeM3EmbedOutput.model_validate(out)
    assert out["dim"] == 1024
    assert out["model"] == "BAAI/bge-m3"
    assert len(fake.calls) == 1


@PROPERTY_SETTINGS
@given(payload=research_agent_valid_input(), output=research_agent_valid_output())
def test_research_agent_valid_round_trip(
    payload: dict[str, Any], output: dict[str, Any]
) -> None:
    fake = FakeRemote(output)
    adapter = _build_adapter(
        "research_agent", ResearchAgentInput, ResearchAgentOutput, fake
    )

    out = asyncio.run(adapter.ainvoke(payload))
    ResearchAgentOutput.model_validate(out)
    assert isinstance(out["report"], str)
    assert isinstance(out["citations"], list)
    assert len(fake.calls) == 1


@PROPERTY_SETTINGS
@given(payload=agentic_search_valid_input(), output=agentic_search_valid_output())
def test_agentic_search_valid_round_trip(
    payload: dict[str, Any], output: dict[str, Any]
) -> None:
    fake = FakeRemote(output)
    adapter = _build_adapter(
        "agentic_search", AgenticSearchInput, AgenticSearchOutput, fake
    )

    out = asyncio.run(adapter.ainvoke(payload))
    AgenticSearchOutput.model_validate(out)
    assert len(fake.calls) == 1


# ─── Fail-fast property: invalid input → ValidationError, no remote call ──


@PROPERTY_SETTINGS
@given(payload=jobbert_ner_invalid_input())
def test_jobbert_ner_invalid_input_fails_fast(payload: dict[str, Any]) -> None:
    fake = FakeRemote({"schema_version": SCHEMA_VERSION, "spans": []})
    adapter = _build_adapter("jobbert_ner", JobbertNerInput, JobbertNerOutput, fake)

    with pytest.raises(ValidationError):
        asyncio.run(adapter.ainvoke(payload))

    # The whole point: fail BEFORE the HTTP round-trip.
    assert fake.calls == []


@PROPERTY_SETTINGS
@given(payload=bge_m3_invalid_input())
def test_bge_m3_invalid_input_fails_fast(payload: dict[str, Any]) -> None:
    fake = FakeRemote(
        {"schema_version": SCHEMA_VERSION, "vectors": [], "dim": 1024, "model": "BAAI/bge-m3"}
    )
    adapter = _build_adapter("bge_m3_embed", BgeM3EmbedInput, BgeM3EmbedOutput, fake)

    with pytest.raises(ValidationError):
        asyncio.run(adapter.ainvoke(payload))

    assert fake.calls == []


@PROPERTY_SETTINGS
@given(payload=research_agent_invalid_input())
def test_research_agent_invalid_input_fails_fast(payload: dict[str, Any]) -> None:
    fake = FakeRemote(
        {"schema_version": SCHEMA_VERSION, "report": "x", "citations": []}
    )
    adapter = _build_adapter(
        "research_agent", ResearchAgentInput, ResearchAgentOutput, fake
    )

    with pytest.raises(ValidationError):
        asyncio.run(adapter.ainvoke(payload))

    assert fake.calls == []


@PROPERTY_SETTINGS
@given(payload=agentic_search_invalid_input())
def test_agentic_search_invalid_input_fails_fast(payload: dict[str, Any]) -> None:
    fake = FakeRemote({"schema_version": SCHEMA_VERSION})
    adapter = _build_adapter(
        "agentic_search", AgenticSearchInput, AgenticSearchOutput, fake
    )

    with pytest.raises(ValidationError):
        asyncio.run(adapter.ainvoke(payload))

    assert fake.calls == []


# ─── Drift property: random schema_version → mismatch iff != current ─────


@PROPERTY_SETTINGS
@given(version=_drift_versions)
def test_jobbert_ner_schema_drift_raises(version: str) -> None:
    fake = FakeRemote({"schema_version": version, "spans": []})
    adapter = _build_adapter("jobbert_ner", JobbertNerInput, JobbertNerOutput, fake)

    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        asyncio.run(adapter.ainvoke({"text": "react"}))

    # Remote WAS called (we only know about drift after the response arrives).
    assert len(fake.calls) == 1


@PROPERTY_SETTINGS
@given(version=_drift_versions)
def test_bge_m3_schema_drift_raises(version: str) -> None:
    output = {
        "schema_version": version,
        "vectors": [[0.0] * 1024],
        "dim": 1024,
        "model": "BAAI/bge-m3",
    }
    fake = FakeRemote(output)
    adapter = _build_adapter("bge_m3_embed", BgeM3EmbedInput, BgeM3EmbedOutput, fake)

    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        asyncio.run(adapter.ainvoke({"texts": ["hi"]}))

    assert len(fake.calls) == 1


@PROPERTY_SETTINGS
@given(version=_drift_versions)
def test_research_agent_schema_drift_raises(version: str) -> None:
    fake = FakeRemote({"schema_version": version, "report": "x", "citations": []})
    adapter = _build_adapter(
        "research_agent", ResearchAgentInput, ResearchAgentOutput, fake
    )

    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        asyncio.run(adapter.ainvoke({"mode": "research", "query": "x"}))

    assert len(fake.calls) == 1


@PROPERTY_SETTINGS
@given(version=_drift_versions)
def test_agentic_search_schema_drift_raises(version: str) -> None:
    fake = FakeRemote(
        {"schema_version": version, "answer": None, "citations": [], "discovery": None}
    )
    adapter = _build_adapter(
        "agentic_search", AgenticSearchInput, AgenticSearchOutput, fake
    )

    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        asyncio.run(adapter.ainvoke({"mode": "search"}))

    assert len(fake.calls) == 1
