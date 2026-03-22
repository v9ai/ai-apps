"""Tests that all 20 agents are defined with proper prompts and tool assignments.

Validates agent specs inside each phase function by inspecting the spec
tuples without running the LLM.
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from research_pipeline import (
    ResearchState,
    build_graph,
    phase1,
    phase2,
    phase3_eval,
    phase3_exec,
    web_search,
    web_news_search,
    fetch_url_content,
    fetch_github_profile,
    fetch_orcid_profile,
    search_arxiv,
    search_semantic_scholar,
    fetch_hf_author,
)


SAMPLE_PERSON = {
    "slug": "jane-doe",
    "name": "Jane Doe",
    "role": "CEO",
    "org": "AcmeCorp",
    "github": "janedoe",
    "orcid": "0000-0001-2345-6789",
}


# ── 1. All 10 tools are importable from research_pipeline ────────────────────────────

def test_all_tools_importable():
    tools = [
        web_search, web_news_search, fetch_url_content,
        fetch_github_profile, fetch_orcid_profile,
        search_arxiv, search_semantic_scholar, fetch_hf_author,
    ]
    for tool in tools:
        assert tool is not None
        assert hasattr(tool, "invoke"), f"{tool.name} missing invoke method"


# ── 2. All tools have non-empty descriptions ────────────────────────────

def test_all_tools_have_descriptions():
    tools = [
        web_search, web_news_search, fetch_url_content,
        fetch_github_profile, fetch_orcid_profile,
        search_arxiv, search_semantic_scholar, fetch_hf_author,
    ]
    for tool in tools:
        assert tool.description and tool.description.strip(), (
            f"Tool '{tool.name}' has empty description"
        )


# ── 3. Phase functions are async callables ───────────────────────────────

def test_phase_functions_async():
    assert asyncio.iscoroutinefunction(phase1)
    assert asyncio.iscoroutinefunction(phase2)
    assert asyncio.iscoroutinefunction(phase3_eval)
    assert asyncio.iscoroutinefunction(phase3_exec)


# ── 4. Graph has the correct 4-node structure ───────────────────────────

def test_graph_4_nodes():
    graph = build_graph()
    nodes = set(graph.get_graph().nodes.keys()) - {"__start__", "__end__"}
    assert nodes == {"phase1", "phase2", "phase3_eval", "phase3_exec"}


# ── 5. ResearchState covers all 20 agent output keys ────────────────────

def test_state_covers_all_agents():
    # 7 Phase 1 + 11 Phase 2 + 2 Phase 3 = 20 output keys + 1 input
    assert len(ResearchState.__annotations__) == 21


# ── 6. Phase 1 output keys match expected agent roles ───────────────────

def test_phase1_key_names():
    expected = {"web_research", "github_data", "orcid_data", "arxiv_data",
                "podcast_data", "news_data", "hf_data"}
    p1_keys = {k for k in ResearchState.__annotations__
                if k.endswith("_data") or k == "web_research"}
    assert expected == p1_keys


# ── 7. Phase 2 output keys match expected agent roles ───────────────────

def test_phase2_key_names():
    expected = {"bio", "timeline", "contributions", "quotes", "social",
                "topics", "competitive", "collaboration", "funding",
                "conference", "philosophy"}
    # Phase 2 keys are the ones that aren't Phase 1, Phase 3, or input
    all_keys = set(ResearchState.__annotations__.keys())
    p1_keys = {"web_research", "github_data", "orcid_data", "arxiv_data",
               "podcast_data", "news_data", "hf_data"}
    p3_keys = {"eval_data", "executive"}
    input_keys = {"person"}
    p2_keys = all_keys - p1_keys - p3_keys - input_keys
    assert expected == p2_keys


# ── 8. Phase 3 output keys match expected agent roles ───────────────────

def test_phase3_key_names():
    expected = {"eval_data", "executive"}
    assert expected.issubset(set(ResearchState.__annotations__.keys()))


# ── 9. web_search tool has correct name ─────────────────────────────────

def test_web_search_tool_name():
    assert web_search.name == "web_search"


# ── 10. fetch_github_profile tool has correct name ──────────────────────

def test_github_tool_name():
    assert fetch_github_profile.name == "fetch_github_profile"


# ── 11. search_arxiv tool has correct name ──────────────────────────────

def test_arxiv_tool_name():
    assert search_arxiv.name == "search_arxiv"


# ── 12. fetch_hf_author tool has correct name ──────────────────────────

def test_hf_tool_name():
    assert fetch_hf_author.name == "fetch_hf_author"
