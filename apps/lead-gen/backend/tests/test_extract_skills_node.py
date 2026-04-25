"""Tests for the extract_skills node in contact_enrich_graph.py.

Covers: adapter-absence short-circuits, no-papers / no-abstract gating,
threshold filtering, lowercase dedup, the 10-paper cap, the 512-char
truncation, and per-call exception handling.
"""

from __future__ import annotations

from leadgen_agent.contact_enrich_graph import extract_skills
from leadgen_agent.contracts import SCHEMA_VERSION


class FakeAdapter:
    """Stand-in for _ValidatedRemoteGraph that records calls and returns canned data."""

    def __init__(self, response_or_exc):
        self._r = response_or_exc
        self.calls: list[dict] = []

    async def ainvoke(self, state, config=None):
        self.calls.append(state)
        if isinstance(self._r, Exception):
            raise self._r
        if callable(self._r):
            return self._r(state)
        return self._r


def _ok(spans):
    return {"schema_version": SCHEMA_VERSION, "spans": spans}


def _span(text, score=0.9, start=0, end=None):
    return {
        "span": text,
        "label": "SKILL",
        "score": score,
        "start": start,
        "end": end if end is not None else len(text),
    }


async def test_no_adapter_returns_empty():
    state = {"papers": [{"abstract": "react"}]}
    config: dict = {}
    assert await extract_skills(state, config) == {}


async def test_adapter_none_returns_empty():
    state = {"papers": [{"abstract": "react"}]}
    config = {"configurable": {"jobbert_ner_adapter": None}}
    assert await extract_skills(state, config) == {}


async def test_no_papers_returns_empty():
    adapter = FakeAdapter(_ok([_span("React")]))
    state: dict = {"papers": []}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    assert result == {}
    assert adapter.calls == []


async def test_papers_without_abstracts_returns_empty():
    adapter = FakeAdapter(_ok([_span("React")]))
    state = {"papers": [{"title": "x"}, {"title": "y"}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    assert result == {}
    assert adapter.calls == []


async def test_happy_path_returns_skills():
    adapter = FakeAdapter(_ok([_span("React", score=0.9)]))
    state = {"papers": [{"abstract": "react developer"}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    assert result == {"extracted_skills": ["react"]}


async def test_summary_fallback_when_no_abstract():
    adapter = FakeAdapter(_ok([_span("Python", score=0.95)]))
    state = {"papers": [{"summary": "python research"}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    assert result == {"extracted_skills": ["python"]}


async def test_threshold_filter():
    adapter = FakeAdapter(
        _ok(
            [
                _span("Below", score=0.5),
                _span("AtBoundary", score=0.7),
                _span("High", score=0.9),
            ]
        )
    )
    state = {"papers": [{"abstract": "stuff"}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    skills = set(result["extracted_skills"])
    assert "below" not in skills
    assert "atboundary" in skills
    assert "high" in skills


async def test_dedup_lowercase():
    adapter = FakeAdapter(
        _ok(
            [
                _span("React", score=0.9),
                _span("REACT", score=0.9),
                _span("react", score=0.9),
            ]
        )
    )
    state = {"papers": [{"abstract": "react react react"}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    assert result == {"extracted_skills": ["react"]}


async def test_cap_at_10_papers():
    adapter = FakeAdapter(_ok([]))
    papers = [{"abstract": f"paper {i}"} for i in range(15)]
    state = {"papers": papers}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    await extract_skills(state, config)
    assert len(adapter.calls) == 10


async def test_truncation_at_512_chars():
    adapter = FakeAdapter(_ok([]))
    state = {"papers": [{"abstract": "x" * 1000}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    await extract_skills(state, config)
    assert len(adapter.calls) == 1
    assert len(adapter.calls[0]["text"]) == 512
    assert adapter.calls[0]["text"] == "x" * 512


async def test_exception_swallowed():
    adapter = FakeAdapter(RuntimeError("boom"))
    state = {"papers": [{"abstract": "react"}]}
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    # Must not raise; per the impl, returns extracted_skills=[] when all
    # adapter calls failed (texts non-empty path always returns the key).
    result = await extract_skills(state, config)
    assert result == {"extracted_skills": []}


async def test_partial_failure_keeps_successful_spans():
    state_holder = {"i": 0}

    def responder(_payload):
        state_holder["i"] += 1
        if state_holder["i"] == 2:
            raise RuntimeError("transient")
        # call 1 -> "react"; call 3 -> "python"
        return _ok([_span("React" if state_holder["i"] == 1 else "Python", score=0.9)])

    adapter = FakeAdapter(responder)
    state = {
        "papers": [
            {"abstract": "first paper about react"},
            {"abstract": "second paper that fails"},
            {"abstract": "third paper about python"},
        ]
    }
    config = {"configurable": {"jobbert_ner_adapter": adapter}}
    result = await extract_skills(state, config)
    skills = set(result["extracted_skills"])
    assert skills == {"react", "python"}
    assert len(adapter.calls) == 3
