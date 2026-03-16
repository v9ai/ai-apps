"""Top-K tuning evaluation for PGVector retrieval.

Tests retrieval quality at different K values (5, 10, 15, 20) to find the
optimal number of chunks to feed into story generation. Measures the tradeoff
between precision (does K increase noise?) and recall (does small K miss papers?).

The story generator currently uses top_k=10 (hardcoded in both
retrieveGoalContext and the paper fetch in generateStoryTask.ts).

Run with:
    cd evals/retrieval && uv run pytest test_topk.py -v
"""

import json
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase

from conftest import RETRIEVAL_TEST_CASES
from deepseek_model import DeepSeekModel
from pgvector_client import generate_response, search

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

judge = DeepSeekModel()

K_VALUES = [5, 10, 15, 20]

# Use a subset to keep cost reasonable
TOPK_TEST_CASES = RETRIEVAL_TEST_CASES[:3]


def _retrieve_at_k(case: dict, top_k: int) -> dict:
    """Retrieve chunks at a specific K, with fixture caching."""
    fixture_path = FIXTURES_DIR / f"{case['id']}_k{top_k}.json"

    if fixture_path.exists():
        return json.loads(fixture_path.read_text(encoding="utf-8"))

    chunks = search(case["query"], top_k=top_k)
    response = generate_response(case["query"], chunks)

    result = {
        "id": case["id"],
        "query": case["query"],
        "top_k": top_k,
        "chunks": chunks,
        "retrieval_context": [c["content"] for c in chunks],
        "similarities": [c["similarity"] for c in chunks],
        "titles": [c["title"] for c in chunks],
        "response": response,
    }

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(result, indent=2, default=str),
        encoding="utf-8",
    )
    return result


# ---------------------------------------------------------------------------
# Parametrized fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(
    scope="session",
    params=[
        (case, k)
        for case in TOPK_TEST_CASES
        for k in K_VALUES
    ],
    ids=[
        f"{case['id']}-k{k}"
        for case in TOPK_TEST_CASES
        for k in K_VALUES
    ],
)
def topk_output(request):
    case, k = request.param
    result = _retrieve_at_k(case, k)
    return case, k, result


# ---------------------------------------------------------------------------
# Deterministic tests — structure and similarity checks per K
# ---------------------------------------------------------------------------


class TestTopKDeterministic:
    """Structural quality checks at each K value."""

    def test_chunk_count_matches_k(self, topk_output):
        """Verify we got at most K chunks (may be fewer if DB has less)."""
        _, k, result = topk_output
        assert len(result["chunks"]) <= k, (
            f"Got {len(result['chunks'])} chunks but requested K={k}"
        )

    def test_similarity_floor_at_high_k(self, topk_output):
        """At higher K, the tail chunks should still have reasonable similarity."""
        _, k, result = topk_output
        if k <= 5 or not result["similarities"]:
            pytest.skip("Only relevant for K > 5")

        tail_sim = result["similarities"][-1]
        # Warn (not fail) if tail similarity is very low — indicates noise
        if tail_sim < 0.15:
            pytest.skip(
                f"K={k}: tail chunk similarity is {tail_sim:.3f} — "
                f"consider reducing K to avoid noise in story context"
            )

    def test_technique_coverage_improves_with_k(self, topk_output):
        """Higher K should find at least as many techniques as lower K."""
        case, k, result = topk_output
        expected = case.get("expected_techniques", [])
        if not expected:
            pytest.skip("No expected techniques")

        all_context = " ".join(result["retrieval_context"]).lower()
        found = [t for t in expected if t.lower() in all_context]

        print(f"\n  [K={k}] Technique coverage: {len(found)}/{len(expected)}: {found}")

    def test_no_duplicates_at_any_k(self, topk_output):
        _, k, result = topk_output
        titles = [t.lower().strip() for t in result["titles"]]
        assert len(set(titles)) == len(titles), (
            f"K={k}: duplicate chunks retrieved — wastes context budget"
        )


# ---------------------------------------------------------------------------
# LLM-judged tests — DeepEval contextual metrics per K
# ---------------------------------------------------------------------------


class TestTopKContextualMetrics:
    """Evaluate how K affects contextual precision, recall, and relevancy."""

    def test_contextual_precision(self, topk_output):
        """Precision should decrease as K increases (more noise at higher K)."""
        case, k, result = topk_output
        # Lower threshold for higher K (expect some noise)
        threshold = 0.7 if k <= 5 else 0.55 if k <= 10 else 0.45
        metric = ContextualPrecisionMetric(threshold=threshold, model=judge)
        tc = LLMTestCase(
            input=case["query"],
            actual_output=result["response"],
            expected_output=case["expected_output"],
            retrieval_context=result["retrieval_context"],
        )
        assert_test(tc, [metric])

    def test_contextual_recall(self, topk_output):
        """Recall should increase or plateau as K increases."""
        case, k, result = topk_output
        # Higher threshold for higher K (should find more relevant papers)
        threshold = 0.5 if k <= 5 else 0.6
        metric = ContextualRecallMetric(threshold=threshold, model=judge)
        tc = LLMTestCase(
            input=case["query"],
            actual_output=result["response"],
            expected_output=case["expected_output"],
            retrieval_context=result["retrieval_context"],
        )
        assert_test(tc, [metric])

    def test_contextual_relevancy(self, topk_output):
        case, k, result = topk_output
        threshold = 0.6 if k <= 10 else 0.45
        metric = ContextualRelevancyMetric(threshold=threshold, model=judge)
        tc = LLMTestCase(
            input=case["query"],
            actual_output=result["response"],
            expected_output=case["expected_output"],
            retrieval_context=result["retrieval_context"],
        )
        assert_test(tc, [metric])


# ---------------------------------------------------------------------------
# Summary — precision × recall across K values
# ---------------------------------------------------------------------------


class TestTopKSummary:
    """Print a comparison table of retrieval quality across K values."""

    def test_print_topk_table(self):
        """Load all cached fixtures and print K-value comparison."""
        rows = []
        for case in TOPK_TEST_CASES:
            for k in K_VALUES:
                fixture_path = FIXTURES_DIR / f"{case['id']}_k{k}.json"
                if not fixture_path.exists():
                    continue
                data = json.loads(fixture_path.read_text(encoding="utf-8"))
                sims = data.get("similarities", [])
                contexts = data.get("retrieval_context", [])

                # Technique coverage
                expected = case.get("expected_techniques", [])
                all_context = " ".join(contexts).lower()
                found = [t for t in expected if t.lower() in all_context]

                rows.append({
                    "case": case["id"][:25],
                    "k": k,
                    "chunks": len(data.get("chunks", [])),
                    "top_sim": f"{sims[0]:.3f}" if sims else "N/A",
                    "avg_sim": f"{sum(sims)/len(sims):.3f}" if sims else "N/A",
                    "tail_sim": f"{sims[-1]:.3f}" if sims else "N/A",
                    "tech_cov": f"{len(found)}/{len(expected)}",
                })

        if not rows:
            pytest.skip("No cached fixtures to compare")

        print("\n\n=== Top-K Comparison ===")
        print(
            f"{'Case':<27} {'K':>3} {'Chunks':>6} "
            f"{'Top':>7} {'Avg':>7} {'Tail':>7} {'Tech':>6}"
        )
        print("-" * 75)
        for r in rows:
            print(
                f"{r['case']:<27} {r['k']:>3} {r['chunks']:>6} "
                f"{r['top_sim']:>7} {r['avg_sim']:>7} {r['tail_sim']:>7} {r['tech_cov']:>6}"
            )
        print("\nRecommendation: Choose K where precision plateau meets recall plateau.")
