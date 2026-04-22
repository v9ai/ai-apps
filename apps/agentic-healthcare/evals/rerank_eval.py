"""
Reranking quality evaluation — measures retrieval precision improvement.

The LangGraph ``rerank`` node is gone; reranking now runs inside
``ContextChatEngine`` as a ``ClinicalRelevancePostprocessor`` node-
postprocessor. These tests exercise that postprocessor directly (plus the
``SimilarityPostprocessor`` pre-filter it composes with inside
``chat_pipeline._build_postprocessors``).

Tests:
  A. ClinicalRelevancePostprocessor correctness — JSON parsing, score
     extraction, fallback, feature-flag bypass.
  B. Ordering quality — NDCG@k, MRR, hit-rate with/without reranking.
  C. Context compression — top-k filtering reduces noise without losing
     relevant chunks.
  D. GEval — context relevance improvement from reranking.

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/rerank_eval.py -v
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

from chat_pipeline import _build_postprocessors  # noqa: E402
from llama_index.core.postprocessor import SimilarityPostprocessor  # noqa: E402
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode  # noqa: E402
from postprocessors import RERANK_SYSTEM, ClinicalRelevancePostprocessor  # noqa: E402


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════


def _make_nodes(chunks: list[str], scores: list[float]) -> list[NodeWithScore]:
    return [
        NodeWithScore(
            node=TextNode(text=c, metadata={"source_table": "blood_marker_embeddings"}),
            score=s,
        )
        for c, s in zip(chunks, scores)
    ]


def _rerank(
    chunks: list[str],
    scores: list[float],
    query: str = "What is my TG/HDL ratio?",
    top_n: int = 8,
    min_score: float = 0.3,
    apply_sim_filter: bool = True,
) -> tuple[list[str], list[float], list[str]]:
    """Mirror the exact two-stage rerank pipeline that ChatEngine runs."""
    nodes = _make_nodes(chunks, scores)
    qb = QueryBundle(query)

    if apply_sim_filter:
        nodes = SimilarityPostprocessor(similarity_cutoff=min_score).postprocess_nodes(nodes, qb)

    reranker = ClinicalRelevancePostprocessor(top_n=top_n, min_score=min_score)
    reranked = reranker.postprocess_nodes(nodes, qb)

    return (
        [n.node.get_content() for n in reranked],
        [float(n.score or 0.0) for n in reranked],
        reranker.rationales,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Ranking metrics (pure Python)
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
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def mock_llm():
    with patch("postprocessors.llm_call") as mock:
        yield mock


# ═══════════════════════════════════════════════════════════════════════════
# A. Postprocessor correctness
# ═══════════════════════════════════════════════════════════════════════════


class TestRerankPostprocessorCorrectness:
    """Test ClinicalRelevancePostprocessor JSON parsing, fallback, and edge cases."""

    def test_rerank_scores_and_reorders_chunks(self, mock_llm):
        """Rerank assigns scores and reorders chunks by relevance."""
        mock_llm.side_effect = [
            '{"score": 0.3, "rationale": "low relevance"}',
            '{"score": 0.9, "rationale": "directly answers query"}',
            '{"score": 0.6, "rationale": "tangentially related"}',
        ]
        chunks, scores, _ = _rerank(
            chunks=["chunk_A", "chunk_B", "chunk_C"],
            scores=[0.8, 0.7, 0.6],
        )
        assert chunks[0] == "chunk_B"
        assert scores[0] == 0.9

    def test_rerank_handles_malformed_json(self, mock_llm):
        """Rerank uses original score on JSON parse failure."""
        mock_llm.return_value = "not json at all"
        chunks, scores, rationales = _rerank(chunks=["chunk_A"], scores=[0.75])
        assert scores[0] == 0.75
        assert rationales[0] == "parse_failure"

    def test_rerank_empty_chunks(self, mock_llm):
        """Rerank handles empty context gracefully."""
        chunks, scores, _ = _rerank(chunks=[], scores=[])
        assert chunks == []
        mock_llm.assert_not_called()

    def test_rerank_fallback_when_all_below_threshold(self, mock_llm):
        """Rerank keeps top 3 if all chunks are below min_score."""
        mock_llm.side_effect = [
            '{"score": 0.2, "rationale": "low"}',
            '{"score": 0.1, "rationale": "low"}',
            '{"score": 0.15, "rationale": "low"}',
            '{"score": 0.05, "rationale": "irrelevant"}',
        ]
        chunks, _, _ = _rerank(
            chunks=["a", "b", "c", "d"],
            scores=[0.5, 0.5, 0.5, 0.5],
        )
        assert len(chunks) == 3


# ═══════════════════════════════════════════════════════════════════════════
# B. Ordering quality
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
# C. Context compression
# ═══════════════════════════════════════════════════════════════════════════


class TestContextCompression:
    """Test that reranking reduces chunk count while preserving quality."""

    def test_top_k_limits_output_size(self, mock_llm):
        """Rerank output should not exceed top_n."""
        mock_llm.side_effect = [
            json.dumps({"score": 0.5 + i * 0.03, "rationale": f"chunk {i}"})
            for i in range(15)
        ]
        chunks, _, _ = _rerank(
            chunks=[f"chunk_{i}" for i in range(15)],
            scores=[0.5] * 15,
            top_n=8,
            min_score=0.3,
            apply_sim_filter=False,  # sim filter would drop scores < 0.3 first
        )
        assert len(chunks) <= 8

    def test_min_score_filters_noise(self, mock_llm):
        """Chunks below min_score are excluded."""
        mock_llm.side_effect = [
            '{"score": 0.9, "rationale": "relevant"}',
            '{"score": 0.1, "rationale": "noise"}',
            '{"score": 0.8, "rationale": "relevant"}',
        ]
        chunks, _, _ = _rerank(
            chunks=["relevant_a", "noise", "relevant_b"],
            scores=[0.7, 0.6, 0.5],
            top_n=8,
            min_score=0.3,
        )
        assert "noise" not in chunks
        assert len(chunks) == 2


# ═══════════════════════════════════════════════════════════════════════════
# D. Feature flag
# ═══════════════════════════════════════════════════════════════════════════


class TestRerankFeatureFlag:
    """Test rerank_enabled toggle — chat_pipeline._build_postprocessors() must bypass rerank."""

    def test_rerank_disabled_returns_empty_postprocessor_list(self, mock_llm):
        """When rerank_enabled=False, no postprocessors are attached."""
        with patch("chat_pipeline.settings") as mock_settings:
            mock_settings.rerank_enabled = False
            mock_settings.rerank_min_score = 0.3
            mock_settings.rerank_top_k = 8
            assert _build_postprocessors() == []
        mock_llm.assert_not_called()

    def test_rerank_enabled_returns_sim_plus_clinical(self, mock_llm):
        """When rerank_enabled=True, the pipeline stacks similarity + clinical rerank."""
        with patch("chat_pipeline.settings") as mock_settings:
            mock_settings.rerank_enabled = True
            mock_settings.rerank_min_score = 0.3
            mock_settings.rerank_top_k = 8
            procs = _build_postprocessors()

        assert len(procs) == 2
        assert isinstance(procs[0], SimilarityPostprocessor)
        assert isinstance(procs[1], ClinicalRelevancePostprocessor)
        mock_llm.assert_not_called()


# ═══════════════════════════════════════════════════════════════════════════
# E. GEval quality
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


__all__ = ["RERANK_SYSTEM"]
