"""
BloodTestNodeParser transformation fidelity evaluation.

Focused tests for the custom LlamaIndex TransformComponent that converts
raw LlamaParse Documents into clinical TextNodes. Tests cover:

  1. Transformation contract (TransformComponent interface compliance)
  2. Node type production (blood_test, blood_marker, health_state)
  3. Metadata fidelity through the transform chain
  4. Content completeness (all markers present in output nodes)
  5. Derived metric computation at transform time
  6. Edge cases (empty input, non-Document nodes, malformed elements)
  7. Multi-panel documents (lipid + CBC + renal in one test)
  8. Transform idempotency (same input → same output structure)
  9. Embedding integration (transform → embed pipeline compatibility)

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/llamaindex_parser_eval.py -v
"""

from __future__ import annotations

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import make_geval, skip_no_judge

from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.core.schema import MetadataMode, TextNode

from embeddings import (
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
    get_embed_model,
    compute_derived_metrics,
    classify_metric_risk,
)
from parsers import Marker, parse_markers
from ingestion_pipeline import BloodTestNodeParser


# ═══════════════════════════════════════════════════════════════════════
# Test fixtures — diverse blood test panels
# ═══════════════════════════════════════════════════════════════════════

_COMPREHENSIVE_PANEL = [
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
                "<tr><td>WBC</td><td>7.5</td><td>K/uL</td><td>4.0 - 11.0</td></tr>"
                "<tr><td>Hemoglobin</td><td>14.2</td><td>g/dL</td><td>12.0 - 16.0</td></tr>"
                "<tr><td>Neutrophils</td><td>4.5</td><td>K/uL</td><td>1.5 - 7.0</td></tr>"
                "<tr><td>Lymphocytes</td><td>2.0</td><td>K/uL</td><td>1.0 - 3.5</td></tr>"
                "<tr><td>BUN</td><td>28</td><td>mg/dL</td><td>7 - 20</td></tr>"
                "<tr><td>Creatinine</td><td>1.5</td><td>mg/dL</td><td>0.7 - 1.3</td></tr>"
                "<tr><td>AST</td><td>45</td><td>U/L</td><td>0 - 40</td></tr>"
                "<tr><td>ALT</td><td>30</td><td>U/L</td><td>0 - 45</td></tr>"
                "</table>"
            )
        },
    },
]

_ALL_NORMAL_PANEL = [
    {
        "type": "Table",
        "text": "",
        "metadata": {
            "text_as_html": (
                "<table>"
                "<tr><td>Total Cholesterol</td><td>180</td><td>mg/dL</td><td>0 - 200</td></tr>"
                "<tr><td>Triglycerides</td><td>95</td><td>mg/dL</td><td>0 - 150</td></tr>"
                "<tr><td>HDL</td><td>55</td><td>mg/dL</td><td>40 - 60</td></tr>"
                "<tr><td>LDL</td><td>90</td><td>mg/dL</td><td>0 - 100</td></tr>"
                "<tr><td>Glucose</td><td>88</td><td>mg/dL</td><td>70 - 100</td></tr>"
                "</table>"
            )
        },
    },
]

_ROMANIAN_FKV_PANEL = [
    {"type": "Title", "text": "Colesterol Total"},
    {"type": "FormKeysValues", "text": "260 mg/dL (0 - 200)"},
    {"type": "Title", "text": "Trigliceride"},
    {"type": "FormKeysValues", "text": "185 mg/dL (0 - 150)"},
    {"type": "Title", "text": "HDL Colesterol"},
    {"type": "FormKeysValues", "text": "35 mg/dL (40 - 60)"},
    {"type": "Title", "text": "Glicemie"},
    {"type": "FormKeysValues", "text": "140 mg/dL (70 - 100)"},
]

_COMMA_DECIMAL_PANEL = [
    {
        "type": "Table",
        "text": "",
        "metadata": {
            "text_as_html": (
                "<table>"
                "<tr><td>Hemoglobina</td><td>14,2</td><td>g/dL</td><td>12,0 - 16,0</td></tr>"
                "<tr><td>Leucocite</td><td>7,5</td><td>K/uL</td><td>4,0 - 11,0</td></tr>"
                "</table>"
            )
        },
    },
]


def _make_document(elements, test_id="test-1", user_id="user-1", file_name="test.pdf"):
    markers = parse_markers(elements)
    marker_ids = [f"m-{i}" for i in range(len(markers))]
    return Document(
        text="",
        metadata={
            "_raw_elements": elements,
            "_marker_ids": marker_ids,
            "test_id": test_id,
            "user_id": user_id,
            "file_name": file_name,
            "uploaded_at": "2024-01-01T00:00:00Z",
            "test_date": "2024-01-01",
        },
        excluded_embed_metadata_keys=["_raw_elements", "_marker_ids", "test_id", "user_id", "node_type"],
        excluded_llm_metadata_keys=["_raw_elements", "_marker_ids", "test_id", "user_id", "node_type"],
    )


# ═══════════════════════════════════════════════════════════════════════
# A. TransformComponent contract
# ═══════════════════════════════════════════════════════════════════════


class TestTransformContract:
    """Verify BloodTestNodeParser satisfies the LlamaIndex TransformComponent contract."""

    def test_is_transform_component(self):
        parser = BloodTestNodeParser()
        # Should be callable (TransformComponent.__call__)
        assert callable(parser)

    def test_transform_returns_list_of_nodes(self):
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])
        assert isinstance(nodes, list)
        assert all(isinstance(n, (TextNode, Document)) for n in nodes)

    def test_transform_non_document_nodes_passthrough(self):
        """Non-Document nodes should pass through unchanged."""
        text_node = TextNode(text="some random text")
        parser = BloodTestNodeParser()
        result = parser([text_node])
        assert len(result) == 1
        assert result[0] is text_node

    def test_transform_empty_document(self):
        """Document with no parseable markers should pass through."""
        doc = Document(
            text="",
            metadata={
                "_raw_elements": [{"type": "NarrativeText", "text": "No data here", "metadata": {}}],
                "_marker_ids": [],
                "test_id": "test-empty",
                "user_id": "user-1",
                "file_name": "empty.pdf",
                "uploaded_at": "2024-01-01",
                "test_date": "2024-01-01",
            },
        )
        parser = BloodTestNodeParser()
        nodes = parser([doc])
        # Should return the original document when no markers found
        assert len(nodes) >= 1


# ═══════════════════════════════════════════════════════════════════════
# B. Node type production
# ═══════════════════════════════════════════════════════════════════════


class TestNodeTypeProduction:
    """Verify all three node types are produced per blood test."""

    @pytest.fixture
    def nodes(self):
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        return parser([doc])

    def test_produces_blood_test_node(self, nodes):
        bt_nodes = [n for n in nodes if n.metadata.get("node_type") == "blood_test"]
        assert len(bt_nodes) == 1

    def test_produces_blood_marker_nodes(self, nodes):
        marker_nodes = [n for n in nodes if n.metadata.get("node_type") == "blood_marker"]
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        assert len(marker_nodes) == len(markers)

    def test_produces_health_state_node(self, nodes):
        hs_nodes = [n for n in nodes if n.metadata.get("node_type") == "health_state"]
        assert len(hs_nodes) == 1

    def test_total_node_count(self, nodes):
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        # 1 blood_test + N markers + 1 health_state
        expected = 1 + len(markers) + 1
        assert len(nodes) == expected


# ═══════════════════════════════════════════════════════════════════════
# C. Metadata fidelity
# ═══════════════════════════════════════════════════════════════════════


class TestMetadataFidelity:
    """Verify metadata is correctly propagated through the transform."""

    @pytest.fixture
    def nodes(self):
        doc = _make_document(_COMPREHENSIVE_PANEL, test_id="test-xyz", user_id="user-abc", file_name="comprehensive.pdf")
        parser = BloodTestNodeParser()
        return parser([doc])

    def test_blood_test_metadata(self, nodes):
        bt_node = next(n for n in nodes if n.metadata.get("node_type") == "blood_test")
        assert bt_node.metadata["test_id"] == "test-xyz"
        assert bt_node.metadata["user_id"] == "user-abc"
        assert bt_node.metadata["file_name"] == "comprehensive.pdf"
        assert bt_node.metadata["marker_count"] == len(parse_markers(_COMPREHENSIVE_PANEL))

    def test_marker_metadata(self, nodes):
        marker_nodes = [n for n in nodes if n.metadata.get("node_type") == "blood_marker"]
        for node in marker_nodes:
            assert "marker_id" in node.metadata
            assert "marker_name" in node.metadata
            assert "test_id" in node.metadata
            assert "user_id" in node.metadata

    def test_health_state_metadata(self, nodes):
        hs_node = next(n for n in nodes if n.metadata.get("node_type") == "health_state")
        assert hs_node.metadata["test_id"] == "test-xyz"
        assert hs_node.metadata["user_id"] == "user-abc"
        assert "derived_metrics" in hs_node.metadata


# ═══════════════════════════════════════════════════════════════════════
# D. Content completeness
# ═══════════════════════════════════════════════════════════════════════


class TestContentCompleteness:
    """Verify node content contains all expected clinical information."""

    def test_blood_test_content_has_all_markers(self):
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        doc = build_test_document(
            markers,
            {"fileName": "test.pdf", "uploadedAt": "2024-01-01"},
            "test-1", "user-1",
        )
        content = doc.get_content(metadata_mode=MetadataMode.NONE)
        for m in markers:
            assert m.name in content, f"Marker '{m.name}' missing from test document content"

    def test_marker_content_has_value_and_flag(self):
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        ids = [f"m-{i}" for i in range(len(markers))]
        nodes = build_marker_nodes(
            markers, ids, "test-1", "user-1",
            {"fileName": "test.pdf", "testDate": "2024-01-01"},
        )
        for node, marker in zip(nodes, markers):
            content = node.get_content(metadata_mode=MetadataMode.NONE)
            assert marker.value in content
            assert marker.flag in content

    def test_health_state_content_has_derived_metrics(self):
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        derived = compute_derived_metrics(markers)
        node = build_health_state_node(
            markers, "test-1", "user-1",
            {"fileName": "test.pdf", "uploadedAt": "2024-01-01"},
        )
        content = node.get_content(metadata_mode=MetadataMode.NONE)
        # Should contain risk classifications
        for key, val in derived.items():
            if val is not None:
                risk = classify_metric_risk(key, val)
                assert risk in content, f"Risk classification '{risk}' missing from health state content"


# ═══════════════════════════════════════════════════════════════════════
# E. Derived metric computation at transform time
# ═══════════════════════════════════════════════════════════════════════


class TestDerivedMetricsAtTransform:
    """Verify derived metrics are correctly computed during node transformation."""

    def test_comprehensive_panel_metrics(self):
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        ids = [f"m-{i}" for i in range(len(markers))]
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])

        hs_node = next(n for n in nodes if n.metadata.get("node_type") == "health_state")
        dm = hs_node.metadata["derived_metrics"]

        # Lipid ratios
        assert dm["total_cholesterol_hdl_ratio"] is not None
        assert dm["triglyceride_hdl_ratio"] is not None
        assert dm["hdl_ldl_ratio"] is not None
        # TyG index (needs glucose + triglycerides)
        assert dm["glucose_triglyceride_index"] is not None
        # NLR (needs neutrophils + lymphocytes)
        assert dm["neutrophil_lymphocyte_ratio"] is not None
        # BUN/Cr
        assert dm["bun_creatinine_ratio"] is not None
        # De Ritis
        assert dm["ast_alt_ratio"] is not None

    def test_all_normal_panel_metrics(self):
        markers = parse_markers(_ALL_NORMAL_PANEL)
        doc = _make_document(_ALL_NORMAL_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])

        hs_node = next(n for n in nodes if n.metadata.get("node_type") == "health_state")
        dm = hs_node.metadata["derived_metrics"]

        # All-normal should have optimal classifications
        assert classify_metric_risk("total_cholesterol_hdl_ratio", dm["total_cholesterol_hdl_ratio"]) == "optimal"
        assert classify_metric_risk("triglyceride_hdl_ratio", dm["triglyceride_hdl_ratio"]) == "optimal"

    def test_abnormal_count_in_test_node(self):
        markers = parse_markers(_COMPREHENSIVE_PANEL)
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])

        bt_node = next(n for n in nodes if n.metadata.get("node_type") == "blood_test")
        assert bt_node.metadata["abnormal_count"] > 0

    def test_zero_abnormal_count_for_normal_panel(self):
        markers = parse_markers(_ALL_NORMAL_PANEL)
        doc = _make_document(_ALL_NORMAL_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])

        bt_node = next(n for n in nodes if n.metadata.get("node_type") == "blood_test")
        assert bt_node.metadata["abnormal_count"] == 0


# ═══════════════════════════════════════════════════════════════════════
# F. Edge cases
# ═══════════════════════════════════════════════════════════════════════


class TestEdgeCases:
    """Test edge cases and robustness of the parser transform."""

    def test_romanian_fkv_format(self):
        """Romanian FormKeysValues format should produce marker nodes."""
        doc = _make_document(_ROMANIAN_FKV_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])
        marker_nodes = [n for n in nodes if n.metadata.get("node_type") == "blood_marker"]
        assert len(marker_nodes) > 0
        # Should find Colesterol, Trigliceride, HDL, Glicemie
        names = [n.metadata["marker_name"] for n in marker_nodes]
        assert any("Colesterol" in n for n in names)

    def test_comma_decimal_values(self):
        """European comma decimals should be correctly parsed."""
        doc = _make_document(_COMMA_DECIMAL_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])
        marker_nodes = [n for n in nodes if n.metadata.get("node_type") == "blood_marker"]
        assert len(marker_nodes) > 0
        # Values should be parseable (14,2 → 14.2)
        for node in marker_nodes:
            content = node.get_content(metadata_mode=MetadataMode.NONE)
            assert "Value:" in content

    def test_multiple_documents_in_transform(self):
        """Transform should handle multiple Documents in the input list."""
        doc1 = _make_document(_COMPREHENSIVE_PANEL, test_id="test-1")
        doc2 = _make_document(_ALL_NORMAL_PANEL, test_id="test-2")
        parser = BloodTestNodeParser()
        nodes = parser([doc1, doc2])
        # Should produce nodes for both tests
        test_ids = {n.metadata.get("test_id") for n in nodes}
        assert "test-1" in test_ids
        assert "test-2" in test_ids


# ═══════════════════════════════════════════════════════════════════════
# G. Transform idempotency
# ═══════════════════════════════════════════════════════════════════════


class TestTransformIdempotency:
    """Verify the transform produces consistent results across runs."""

    def test_same_input_same_node_count(self):
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes1 = parser([doc])
        nodes2 = parser([_make_document(_COMPREHENSIVE_PANEL)])
        assert len(nodes1) == len(nodes2)

    def test_same_input_same_node_types(self):
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes1 = parser([doc])
        nodes2 = parser([_make_document(_COMPREHENSIVE_PANEL)])
        types1 = sorted(n.metadata.get("node_type") for n in nodes1)
        types2 = sorted(n.metadata.get("node_type") for n in nodes2)
        assert types1 == types2

    def test_same_input_same_derived_metrics(self):
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes1 = parser([doc])
        nodes2 = parser([_make_document(_COMPREHENSIVE_PANEL)])
        hs1 = next(n for n in nodes1 if n.metadata.get("node_type") == "health_state")
        hs2 = next(n for n in nodes2 if n.metadata.get("node_type") == "health_state")
        assert hs1.metadata["derived_metrics"] == hs2.metadata["derived_metrics"]


# ═══════════════════════════════════════════════════════════════════════
# H. Embedding integration compatibility
# ═══════════════════════════════════════════════════════════════════════


class TestEmbeddingIntegration:
    """Verify transformed nodes work correctly with LlamaIndex embedding pipeline."""

    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    @pytest.fixture(scope="class")
    def transformed_nodes(self, embed_model):
        """Transform a document and return nodes with embeddings."""
        Settings.embed_model = embed_model
        doc = _make_document(_COMPREHENSIVE_PANEL)
        parser = BloodTestNodeParser()
        nodes = parser([doc])

        # Generate embeddings for all nodes
        for node in nodes:
            if isinstance(node, (TextNode, Document)):
                content = node.get_content(metadata_mode=MetadataMode.EMBED)
                node.embedding = embed_model.get_text_embedding(content)

        return nodes

    def test_all_nodes_have_embeddings(self, transformed_nodes):
        for node in transformed_nodes:
            if isinstance(node, (TextNode, Document)):
                assert node.embedding is not None, f"Node {node.id_ if hasattr(node, 'id_') else 'unknown'} has no embedding"

    def test_embedding_dimension(self, transformed_nodes):
        for node in transformed_nodes:
            if isinstance(node, (TextNode, Document)) and node.embedding:
                assert len(node.embedding) == 1024

    def test_transformed_nodes_indexable(self, transformed_nodes, embed_model):
        """Transformed nodes should be indexable in VectorStoreIndex."""
        Settings.embed_model = embed_model
        index = VectorStoreIndex(transformed_nodes)
        assert index is not None

    def test_retrieval_from_transformed_nodes(self, transformed_nodes, embed_model):
        """Should be able to retrieve specific markers from transformed nodes."""
        Settings.embed_model = embed_model
        index = VectorStoreIndex(transformed_nodes)
        retriever = index.as_retriever(similarity_top_k=5)
        results = retriever.retrieve("What is my cholesterol? Total, HDL, LDL?")
        assert len(results) > 0
        texts = [r.get_content() for r in results]
        assert any("Cholesterol" in t or "HDL" in t or "LDL" in t for t in texts)


# ═══════════════════════════════════════════════════════════════════════
# I. DeepEval — LLM-judged transform quality
# ═══════════════════════════════════════════════════════════════════════


@skip_no_judge
def test_transform_output_completeness_llm_judged():
    """LLM judges whether the transform output contains all clinical information."""
    markers = parse_markers(_COMPREHENSIVE_PANEL)
    doc = build_test_document(
        markers,
        {"fileName": "comprehensive.pdf", "uploadedAt": "2024-01-01"},
        "test-1", "user-1",
    )
    metric = make_geval(
        name="Transform Completeness",
        criteria=(
            "Given a transformed blood test document (actual_output), evaluate whether "
            "it contains all essential clinical information from the original test: "
            "all marker names, values, units, reference ranges, and flags. The summary "
            "should correctly count abnormal markers. Missing data or incorrect values "
            "reduce the score."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        threshold=0.7,
    )
    expected = (
        "Blood test: comprehensive.pdf with 13 markers including Total Cholesterol 245 [high], "
        "Triglycerides 210 [high], HDL 38 [low], LDL 155 [high], Glucose 130 [high], "
        "BUN 28 [high], Creatinine 1.5 [high], AST 45 [high], and normal WBC, Hemoglobin, "
        "Neutrophils, Lymphocytes, ALT."
    )
    test_case = LLMTestCase(
        input="Transform comprehensive blood test with 13 markers",
        actual_output=doc.get_content(metadata_mode=MetadataMode.NONE),
        expected_output=expected,
    )
    assert_test(test_case, [metric])


@skip_no_judge
def test_health_state_derived_metrics_llm_judged():
    """LLM judges whether health state node has correct derived metrics."""
    markers = parse_markers(_COMPREHENSIVE_PANEL)
    derived = compute_derived_metrics(markers)
    node = build_health_state_node(
        markers, "test-1", "user-1",
        {"fileName": "comprehensive.pdf", "uploadedAt": "2024-01-01"},
    )
    metric = make_geval(
        name="Derived Metrics Quality",
        criteria=(
            "Given a health state embedding text (actual_output), evaluate whether it "
            "correctly includes all computable derived metrics with their risk classifications. "
            "For this comprehensive panel, the following should be present: TC/HDL ratio "
            "(elevated), TG/HDL ratio (elevated), HDL/LDL ratio, TyG Index, NLR (optimal), "
            "BUN/Creatinine ratio (elevated), and De Ritis ratio (borderline). Each metric "
            "should have its correct risk label."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        threshold=0.7,
    )
    expected_parts = [
        "TC/HDL", "TG/HDL", "HDL/LDL", "TyG", "NLR", "BUN/Creatinine", "De Ritis",
    ]
    test_case = LLMTestCase(
        input="Build health state embedding for comprehensive panel",
        actual_output=node.get_content(metadata_mode=MetadataMode.NONE),
        expected_output="Health state with all 7 derived metrics and risk classifications: " + ", ".join(expected_parts),
    )
    assert_test(test_case, [metric])
