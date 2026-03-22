"""Shared fixtures and metrics for RAG evaluation tests.

Provides session-scoped retriever, RAG pipeline fixtures,
golden loading, skip conditions, and shared metric instances.
"""

import json
from pathlib import Path

import pytest
from deepeval.dataset import Golden
from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    FaithfulnessMetric,
)

from deepseek_model import DeepSeekModel
from pgvector_retriever import PgVectorRetriever
from rag_pipeline import RAGConfig

DATASETS_DIR = Path(__file__).resolve().parent / "datasets"
RAG_GOLDENS_PATH = DATASETS_DIR / "rag_goldens.json"

model = DeepSeekModel()
RAG_THRESHOLD = 0.6

# -- Shared metric instances ---------------------------------------------------

faithfulness = FaithfulnessMetric(model=model, threshold=RAG_THRESHOLD)
answer_relevancy = AnswerRelevancyMetric(model=model, threshold=RAG_THRESHOLD)
contextual_relevancy = ContextualRelevancyMetric(model=model, threshold=RAG_THRESHOLD)
contextual_precision = ContextualPrecisionMetric(model=model, threshold=RAG_THRESHOLD)
contextual_recall = ContextualRecallMetric(model=model, threshold=RAG_THRESHOLD)


# -- Golden loading ------------------------------------------------------------


def load_rag_goldens() -> list[dict]:
    """Load RAG goldens from datasets/rag_goldens.json."""
    if not RAG_GOLDENS_PATH.exists():
        return []
    with open(RAG_GOLDENS_PATH) as f:
        return json.load(f)


def rag_golden_params(goldens: list[dict]) -> list:
    """Create pytest.param list from goldens with readable IDs."""
    return [
        pytest.param(g, id=f"rag-{i}-{g.get('source', 'unknown')[:30]}")
        for i, g in enumerate(goldens)
    ]


def to_golden(item: dict) -> Golden:
    """Convert a dict to a DeepEval Golden."""
    return Golden(
        input=item["input"],
        expected_output=item.get("expected_output"),
        context=item.get("context"),
        source_file=item.get("source"),
    )


# -- Fixtures ------------------------------------------------------------------


@pytest.fixture(scope="session")
def retriever():
    r = PgVectorRetriever()
    yield r
    r.close()


@pytest.fixture(scope="session")
def rag_config() -> RAGConfig:
    return RAGConfig(top_k=5, retrieval_method="fts", threshold=0.3)


@pytest.fixture(scope="session")
def rag_goldens() -> list[dict]:
    goldens = load_rag_goldens()
    if not goldens:
        pytest.skip("No RAG goldens found. Run synthesize_rag.py first.")
    return goldens
