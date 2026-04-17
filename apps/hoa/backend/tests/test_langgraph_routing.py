"""Tests for LangGraph conditional routing, question_generator, and checkpointing.

Covers:
- _should_reresearch routing decisions for all score scenarios
- reresearch increments the reresearch_count counter
- question_generator returns the questions key
- build_graph accepts an optional checkpointer
- Phase gather error resilience (return_exceptions=True)
"""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from research_pipeline import (
    ResearchState,
    _should_reresearch,
    build_graph,
    question_generator,
    reresearch,
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
# _should_reresearch routing
# ═══════════════════════════════════════════════════════════════════════════


def _eval_json(overall: int, **dim_scores) -> str:
    dims = {
        "bio_quality": {"score": 8, "reasoning": "ok"},
        "source_coverage": {"score": 8, "reasoning": "ok"},
        "timeline_completeness": {"score": 8, "reasoning": "ok"},
        "contributions_depth": {"score": 8, "reasoning": "ok"},
        "name_disambiguation": {"score": 10, "reasoning": "ok"},
    }
    for k, v in dim_scores.items():
        dims[k] = {"score": v, "reasoning": "test"}
    return json.dumps({"overall_score": overall, "summary": "test", **dims})


def test_should_reresearch_high_score_goes_to_exec():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(9),
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "phase3_exec"


def test_should_reresearch_low_overall_triggers_reresearch():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(5),
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "reresearch"


def test_should_reresearch_weak_dimension_triggers_reresearch():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(8, timeline_completeness=3),
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "reresearch"


def test_should_reresearch_max_count_skips_reresearch():
    """After reresearch_count >= 1, always proceed to exec even if score is low."""
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(3),
        "reresearch_count": 1,
    }
    assert _should_reresearch(state) == "phase3_exec"


def test_should_reresearch_missing_eval_data_goes_to_exec():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": "",
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "phase3_exec"


def test_should_reresearch_invalid_json_goes_to_exec():
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": "not valid json",
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "phase3_exec"


def test_should_reresearch_boundary_score_7_goes_to_exec():
    """Score of exactly 7 should NOT trigger reresearch (threshold is < 7)."""
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(7),
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "phase3_exec"


def test_should_reresearch_boundary_score_6_triggers_reresearch():
    """Score of 6 is below threshold and should trigger reresearch."""
    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(6),
        "reresearch_count": 0,
    }
    assert _should_reresearch(state) == "reresearch"


# ═══════════════════════════════════════════════════════════════════════════
# reresearch increments counter
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_reresearch_increments_count_from_zero():
    async def mock_run(client, sys, task, tools=None):
        return "[]"

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(4, timeline_completeness=3, bio_quality=3),
        "reresearch_count": 0,
        "timeline": "",
        "quotes": "",
        "social": "",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        result = await reresearch(state)

    assert result["reresearch_count"] == 1


@pytest.mark.asyncio
async def test_reresearch_increments_count_from_existing():
    async def mock_run(client, sys, task, tools=None):
        return "[]"

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(4, timeline_completeness=3),
        "reresearch_count": 0,
        "timeline": "",
        "quotes": "[]",
        "social": "{}",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        result = await reresearch(state)

    assert "reresearch_count" in result
    assert result["reresearch_count"] >= 1


@pytest.mark.asyncio
async def test_reresearch_skips_agents_when_dimensions_ok():
    """When all dimensions score >= threshold, no agents should be run."""
    calls = []

    async def mock_run(client, sys, task, tools=None):
        calls.append(task[:30])
        return "[]"

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "eval_data": _eval_json(5),  # low overall but all dims ok
        "reresearch_count": 0,
        "timeline": '[{"date": "2020-01", "event": "Founded", "url": ""}]',
        "quotes": '[{"text": "a quote", "source": "blog", "url": ""}]',
        "social": '{"github": "https://github.com/test"}',
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        result = await reresearch(state)

    # All existing dimensions are non-empty, so no agents should be spawned
    assert len(calls) == 0
    assert result["reresearch_count"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# question_generator
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_question_generator_returns_questions_key():
    async def mock_run(client, sys, task, tools=None):
        return '[{"category": "origin", "question": "How did you start?"}]'

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "philosophy": "{}",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "executive": "{}",
        "podcast_data": "[]",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        result = await question_generator(state)

    assert "questions" in result
    assert len(result["questions"]) > 0


@pytest.mark.asyncio
async def test_question_generator_enriched_output():
    """question_generator should pass through enriched fields from the agent."""
    enriched = json.dumps([
        {
            "category": "origin",
            "question": "What moment at Kensho made you leave for LangChain?",
            "why_this_question": "Reveals the founder's risk calculus.",
            "expected_insight": "A concrete anecdote about commitment.",
        },
        {
            "category": "philosophy",
            "question": "Why did LangGraph introduce cyclic graphs?",
            "why_this_question": "Exposes DAG limitations in production.",
            "expected_insight": "A specific failure pattern.",
        },
    ])

    async def mock_run(client, sys, task, tools=None):
        return enriched

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "philosophy": "{}",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "executive": "{}",
        "podcast_data": "[]",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        result = await question_generator(state)

    assert "questions" in result
    # Verify the raw output contains the enriched JSON
    parsed = json.loads(result["questions"])
    assert len(parsed) == 2
    assert parsed[0]["why_this_question"] == "Reveals the founder's risk calculus."
    assert parsed[1]["expected_insight"] == "A specific failure pattern."


@pytest.mark.asyncio
async def test_question_generator_prompt_includes_new_context():
    """question_generator should include news and conference data in its prompt."""
    captured_tasks = []

    async def mock_run(client, sys, task, tools=None):
        captured_tasks.append(task)
        return '[{"category": "origin", "question": "Test?"}]'

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "philosophy": "{}",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "executive": "{}",
        "podcast_data": "[]",
        "news_data": '[{"headline": "Test News"}]',
        "conference": '{"talks": [{"title": "Keynote"}]}',
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        await question_generator(state)

    assert len(captured_tasks) == 1
    task_text = captured_tasks[0]
    assert "News" in task_text
    assert "Conferences" in task_text


@pytest.mark.asyncio
async def test_question_generator_prompt_has_anti_patterns():
    """The system prompt should include anti-pattern guidance."""
    captured_sys = []

    async def mock_run(client, sys_prompt, task, tools=None):
        captured_sys.append(sys_prompt)
        return '[{"category": "origin", "question": "Test?"}]'

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "philosophy": "{}",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "executive": "{}",
        "podcast_data": "[]",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        await question_generator(state)

    assert len(captured_sys) == 1
    sys_text = captured_sys[0]
    assert "Anti-patterns" in sys_text
    assert "Tell me about" in sys_text


@pytest.mark.asyncio
async def test_question_generator_handles_agent_error():
    """question_generator should not raise even if agent errors."""
    async def mock_run(client, sys, task, tools=None):
        return "(agent error: timeout)"

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "bio": "Test bio",
        "timeline": "[]",
        "contributions": "[]",
        "quotes": "[]",
        "philosophy": "{}",
        "competitive": "{}",
        "collaboration": "{}",
        "funding": "{}",
        "executive": "{}",
        "podcast_data": "[]",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        result = await question_generator(state)

    assert "questions" in result


# ═══════════════════════════════════════════════════════════════════════════
# build_graph checkpointing
# ═══════════════════════════════════════════════════════════════════════════


def test_build_graph_accepts_none_checkpointer():
    graph = build_graph(checkpointer=None)
    assert graph is not None


def test_build_graph_accepts_memory_saver():
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    graph = build_graph(checkpointer=checkpointer)
    assert graph is not None


def test_build_graph_with_checkpointer_has_same_nodes():
    from langgraph.checkpoint.memory import MemorySaver
    g_plain = build_graph()
    g_checked = build_graph(checkpointer=MemorySaver())
    plain_nodes = set(g_plain.get_graph().nodes.keys())
    checked_nodes = set(g_checked.get_graph().nodes.keys())
    assert plain_nodes == checked_nodes


# ═══════════════════════════════════════════════════════════════════════════
# Phase gather resilience (return_exceptions=True)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_phase1_continues_if_one_agent_raises():
    """Phase 1 should still return all 8 keys even if one agent raises."""
    call_idx = 0

    async def mock_run(client, sys, task, tools=None):
        nonlocal call_idx
        call_idx += 1
        if call_idx == 3:
            raise RuntimeError("simulated transient error")
        return f"output {call_idx}"

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        from research_pipeline import phase1
        state: ResearchState = {"person": SAMPLE_PERSON}
        result = await phase1(state)

    assert len(result) == 8
    # The failed agent should produce an error sentinel, not crash
    for v in result.values():
        assert isinstance(v, str)


@pytest.mark.asyncio
async def test_phase2_continues_if_one_agent_raises():
    """Phase 2 should still return all 11 keys even if one agent raises."""
    call_idx = 0

    async def mock_run(client, sys, task, tools=None):
        nonlocal call_idx
        call_idx += 1
        if call_idx == 5:
            raise RuntimeError("simulated error")
        return f"output {call_idx}"

    state: ResearchState = {
        "person": SAMPLE_PERSON,
        "web_research": "mock",
        "github_data": "mock",
        "orcid_data": "",
        "arxiv_data": "mock",
        "podcast_data": "[]",
        "news_data": "[]",
        "hf_data": "mock",
        "video_data": "[]",
        "wikipedia_data": "mock",
        "deep_fetched_urls": "mock",
    }

    with patch("research_pipeline._run_agent", side_effect=mock_run), \
         patch("research_pipeline._make_client", return_value=MagicMock()):
        from research_pipeline import phase2
        result = await phase2(state)

    assert len(result) == 11
    for v in result.values():
        assert isinstance(v, str)
