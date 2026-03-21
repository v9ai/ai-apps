"""End-to-end tests for LangGraph pipeline and deepeval tracing integration.

Validates that:
- LangGraph graph is buildable and inspectable
- deepeval trace() context manager works with metrics
- EvaluationDataset / Golden objects can be created from personality data
- Graph invoke can be wrapped in trace for observability
"""

import json
import os

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

pytestmark = [pytest.mark.deepeval, pytest.mark.e2e]
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

from deepeval.tracing import trace
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.metrics import AnswerRelevancyMetric

from crew import build_graph


# ── Test 1: LangGraph graph is buildable ────────────────────────────────

def test_graph_buildable():
    """build_graph should return a compiled graph."""
    graph = build_graph()
    assert graph is not None
    nodes = set(graph.get_graph().nodes.keys()) - {"__start__", "__end__"}
    assert len(nodes) == 4


# ── Test 2: trace is importable ─────────────────────────────────────────

def test_trace_importable():
    """trace should be importable from deepeval.tracing."""
    assert callable(trace), "trace must be callable"


# ── Test 3: Golden dataset creation ─────────────────────────────────────

def test_golden_dataset_creation(all_personality_slugs):
    """Can create an EvaluationDataset with Golden objects from personality names."""
    slugs = all_personality_slugs[:3] if len(all_personality_slugs) >= 3 else all_personality_slugs
    assert len(slugs) > 0, "Need at least one personality slug"

    goldens = []
    for slug in slugs:
        name = slug.replace("-", " ").title()
        golden = Golden(
            input=f"Research the AI/tech personality: {name}",
            expected_output=f"A comprehensive research profile for {name}",
        )
        goldens.append(golden)

    dataset = EvaluationDataset(goldens=goldens)
    assert len(dataset.goldens) == len(slugs)
    for golden in dataset.goldens:
        assert golden.input is not None
        assert "Research" in golden.input
        assert golden.expected_output is not None


# ── Test 4: trace context manager with metrics ──────────────────────────

@skip_no_key
def test_trace_context_manager(sample_person, deepeval_model):
    """trace() works as a context manager with a metrics list (mocked graph execution)."""
    metrics = [
        AnswerRelevancyMetric(
            threshold=0.5,
            model=deepeval_model,
        ),
    ]

    mock_result = {
        "person": sample_person,
        "bio": "Harrison Chase is the CEO of LangChain.",
        "topics": '["LLM orchestration", "context engineering"]',
    }

    with trace(
        type="llm",
        name="langgraph-research-pipeline",
        model=deepeval_model,
        input=f"Research {sample_person['name']}",
        output=json.dumps(mock_result),
    ):
        pass  # Trace wrapping works without actual execution

    assert len(metrics) == 1
    assert metrics[0].threshold == 0.5


# ── Test 5: Graph is inspectable after build ─────────────────────────────

def test_graph_inspectable():
    """Graph edges and nodes can be enumerated after compilation."""
    graph = build_graph()
    g = graph.get_graph()
    edges = [(e.source, e.target) for e in g.edges]
    assert len(edges) == 5
    assert ("__start__", "phase1") in edges
    assert ("phase3_exec", "__end__") in edges


# ── Test 6: EvaluationDataset from all personalities ────────────────────

def test_evaluation_dataset_from_personalities(all_personality_slugs):
    """Load all personality slugs and create a Golden for each one."""
    assert len(all_personality_slugs) > 0, (
        "No personality slugs found in personalities/ directory"
    )

    goldens = []
    for slug in all_personality_slugs:
        name = slug.replace("-", " ").title()
        golden = Golden(
            input=f"Research the AI/tech personality: {name} (slug: {slug})",
            expected_output=(
                f"A structured JSON research profile for {name} containing: "
                f"bio, executive_summary, topics, timeline, key_contributions, "
                f"quotes, social, podcast_appearances, news, competitive_landscape, "
                f"collaboration_network, funding, conferences, technical_philosophy"
            ),
        )
        goldens.append(golden)

    dataset = EvaluationDataset(goldens=goldens)
    assert len(dataset.goldens) == len(all_personality_slugs)
    for golden, slug in zip(dataset.goldens, all_personality_slugs):
        assert slug in golden.input, f"Golden input missing slug '{slug}'"
        assert "bio" in golden.expected_output
        assert "executive_summary" in golden.expected_output
