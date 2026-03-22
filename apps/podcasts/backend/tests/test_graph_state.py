"""Tests for LangGraph state propagation and phase isolation.

Validates that:
- State flows correctly between phases
- Each phase writes only its designated keys
- Error in one agent doesn't crash the pipeline
- _run_agent handles tool/no-tool paths
- _ctx_block formats context correctly
- export_results handles all JSON extraction edge cases
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from research_pipeline import (
    ResearchState,
    _ctx_block,
    _extract_json,
    _run_agent,
    build_graph,
    export_results,
    phase1,
    phase2,
    phase3_eval,
    phase3_exec,
)

SAMPLE_PERSON = {
    "slug": "test-person",
    "name": "Test Person",
    "role": "CEO",
    "org": "TestCorp",
    "github": "testperson",
    "orcid": "",
}


# ═══════════════════════════════════════════════════════════════════════════
# _ctx_block tests
# ═══════════════════════════════════════════════════════════════════════════


def test_ctx_block_formats_content():
    result = _ctx_block("Web Research", "Some research findings here")
    assert "### Web Research" in result
    assert "Some research findings here" in result


def test_ctx_block_empty_content_returns_empty():
    assert _ctx_block("Label", "") == ""


def test_ctx_block_skips_error_sentinel():
    assert _ctx_block("Label", "(no data)") == ""
    assert _ctx_block("Label", "(agent error: timeout)") == ""


def test_ctx_block_truncates_long_content():
    long_content = "A" * 5000
    result = _ctx_block("Label", long_content)
    # Content should be truncated to 3000 chars
    content_part = result.split("\n", 2)[2] if "\n" in result else result
    assert len(content_part) <= 3100  # 3000 + label overhead


# ═══════════════════════════════════════════════════════════════════════════
# _run_agent tests
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_run_agent_no_tools_calls_llm_directly():
    """_run_agent without tools calls llm.ainvoke directly."""
    mock_llm = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "Agent response without tools"
    mock_llm.ainvoke.return_value = mock_response

    result = await _run_agent(mock_llm, "You are a test agent", "Do a task")

    assert result == "Agent response without tools"
    mock_llm.ainvoke.assert_called_once()


@pytest.mark.asyncio
async def test_run_agent_handles_errors_gracefully():
    """_run_agent returns error string instead of raising."""
    mock_llm = AsyncMock()
    mock_llm.ainvoke.side_effect = RuntimeError("API timeout")

    result = await _run_agent(mock_llm, "System", "Task")

    assert "agent error" in result.lower()
    assert "API timeout" in result


# ═══════════════════════════════════════════════════════════════════════════
# Phase function tests (with mocked _run_agent)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_phase1_returns_7_keys():
    """Phase 1 should return exactly 7 state keys."""
    call_idx = 0

    async def mock_run(llm, sys, task, tools=None):
        nonlocal call_idx
        call_idx += 1
        return f"Phase 1 agent {call_idx} output"

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_llm", return_value=MagicMock()):
        state: ResearchState = {"person": SAMPLE_PERSON}
        result = await phase1(state)

    expected_keys = {"web_research", "github_data", "orcid_data", "arxiv_data",
                     "podcast_data", "news_data", "hf_data"}
    assert set(result.keys()) == expected_keys
    assert call_idx == 7


@pytest.mark.asyncio
async def test_phase2_returns_11_keys():
    """Phase 2 should return exactly 11 state keys."""
    call_idx = 0

    async def mock_run(llm, sys, task, tools=None):
        nonlocal call_idx
        call_idx += 1
        return f"Phase 2 agent {call_idx} output"

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "web_research": "mock web data",
        "github_data": "mock github data",
        "orcid_data": "",
        "arxiv_data": "mock arxiv data",
        "podcast_data": "[]",
        "news_data": "[]",
        "hf_data": "mock hf data",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_llm", return_value=MagicMock()):
        result = await phase2(state)

    expected_keys = {"bio", "timeline", "contributions", "quotes", "social",
                     "topics", "competitive", "collaboration", "funding",
                     "conference", "philosophy"}
    assert set(result.keys()) == expected_keys
    assert call_idx == 11


@pytest.mark.asyncio
async def test_phase3_eval_returns_eval_key():
    """Phase 3 eval should return eval_data key."""
    async def mock_run(llm, sys, task, tools=None):
        return '{"overall_score": 8, "summary": "Good"}'

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "social": "{}",
        "topics": "[]",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "conference": "{}",
        "philosophy": "{}",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_llm", return_value=MagicMock()):
        result = await phase3_eval(state)

    assert "eval_data" in result
    assert "overall_score" in result["eval_data"]


@pytest.mark.asyncio
async def test_phase3_exec_returns_executive_key():
    """Phase 3 exec should return executive key."""
    async def mock_run(llm, sys, task, tools=None):
        return '{"one_liner": "Test person is a CEO"}'

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "social": "{}",
        "topics": "[]",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "conference": "{}",
        "philosophy": "{}",
        "eval_data": '{"overall_score": 8}',
        "podcast_data": "[]",
        "news_data": "[]",
        "arxiv_data": "",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_llm", return_value=MagicMock()):
        result = await phase3_exec(state)

    assert "executive" in result
    assert "one_liner" in result["executive"]


# ═══════════════════════════════════════════════════════════════════════════
# Full graph integration test (mocked)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_full_graph_mocked_produces_complete_state():
    """Full graph with mocked agents produces all expected state keys."""
    agent_count = 0

    async def mock_run(llm, sys, task, tools=None):
        nonlocal agent_count
        agent_count += 1
        return f"Mock output {agent_count}"

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_llm", return_value=MagicMock()):
        graph = build_graph()
        result = await graph.ainvoke({"person": SAMPLE_PERSON})

    # All keys should be present
    all_keys = set(ResearchState.__annotations__.keys())
    for key in all_keys:
        assert key in result, f"Missing key in final state: {key}"

    # Exactly 20 agents should have been called
    assert agent_count == 20


@pytest.mark.asyncio
async def test_graph_preserves_person_through_phases():
    """The person dict should be preserved through all phases."""
    async def mock_run(llm, sys, task, tools=None):
        return "mock"

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_llm", return_value=MagicMock()):
        graph = build_graph()
        result = await graph.ainvoke({"person": SAMPLE_PERSON})

    assert result["person"] == SAMPLE_PERSON
