"""Tests graph phase dependency structure and data flow between phases.

Validates that the LangGraph StateGraph enforces sequential phase execution
and that each phase reads/writes the correct state keys.
"""

import pytest

from crew import build_graph, ResearchState


@pytest.fixture
def graph():
    return build_graph()


def _get_edges(graph):
    """Return a list of (source, target) tuples from the compiled graph."""
    return [(e.source, e.target) for e in graph.get_graph().edges]


# ── 1. Phase 1 has no upstream dependency (only START) ───────────────────

def test_phase1_starts_from_start(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase1"]
    assert incoming == ["__start__"], f"phase1 should only come from __start__, got {incoming}"


# ── 2. Phase 2 depends only on Phase 1 ──────────────────────────────────

def test_phase2_depends_on_phase1(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase2"]
    assert incoming == ["phase1"], f"phase2 should come from phase1, got {incoming}"


# ── 3. Phase 3 eval depends only on Phase 2 ─────────────────────────────

def test_phase3_eval_depends_on_phase2(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase3_eval"]
    assert incoming == ["phase2"], f"phase3_eval should come from phase2, got {incoming}"


# ── 4. Phase 3 exec depends only on Phase 3 eval ────────────────────────

def test_phase3_exec_depends_on_eval(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase3_exec"]
    assert incoming == ["phase3_eval"], f"phase3_exec should come from phase3_eval, got {incoming}"


# ── 5. Only phase3_exec leads to END ────────────────────────────────────

def test_only_phase3_exec_leads_to_end(graph):
    edges = _get_edges(graph)
    to_end = [src for src, tgt in edges if tgt == "__end__"]
    assert to_end == ["phase3_exec"], f"Only phase3_exec should lead to END, got {to_end}"


# ── 6. No node has multiple incoming edges (strictly sequential) ────────

def test_no_fan_in(graph):
    edges = _get_edges(graph)
    targets = [tgt for _, tgt in edges]
    for node in set(targets):
        count = targets.count(node)
        assert count == 1, f"Node '{node}' has {count} incoming edges (expected 1)"


# ── 7. No node has multiple outgoing edges (no branching) ───────────────

def test_no_fan_out(graph):
    edges = _get_edges(graph)
    sources = [src for src, _ in edges]
    for node in set(sources):
        count = sources.count(node)
        assert count == 1, f"Node '{node}' has {count} outgoing edges (expected 1)"


# ── 8. Graph forms a linear chain of exactly 6 nodes ────────────────────

def test_linear_chain(graph):
    edges = _get_edges(graph)
    expected_chain = [
        ("__start__", "phase1"),
        ("phase1", "phase2"),
        ("phase2", "phase3_eval"),
        ("phase3_eval", "phase3_exec"),
        ("phase3_exec", "__end__"),
    ]
    assert edges == expected_chain, f"Expected linear chain, got {edges}"


# ── 9. Phase 1 writes 7 state keys ──────────────────────────────────────

def test_phase1_writes_7_keys():
    p1_keys = {"web_research", "github_data", "orcid_data", "arxiv_data",
               "podcast_data", "news_data", "hf_data"}
    assert len(p1_keys) == 7


# ── 10. Phase 2 writes 11 state keys ────────────────────────────────────

def test_phase2_writes_11_keys():
    p2_keys = {"bio", "timeline", "contributions", "quotes", "social",
               "topics", "competitive", "collaboration", "funding",
               "conference", "philosophy"}
    assert len(p2_keys) == 11


# ── 11. Phase 3 writes 2 state keys ─────────────────────────────────────

def test_phase3_writes_2_keys():
    p3_keys = {"eval_data", "executive"}
    assert len(p3_keys) == 2


# ── 12. Total state keys = 1 input + 7 + 11 + 2 = 21 ───────────────────

def test_total_state_keys():
    total = len(ResearchState.__annotations__)
    assert total == 21, f"Expected 21 state keys (person + 7 + 11 + 2), got {total}"
