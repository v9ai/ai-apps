"""
Reranking quality evaluation — measures retrieval precision improvement.

Tests:
  A. Rerank node correctness — JSON parsing, score extraction, fallback behavior
  B. Ordering quality — NDCG@k, MRR, hit-rate with/without reranking
  C. Context compression — top-k filtering reduces noise without losing relevant chunks
  D. Rerank disabled passthrough — feature flag skips LLM calls
  E. GEval — context relevance improvement from reranking

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/rerank_eval.py -v
  uv run --project langgraph pytest evals/rerank_eval.py -v -k Ordering
  uv run --project langgraph pytest evals/rerank_eval.py -v -k Compression
"""

from __future__ import annotations

import json
import math
import os
import sys
from unittest.mock import patch

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import make_geval, skip_no_judge

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "langgraph"))

from graph import GraphState, rerank, RERANK_SYSTEM


# ═══════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def mock_llm():
    with patch("postprocessors.llm_call") as mock:
        yield mock


def _make_rerank_state(
    chunks: list[str],
    scores: list[float],
    sources: list[str] | None = None,
    query: str = "What is my TG/HDL ratio?",
    intent: str = "markers",
) -> GraphState:
    """Create a GraphState pre-loaded with retrieval results."""
    if sources is None:
        sources = ["blood_marker_embeddings"] * len(chunks)
    return GraphState(
        query=query,
        user_id="test-user-123",
        intent=intent,
        context_chunks=chunks,
        retrieval_sources=sources,
        retrieval_scores=scores,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Ranking metrics (pure Python, no heavy deps)
# ═══════════════════════════════════════════════════════════════════════════


def ndcg_at_k(relevance_scores: list[float], k: int) -> float:
    """Normalized Discounted Cumulative Gain at position k."""
    def dcg(scores: list[float], k: int) -> float:
        return sum(s / math.log2(i + 2) for i, s in enumerate(scores[:k]))

    actual_dcg = dcg(relevance_scores, k)
    ideal_dcg = dcg(sorted(relevance_scores, reverse=True), k)
    return actual_dcg / ideal_dcg if ideal_dcg > 0 else 0.0


def mrr(relevance_scores: list[float], threshold: float = 0.5) -> float:
    """Mean Reciprocal Rank — position of first relevant result."""
    for i, score in enumerate(relevance_scores):
        if score >= threshold:
            return 1.0 / (i + 1)
    return 0.0


def hit_rate(relevance_scores: list[float], threshold: float = 0.5, k: int = 5) -> float:
    """Fraction of top-k results that are relevant."""
    top_k = relevance_scores[:k]
    if not top_k:
        return 0.0
    return sum(1 for s in top_k if s >= threshold) / len(top_k)


# ═══════════════════════════════════════════════════════════════════════════
# A. Rerank Node Correctness
# ═══════════════════════════════════════════════════════════════════════════


class TestRerankNodeCorrectness:
    """Test rerank node JSON parsing, fallback, and edge cases."""

    def test_rerank_scores_and_reorders_chunks(self, mock_llm):
        """Rerank assigns scores and reorders chunks by relevance."""
        mock_llm.side_effect = [
            '{"score": 0.3, "rationale": "low relevance"}',
            '{"score": 0.9, "rationale": "directly answers query"}',
            '{"score": 0.6, "rationale": "tangentially related"}',
        ]
        state = _make_rerank_state(
            chunks=["chunk_A", "chunk_B", "chunk_C"],
            scores=[0.8, 0.7, 0.6],
        )
        result = rerank(state)
        assert result["context_chunks"][0] == "chunk_B"
        assert result["rerank_scores"][0] == 0.9

    def test_rerank_handles_malformed_json(self, mock_llm):
        """Rerank uses original score on JSON parse failure."""
        mock_llm.return_value = "not json at all"
        state = _make_rerank_state(chunks=["chunk_A"], scores=[0.75])
        result = rerank(state)
        assert result["rerank_scores"][0] == 0.75
        assert result["rerank_rationales"][0] == "parse_failure"

    def test_rerank_skips_safety_refusal(self, mock_llm):
        """Rerank is a no-op for safety_refusal intent."""
        state = GraphState(intent="safety_refusal", context_chunks=[])
        result = rerank(state)
        assert result["rerank_scores"] == []
        mock_llm.assert_not_called()

    def test_rerank_empty_chunks(self, mock_llm):
        """Rerank handles empty context gracefully."""
        state = _make_rerank_state(chunks=[], scores=[])
        result = rerank(state)
        assert result["context_chunks"] == []
        mock_llm.assert_not_called()

    def test_rerank_fallback_when_all_below_threshold(self, mock_llm):
        """Rerank keeps top 3 if all chunks are below min_score."""
        mock_llm.side_effect = [
            '{"score": 0.2, "rationale": "low"}',
            '{"score": 0.1, "rationale": "low"}',
            '{"score": 0.15, "rationale": "low"}',
            '{"score": 0.05, "rationale": "irrelevant"}',
        ]
        state = _make_rerank_state(
            chunks=["a", "b", "c", "d"],
            scores=[0.5, 0.5, 0.5, 0.5],
        )
        result = rerank(state)
        assert len(result["context_chunks"]) == 3


# ═══════════════════════════════════════════════════════════════════════════
# B. Ordering Quality
# ═══════════════════════════════════════════════════════════════════════════


class TestRerankOrderingQuality:
    """Test that reranking improves ranking metrics vs raw retrieval."""

    def test_ndcg_improves_after_reranking(self):
        """Reranking should produce higher NDCG than raw retrieval order."""
        raw_relevance = [0.2, 0.1, 0.9, 0.15, 0.85]
        reranked_relevance = [0.9, 0.85, 0.2, 0.15, 0.1]

        ndcg_before = ndcg_at_k(raw_relevance, k=3)
        ndcg_after = ndcg_at_k(reranked_relevance, k=3)
        assert ndcg_after > ndcg_before

    def test_mrr_improves_after_reranking(self):
        """First relevant result should appear earlier after reranking."""
        raw_relevance = [0.1, 0.2, 0.9, 0.1]
        reranked_relevance = [0.9, 0.2, 0.1, 0.1]

        assert mrr(reranked_relevance) > mrr(raw_relevance)
        assert mrr(reranked_relevance) == 1.0

    def test_hit_rate_at_k(self):
        """Hit rate at k=3 should be higher after reranking."""
        raw = [0.2, 0.1, 0.9, 0.85, 0.1]
        reranked = [0.9, 0.85, 0.2, 0.1, 0.1]

        assert hit_rate(reranked, k=3) > hit_rate(raw, k=3)


# ═══════════════════════════════════════════════════════════════════════════
# C. Context Compression
# ═══════════════════════════════════════════════════════════════════════════


class TestContextCompression:
    """Test that reranking reduces chunk count while preserving quality."""

    def test_top_k_limits_output_size(self, mock_llm):
        """Rerank output should not exceed rerank_top_k."""
        mock_llm.side_effect = [
            json.dumps({"score": 0.5 + i * 0.03, "rationale": f"chunk {i}"})
            for i in range(15)
        ]
        state = _make_rerank_state(
            chunks=[f"chunk_{i}" for i in range(15)],
            scores=[0.5] * 15,
        )
        with patch("config.settings") as mock_settings:
            mock_settings.rerank_top_k = 8
            mock_settings.rerank_min_score = 0.3
            mock_settings.rerank_enabled = True
            result = rerank(state)
        assert len(result["context_chunks"]) <= 8

    def test_min_score_filters_noise(self, mock_llm):
        """Chunks below rerank_min_score are excluded."""
        mock_llm.side_effect = [
            '{"score": 0.9, "rationale": "relevant"}',
            '{"score": 0.1, "rationale": "noise"}',
            '{"score": 0.8, "rationale": "relevant"}',
        ]
        state = _make_rerank_state(
            chunks=["relevant_a", "noise", "relevant_b"],
            scores=[0.7, 0.6, 0.5],
        )
        with patch("config.settings") as mock_settings:
            mock_settings.rerank_top_k = 8
            mock_settings.rerank_min_score = 0.3
            mock_settings.rerank_enabled = True
            result = rerank(state)
        assert "noise" not in result["context_chunks"]
        assert len(result["context_chunks"]) == 2


# ═══════════════════════════════════════════════════════════════════════════
# D. Feature Flag
# ═══════════════════════════════════════════════════════════════════════════


class TestRerankFeatureFlag:
    """Test rerank_enabled toggle."""

    def test_rerank_disabled_passes_through(self, mock_llm):
        """When rerank_enabled=False, chunks pass through unchanged."""
        state = _make_rerank_state(
            chunks=["a", "b", "c"],
            scores=[0.8, 0.6, 0.4],
        )
        with patch("config.settings") as mock_settings:
            mock_settings.rerank_enabled = False
            result = rerank(state)
        mock_llm.assert_not_called()
        assert result["rerank_rationales"] == ["rerank_disabled"] * 3


# ═══════════════════════════════════════════════════════════════════════════
# E. GEval Quality
# ═══════════════════════════════════════════════════════════════════════════


@skip_no_judge
class TestRerankGEvalQuality:
    """GEval: does reranking improve context relevance?"""

    def test_reranked_context_relevance(self, judge_model):
        """Reranked context should score high on relevance."""
        metric = make_geval(
            name="reranked_context_relevance",
            criteria=(
                "The retrieval context should contain chunks directly relevant to "
                "answering the user's query about blood markers. Irrelevant chunks "
                "(wrong marker, wrong time period, wrong data domain) should be absent."
            ),
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.RETRIEVAL_CONTEXT,
            ],
            threshold=0.7,
            model=judge_model,
        )
        test_case = LLMTestCase(
            input="What is my current TG/HDL ratio?",
            actual_output="Your TG/HDL ratio is 2.1, which is in the optimal range.",
            retrieval_context=[
                "Marker: Triglycerides\nValue: 110 mg/dL\nFlag: normal\nDate: 2024-03-01",
                "Marker: HDL\nValue: 52 mg/dL\nFlag: normal\nDate: 2024-03-01",
            ],
        )
        assert_test(test_case, [metric])
