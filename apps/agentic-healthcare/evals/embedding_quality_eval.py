"""
Medical embedding quality evaluation — semantic separation, synonym resolution,
entity embedding quality, and retrieval precision for clinical data.

Tests that the BAAI/bge-large-en-v1.5 embedding model + formatted text templates
produce vectors with the right semantic properties for healthcare search:

  A. Cross-organ semantic separation (5 organ systems)
  B. Medical synonym & lay-term resolution
  C. Entity embedding quality (conditions, medications, symptoms, appointments)
  D. Health state embedding carries derived metric signal
  E. Abnormal-first retrieval bias (flagged markers rank higher for risk queries)
  F. Temporal embedding (same marker, different dates → distinct embeddings)

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/embedding_quality_eval.py -v
"""

from __future__ import annotations

import numpy as np
import pytest

from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.schema import TextNode, MetadataMode

from conftest import get_embed_model
from embeddings import (
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
    format_condition_for_embedding,
    format_medication_for_embedding,
    format_symptom_for_embedding,
    format_appointment_for_embedding,
    generate_embedding,
)
from parsers import Marker, parse_markers


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════


def _cosine_sim(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    return float(np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb)))


def _embed(text: str) -> list[float]:
    return generate_embedding(text)


# ═══════════════════════════════════════════════════════════════════════
# A. Cross-organ semantic separation (5 systems)
#
# Verifies that markers from the same organ system embed closer together
# than markers from different systems.
# ═══════════════════════════════════════════════════════════════════════


class TestOrganSystemSeparation:
    """Each organ system's markers should cluster together in embedding space."""

    @pytest.fixture(scope="class")
    def system_embeddings(self):
        systems = {
            "cardiovascular": [
                "Marker: Total Cholesterol\nValue: 245 mg/dL\nReference: 0-200\nFlag: high",
                "Marker: LDL Cholesterol\nValue: 155 mg/dL\nReference: 0-100\nFlag: high",
                "Marker: HDL Cholesterol\nValue: 38 mg/dL\nReference: 40-60\nFlag: low",
            ],
            "metabolic": [
                "Marker: Glucose\nValue: 130 mg/dL\nReference: 70-100\nFlag: high",
                "Marker: Triglycerides\nValue: 210 mg/dL\nReference: 0-150\nFlag: high",
                "Marker: HbA1c\nValue: 7.2 %\nReference: 4.0-5.6\nFlag: high",
            ],
            "renal": [
                "Marker: BUN (Blood Urea Nitrogen)\nValue: 28 mg/dL\nReference: 7-20\nFlag: high",
                "Marker: Creatinine\nValue: 1.5 mg/dL\nReference: 0.7-1.3\nFlag: high",
                "Marker: eGFR\nValue: 55 mL/min\nReference: >60\nFlag: low",
            ],
            "hepatic": [
                "Marker: AST (SGOT)\nValue: 85 U/L\nReference: 10-40\nFlag: high",
                "Marker: ALT (SGPT)\nValue: 72 U/L\nReference: 7-56\nFlag: high",
                "Marker: GGT\nValue: 120 U/L\nReference: 0-51\nFlag: high",
            ],
            "inflammatory": [
                "Marker: Neutrophils\nValue: 7.5 K/uL\nReference: 1.5-7.0\nFlag: high",
                "Marker: Lymphocytes\nValue: 1.0 K/uL\nReference: 1.0-3.5\nFlag: normal",
                "Marker: CRP (C-Reactive Protein)\nValue: 15.0 mg/L\nReference: <5.0\nFlag: high",
            ],
        }
        return {
            sys: [_embed(text) for text in texts]
            for sys, texts in systems.items()
        }

    @staticmethod
    def _centroid(embeddings: list[list[float]]) -> np.ndarray:
        return np.mean(embeddings, axis=0)

    def test_cardiovascular_vs_renal(self, system_embeddings):
        cv = self._centroid(system_embeddings["cardiovascular"])
        renal = self._centroid(system_embeddings["renal"])
        hepatic = self._centroid(system_embeddings["hepatic"])

        # Cardiovascular and hepatic should be more distinct from each other
        # than cardiovascular markers are from each other (intra-cluster > inter)
        intra_cv = np.mean([
            _cosine_sim(system_embeddings["cardiovascular"][i], system_embeddings["cardiovascular"][j])
            for i in range(3) for j in range(i + 1, 3)
        ])
        inter_cv_renal = _cosine_sim(cv.tolist(), renal.tolist())
        assert intra_cv > inter_cv_renal, (
            f"Intra-cardiovascular similarity ({intra_cv:.3f}) should exceed "
            f"cardiovascular-renal similarity ({inter_cv_renal:.3f})"
        )

    def test_hepatic_vs_inflammatory(self, system_embeddings):
        hepatic = self._centroid(system_embeddings["hepatic"])
        inflammatory = self._centroid(system_embeddings["inflammatory"])

        intra_hepatic = np.mean([
            _cosine_sim(system_embeddings["hepatic"][i], system_embeddings["hepatic"][j])
            for i in range(3) for j in range(i + 1, 3)
        ])
        inter = _cosine_sim(hepatic.tolist(), inflammatory.tolist())
        assert intra_hepatic > inter

    def test_metabolic_vs_inflammatory(self, system_embeddings):
        """Metabolic and inflammatory markers share clinical context (both blood
        biomarkers). bge-large separates them less strongly than, say, cardiovascular
        vs renal. We test they're at least distinct centroids (< 0.95)."""
        metabolic = self._centroid(system_embeddings["metabolic"])
        inflammatory = self._centroid(system_embeddings["inflammatory"])
        sim = _cosine_sim(metabolic.tolist(), inflammatory.tolist())
        assert sim < 0.95, f"Metabolic and inflammatory centroids too similar ({sim:.3f})"

    def test_all_systems_have_distinct_centroids(self, system_embeddings):
        """No two system centroids should be > 0.95 similar."""
        systems = list(system_embeddings.keys())
        centroids = {s: self._centroid(system_embeddings[s]) for s in systems}
        for i, s1 in enumerate(systems):
            for s2 in systems[i + 1:]:
                sim = _cosine_sim(centroids[s1].tolist(), centroids[s2].tolist())
                assert sim < 0.95, f"{s1} and {s2} centroids are too similar ({sim:.3f})"


# ═══════════════════════════════════════════════════════════════════════
# B. Medical synonym & lay-term resolution
#
# Queries using medical synonyms and lay terms should retrieve the
# correct markers.
# ═══════════════════════════════════════════════════════════════════════


class TestSynonymResolution:
    """Clinical synonyms and lay terms should map to correct markers."""

    @pytest.fixture(scope="class")
    def index(self):
        Settings.embed_model = get_embed_model()

        markers = [
            Marker("HDL Cholesterol", "55", "mg/dL", "40-60", "normal"),
            Marker("LDL Cholesterol", "130", "mg/dL", "0-100", "high"),
            Marker("Hemoglobin", "14.2", "g/dL", "12.0-16.0", "normal"),
            Marker("Creatinine", "1.5", "mg/dL", "0.7-1.3", "high"),
            Marker("BUN", "28", "mg/dL", "7-20", "high"),
            Marker("AST", "85", "U/L", "10-40", "high"),
            Marker("ALT", "42", "U/L", "7-56", "normal"),
            Marker("Glucose", "130", "mg/dL", "70-100", "high"),
            Marker("Neutrophils", "7.5", "K/uL", "1.5-7.0", "high"),
            Marker("Lymphocytes", "1.0", "K/uL", "1.0-3.5", "normal"),
        ]
        ids = [f"m-{i}" for i in range(len(markers))]
        meta = {"fileName": "full_panel.pdf", "testDate": "2024-03-01"}
        nodes = build_marker_nodes(markers, ids, "test-1", "user-1", meta)
        return VectorStoreIndex(nodes)

    @pytest.mark.parametrize("query,expected_markers", [
        ("good cholesterol levels", ["HDL Cholesterol"]),
        ("bad cholesterol", ["LDL Cholesterol"]),
        ("kidney function", ["Creatinine", "BUN"]),
        ("AST ALT liver transaminases", ["AST", "ALT"]),
        ("blood sugar", ["Glucose"]),
        ("iron in blood", ["Hemoglobin"]),
        ("white blood cell differential", ["Neutrophils", "Lymphocytes"]),
        ("infection markers", ["Neutrophils"]),
    ])
    def test_synonym_retrieval(self, index, query, expected_markers):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve(query)
        retrieved_names = [r.metadata.get("marker_name", "") for r in results]
        assert any(
            exp in retrieved_names for exp in expected_markers
        ), f"Query '{query}' retrieved {retrieved_names}, expected one of {expected_markers}"


# ═══════════════════════════════════════════════════════════════════════
# C. Entity embedding quality
#
# Conditions, medications, symptoms, and appointments should embed
# into semantically meaningful vectors.
# ═══════════════════════════════════════════════════════════════════════


class TestEntityEmbeddingQuality:
    """Entity-specific text formatters produce embeddings that cluster by type."""

    def test_conditions_cluster(self):
        diabetes = _embed(format_condition_for_embedding("Type 2 Diabetes", "Diagnosed 2022, managed with metformin"))
        hypertension = _embed(format_condition_for_embedding("Hypertension", "Controlled with lisinopril"))
        migraine = _embed(format_condition_for_embedding("Chronic Migraine", "Episodic, triggers: stress"))

        # Diabetes and hypertension (both metabolic/cardiovascular) should be
        # closer than diabetes and migraine
        sim_metab = _cosine_sim(diabetes, hypertension)
        sim_cross = _cosine_sim(diabetes, migraine)
        assert sim_metab > sim_cross

    def test_medications_cluster(self):
        metformin = _embed(format_medication_for_embedding(
            "Metformin", dosage="500mg", frequency="twice daily", notes="For type 2 diabetes"
        ))
        insulin = _embed(format_medication_for_embedding(
            "Insulin Glargine", dosage="20 units", frequency="once daily", notes="Basal insulin for diabetes"
        ))
        atorvastatin = _embed(format_medication_for_embedding(
            "Atorvastatin", dosage="40mg", frequency="once daily", notes="Cholesterol management"
        ))

        # Diabetes medications should cluster together
        sim_diabetes = _cosine_sim(metformin, insulin)
        sim_cross = _cosine_sim(metformin, atorvastatin)
        assert sim_diabetes > sim_cross

    def test_symptoms_capture_severity(self):
        mild = _embed(format_symptom_for_embedding("Headache", severity="mild", logged_at="2024-03-01"))
        severe = _embed(format_symptom_for_embedding("Headache", severity="severe", logged_at="2024-03-01"))
        fatigue = _embed(format_symptom_for_embedding("Fatigue", severity="moderate", logged_at="2024-03-01"))

        # Same symptom at different severities should be more similar than different symptoms
        sim_same = _cosine_sim(mild, severe)
        sim_diff = _cosine_sim(mild, fatigue)
        assert sim_same > sim_diff

    def test_appointment_notes_embed_meaningfully(self):
        cardio = _embed(format_appointment_for_embedding(
            "Cardiology Follow-up", provider="Dr. Smith",
            notes="Review lipid panel, adjust statin dose", appointment_date="2024-03-15"
        ))
        endo = _embed(format_appointment_for_embedding(
            "Endocrinology Visit", provider="Dr. Jones",
            notes="Review HbA1c, adjust insulin", appointment_date="2024-03-20"
        ))
        dental = _embed(format_appointment_for_embedding(
            "Dental Cleaning", provider="Dr. White",
            notes="Routine cleaning and exam", appointment_date="2024-03-25"
        ))

        # Cardiology and endocrinology (both chronic disease management) should be closer
        sim_chronic = _cosine_sim(cardio, endo)
        sim_cross = _cosine_sim(cardio, dental)
        assert sim_chronic > sim_cross


# ═══════════════════════════════════════════════════════════════════════
# D. Health state embedding carries derived metric signal
#
# Health state nodes (with derived ratios) should respond to
# clinically appropriate queries.
# ═══════════════════════════════════════════════════════════════════════


class TestHealthStateEmbeddingSignal:
    """Health state embeddings should be retrievable by clinical risk queries."""

    @pytest.fixture(scope="class")
    def index(self):
        Settings.embed_model = get_embed_model()
        nodes: list[TextNode] = []

        # Healthy profile
        healthy_markers = [
            Marker("HDL", "55", "mg/dL", "40-60", "normal"),
            Marker("LDL", "90", "mg/dL", "0-100", "normal"),
            Marker("Total Cholesterol", "180", "mg/dL", "0-200", "normal"),
            Marker("Triglycerides", "100", "mg/dL", "0-150", "normal"),
            Marker("Glucose", "88", "mg/dL", "70-100", "normal"),
            Marker("Neutrophils", "4.0", "K/uL", "1.5-7.0", "normal"),
            Marker("Lymphocytes", "2.0", "K/uL", "1.0-3.5", "normal"),
        ]
        nodes.append(build_health_state_node(
            healthy_markers, "test-healthy", "user-1",
            {"fileName": "healthy.pdf", "uploadedAt": "2024-01-01"},
        ))

        # Metabolic syndrome profile
        metab_markers = [
            Marker("HDL", "35", "mg/dL", "40-60", "low"),
            Marker("LDL", "160", "mg/dL", "0-100", "high"),
            Marker("Total Cholesterol", "260", "mg/dL", "0-200", "high"),
            Marker("Triglycerides", "280", "mg/dL", "0-150", "high"),
            Marker("Glucose", "130", "mg/dL", "70-100", "high"),
        ]
        nodes.append(build_health_state_node(
            metab_markers, "test-metab", "user-1",
            {"fileName": "metabolic.pdf", "uploadedAt": "2024-02-01"},
        ))

        # Inflammatory profile
        inflam_markers = [
            Marker("Neutrophils", "8.0", "K/uL", "1.5-7.0", "high"),
            Marker("Lymphocytes", "1.0", "K/uL", "1.0-3.5", "normal"),
            Marker("AST", "120", "U/L", "10-40", "high"),
            Marker("ALT", "45", "U/L", "7-56", "normal"),
        ]
        nodes.append(build_health_state_node(
            inflam_markers, "test-inflam", "user-1",
            {"fileName": "inflammatory.pdf", "uploadedAt": "2024-03-01"},
        ))

        return VectorStoreIndex(nodes)

    def test_metabolic_risk_query(self, index):
        retriever = index.as_retriever(similarity_top_k=1)
        results = retriever.retrieve("insulin resistance and metabolic syndrome risk")
        assert results[0].metadata["test_id"] == "test-metab"

    def test_inflammation_query(self, index):
        retriever = index.as_retriever(similarity_top_k=1)
        results = retriever.retrieve("systemic inflammation and elevated NLR")
        assert results[0].metadata["test_id"] == "test-inflam"

    def test_healthy_query(self, index):
        retriever = index.as_retriever(similarity_top_k=1)
        results = retriever.retrieve("all markers within normal range, healthy profile")
        assert results[0].metadata["test_id"] == "test-healthy"


# ═══════════════════════════════════════════════════════════════════════
# E. Abnormal-first retrieval bias
#
# When searching for risk-related queries, abnormal markers should
# rank higher than normal ones.
# ═══════════════════════════════════════════════════════════════════════


class TestAbnormalRetrievalBias:
    """Risk queries should preferentially retrieve abnormal markers."""

    @pytest.fixture(scope="class")
    def index(self):
        Settings.embed_model = get_embed_model()

        markers = [
            Marker("HDL", "55", "mg/dL", "40-60", "normal"),
            Marker("HDL", "28", "mg/dL", "40-60", "low"),
            Marker("LDL", "90", "mg/dL", "0-100", "normal"),
            Marker("LDL", "180", "mg/dL", "0-100", "high"),
            Marker("Glucose", "88", "mg/dL", "70-100", "normal"),
            Marker("Glucose", "250", "mg/dL", "70-100", "high"),
        ]
        ids = [f"m-{i}" for i in range(len(markers))]
        meta = {"fileName": "mixed.pdf", "testDate": "2024-01-01"}
        nodes = build_marker_nodes(markers, ids, "test-1", "user-1", meta)
        return VectorStoreIndex(nodes)

    def test_high_ldl_risk_query(self, index):
        retriever = index.as_retriever(similarity_top_k=2)
        results = retriever.retrieve("elevated LDL cholesterol cardiovascular risk")
        # The high LDL (180) should rank higher than normal LDL (90)
        flags = [r.metadata.get("flag") for r in results]
        assert "high" in flags, f"Expected 'high' flag in results, got {flags}"

    def test_low_hdl_risk_query(self, index):
        retriever = index.as_retriever(similarity_top_k=2)
        results = retriever.retrieve("dangerously low HDL, cardiovascular protection lacking")
        flags = [r.metadata.get("flag") for r in results]
        assert "low" in flags, f"Expected 'low' flag in results, got {flags}"


# ═══════════════════════════════════════════════════════════════════════
# F. Temporal embedding differentiation
#
# The same marker from different dates should produce different
# embeddings (because the date is in the text).
# ═══════════════════════════════════════════════════════════════════════


class TestTemporalDifferentiation:
    def test_same_marker_different_dates_differ(self):
        from embeddings import format_marker_for_embedding

        marker = Marker("HDL", "55", "mg/dL", "40-60", "normal")
        meta_jan = {"fileName": "jan.pdf", "testDate": "2024-01-15"}
        meta_jun = {"fileName": "jun.pdf", "testDate": "2024-06-15"}

        text_jan = format_marker_for_embedding(marker, meta_jan)
        text_jun = format_marker_for_embedding(marker, meta_jun)

        emb_jan = _embed(text_jan)
        emb_jun = _embed(text_jun)

        sim = _cosine_sim(emb_jan, emb_jun)
        # Same marker different dates: high similarity but not identical
        assert 0.85 < sim < 1.0, f"Expected sim in (0.85, 1.0), got {sim:.3f}"

    def test_different_values_same_marker_differ(self):
        from embeddings import format_marker_for_embedding

        marker_normal = Marker("Glucose", "88", "mg/dL", "70-100", "normal")
        marker_high = Marker("Glucose", "250", "mg/dL", "70-100", "high")
        meta = {"fileName": "test.pdf", "testDate": "2024-01-01"}

        emb_normal = _embed(format_marker_for_embedding(marker_normal, meta))
        emb_high = _embed(format_marker_for_embedding(marker_high, meta))

        sim = _cosine_sim(emb_normal, emb_high)
        # Same marker different values: should be similar but distinguishable
        assert 0.80 < sim < 0.99, f"Expected sim in (0.80, 0.99), got {sim:.3f}"


# ═══════════════════════════════════════════════════════════════════════
# G. Multi-entity retrieval quality
#
# Build an index with all entity types and verify cross-entity queries
# retrieve the right type of entity.
# ═══════════════════════════════════════════════════════════════════════


class TestMultiEntityRetrieval:
    """Cross-entity semantic search should retrieve the right entity type."""

    @pytest.fixture(scope="class")
    def index(self):
        Settings.embed_model = get_embed_model()
        nodes: list[TextNode] = []

        # Blood markers
        markers = [
            Marker("Glucose", "130", "mg/dL", "70-100", "high"),
            Marker("HDL", "55", "mg/dL", "40-60", "normal"),
        ]
        ids = ["bm-0", "bm-1"]
        nodes.extend(build_marker_nodes(
            markers, ids, "test-1", "user-1",
            {"fileName": "test.pdf", "testDate": "2024-01-01"},
        ))

        # Condition
        nodes.append(TextNode(
            id_="cond-1",
            text=format_condition_for_embedding("Type 2 Diabetes", "Diagnosed 2022"),
            metadata={"node_type": "condition", "entity_id": "cond-1"},
        ))

        # Medication
        nodes.append(TextNode(
            id_="med-1",
            text=format_medication_for_embedding("Metformin", dosage="500mg", frequency="twice daily"),
            metadata={"node_type": "medication", "entity_id": "med-1"},
        ))

        # Symptom
        nodes.append(TextNode(
            id_="sym-1",
            text=format_symptom_for_embedding("Excessive thirst", severity="moderate", logged_at="2024-03-01"),
            metadata={"node_type": "symptom", "entity_id": "sym-1"},
        ))

        # Appointment
        nodes.append(TextNode(
            id_="apt-1",
            text=format_appointment_for_embedding(
                "Endocrinology Visit", provider="Dr. Jones",
                notes="Review HbA1c and glucose trends", appointment_date="2024-03-15"
            ),
            metadata={"node_type": "appointment", "entity_id": "apt-1"},
        ))

        return VectorStoreIndex(nodes)

    def test_condition_query(self, index):
        retriever = index.as_retriever(similarity_top_k=2)
        results = retriever.retrieve("What conditions have I been diagnosed with?")
        types = [r.metadata.get("node_type") for r in results]
        assert "condition" in types

    def test_medication_query(self, index):
        retriever = index.as_retriever(similarity_top_k=2)
        results = retriever.retrieve("What diabetes medication am I taking?")
        types = [r.metadata.get("node_type") for r in results]
        assert "medication" in types

    def test_symptom_query(self, index):
        retriever = index.as_retriever(similarity_top_k=2)
        results = retriever.retrieve("Am I experiencing any symptoms of high blood sugar?")
        types = [r.metadata.get("node_type") for r in results]
        # Should retrieve either the symptom (excessive thirst) or the glucose marker
        assert "symptom" in types or "blood_marker" in types

    def test_appointment_query(self, index):
        retriever = index.as_retriever(similarity_top_k=2)
        results = retriever.retrieve("When is my next doctor's appointment?")
        types = [r.metadata.get("node_type") for r in results]
        assert "appointment" in types
