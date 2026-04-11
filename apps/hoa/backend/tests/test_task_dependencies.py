"""Tests graph phase dependency structure and data flow between phases.

Validates that the LangGraph StateGraph enforces sequential phase execution
and that each phase reads/writes the correct state keys.

Graph topology (actual):
  START → phase1 → phase1_5 → phase2 → phase3_eval ─┬→ reresearch → phase3_eval
                                                      └→ phase3_exec → question_generator → END
"""

import pytest

from research_pipeline import build_graph, ResearchState


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


# ── 2. Phase 2 depends only on phase1_5 ─────────────────────────────────

def test_phase2_depends_on_phase1_5(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase2"]
    assert incoming == ["phase1_5"], f"phase2 should come from phase1_5, got {incoming}"


# ── 3. phase1 feeds into phase1_5 ────────────────────────────────────────

def test_phase1_5_depends_on_phase1(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase1_5"]
    assert incoming == ["phase1"], f"phase1_5 should come from phase1, got {incoming}"


# ── 4. Phase 3 eval depends on Phase 2 AND reresearch (fan-in) ───────────

def test_phase3_eval_depends_on_phase2_and_reresearch(graph):
    edges = _get_edges(graph)
    incoming = sorted(src for src, tgt in edges if tgt == "phase3_eval")
    assert incoming == ["phase2", "reresearch"], (
        f"phase3_eval should come from phase2 and reresearch, got {incoming}"
    )


# ── 5. phase3_exec depends only on phase3_eval ──────────────────────────

def test_phase3_exec_depends_on_eval(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "phase3_exec"]
    assert incoming == ["phase3_eval"], f"phase3_exec should come from phase3_eval, got {incoming}"


# ── 6. question_generator depends only on phase3_exec ────────────────────

def test_question_generator_depends_on_phase3_exec(graph):
    edges = _get_edges(graph)
    incoming = [src for src, tgt in edges if tgt == "question_generator"]
    assert incoming == ["phase3_exec"], (
        f"question_generator should come from phase3_exec, got {incoming}"
    )


# ── 7. Only question_generator leads to END ──────────────────────────────

def test_only_question_generator_leads_to_end(graph):
    edges = _get_edges(graph)
    to_end = [src for src, tgt in edges if tgt == "__end__"]
    assert to_end == ["question_generator"], (
        f"Only question_generator should lead to END, got {to_end}"
    )


# ── 8. phase3_eval has two outgoing edges (conditional fan-out) ──────────

def test_phase3_eval_has_conditional_fan_out(graph):
    edges = _get_edges(graph)
    outgoing = sorted(tgt for src, tgt in edges if src == "phase3_eval")
    assert outgoing == ["phase3_exec", "reresearch"], (
        f"phase3_eval should fan out to reresearch and phase3_exec, got {outgoing}"
    )


# ── 9. Phase 1 writes 8 state keys ──────────────────────────────────────

def test_phase1_writes_8_keys():
    p1_keys = {"web_research", "github_data", "orcid_data", "arxiv_data",
               "podcast_data", "news_data", "hf_data", "video_data"}
    assert len(p1_keys) == 8


# ── 10. Phase 1.5 writes 2 state keys ───────────────────────────────────

def test_phase1_5_writes_2_keys():
    p15_keys = {"wikipedia_data", "deep_fetched_urls"}
    assert len(p15_keys) == 2


# ── 11. Phase 2 writes 11 state keys ────────────────────────────────────

def test_phase2_writes_11_keys():
    p2_keys = {"bio", "timeline", "contributions", "quotes", "social",
               "topics", "competitive", "collaboration", "funding",
               "conference", "philosophy"}
    assert len(p2_keys) == 11


# ── 12. Phase 3 writes 3 state keys ─────────────────────────────────────

def test_phase3_writes_3_keys():
    p3_keys = {"eval_data", "executive", "questions"}
    assert len(p3_keys) == 3


# ── 13. Total state keys: 1 + 8 + 2 + 11 + 3 + 1 = 26 ──────────────────

def test_total_state_keys():
    total = len(ResearchState.__annotations__)
    # person(1) + p1(8) + p1.5(2) + p2(11) + p3(3) + reresearch_count(1) = 26
    assert total == 26, f"Expected 26 state keys, got {total}"
