"""Smoke tests to verify the test environment is correctly configured.

These are zero-dependency tests that confirm:
- conftest fixtures are wired up
- key packages (crew, deepeval, langgraph, langchain) are importable
- the test suite has sufficient coverage files
"""

from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent


def test_conftest_fixtures_available(sample_research):
    """sample_research fixture returns a dict with expected keys."""
    assert isinstance(sample_research, dict)
    assert "slug" in sample_research
    assert "name" in sample_research
    assert "bio" in sample_research


def test_crew_importable():
    """Can import build_graph and _extract_json from the crew module."""
    from crew import build_graph, _extract_json  # noqa: F401

    assert callable(build_graph)
    assert callable(_extract_json)


def test_deepeval_importable():
    """Can import deepeval.metrics — the evaluation library is installed."""
    import deepeval.metrics  # noqa: F401

    # Spot-check that at least one well-known metric class exists
    assert hasattr(deepeval.metrics, "AnswerRelevancyMetric")


def test_langgraph_importable():
    """Can import langgraph.graph — the orchestration library is installed."""
    from langgraph.graph import StateGraph, START, END  # noqa: F401

    assert callable(StateGraph)


def test_langchain_importable():
    """Can import langchain_openai and langchain_core — the LLM library is installed."""
    from langchain_openai import ChatOpenAI  # noqa: F401
    from langchain_core.tools import tool  # noqa: F401

    assert callable(ChatOpenAI)


def test_test_directory_has_files():
    """tests/ directory contains more than 10 test files."""
    test_files = sorted(TESTS_DIR.glob("test_*.py"))
    assert len(test_files) > 10, (
        f"Expected >10 test files in {TESTS_DIR}, found {len(test_files)}: "
        f"{[f.name for f in test_files]}"
    )
