"""Tests for build_graph — validates LangGraph graph structure without running it.

Checks node count, edge connectivity, state schema, and structural invariants.
No API key or network calls needed.
"""

import pytest
from langgraph.graph import StateGraph

from research_pipeline import build_graph, ResearchState, phase1, phase1_5, phase2, phase3_eval, phase3_exec, reresearch


@pytest.fixture
def graph():
    return build_graph()


# ── 1. build_graph returns a compiled graph ─────────────────────────────

def test_build_graph_returns_compiled_graph(graph):
    assert graph is not None


# ── 2. Graph has exactly 6 nodes ────────────────────────────────────────

def test_graph_has_6_nodes(graph):
    node_names = set(graph.get_graph().nodes.keys()) - {"__start__", "__end__"}
    assert len(node_names) == 6, f"Expected 6 nodes, got {node_names}"


# ── 3. Graph nodes are named correctly ──────────────────────────────────

def test_graph_node_names(graph):
    node_names = set(graph.get_graph().nodes.keys()) - {"__start__", "__end__"}
    expected = {"phase1", "phase1_5", "phase2", "phase3_eval", "reresearch", "phase3_exec"}
    assert node_names == expected, f"Expected {expected}, got {node_names}"


# ── 4. Graph edges enforce sequential phases ────────────────────────────

def test_graph_edges_sequential(graph):
    g = graph.get_graph()
    edges = [(e.source, e.target) for e in g.edges]
    assert ("__start__", "phase1") in edges
    assert ("phase1", "phase1_5") in edges
    assert ("phase1_5", "phase2") in edges
    assert ("phase2", "phase3_eval") in edges
    assert ("phase3_eval", "phase3_exec") in edges
    assert ("phase3_eval", "reresearch") in edges
    assert ("reresearch", "phase3_eval") in edges
    assert ("phase3_exec", "__end__") in edges


# ── 5. Graph has exactly 8 edges ────────────────────────────────────────

def test_graph_edge_count(graph):
    g = graph.get_graph()
    assert len(g.edges) == 8, f"Expected 8 edges, got {len(g.edges)}"


# ── 6. ResearchState has all expected keys ──────────────────────────────

def test_research_state_schema():
    expected_keys = {
        "person",
        # Phase 1
        "web_research", "github_data", "orcid_data", "arxiv_data",
        "podcast_data", "news_data", "hf_data", "video_data",
        # Phase 1.5
        "wikipedia_data", "deep_fetched_urls",
        # Phase 2
        "bio", "timeline", "contributions", "quotes", "social",
        "topics", "competitive", "collaboration", "funding",
        "conference", "philosophy",
        # Phase 3
        "eval_data", "executive",
        # Re-research
        "reresearch_count",
    }
    actual_keys = set(ResearchState.__annotations__.keys())
    assert expected_keys == actual_keys, (
        f"Missing: {expected_keys - actual_keys}, Extra: {actual_keys - expected_keys}"
    )


# ── 7. Phase 1 state keys (8 output keys) ──────────────────────────────

def test_phase1_output_keys():
    p1_keys = {"web_research", "github_data", "orcid_data", "arxiv_data",
               "podcast_data", "news_data", "hf_data", "video_data"}
    state_keys = set(ResearchState.__annotations__.keys())
    assert p1_keys.issubset(state_keys)


# ── 8. Phase 1.5 state keys (2 output keys) ─────────────────────────────

def test_phase1_5_output_keys():
    p15_keys = {"wikipedia_data", "deep_fetched_urls"}
    state_keys = set(ResearchState.__annotations__.keys())
    assert p15_keys.issubset(state_keys)


# ── 9. Phase 2 state keys (11 output keys) ─────────────────────────────

def test_phase2_output_keys():
    p2_keys = {"bio", "timeline", "contributions", "quotes", "social",
               "topics", "competitive", "collaboration", "funding",
               "conference", "philosophy"}
    state_keys = set(ResearchState.__annotations__.keys())
    assert p2_keys.issubset(state_keys)


# ── 10. Phase 3 state keys (2 output keys) ─────────────────────────────

def test_phase3_output_keys():
    p3_keys = {"eval_data", "executive"}
    state_keys = set(ResearchState.__annotations__.keys())
    assert p3_keys.issubset(state_keys)


# ── 11. build_graph is deterministic ────────────────────────────────────

def test_build_graph_deterministic():
    g1 = build_graph()
    g2 = build_graph()
    nodes1 = set(g1.get_graph().nodes.keys())
    nodes2 = set(g2.get_graph().nodes.keys())
    assert nodes1 == nodes2


# ── 12. Phase functions are async ───────────────────────────────────────

def test_phase_functions_are_async():
    import asyncio
    assert asyncio.iscoroutinefunction(phase1)
    assert asyncio.iscoroutinefunction(phase1_5)
    assert asyncio.iscoroutinefunction(phase2)
    assert asyncio.iscoroutinefunction(phase3_eval)
    assert asyncio.iscoroutinefunction(phase3_exec)
    assert asyncio.iscoroutinefunction(reresearch)


# ── 13. Graph can be built multiple times without side effects ──────────

def test_build_graph_no_side_effects():
    graphs = [build_graph() for _ in range(3)]
    for g in graphs:
        node_names = set(g.get_graph().nodes.keys()) - {"__start__", "__end__"}
        assert len(node_names) == 6
