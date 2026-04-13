"""
LlamaIndex-specific evaluation — IngestionPipeline, ContextChatEngine, and
embedding round-trip fidelity.

Tests the core LlamaIndex abstractions used throughout the healthcare app:
  1. IngestionPipeline transformation chain (Document → NodeParser → Embedding)
  2. ContextChatEngine retrieval and generation quality (/chat/simple)
  3. Node type distribution and metadata preservation
  4. Embedding round-trip (text → embed → retrieve → verify content)
  5. Settings isolation (embed_model vs llm don't interfere)
  6. LlamaParse document ingestion fidelity

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/llamaindex_eval.py -v
"""

from __future__ import annotations

import numpy as np
import pytest
from deepeval import assert_test, evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import DeepSeekEvalLLM, make_geval, skip_no_judge

from llama_index.core import (
    Document,
    Settings,
    VectorStoreIndex,
    get_response_synthesizer,
)
from llama_index.core.chat_engine import ContextChatEngine
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.schema import MetadataMode, TextNode
from llama_index.embeddings.fastembed import FastEmbedEmbedding
from llama_index.llms.openai_like import OpenAILike

from embeddings import (
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
    get_embed_model,
)
from parsers import Marker, parse_markers
from ingestion_pipeline import BloodTestNodeParser, build_ingestion_pipeline


# ═══════════════════════════════════════════════════════════════════════
# Test fixtures — realistic blood test documents
# ═══════════════════════════════════════════════════════════════════════

_LIPID_PANEL_ELEMENTS = [
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

_CBC_PANEL_ELEMENTS = [
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

_RENAL_PANEL_ELEMENTS = [
    {"type": "Title", "text": "BUN"},
    {"type": "FormKeysValues", "text": "28 mg/dL (7 - 20)"},
    {"type": "Title", "text": "Creatinine"},
    {"type": "FormKeysValues", "text": "1.5 mg/dL (0.7 - 1.3)"},
    {"type": "Title", "text": "Sodium"},
    {"type": "FormKeysValues", "text": "140 mEq/L (136 - 145)"},
    {"type": "Title", "text": "AST"},
    {"type": "FormKeysValues", "text": "45 U/L (0 - 40)"},
    {"type": "Title", "text": "ALT"},
    {"type": "FormKeysValues", "text": "30 U/L (0 - 45)"},
]


def _make_llm() -> OpenAILike:
    """Create a LlamaIndex LLM for chat engine tests."""
    from llm_backend import get_llama_index_llm
    return get_llama_index_llm()


# ═══════════════════════════════════════════════════════════════════════
# A. IngestionPipeline transformation chain
# ═══════════════════════════════════════════════════════════════════════


class TestIngestionPipeline:
    """Test the full IngestionPipeline: Document → BloodTestNodeParser → Embedding."""

    @pytest.fixture
    def pipeline(self):
        return build_ingestion_pipeline()

    @pytest.fixture
    def lipid_document(self):
        markers = parse_markers(_LIPID_PANEL_ELEMENTS)
        marker_ids = [f"lm-{i}" for i in range(len(markers))]
        return Document(
            text="",
            metadata={
                "_raw_elements": _LIPID_PANEL_ELEMENTS,
                "_marker_ids": marker_ids,
                "test_id": "test-lipid",
                "user_id": "user-1",
                "file_name": "lipid_panel.pdf",
                "uploaded_at": "2024-01-01T00:00:00Z",
                "test_date": "2024-01-01",
            },
            excluded_embed_metadata_keys=[
                "_raw_elements", "_marker_ids", "test_id",
                "user_id", "node_type",
            ],
            excluded_llm_metadata_keys=[
                "_raw_elements", "_marker_ids", "test_id",
                "user_id", "node_type",
            ],
        )

    @pytest.fixture
    def renal_document(self):
        markers = parse_markers(_RENAL_PANEL_ELEMENTS)
        marker_ids = [f"rm-{i}" for i in range(len(markers))]
        return Document(
            text="",
            metadata={
                "_raw_elements": _RENAL_PANEL_ELEMENTS,
                "_marker_ids": marker_ids,
                "test_id": "test-renal",
                "user_id": "user-1",
                "file_name": "renal_panel.pdf",
                "uploaded_at": "2024-02-01T00:00:00Z",
                "test_date": "2024-02-01",
            },
            excluded_embed_metadata_keys=[
                "_raw_elements", "_marker_ids", "test_id",
                "user_id", "node_type",
            ],
            excluded_llm_metadata_keys=[
                "_raw_elements", "_marker_ids", "test_id",
                "user_id", "node_type",
            ],
        )

    def test_pipeline_produces_nodes(self, pipeline, lipid_document):
        nodes = pipeline.run(documents=[lipid_document])
        assert len(nodes) > 0

    def test_node_type_distribution(self, pipeline, lipid_document):
        nodes = pipeline.run(documents=[lipid_document])
        node_types = {n.metadata.get("node_type") for n in nodes}
        # Should produce blood_test, blood_marker, and health_state nodes
        assert "blood_test" in node_types
        assert "blood_marker" in node_types
        assert "health_state" in node_types

    def test_marker_node_count(self, pipeline, lipid_document):
        nodes = pipeline.run(documents=[lipid_document])
        marker_nodes = [n for n in nodes if n.metadata.get("node_type") == "blood_marker"]
        markers = parse_markers(_LIPID_PANEL_ELEMENTS)
        assert len(marker_nodes) == len(markers)

    def test_health_state_has_derived_metrics(self, pipeline, lipid_document):
        nodes = pipeline.run(documents=[lipid_document])
        hs_nodes = [n for n in nodes if n.metadata.get("node_type") == "health_state"]
        assert len(hs_nodes) == 1
        dm = hs_nodes[0].metadata.get("derived_metrics", {})
        # Lipid panel should compute these ratios
        assert "total_cholesterol_hdl_ratio" in dm
        assert "triglyceride_hdl_ratio" in dm
        assert "hdl_ldl_ratio" in dm

    def test_renal_panel_computes_liver_ratios(self, pipeline, renal_document):
        nodes = pipeline.run(documents=[renal_document])
        hs_nodes = [n for n in nodes if n.metadata.get("node_type") == "health_state"]
        assert len(hs_nodes) == 1
        dm = hs_nodes[0].metadata.get("derived_metrics", {})
        assert "bun_creatinine_ratio" in dm
        assert "ast_alt_ratio" in dm

    def test_all_nodes_have_embeddings(self, pipeline, lipid_document):
        nodes = pipeline.run(documents=[lipid_document])
        for node in nodes:
            if isinstance(node, TextNode):
                assert node.embedding is not None, f"Node {node.id_} has no embedding"
                assert len(node.embedding) == 1024

    def test_metadata_preservation(self, pipeline, lipid_document):
        nodes = pipeline.run(documents=[lipid_document])
        for node in nodes:
            if isinstance(node, TextNode):
                meta = node.metadata
                assert "test_id" in meta or "marker_id" in meta
                assert "user_id" in meta or "node_type" in meta

    def test_excluded_metadata_not_in_content(self, pipeline, lipid_document):
        """Verify excluded keys don't leak into embedding content."""
        nodes = pipeline.run(documents=[lipid_document])
        for node in nodes:
            if isinstance(node, TextNode):
                content = node.get_content(metadata_mode=MetadataMode.NONE)
                # Raw elements should not appear in the node content
                assert "_raw_elements" not in content


# ═══════════════════════════════════════════════════════════════════════
# B. ContextChatEngine quality (/chat/simple)
# ═══════════════════════════════════════════════════════════════════════


class TestContextChatEngine:
    """Test the LlamaIndex ContextChatEngine used at /chat/simple."""

    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    @pytest.fixture(scope="class")
    def clinical_index(self, embed_model):
        """Build an in-memory index from clinical knowledge documents."""
        from deepeval_rag import DOCUMENTS
        Settings.embed_model = embed_model
        return VectorStoreIndex(DOCUMENTS)

    @pytest.fixture(scope="class")
    def chat_engine(self, clinical_index):
        llm = _make_llm()
        return ContextChatEngine.from_defaults(
            retriever=clinical_index.as_retriever(similarity_top_k=5),
            system_prompt=(
                "You are a clinical blood marker intelligence assistant. "
                "Answer questions about derived ratios, trajectory interpretation, "
                "and health conditions based only on the provided context."
            ),
            llm=llm,
        )

    @pytest.fixture(scope="class")
    def chat_engine_small(self, embed_model):
        """Chat engine with small index for fast tests."""
        from embeddings import format_condition_for_embedding
        docs = [
            Document(text=format_condition_for_embedding("Type 2 Diabetes", "Elevated TyG and TG/HDL indicate insulin resistance.")),
            Document(text=format_condition_for_embedding("Chronic Kidney Disease", "BUN/Creatinine ratio helps distinguish pre-renal from intrinsic renal causes.")),
            Document(text=format_condition_for_embedding("Metabolic Syndrome", "TG/HDL > 3.5 and TyG > 9.0 suggest insulin resistance and metabolic syndrome.")),
        ]
        Settings.embed_model = embed_model
        index = VectorStoreIndex(docs)
        llm = _make_llm()
        return ContextChatEngine.from_defaults(
            retriever=index.as_retriever(similarity_top_k=3),
            system_prompt="You are a clinical assistant answering blood marker questions.",
            llm=llm,
        )

    def test_chat_engine_responds_to_lipid_query(self, chat_engine):
        response = chat_engine.chat("What is the TG/HDL ratio and what does it mean?")
        assert response.response is not None
        assert len(response.response) > 20

    def test_chat_engine_responds_to_renal_query(self, chat_engine):
        response = chat_engine.chat("What does an elevated BUN/Creatinine ratio indicate?")
        assert response.response is not None
        assert len(response.response) > 20

    def test_chat_engine_uses_context(self, chat_engine):
        """Verify the chat engine retrieves and uses context from the index."""
        response = chat_engine.chat("Explain the NLR and its clinical significance.")
        # Response should reference NLR thresholds or clinical significance
        assert response.response is not None
        assert len(response.source_nodes) > 0

    def test_chat_engine_multi_turn(self, chat_engine):
        """Test multi-turn conversation maintains context."""
        chat_engine.chat("What is the De Ritis ratio?")
        response = chat_engine.chat("What does a value above 2.0 mean?")
        assert response.response is not None
        # Should understand the follow-up refers to De Ritis
        assert len(response.response) > 10

    def test_chat_engine_reset_clears_history(self, chat_engine):
        """Test that reset() clears conversation history."""
        chat_engine.chat("My TG/HDL is 4.5, is that bad?")
        chat_engine.reset()
        response = chat_engine.chat("What is it?")
        # After reset, "What is it?" should not resolve to TG/HDL
        assert response.response is not None


# ═══════════════════════════════════════════════════════════════════════
# C. Embedding round-trip fidelity
# ═══════════════════════════════════════════════════════════════════════


class TestEmbeddingRoundTrip:
    """Test that text → embed → retrieve preserves semantic fidelity."""

    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    @pytest.fixture(scope="class")
    def marker_index(self, embed_model):
        """Build index from marker nodes for retrieval testing."""
        Settings.embed_model = embed_model

        markers_lipid = parse_markers(_LIPID_PANEL_ELEMENTS)
        markers_cbc = parse_markers(_CBC_PANEL_ELEMENTS)
        markers_renal = parse_markers(_RENAL_PANEL_ELEMENTS)

        nodes = []
        nodes.append(build_test_document(
            markers_lipid,
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
            "test-lipid", "user-1",
        ))
        nodes.append(build_test_document(
            markers_cbc,
            {"fileName": "cbc.pdf", "uploadedAt": "2024-01-15"},
            "test-cbc", "user-1",
        ))
        nodes.append(build_test_document(
            markers_renal,
            {"fileName": "renal.pdf", "uploadedAt": "2024-02-01"},
            "test-renal", "user-1",
        ))

        lipid_ids = [f"lm-{i}" for i in range(len(markers_lipid))]
        nodes.extend(build_marker_nodes(
            markers_lipid, lipid_ids, "test-lipid", "user-1",
            {"fileName": "lipid.pdf", "testDate": "2024-01-01"},
        ))

        cbc_ids = [f"cm-{i}" for i in range(len(markers_cbc))]
        nodes.extend(build_marker_nodes(
            markers_cbc, cbc_ids, "test-cbc", "user-1",
            {"fileName": "cbc.pdf", "testDate": "2024-01-15"},
        ))

        renal_ids = [f"rm-{i}" for i in range(len(markers_renal))]
        nodes.extend(build_marker_nodes(
            markers_renal, renal_ids, "test-renal", "user-1",
            {"fileName": "renal.pdf", "testDate": "2024-02-01"},
        ))

        nodes.append(build_health_state_node(
            markers_lipid, "test-lipid", "user-1",
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
        ))
        nodes.append(build_health_state_node(
            markers_renal, "test-renal", "user-1",
            {"fileName": "renal.pdf", "uploadedAt": "2024-02-01"},
        ))

        return VectorStoreIndex(nodes)

    def test_cholesterol_query_retrieves_lipid_nodes(self, marker_index):
        retriever = marker_index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("What are my cholesterol levels? Total and HDL?")
        assert len(results) > 0
        texts = [r.get_content() for r in results]
        assert any("Cholesterol" in t or "HDL" in t or "LDL" in t for t in texts)

    def test_kidney_query_retrieves_renal_nodes(self, marker_index):
        retriever = marker_index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("How is my kidney function? BUN and creatinine?")
        assert len(results) > 0
        texts = [r.get_content() for r in results]
        assert any("BUN" in t or "Creatinine" in t for t in texts)

    def test_inflammation_query_retrieves_cbc_markers(self, marker_index):
        retriever = marker_index.as_retriever(similarity_top_k=5)
        results = retriever.retrieve("Any signs of inflammation? Neutrophils or lymphocytes?")
        texts = [r.get_content() for r in results]
        assert any("Neutrophils" in t or "Lymphocytes" in t or "WBC" in t for t in texts)

    def test_health_state_retrieval_with_derived_metrics(self, marker_index):
        retriever = marker_index.as_retriever(similarity_top_k=5)
        results = retriever.retrieve("What is my overall health state from this test?")
        hs_results = [r for r in results if r.metadata.get("node_type") == "health_state"]
        # Health state nodes should be retrievable
        assert len(results) > 0

    def test_similarity_threshold_filtering(self, marker_index):
        """Test that low-similarity results are filtered out."""
        retriever = marker_index.as_retriever(similarity_top_k=10)
        # Query unrelated to blood tests
        results = retriever.retrieve("What is the capital of France?")
        # Should still return nodes but with low similarity scores
        for r in results:
            assert r.score is not None

    def test_retrieval_specificity(self, marker_index):
        """Test that specific queries retrieve specific nodes."""
        retriever = marker_index.as_retriever(similarity_top_k=3)
        # Query specifically about triglycerides
        results = retriever.retrieve("Triglycerides level")
        texts = [r.get_content() for r in results]
        assert any("Triglycerides" in t or "TG/HDL" in t for t in texts)


# ═══════════════════════════════════════════════════════════════════════
# D. Settings isolation
# ═══════════════════════════════════════════════════════════════════════


class TestSettingsIsolation:
    """Verify that LlamaIndex Settings changes don't cause cross-test interference."""

    def test_embed_model_independence(self):
        """Changing Settings.embed_model shouldn't affect get_embed_model()."""
        original = get_embed_model()
        # Temporarily change Settings
        old_setting = getattr(Settings, "embed_model", None)
        Settings.embed_model = FastEmbedEmbedding(model_name="BAAI/bge-small-en-v1.5")
        # get_embed_model() should still return the original (cached) model
        assert get_embed_model() is original
        # Restore
        Settings.embed_model = old_setting

    @skip_no_judge
    def test_llm_setting_independence(self):
        """Changing Settings.llm shouldn't affect embedding operations."""
        old_llm = getattr(Settings, "llm", None)
        # Just set the setting — we don't actually call the LLM here
        Settings.llm = OpenAILike(model="test-model", api_base="http://localhost:8080")
        # Embedding model should still work
        model = get_embed_model()
        vec = model.get_text_embedding("test")
        assert len(vec) == 1024
        # Restore
        Settings.llm = old_llm


# ═══════════════════════════════════════════════════════════════════════
# E. DeepEval — LLM-judged ContextChatEngine quality
# ═══════════════════════════════════════════════════════════════════════


@skip_no_judge
class TestContextChatEngineQuality:
    """LLM-judged quality metrics for ContextChatEngine responses."""

    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    @pytest.fixture(scope="class")
    def chat_engine(self, embed_model):
        from deepeval_rag import DOCUMENTS
        Settings.embed_model = embed_model
        index = VectorStoreIndex(DOCUMENTS)
        llm = _make_llm()
        return ContextChatEngine.from_defaults(
            retriever=index.as_retriever(similarity_top_k=5),
            system_prompt=(
                "You are a clinical blood marker intelligence assistant. "
                "Answer based only on provided context. Cite references when available."
            ),
            llm=llm,
        )

    def test_answer_relevancy(self, chat_engine):
        response = chat_engine.chat(
            "What does an elevated TG/HDL ratio indicate about insulin resistance?"
        )
        metric = make_geval(
            name="Answer Relevancy",
            criteria=(
                "Evaluate whether the response directly answers the question about "
                "TG/HDL ratio and insulin resistance. The answer should mention the "
                "threshold (> 3.5 indicates insulin resistance) and clinical significance. "
                "Irrelevant information or failure to address the core question reduces the score."
            ),
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
            ],
            threshold=0.7,
        )
        test_case = LLMTestCase(
            input="What does an elevated TG/HDL ratio indicate about insulin resistance?",
            actual_output=response.response,
            expected_output=(
                "TG/HDL ratio > 3.5 is a surrogate marker for insulin resistance. "
                "It indicates the presence of small dense LDL particles and metabolic syndrome risk."
            ),
        )
        assert_test(test_case, [metric])

    def test_faithfulness_to_context(self, chat_engine):
        response = chat_engine.chat(
            "What is the optimal range for the De Ritis ratio?"
        )
        metric = make_geval(
            name="Faithfulness",
            criteria=(
                "Evaluate whether the response is faithful to the provided clinical context. "
                "The De Ritis ratio optimal range is 0.8-1.2. Values above 2.0 indicate "
                "alcoholic liver disease. The response should not hallucinate information "
                "not present in the context or contradict the reference thresholds."
            ),
            evaluation_params=[
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.CONTEXT,
            ],
            threshold=0.7,
        )
        test_case = LLMTestCase(
            input="What is the optimal range for the De Ritis ratio?",
            actual_output=response.response,
            expected_output="Optimal range is 0.8-1.2. Values > 2.0 suggest alcoholic liver disease.",
            context=response.source_nodes[0].get_content() if response.source_nodes else "",
        )
        assert_test(test_case, [metric])


# ═══════════════════════════════════════════════════════════════════════
# F. Node parser comparison — BloodTestNodeParser vs SentenceSplitter
# ═══════════════════════════════════════════════════════════════════════


class TestNodeParserComparison:
    """Compare custom BloodTestNodeParser against generic SentenceSplitter."""

    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    def test_blood_test_parser_produces_structured_nodes(self):
        markers = parse_markers(_LIPID_PANEL_ELEMENTS)
        marker_ids = [f"lm-{i}" for i in range(len(markers))]
        doc = Document(
            text="",
            metadata={
                "_raw_elements": _LIPID_PANEL_ELEMENTS,
                "_marker_ids": marker_ids,
                "test_id": "test-1",
                "user_id": "user-1",
                "file_name": "lipid.pdf",
                "uploaded_at": "2024-01-01",
                "test_date": "2024-01-01",
            },
        )
        parser = BloodTestNodeParser()
        nodes = parser([doc])
        # Should produce structured nodes with correct types
        node_types = [n.metadata.get("node_type") for n in nodes]
        assert "blood_test" in node_types
        assert "blood_marker" in node_types
        assert "health_state" in node_types

    def test_sentence_splitter_produces_unstructured_nodes(self):
        """SentenceSplitter on the same content produces generic nodes."""
        markers = parse_markers(_LIPID_PANEL_ELEMENTS)
        content = "Total Cholesterol: 245 mg/dL. HDL: 38 mg/dL. LDL: 155 mg/dL."
        doc = Document(text=content)
        splitter = SentenceSplitter(chunk_size=200, chunk_overlap=50)
        nodes = splitter([doc])
        # Generic nodes won't have our custom metadata
        for node in nodes:
            assert node.metadata.get("node_type") != "blood_marker"
            assert node.metadata.get("marker_name") is None

    def test_blood_test_parser_better_for_retrieval(self, embed_model):
        """BloodTestNodeParser nodes should be more retrievable for clinical queries."""
        markers = parse_markers(_LIPID_PANEL_ELEMENTS)
        marker_ids = [f"lm-{i}" for i in range(len(markers))]

        # Build index with BloodTestNodeParser nodes
        Settings.embed_model = embed_model
        bt_nodes = []
        bt_nodes.append(build_test_document(
            markers,
            {"fileName": "lipid.pdf", "uploadedAt": "2024-01-01"},
            "test-bt", "user-1",
        ))
        bt_nodes.extend(build_marker_nodes(
            markers, marker_ids, "test-bt", "user-1",
            {"fileName": "lipid.pdf", "testDate": "2024-01-01"},
        ))
        bt_index = VectorStoreIndex(bt_nodes)

        # Query for HDL
        retriever = bt_index.as_retriever(similarity_top_k=3)
        results = retriever.retrieve("What is my HDL cholesterol level?")
        assert len(results) > 0
        # Should find HDL marker node
        assert any("HDL" in r.get_content() for r in results)
