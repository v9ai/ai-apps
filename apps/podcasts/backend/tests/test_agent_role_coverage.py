"""Tests that all agents are defined with proper prompts and tool assignments.

Validates agent callables, graph structure, and state key coverage without
running the LLM.  The pipeline uses plain Python functions (not LangChain
@tool decorators) wired via DeepSeek's FunctionTool system.
"""

import asyncio
import inspect

import pytest

from research_pipeline import (
    ResearchState,
    build_graph,
    phase1,
    phase1_5,
    phase2,
    phase3_eval,
    phase3_exec,
    question_generator,
    reresearch,
    web_search,
    web_news_search,
    fetch_url_content,
    fetch_github_profile,
    fetch_orcid_profile,
    search_arxiv,
    search_semantic_scholar,
    fetch_hf_author,
    TOOLS_SEARCH,
    TOOLS_NEWS,
    TOOLS_ACADEMIC,
    TOOLS_VIDEO,
)


SAMPLE_PERSON = {
    "slug": "jane-doe",
    "name": "Jane Doe",
    "role": "CEO",
    "org": "AcmeCorp",
    "github": "janedoe",
    "orcid": "0000-0001-2345-6789",
}


# ── 1. All tool functions are importable and callable ────────────────────


def test_all_tool_functions_importable():
    tools = [
        web_search, web_news_search, fetch_url_content,
        fetch_github_profile, fetch_orcid_profile,
        search_arxiv, search_semantic_scholar, fetch_hf_author,
    ]
    for fn in tools:
        assert fn is not None
        assert callable(fn), f"{fn.__name__} is not callable"


def test_all_tool_functions_have_docstrings():
    tools = [
        web_search, web_news_search, fetch_url_content,
        fetch_github_profile, fetch_orcid_profile,
        search_arxiv, search_semantic_scholar, fetch_hf_author,
    ]
    for fn in tools:
        assert fn.__doc__ and fn.__doc__.strip(), (
            f"Function '{fn.__name__}' has empty docstring"
        )


# ── 2. Phase functions are async callables ──────────────────────────────


def test_all_phase_functions_async():
    phase_fns = [phase1, phase1_5, phase2, phase3_eval, phase3_exec,
                 question_generator, reresearch]
    for fn in phase_fns:
        assert asyncio.iscoroutinefunction(fn), f"{fn.__name__} is not async"


# ── 3. Graph has the correct 7-node structure ────────────────────────────


def test_graph_7_nodes():
    graph = build_graph()
    nodes = set(graph.get_graph().nodes.keys()) - {"__start__", "__end__"}
    expected = {"phase1", "phase1_5", "phase2", "phase3_eval",
                "reresearch", "phase3_exec", "question_generator"}
    assert nodes == expected, f"Expected {expected}, got {nodes}"


# ── 4. ResearchState covers all output keys ──────────────────────────────


def test_state_covers_all_agent_outputs():
    # p1(8) + p1.5(2) + p2(11) + p3(3) + person(1) + reresearch_count(1) = 26
    assert len(ResearchState.__annotations__) == 26


# ── 5. Phase 1 output keys ──────────────────────────────────────────────


def test_phase1_key_names():
    expected = {"web_research", "github_data", "orcid_data", "arxiv_data",
                "podcast_data", "news_data", "hf_data", "video_data"}
    assert expected.issubset(set(ResearchState.__annotations__.keys()))
    assert len(expected) == 8


# ── 6. Phase 1.5 output keys ────────────────────────────────────────────


def test_phase1_5_key_names():
    expected = {"wikipedia_data", "deep_fetched_urls"}
    assert expected.issubset(set(ResearchState.__annotations__.keys()))


# ── 7. Phase 2 output keys ──────────────────────────────────────────────


def test_phase2_key_names():
    expected = {"bio", "timeline", "contributions", "quotes", "social",
                "topics", "competitive", "collaboration", "funding",
                "conference", "philosophy"}
    assert expected.issubset(set(ResearchState.__annotations__.keys()))
    assert len(expected) == 11


# ── 8. Phase 3 output keys ──────────────────────────────────────────────


def test_phase3_key_names():
    expected = {"eval_data", "executive", "questions"}
    assert expected.issubset(set(ResearchState.__annotations__.keys()))


# ── 9. Tool groups are non-empty lists ──────────────────────────────────


def test_tools_search_is_list():
    assert isinstance(TOOLS_SEARCH, list)
    assert len(TOOLS_SEARCH) >= 2


def test_tools_news_is_list():
    assert isinstance(TOOLS_NEWS, list)
    assert len(TOOLS_NEWS) >= 2


def test_tools_academic_is_list():
    assert isinstance(TOOLS_ACADEMIC, list)
    assert len(TOOLS_ACADEMIC) >= 2


def test_tools_video_is_list():
    assert isinstance(TOOLS_VIDEO, list)
    assert len(TOOLS_VIDEO) >= 2


# ── 10. Phase functions accept state dict as first argument ──────────────


def test_phase_function_signatures():
    for fn in [phase1, phase1_5, phase2, phase3_eval, phase3_exec,
               question_generator, reresearch]:
        sig = inspect.signature(fn)
        params = list(sig.parameters.keys())
        assert "state" in params, f"{fn.__name__} missing 'state' parameter"
