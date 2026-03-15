"""DeepEval retrieval quality tests for PGVector → story generation pipeline.

Tests whether the PGVector cosine similarity search returns therapeutically
relevant, precise, and complete research context for each Noah scenario.

Two test categories:
  1. Deterministic — fast similarity/structure checks, no LLM calls
  2. LLM-judged   — DeepEval contextual metrics + custom GEval via DeepSeek

Run with:
    cd evals/retrieval && uv run pytest test_retrieval.py -v
"""

import json
import re

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    contextual_precision,
    contextual_recall,
    contextual_relevancy,
    retrieval_evidence_quality,
    therapeutic_retrieval_relevance,
)


def _make_test_case(case: dict, result: dict) -> LLMTestCase:
    return LLMTestCase(
        input=case["query"],
        actual_output=result["response"],
        expected_output=case["expected_output"],
        retrieval_context=result["retrieval_context"],
    )


# ---------------------------------------------------------------------------
# Deterministic tests — no LLM judge, fast
# ---------------------------------------------------------------------------


class TestDeterministic:
    """Fast structural checks on PGVector retrieval results."""

    def test_retrieval_not_empty(self, retrieval_output):
        _, result = retrieval_output
        assert result["chunks"], "PGVector returned no chunks for this query"

    def test_minimum_chunk_count(self, retrieval_output):
        _, result = retrieval_output
        assert len(result["chunks"]) >= 3, (
            f"Expected at least 3 chunks, got {len(result['chunks'])}. "
            "Too few results may indicate sparse embeddings for this domain."
        )

    def test_similarity_scores_positive(self, retrieval_output):
        _, result = retrieval_output
        for i, sim in enumerate(result["similarities"]):
            assert sim > 0, (
                f"Chunk {i} has non-positive similarity ({sim}). "
                "This suggests the embedding is unrelated to the query."
            )

    def test_top_chunk_similarity_threshold(self, retrieval_output):
        _, result = retrieval_output
        if not result["similarities"]:
            pytest.skip("No similarity scores available")
        top_sim = result["similarities"][0]
        assert top_sim >= 0.3, (
            f"Top chunk similarity is only {top_sim:.3f} (threshold: 0.3). "
            "The best match is too distant — embedding model may be weak for this domain."
        )

    def test_similarity_monotonically_decreasing(self, retrieval_output):
        _, result = retrieval_output
        sims = result["similarities"]
        for i in range(1, len(sims)):
            assert sims[i] <= sims[i - 1] + 1e-6, (
                f"Similarity not monotonically decreasing: "
                f"chunk {i-1}={sims[i-1]:.4f} < chunk {i}={sims[i]:.4f}"
            )

    def test_chunks_have_content(self, retrieval_output):
        _, result = retrieval_output
        for i, chunk in enumerate(result["chunks"]):
            assert chunk.get("content") and len(chunk["content"].strip()) > 20, (
                f"Chunk {i} has no meaningful content (title: {chunk.get('title', 'unknown')})"
            )

    def test_chunks_have_titles(self, retrieval_output):
        _, result = retrieval_output
        for i, chunk in enumerate(result["chunks"]):
            assert chunk.get("title") and chunk["title"].strip(), (
                f"Chunk {i} has no title"
            )

    def test_expected_technique_keywords_in_context(self, retrieval_output):
        case, result = retrieval_output
        expected_techniques = case.get("expected_techniques", [])
        if not expected_techniques:
            pytest.skip("No expected techniques for this test case")

        all_context = " ".join(result["retrieval_context"]).lower()
        found = [t for t in expected_techniques if t.lower() in all_context]

        assert len(found) >= 1, (
            f"None of the expected techniques found in retrieval context. "
            f"Expected at least 1 of: {expected_techniques}"
        )

    def test_clinical_domain_in_context(self, retrieval_output):
        case, result = retrieval_output
        domain = case.get("clinical_domain", "")
        if not domain:
            pytest.skip("No clinical domain specified")

        all_context = " ".join(result["retrieval_context"]).lower()
        domain_words = [w for w in domain.lower().split() if len(w) > 3]

        found = any(w in all_context for w in domain_words)
        assert found, (
            f"Clinical domain '{domain}' keywords not found in retrieved context. "
            f"Retrieval may be returning off-topic papers."
        )

    def test_no_duplicate_chunks(self, retrieval_output):
        _, result = retrieval_output
        titles = [t.lower().strip() for t in result["titles"]]
        unique_titles = set(titles)
        assert len(unique_titles) == len(titles), (
            f"Duplicate chunks retrieved: {len(titles)} total, {len(unique_titles)} unique. "
            f"Duplicates waste retrieval budget."
        )

    def test_response_not_empty(self, retrieval_output):
        _, result = retrieval_output
        assert result["response"].strip(), (
            "Generated response from retrieval context is empty"
        )

    def test_response_references_retrieved_content(self, retrieval_output):
        _, result = retrieval_output
        response_lower = result["response"].lower()
        titles_lower = [t.lower() for t in result["titles"]]

        # At least one retrieved chunk's key terms should appear in the response
        referenced = False
        for title in titles_lower:
            title_words = [w for w in title.split() if len(w) > 4]
            if any(w in response_lower for w in title_words[:3]):
                referenced = True
                break

        assert referenced, (
            "Response does not reference any retrieved chunk content. "
            "The generation may be ignoring the retrieval context."
        )


# ---------------------------------------------------------------------------
# LLM-judged tests — DeepEval contextual metrics
# ---------------------------------------------------------------------------


class TestContextualMetrics:
    """DeepEval RAG metrics evaluating retrieval quality for story generation."""

    def test_contextual_precision(self, retrieval_output):
        """Are the top-ranked retrieved chunks actually the most useful ones?"""
        case, result = retrieval_output
        assert_test(_make_test_case(case, result), [contextual_precision])

    def test_contextual_recall(self, retrieval_output):
        """Did retrieval find all the relevant research for this goal?"""
        case, result = retrieval_output
        assert_test(_make_test_case(case, result), [contextual_recall])

    def test_contextual_relevancy(self, retrieval_output):
        """Is each retrieved chunk therapeutically relevant to the query?"""
        case, result = retrieval_output
        assert_test(_make_test_case(case, result), [contextual_relevancy])


class TestTherapeuticRetrievalQuality:
    """Domain-specific GEval metrics for therapeutic retrieval quality."""

    def test_therapeutic_relevance(self, retrieval_output):
        """Are retrieved papers from the correct clinical domain and population?"""
        case, result = retrieval_output
        tc = LLMTestCase(
            input=(
                f"Query: {case['query']}\n"
                f"Goal: {case['goal_context']}\n"
                f"Domain: {case['clinical_domain']}\n"
                f"Population: {case['population']}"
            ),
            actual_output="\n\n".join(
                f"[{t}]\n{c}" for t, c in zip(result["titles"], result["retrieval_context"])
            ),
        )
        assert_test(tc, [therapeutic_retrieval_relevance])

    def test_evidence_quality(self, retrieval_output):
        """Do retrieved chunks contain high-quality, actionable evidence?"""
        case, result = retrieval_output
        tc = LLMTestCase(
            input=f"Query: {case['query']}\nGoal: {case['goal_context']}",
            actual_output="\n\n".join(
                f"[{t}]\n{c}" for t, c in zip(result["titles"], result["retrieval_context"])
            ),
        )
        assert_test(tc, [retrieval_evidence_quality])
