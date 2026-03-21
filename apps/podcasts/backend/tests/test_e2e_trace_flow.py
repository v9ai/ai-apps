"""End-to-end tests for LangGraph pipeline tracing and evaluation flow.

Validates that:
- LangGraph graph compiles and can be invoked with mocked LLM
- deepeval tracing and metric wiring work with the LangGraph pipeline
- State flows correctly through all phases
"""

import json
import os

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from deepeval.tracing import trace
from deepeval.metrics import AnswerRelevancyMetric

from crew import build_graph, ResearchState

pytestmark = [pytest.mark.deepeval, pytest.mark.e2e]
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)


# ── 1. Graph can be compiled ────────────────────────────────────────────

def test_graph_compiles():
    """build_graph() should return a compiled graph without errors."""
    graph = build_graph()
    assert graph is not None


# ── 2. trace() works as a context manager wrapping a simple function ──

def test_trace_wraps_function():
    """trace() should work as a context manager around an arbitrary callable."""

    @trace(name="simple_addition")
    def add(a: int, b: int) -> int:
        return a + b

    result = add(3, 4)
    assert result == 7


# ── 3. trace() accepts trace_metrics kwarg ────────────────────────────

def test_trace_with_metrics():
    """trace() should accept a trace_metrics list containing deepeval metrics."""
    metric = AnswerRelevancyMetric(
        threshold=0.5,
        model="deepseek/deepseek-chat",
    )

    @trace(name="metric_trace", trace_metrics=[metric])
    def echo(text: str) -> str:
        return text

    result = echo("hello")
    assert result == "hello"


# ── 4. Graph structure is correct after build ────────────────────────────

def test_graph_structure():
    """Graph has 4 nodes and 5 edges after compilation."""
    graph = build_graph()
    g = graph.get_graph()

    node_names = set(g.nodes.keys()) - {"__start__", "__end__"}
    assert len(node_names) == 4

    edges = [(e.source, e.target) for e in g.edges]
    assert len(edges) == 5


# ── 5. Full flow with mocked LLM — graph invocation ─────────────────────

@pytest.mark.asyncio
async def test_full_flow_mocked(sample_person):
    """Full integration: build graph, invoke with mocked _run_agent."""
    mock_results = {
        "web_research": "Mock web research results",
        "github_data": "Mock GitHub data",
        "orcid_data": "(no academic record available)",
        "arxiv_data": "Mock arXiv data",
        "podcast_data": "[]",
        "news_data": "[]",
        "hf_data": "Mock HF data",
        "bio": "Harrison Chase is the CEO of LangChain.",
        "timeline": '[{"date": "2022-10", "event": "Founded LangChain", "url": "https://example.com"}]',
        "contributions": '[{"title": "LangChain", "description": "LLM framework", "url": "https://example.com"}]',
        "quotes": '[]',
        "social": '{"github": "https://github.com/hwchase17"}',
        "topics": '["LLM orchestration", "context engineering"]',
        "competitive": '{"market_position": "leader"}',
        "collaboration": '{"co_founders": ["Ankush Gola"]}',
        "funding": '{"total_raised": "$35M"}',
        "conference": '{"speaking_tier": "thought-leader"}',
        "philosophy": '{"core_thesis": "Context engineering matters most"}',
        "eval_data": '{"overall_score": 8, "summary": "Good quality"}',
        "executive": '{"one_liner": "Creator of LangChain"}',
    }

    call_count = 0

    async def mock_run_agent(llm, system_prompt, task, tools=None):
        nonlocal call_count
        call_count += 1
        return f"Mock agent output #{call_count}"

    with patch("crew._run_agent", side_effect=mock_run_agent), \
         patch("crew._make_llm", return_value=MagicMock()):
        graph = build_graph()
        result = await graph.ainvoke({"person": sample_person})

    # All phase 1 keys should be populated
    for key in ["web_research", "github_data", "orcid_data", "arxiv_data",
                "podcast_data", "news_data", "hf_data"]:
        assert key in result, f"Missing Phase 1 key: {key}"
        assert result[key], f"Phase 1 key '{key}' is empty"

    # All phase 2 keys should be populated
    for key in ["bio", "timeline", "contributions", "quotes", "social",
                "topics", "competitive", "collaboration", "funding",
                "conference", "philosophy"]:
        assert key in result, f"Missing Phase 2 key: {key}"
        assert result[key], f"Phase 2 key '{key}' is empty"

    # Phase 3 keys
    assert "eval_data" in result
    assert "executive" in result

    # Total agents: 7 (phase1) + 11 (phase2) + 1 (eval) + 1 (exec) = 20
    assert call_count == 20, f"Expected 20 agent calls, got {call_count}"
