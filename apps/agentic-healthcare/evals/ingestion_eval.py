"""
LlamaIndex IngestionPipeline evaluation — end-to-end ingestion quality.

Tests that the BloodTestNodeParser + FastEmbedEmbedding pipeline correctly:
  1. Transforms raw Unstructured elements into LlamaIndex nodes
  2. Produces the right number and types of nodes (test, marker, health_state)
  3. Embeds each node with the correct dimensionality
  4. Preserves metadata through the pipeline
  5. Generates embeddings that cluster semantically (similar markers close)

Uses DeepEval for LLM-judged embedding quality and retrieval relevance.

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/ingestion_eval.py -v
"""

from __future__ import annotations

import numpy as np
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import make_geval, skip_no_judge

from llama_index.core import VectorStoreIndex, Settings
from llama_index.core.schema import Document, TextNode, MetadataMode

from conftest import get_embed_model
from embeddings import (
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
)
from parsers import Marker, parse_markers


# ═══════════════════════════════════════════════════════════════════════
# Test fixtures
# ═══════════════════════════════════════════════════════════════════════

_LIPID_ELEMENTS = [
    {
        "type": "Table",
        "text": "",
        "metadata": {
            "text_as_html": (
                "<table>"
                "<tr><td>Total Cholesterol</td><td>245</td><td>mg/dL</td><td>0 - 200</td></tr>"
                "<tr><td>Triglycerides</td><td>210</td><td>mg/dL</td><td>0 - 150</td></tr>"
                "<tr><td>HDL</td><td>38</td><td>mg/dL</td><td>40 - 60</td></tr>"
                "<tr><td>LDL</td><td>155</td><td>mg/dL</td><td>0 - 100</td></tr>"
                "<tr><td>Glucose</td><td>130</td><td>mg/dL</td><td>70 - 100</td></tr>"
                "</table>"
            )
        },
    },
]

_CBC_ELEMENTS = [
    {
        "type": "Table",
        "text": "",
        "metadata": {
            "text_as_html": (
                "<table>"
                "<tr><td>WBC</td><td>7.5</td><td>K/uL</td><td>4.0 - 11.0</td></tr>"
                "<tr><td>Hemoglobin</td><td>14.2</td><td>g/dL</td><td>12.0 - 16.0</td></tr>"
                "<tr><td>Platelets</td><td>280</td><td>K/uL</td><td>150 - 400</td></tr>"
                "<tr><td>Neutrophils</td><td>4.5</td><td>K/uL</td><td>1.5 - 7.0</td></tr>"
                "<tr><td>Lymphocytes</td><td>2.0</td><td>K/uL</td><td>1.0 - 3.5</td></tr>"
                "</table>"
            )
        },
    },
]

_RENAL_ELEMENTS = [
    {"type": "Title", "text": "BUN"},
    {"type": "FormKeysValues", "text": "28 mg/dL (7 - 20)"},
    {"type": "Title", "text": "Creatinine"},
    {"type": "FormKeysValues", "text": "1.5 mg/dL (0.7 - 1.3)"},
    {"type": "Title", "text": "Sodium"},
    {"type": "FormKeysValues", "text": "140 mEq/L (136 - 145)"},
]


# ═══════════════════════════════════════════════════════════════════════
# A. Node builder tests — correct structure and metadata
# ═══════════════════════════════════════════════════════════════════════


class TestBuildTestDocument:
    def test_produces_document(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        doc = build_test_document(
            markers,
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
            "test-123", "user-456",
        )
        assert isinstance(doc, Document)
        assert doc.metadata["node_type"] == "blood_test"
        assert doc.metadata["test_id"] == "test-123"
        assert doc.metadata["user_id"] == "user-456"
        assert doc.metadata["marker_count"] == 5
        assert doc.metadata["abnormal_count"] > 0

    def test_content_has_summary(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        doc = build_test_document(
            markers,
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
            "test-123", "user-456",
        )
        text = doc.get_content(metadata_mode=MetadataMode.NONE)
        assert "Blood test: lipid.pdf" in text
        assert "abnormal marker" in text

    def test_all_normal_summary(self):
        markers = parse_markers(_CBC_ELEMENTS)
        doc = build_test_document(
            markers,
            {"fileName": "cbc.pdf", "uploadedAt": "2024-01-01"},
            "test-abc", "user-def",
        )
        text = doc.get_content(metadata_mode=MetadataMode.NONE)
        assert "All markers within normal range" in text


class TestBuildMarkerNodes:
    def test_one_node_per_marker(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        ids = [f"m-{i}" for i in range(len(markers))]
        nodes = build_marker_nodes(
            markers, ids, "test-1", "user-1",
            {"fileName": "lipid.pdf", "testDate": "2024-01-01"},
        )
        assert len(nodes) == len(markers)
        assert all(isinstance(n, TextNode) for n in nodes)

    def test_marker_metadata(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        ids = [f"m-{i}" for i in range(len(markers))]
        nodes = build_marker_nodes(
            markers, ids, "test-1", "user-1",
            {"fileName": "lipid.pdf", "testDate": "2024-01-01"},
        )
        for node, marker, mid in zip(nodes, markers, ids):
            assert node.metadata["marker_id"] == mid
            assert node.metadata["marker_name"] == marker.name
            assert node.metadata["node_type"] == "blood_marker"

    def test_marker_content(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        ids = [f"m-{i}" for i in range(len(markers))]
        nodes = build_marker_nodes(
            markers, ids, "test-1", "user-1",
            {"fileName": "lipid.pdf", "testDate": "2024-01-01"},
        )
        hdl_node = next(n for n in nodes if n.metadata["marker_name"] == "HDL")
        text = hdl_node.get_content(metadata_mode=MetadataMode.NONE)
        assert "Marker: HDL" in text
        assert "38" in text


class TestBuildHealthStateNode:
    def test_produces_text_node(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        node = build_health_state_node(
            markers, "test-1", "user-1",
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
        )
        assert isinstance(node, TextNode)
        assert node.metadata["node_type"] == "health_state"

    def test_contains_derived_metrics(self):
        markers = parse_markers(_LIPID_ELEMENTS)
        node = build_health_state_node(
            markers, "test-1", "user-1",
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
        )
        dm = node.metadata.get("derived_metrics", {})
        # Lipid panel should compute TC/HDL, TG/HDL, HDL/LDL
        assert "total_cholesterol_hdl_ratio" in dm
        assert "triglyceride_hdl_ratio" in dm
        assert "hdl_ldl_ratio" in dm

    def test_renal_panel_computes_bun_cr(self):
        markers = parse_markers(_RENAL_ELEMENTS)
        node = build_health_state_node(
            markers, "test-2", "user-1",
            {"fileName": "renal.pdf", "uploadedAt": "2024-01-01"},
        )
        dm = node.metadata.get("derived_metrics", {})
        assert "bun_creatinine_ratio" in dm
        assert dm["bun_creatinine_ratio"] == pytest.approx(28 / 1.5, rel=0.01)


# ═══════════════════════════════════════════════════════════════════════
# B. Embedding dimension and quality tests
# ═══════════════════════════════════════════════════════════════════════


class TestEmbeddingDimension:
    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    def test_dimension_1024(self, embed_model):
        vec = embed_model.get_text_embedding("HDL Cholesterol: 55 mg/dL")
        assert len(vec) == 1024

    def test_deterministic(self, embed_model):
        text = "Glucose: 95 mg/dL (ref: 70 - 100) [normal]"
        v1 = embed_model.get_text_embedding(text)
        v2 = embed_model.get_text_embedding(text)
        np.testing.assert_allclose(v1, v2, atol=1e-6)


class TestEmbeddingSemanticClustering:
    """Verify that semantically similar markers embed closer together."""

    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    @staticmethod
    def _cosine_sim(a: list[float], b: list[float]) -> float:
        va, vb = np.array(a), np.array(b)
        return float(np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb)))

    def test_lipid_markers_cluster(self, embed_model):
        hdl = embed_model.get_text_embedding("Marker: HDL Cholesterol\nValue: 55 mg/dL\nFlag: normal")
        ldl = embed_model.get_text_embedding("Marker: LDL Cholesterol\nValue: 130 mg/dL\nFlag: high")
        nlr = embed_model.get_text_embedding("Marker: Neutrophil-to-Lymphocyte Ratio\nValue: 6.5\nFlag: elevated")

        sim_lipid = self._cosine_sim(hdl, ldl)
        sim_cross = self._cosine_sim(hdl, nlr)
        # Lipid markers should be closer to each other than to an inflammatory marker
        assert sim_lipid > sim_cross

    def test_renal_markers_cluster(self, embed_model):
        bun = embed_model.get_text_embedding(
            "Marker: BUN (Blood Urea Nitrogen)\nValue: 22 mg/dL\nReference: 7-20\nFlag: high\nKidney function marker"
        )
        creat = embed_model.get_text_embedding(
            "Marker: Creatinine\nValue: 1.5 mg/dL\nReference: 0.7-1.3\nFlag: high\nKidney function marker"
        )
        glucose = embed_model.get_text_embedding(
            "Marker: Glucose\nValue: 250 mg/dL\nReference: 70-100\nFlag: high\nMetabolic blood sugar marker"
        )

        sim_renal = self._cosine_sim(bun, creat)
        sim_cross = self._cosine_sim(bun, glucose)
        assert sim_renal > sim_cross

    def test_normal_vs_abnormal_differentiation(self, embed_model):
        normal = embed_model.get_text_embedding(
            "Blood test summary: All markers within normal range\nGlucose: 88 [normal], HDL: 55 [normal]"
        )
        abnormal = embed_model.get_text_embedding(
            "Blood test summary: 5 abnormal markers\nGlucose: 250 [high], HDL: 28 [low], NLR: 8.0 [elevated]"
        )
        sim = self._cosine_sim(normal, abnormal)
        # Different clinical states should have lower similarity
        assert sim < 0.95


# ═══════════════════════════════════════════════════════════════════════
# C. LlamaIndex VectorStoreIndex retrieval quality
# ═══════════════════════════════════════════════════════════════════════


class TestRetrievalQuality:
    """Test that embedded nodes can be retrieved by semantic query."""

    @pytest.fixture(scope="class")
    def index(self):
        # Build a small in-memory index from test nodes
        Settings.embed_model = get_embed_model()

        markers_lipid = parse_markers(_LIPID_ELEMENTS)
        markers_cbc = parse_markers(_CBC_ELEMENTS)
        markers_renal = parse_markers(_RENAL_ELEMENTS)

        nodes: list[TextNode] = []

        # Lipid test document
        nodes.append(build_test_document(
            markers_lipid,
            {"fileName": "lipid_panel.pdf", "uploadedAt": "2024-01-01"},
            "test-lipid", "user-1",
        ))

        # CBC test document
        nodes.append(build_test_document(
            markers_cbc,
            {"fileName": "cbc_panel.pdf", "uploadedAt": "2024-01-15"},
            "test-cbc", "user-1",
        ))

        # Renal test document
        nodes.append(build_test_document(
            markers_renal,
            {"fileName": "renal_panel.pdf", "uploadedAt": "2024-02-01"},
            "test-renal", "user-1",
        ))

        # Individual marker nodes
        lipid_ids = [f"lm-{i}" for i in range(len(markers_lipid))]
        nodes.extend(build_marker_nodes(
            markers_lipid, lipid_ids, "test-lipid", "user-1",
            {"fileName": "lipid_panel.pdf", "testDate": "2024-01-01"},
        ))

        cbc_ids = [f"cm-{i}" for i in range(len(markers_cbc))]
        nodes.extend(build_marker_nodes(
            markers_cbc, cbc_ids, "test-cbc", "user-1",
            {"fileName": "cbc_panel.pdf", "testDate": "2024-01-15"},
        ))

        renal_ids = [f"rm-{i}" for i in range(len(markers_renal))]
        nodes.extend(build_marker_nodes(
            markers_renal, renal_ids, "test-renal", "user-1",
            {"fileName": "renal_panel.pdf", "testDate": "2024-02-01"},
        ))

        # Health state nodes
        nodes.append(build_health_state_node(
            markers_lipid, "test-lipid", "user-1",
            {"fileName": "lipid_panel.pdf", "uploadedAt": "2024-01-01"},
        ))

        return VectorStoreIndex(nodes)

    def test_cholesterol_query_retrieves_lipid(self, index):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("What are my cholesterol levels?")
        texts = [r.get_content() for r in results]
        assert any("Cholesterol" in t or "HDL" in t or "LDL" in t for t in texts)

    def test_kidney_query_retrieves_renal(self, index):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("How is my kidney function?")
        texts = [r.get_content() for r in results]
        assert any("BUN" in t or "Creatinine" in t for t in texts)

    def test_blood_count_query_retrieves_cbc(self, index):
        retriever = index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("What is my white blood cell count?")
        texts = [r.get_content() for r in results]
        assert any("WBC" in t or "Neutrophils" in t or "Hemoglobin" in t for t in texts)

    def test_inflammation_query_retrieves_nlr_markers(self, index):
        retriever = index.as_retriever(similarity_top_k=5)
        results = retriever.retrieve("Do I have any signs of inflammation?")
        texts = [r.get_content() for r in results]
        assert any("Neutrophils" in t or "Lymphocytes" in t for t in texts)

    def test_metabolic_query_retrieves_glucose_tg(self, index):
        retriever = index.as_retriever(similarity_top_k=5)
        results = retriever.retrieve("Am I at risk for metabolic syndrome?")
        texts = [r.get_content() for r in results]
        assert any("Glucose" in t or "Triglycerides" in t or "TG/HDL" in t for t in texts)


# ═══════════════════════════════════════════════════════════════════════
# D. DeepEval — node content quality (LLM-judged)
# ═══════════════════════════════════════════════════════════════════════


@skip_no_judge
def test_test_document_content_quality():
    markers = parse_markers(_LIPID_ELEMENTS)
    doc = build_test_document(
        markers,
        {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
        "test-1", "user-1",
    )
    metric = make_geval(
        name="Node Content Quality",
        criteria=(
            "Given a formatted blood test node (actual_output), evaluate whether it "
            "contains all essential clinical information: marker names, numeric values, "
            "units, reference ranges, and abnormal flags. The format should be structured "
            "and machine-readable while remaining clinically informative. Missing "
            "values or ambiguous formatting reduce the score."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        threshold=0.7,
    )
    test_case = LLMTestCase(
        input="Build test document for a lipid panel with 5 markers",
        actual_output=doc.get_content(metadata_mode=MetadataMode.NONE),
        expected_output=(
            "A structured blood test summary containing: Total Cholesterol 245 [high], "
            "Triglycerides 210 [high], HDL 38 [low], LDL 155 [high], Glucose 130 [high], "
            "with a summary noting 5 abnormal markers."
        ),
    )
    assert_test(test_case, [metric])


@skip_no_judge
def test_health_state_content_completeness():
    markers = parse_markers(_LIPID_ELEMENTS)
    node = build_health_state_node(
        markers, "test-1", "user-1",
        {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
    )
    metric = make_geval(
        name="Health State Completeness",
        criteria=(
            "Given a health state embedding text (actual_output), evaluate whether it "
            "includes: (1) all marker values, (2) computed derived ratios with risk "
            "classifications, (3) a summary of abnormal findings, and (4) metadata "
            "(file name, date). All computable ratios from the available markers should "
            "be present."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        threshold=0.7,
    )
    test_case = LLMTestCase(
        input="Build health state embedding for a lipid panel",
        actual_output=node.get_content(metadata_mode=MetadataMode.NONE),
        expected_output=(
            "A health state document containing: all 5 marker values with flags, "
            "derived ratios including TC/HDL (elevated), TG/HDL (elevated), "
            "HDL/LDL (low risk), and TyG index, each with risk classification. "
            "Summary should note 5 abnormal markers."
        ),
    )
    assert_test(test_case, [metric])
