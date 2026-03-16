"""A/B embedding model comparison for therapeutic retrieval quality.

Compares different OpenAI embedding models on the same therapeutic queries
to determine which produces the best retrieval for story generation.

IMPORTANT: This test re-embeds queries at runtime with each model but searches
against the existing PGVector index (which uses text-embedding-3-small). For a
full comparison, you would also need to re-index all research chunks with each
model. This test measures query-side embedding quality only.

For a complete reindex comparison, use test_embedding_reindex.py (not included —
requires rebuilding the full index per model, which is expensive).

Run with:
    cd evals/retrieval && uv run pytest test_embedding.py -v
"""

import json
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.metrics import ContextualPrecisionMetric, ContextualRelevancyMetric
from deepeval.test_case import LLMTestCase

from conftest import RETRIEVAL_TEST_CASES
from deepseek_model import DeepSeekModel
from pgvector_client import generate_response, search

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

judge = DeepSeekModel()

# Models to compare (all OpenAI embedding models)
EMBEDDING_MODELS = [
    "text-embedding-3-small",   # current production model (1536 dims)
    "text-embedding-3-large",   # higher-dimensional (3072 dims)
]

# Use a subset of test cases to keep cost reasonable
EMBEDDING_TEST_CASES = RETRIEVAL_TEST_CASES[:3]


def _retrieve_with_model(case: dict, model: str, top_k: int = 10) -> dict:
    """Retrieve chunks using a specific embedding model, with caching."""
    model_slug = model.replace("-", "_")
    fixture_path = FIXTURES_DIR / f"{case['id']}_embed_{model_slug}.json"

    if fixture_path.exists():
        return json.loads(fixture_path.read_text(encoding="utf-8"))

    chunks = search(case["query"], top_k=top_k, embedding_model=model)
    response = generate_response(case["query"], chunks)

    result = {
        "id": case["id"],
        "query": case["query"],
        "embedding_model": model,
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
# Parametrized tests — one run per (case, model) combination
# ---------------------------------------------------------------------------


@pytest.fixture(
    scope="session",
    params=[
        (case, model)
        for case in EMBEDDING_TEST_CASES
        for model in EMBEDDING_MODELS
    ],
    ids=[
        f"{case['id']}-{model}"
        for case in EMBEDDING_TEST_CASES
        for model in EMBEDDING_MODELS
    ],
)
def embedding_output(request):
    case, model = request.param
    result = _retrieve_with_model(case, model)
    return case, model, result


class TestEmbeddingComparison:
    """Compare embedding models on therapeutic retrieval quality."""

    def test_retrieval_not_empty(self, embedding_output):
        _, model, result = embedding_output
        assert result["chunks"], f"Model {model} returned no chunks"

    def test_top_similarity_above_threshold(self, embedding_output):
        _, model, result = embedding_output
        if not result["similarities"]:
            pytest.skip("No results")
        top_sim = result["similarities"][0]
        assert top_sim >= 0.2, (
            f"Model {model}: top similarity {top_sim:.3f} is too low (threshold: 0.2)"
        )

    def test_technique_coverage(self, embedding_output):
        """Does the model retrieve chunks containing expected therapeutic techniques?"""
        case, model, result = embedding_output
        expected = case.get("expected_techniques", [])
        if not expected:
            pytest.skip("No expected techniques")

        all_context = " ".join(result["retrieval_context"]).lower()
        found = [t for t in expected if t.lower() in all_context]
        coverage = len(found) / len(expected) if expected else 0

        # Log for comparison — not a hard fail, but useful for A/B analysis
        print(f"\n  [{model}] Technique coverage: {coverage:.0%} ({len(found)}/{len(expected)})")
        print(f"  Found: {found}")
        print(f"  Missing: {[t for t in expected if t not in found]}")

        assert len(found) >= 1, (
            f"Model {model}: zero expected techniques found in retrieval"
        )

    def test_contextual_precision(self, embedding_output):
        case, model, result = embedding_output
        metric = ContextualPrecisionMetric(threshold=0.5, model=judge)
        tc = LLMTestCase(
            input=case["query"],
            actual_output=result["response"],
            expected_output=case["expected_output"],
            retrieval_context=result["retrieval_context"],
        )
        assert_test(tc, [metric])

    def test_contextual_relevancy(self, embedding_output):
        case, model, result = embedding_output
        metric = ContextualRelevancyMetric(threshold=0.5, model=judge)
        tc = LLMTestCase(
            input=case["query"],
            actual_output=result["response"],
            expected_output=case["expected_output"],
            retrieval_context=result["retrieval_context"],
        )
        assert_test(tc, [metric])


# ---------------------------------------------------------------------------
# Summary comparison — runs after all parametrized tests
# ---------------------------------------------------------------------------


class TestEmbeddingSummary:
    """Print a comparison summary of embedding model performance."""

    def test_print_comparison_table(self):
        """Load all cached fixtures and print a comparison table."""
        rows = []
        for case in EMBEDDING_TEST_CASES:
            for model in EMBEDDING_MODELS:
                model_slug = model.replace("-", "_")
                fixture_path = FIXTURES_DIR / f"{case['id']}_embed_{model_slug}.json"
                if not fixture_path.exists():
                    continue
                data = json.loads(fixture_path.read_text(encoding="utf-8"))
                sims = data.get("similarities", [])
                rows.append({
                    "case": case["id"],
                    "model": model,
                    "num_chunks": len(data.get("chunks", [])),
                    "top_sim": f"{sims[0]:.3f}" if sims else "N/A",
                    "avg_sim": f"{sum(sims)/len(sims):.3f}" if sims else "N/A",
                    "min_sim": f"{min(sims):.3f}" if sims else "N/A",
                })

        if not rows:
            pytest.skip("No cached fixtures to compare")

        print("\n\n=== Embedding Model Comparison ===")
        print(f"{'Case':<30} {'Model':<28} {'Chunks':>6} {'Top':>7} {'Avg':>7} {'Min':>7}")
        print("-" * 90)
        for r in rows:
            print(
                f"{r['case']:<30} {r['model']:<28} {r['num_chunks']:>6} "
                f"{r['top_sim']:>7} {r['avg_sim']:>7} {r['min_sim']:>7}"
            )
