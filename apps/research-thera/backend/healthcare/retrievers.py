"""LlamaIndex retrievers wrapping the existing pgvector search functions.

Each retriever subclass delegates to a ``db.py`` search function and returns
standard ``NodeWithScore`` objects, enabling LlamaIndex postprocessors and
response synthesisers downstream.

Usage in graph nodes::

    retriever = build_retriever_for_intent("markers", user_id, 0.9, query, entities)
    nodes = retriever.retrieve(query)
"""

from __future__ import annotations

from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode

from .db import (
    search_appointments,
    search_blood_tests,
    search_conditions,
    search_health_states,
    search_markers_hybrid,
    search_medications,
    search_marker_trend,
    search_symptoms,
)
from .embeddings import generate_embedding


# ── Confidence-scaled k-limit ────────────────────────────────────────────


def _dynamic_k(confidence: float, base_k: int) -> int:
    """Widen retrieval net for low-confidence classifications."""
    if confidence >= 0.8:
        return base_k
    if confidence >= 0.6:
        return int(base_k * 1.5)
    return base_k * 2


# ── Single-table retrievers ──────────────────────────────────────────────


class MarkerHybridRetriever(BaseRetriever):
    """Hybrid FTS + vector retrieval over blood_marker_embeddings."""

    def __init__(self, user_id: str, top_k: int = 10, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_markers_hybrid(
            query_bundle.query_str, embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "blood_marker_embeddings",
                        "marker_name": r.get("marker_name", ""),
                        "fts_rank": r.get("fts_rank", 0.0),
                        "vector_similarity": r.get("vector_similarity", 0.0),
                    },
                ),
                score=r.get("combined_score", r.get("similarity", 0.0)),
            )
            for r in results
        ]


class BloodTestRetriever(BaseRetriever):
    """Vector retrieval over blood_test_embeddings."""

    def __init__(self, user_id: str, top_k: int = 5, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_blood_tests(
            embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "blood_test_embeddings",
                        "test_id": r.get("test_id", ""),
                        "file_name": r.get("file_name", ""),
                        "test_date": r.get("test_date"),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


class HealthStateRetriever(BaseRetriever):
    """Vector retrieval over health_state_embeddings (includes derived_metrics)."""

    def __init__(self, user_id: str, top_k: int = 5, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_health_states(
            embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "health_state_embeddings",
                        "test_id": r.get("test_id", ""),
                        "derived_metrics": r.get("derived_metrics", {}),
                        "file_name": r.get("file_name", ""),
                        "test_date": r.get("test_date"),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


class ConditionRetriever(BaseRetriever):
    """Vector retrieval over condition_embeddings."""

    def __init__(self, user_id: str, top_k: int = 5, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_conditions(
            embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "condition_embeddings",
                        "condition_id": r.get("condition_id", ""),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


class MedicationRetriever(BaseRetriever):
    """Vector retrieval over medication_embeddings."""

    def __init__(self, user_id: str, top_k: int = 5, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_medications(
            embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "medication_embeddings",
                        "medication_id": r.get("medication_id", ""),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


class SymptomRetriever(BaseRetriever):
    """Vector retrieval over symptom_embeddings."""

    def __init__(self, user_id: str, top_k: int = 5, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_symptoms(
            embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "symptom_embeddings",
                        "symptom_id": r.get("symptom_id", ""),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


class AppointmentRetriever(BaseRetriever):
    """Vector retrieval over appointment_embeddings."""

    def __init__(self, user_id: str, top_k: int = 5, threshold: float = 0.3):
        super().__init__()
        self._user_id = user_id
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_appointments(
            embedding, self._user_id,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "appointment_embeddings",
                        "appointment_id": r.get("appointment_id", ""),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


class MarkerTrendRetriever(BaseRetriever):
    """Vector retrieval over blood_marker_embeddings filtered by marker name."""

    def __init__(
        self, user_id: str, marker_name: str | None = None,
        top_k: int = 50, threshold: float = 0.3,
    ):
        super().__init__()
        self._user_id = user_id
        self._marker_name = marker_name
        self._top_k = top_k
        self._threshold = threshold

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        embedding = generate_embedding(query_bundle.query_str)
        results = search_marker_trend(
            embedding, self._user_id,
            marker_name=self._marker_name,
            threshold=self._threshold, limit=self._top_k,
        )
        return [
            NodeWithScore(
                node=TextNode(
                    text=r["content"],
                    metadata={
                        "source_table": "marker_trend",
                        "marker_name": r.get("marker_name", ""),
                        "value": r.get("value"),
                        "unit": r.get("unit", ""),
                        "flag": r.get("flag", ""),
                        "test_date": r.get("test_date"),
                        "file_name": r.get("file_name", ""),
                    },
                ),
                score=r.get("similarity", 0.0),
            )
            for r in results
        ]


# ── Composite retriever (fan-out + dedup) ─────────────────────────────────


class CompositeRetriever(BaseRetriever):
    """Merge and deduplicate results from multiple sub-retrievers."""

    def __init__(self, retrievers: list[BaseRetriever]):
        super().__init__()
        self._retrievers = retrievers

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        all_nodes: list[NodeWithScore] = []
        seen: set[str] = set()
        for retriever in self._retrievers:
            for node in retriever._retrieve(query_bundle):
                key = node.node.get_content().strip()
                if key not in seen:
                    seen.add(key)
                    all_nodes.append(node)
        all_nodes.sort(key=lambda n: n.score or 0.0, reverse=True)
        return all_nodes


# ── Factory: build the right retriever composition per intent ─────────────


def build_retriever_for_intent(
    intent: str,
    user_id: str,
    confidence: float,
    query: str,
    entities: list[str],
    k_scale: float = 1.0,
) -> BaseRetriever:
    """Build a LlamaIndex retriever matching the per-intent retrieval logic.

    Replicates the fan-out patterns from the original ``_retrieve_*_core``
    functions but returns a composable ``BaseRetriever``.
    """
    if intent == "markers":
        k = int(_dynamic_k(confidence, 10) * k_scale)
        return CompositeRetriever([
            MarkerHybridRetriever(user_id, top_k=k),
            BloodTestRetriever(user_id, top_k=max(1, int(3 * k_scale))),
            HealthStateRetriever(user_id, top_k=max(1, int(2 * k_scale))),
        ])

    if intent == "derived_ratios":
        k = int(_dynamic_k(confidence, 5) * k_scale)
        return CompositeRetriever([
            HealthStateRetriever(user_id, top_k=k),
            MarkerHybridRetriever(user_id, top_k=k),
        ])

    if intent == "trajectory":
        k = int(_dynamic_k(confidence, 10) * k_scale)
        subs: list[BaseRetriever] = [
            MarkerHybridRetriever(user_id, top_k=k),
            BloodTestRetriever(user_id, top_k=max(1, int(3 * k_scale))),
            HealthStateRetriever(user_id, top_k=max(1, int(2 * k_scale))),
        ]
        trend_limit = max(5, int(20 * k_scale))
        for entity in entities[:3]:
            subs.append(MarkerTrendRetriever(user_id, marker_name=entity, top_k=trend_limit))
        return CompositeRetriever(subs)

    if intent == "conditions":
        k = int(_dynamic_k(confidence, 5) * k_scale)
        return CompositeRetriever([
            ConditionRetriever(user_id, top_k=k),
            MarkerHybridRetriever(user_id, top_k=k),
        ])

    if intent == "medications":
        k = int(_dynamic_k(confidence, 5) * k_scale)
        return CompositeRetriever([
            MedicationRetriever(user_id, top_k=k),
            MarkerHybridRetriever(user_id, top_k=k),
        ])

    if intent == "symptoms":
        k = int(_dynamic_k(confidence, 5) * k_scale)
        return CompositeRetriever([
            SymptomRetriever(user_id, top_k=k),
            MarkerHybridRetriever(user_id, top_k=k),
        ])

    if intent == "appointments":
        k = int(_dynamic_k(confidence, 5) * k_scale)
        return AppointmentRetriever(user_id, top_k=k)

    # general_health — fan-out to all tables
    return CompositeRetriever([
        BloodTestRetriever(user_id, top_k=max(1, int(3 * k_scale))),
        MarkerHybridRetriever(user_id, top_k=max(1, int(5 * k_scale))),
        HealthStateRetriever(user_id, top_k=max(1, int(3 * k_scale))),
        ConditionRetriever(user_id, top_k=max(1, int(3 * k_scale))),
        MedicationRetriever(user_id, top_k=max(1, int(3 * k_scale))),
        SymptomRetriever(user_id, top_k=max(1, int(3 * k_scale))),
    ])


# ── Conversion helpers (NodeWithScore ↔ GraphState fields) ────────────────


def nodes_to_state(nodes: list[NodeWithScore]) -> dict:
    """Convert LlamaIndex NodeWithScore list to GraphState retrieval fields."""
    return {
        "context_chunks": [n.node.get_content() for n in nodes],
        "retrieval_sources": [
            n.node.metadata.get("source_table", "unknown") for n in nodes
        ],
        "retrieval_scores": [n.score or 0.0 for n in nodes],
    }


def state_to_nodes(
    chunks: list[str], sources: list[str], scores: list[float],
) -> list[NodeWithScore]:
    """Reconstruct NodeWithScore list from GraphState retrieval fields."""
    return [
        NodeWithScore(
            node=TextNode(text=chunk, metadata={"source_table": source}),
            score=score,
        )
        for chunk, source, score in zip(chunks, sources, scores)
    ]
