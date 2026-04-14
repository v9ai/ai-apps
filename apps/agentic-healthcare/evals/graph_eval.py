"""
LangGraph clinical intelligence pipeline evaluation.

Tests the full agentic graph with conditional routing:

  triage -> refuse (safety_refusal) -> END
  triage -> re_triage (low confidence) -> retrieve_* -> synthesize -> guard -> END
  triage -> retrieve_* -> synthesize -> guard -> resynthesize -> guard -> END

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/graph_eval.py -v
"""

from __future__ import annotations

import json
import os
import sys
from unittest.mock import patch

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import make_geval, skip_no_judge

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "langgraph"))

from graph import (
    CONFIDENCE_THRESHOLD,
    GUARD_SYSTEM,
    RERANK_SYSTEM,
    RETRIEVER_NODE_NAMES,
    SAFETY_REFUSAL_RESPONSE,
    SINGLE_INTENTS,
    SYNTHESIS_SYSTEM,
    TRIAGE_SYSTEM,
    GraphState,
    build_graph,
    compiled_graph,
    guard,
    rerank,
    refuse,
    re_triage,
    resynthesize,
    retrieve_appointments,
    retrieve_conditions,
    retrieve_derived_ratios,
    retrieve_general_health,
    retrieve_markers,
    retrieve_medications,
    retrieve_multi_intent,
    retrieve_symptoms,
    retrieve_trajectory,
    route_after_guard,
    route_after_triage,
    synthesize,
    triage,
)


# ═══════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def mock_llm():
    with patch("graph._llm_call") as mock:
        yield mock


@pytest.fixture
def mock_embedding():
    with patch("retrievers.generate_embedding") as mock:
        mock.return_value = [0.0] * 1024
        yield mock


@pytest.fixture
def mock_search_all():
    patches = {}
    search_fns = [
        "retrievers.search_blood_tests",
        "retrievers.search_markers_hybrid",
        "retrievers.search_conditions",
        "retrievers.search_medications",
        "retrievers.search_symptoms",
        "retrievers.search_appointments",
        "retrievers.search_marker_trend",
        "retrievers.search_health_states",
    ]
    entered = []
    for fn_path in search_fns:
        p = patch(fn_path, return_value=[])
        entered.append(p.start())
        patches[fn_path.split(".")[-1]] = entered[-1]
    yield patches
    for p_obj in entered:
        p_obj.stop()


@pytest.fixture
def mock_synthesizer():
    """Mock the LlamaIndex response synthesizer used by graph.synthesize."""
    from unittest.mock import MagicMock
    mock_synth = MagicMock()
    with patch("graph.get_response_synthesizer", return_value=mock_synth):
        yield mock_synth


def _make_state(**kwargs) -> GraphState:
    defaults = {"query": "What is my TG/HDL ratio?", "user_id": "test-user-123"}
    defaults.update(kwargs)
    return GraphState(**defaults)


# ═══════════════════════════════════════════════════════════════════════════
# A. Triage accuracy
# ═══════════════════════════════════════════════════════════════════════════


class TestTriageClassification:

    @pytest.mark.parametrize("query,expected_intent", [
        ("What is my HDL level?", "markers"),
        ("Show me my cholesterol values", "markers"),
    ])
    def test_marker_queries(self, mock_llm, query, expected_intent):
        mock_llm.return_value = json.dumps({
            "intent": expected_intent, "confidence": 0.95, "entities": [],
            "multi_intent": False,
        })
        result = triage(_make_state(query=query))
        assert result["intent"] == expected_intent

    @pytest.mark.parametrize("query,expected_intent", [
        ("Is my De Ritis ratio normal?", "derived_ratios"),
        ("What is my TG/HDL ratio?", "derived_ratios"),
    ])
    def test_derived_ratio_queries(self, mock_llm, query, expected_intent):
        mock_llm.return_value = json.dumps({
            "intent": expected_intent, "confidence": 0.9, "entities": [],
            "multi_intent": False,
        })
        result = triage(_make_state(query=query))
        assert result["intent"] == expected_intent

    def test_triage_handles_malformed_json(self, mock_llm):
        mock_llm.return_value = "this is not json"
        result = triage(_make_state(query="random"))
        assert result["intent"] == "general_health"
        assert result["intent_confidence"] == 0.5

    def test_triage_handles_invalid_intent(self, mock_llm):
        mock_llm.return_value = json.dumps({
            "intent": "aliens", "confidence": 0.8, "entities": [],
            "multi_intent": False,
        })
        result = triage(_make_state(query="random"))
        assert result["intent"] == "general_health"

    def test_multi_intent_classification(self, mock_llm):
        mock_llm.return_value = json.dumps({
            "intent": "multi_intent", "confidence": 0.85,
            "entities": ["iron"],
            "multi_intent": True,
            "sub_intents": ["trajectory", "medications"],
            "sub_queries": ["Is my iron improving?", "What medication affects iron?"],
        })
        result = triage(_make_state(query="Is my iron improving and what medication affects it?"))
        assert result["intent"] == "multi_intent"
        assert result["is_multi_intent"] is True
        assert len(result["sub_intents"]) == 2

    def test_triage_increments_attempts(self, mock_llm):
        mock_llm.return_value = json.dumps({
            "intent": "markers", "confidence": 0.9, "entities": [],
            "multi_intent": False,
        })
        result = triage(_make_state(query="HDL level?"))
        assert result["triage_attempts"] == 1


# ═══════════════════════════════════════════════════════════════════════════
# A2. Re-triage
# ═══════════════════════════════════════════════════════════════════════════


class TestReTriage:

    def test_re_triage_improves_confidence(self, mock_llm):
        mock_llm.return_value = json.dumps({
            "intent": "markers", "confidence": 0.9, "entities": ["HDL"],
        })
        state = _make_state(intent="general_health", intent_confidence=0.4, triage_attempts=1)
        result = re_triage(state)
        assert result["intent"] == "markers"
        assert result["intent_confidence"] == 0.9

    def test_re_triage_keeps_original_on_lower_confidence(self, mock_llm):
        mock_llm.return_value = json.dumps({
            "intent": "conditions", "confidence": 0.3, "entities": [],
        })
        state = _make_state(intent="markers", intent_confidence=0.5, triage_attempts=1)
        result = re_triage(state)
        assert "intent" not in result or result.get("intent") == state.intent


# ═══════════════════════════════════════════════════════════════════════════
# B. Retrieval routing
# ═══════════════════════════════════════════════════════════════════════════


class TestRetrievalRouting:

    def test_markers_queries_expected_tables(self, mock_embedding, mock_search_all):
        state = _make_state(intent="markers", intent_confidence=0.9)
        retrieve_markers(state)
        mock_search_all["search_markers_hybrid"].assert_called_once()
        mock_search_all["search_blood_tests"].assert_called_once()
        mock_search_all["search_health_states"].assert_called_once()

    def test_derived_ratios_queries_health_states(self, mock_embedding, mock_search_all):
        state = _make_state(intent="derived_ratios", intent_confidence=0.9)
        retrieve_derived_ratios(state)
        mock_search_all["search_health_states"].assert_called_once()

    def test_trajectory_with_entities_queries_trend(self, mock_embedding, mock_search_all):
        state = _make_state(intent="trajectory", entities=["HDL"], intent_confidence=0.9)
        retrieve_trajectory(state)
        mock_search_all["search_marker_trend"].assert_called_once()

    def test_appointments_queries_only_appointments(self, mock_embedding, mock_search_all):
        state = _make_state(intent="appointments", intent_confidence=0.9)
        retrieve_appointments(state)
        mock_search_all["search_appointments"].assert_called_once()
        mock_search_all["search_markers_hybrid"].assert_not_called()

    def test_general_health_fans_out(self, mock_embedding, mock_search_all):
        state = _make_state(intent="general_health", intent_confidence=0.9)
        retrieve_general_health(state)
        mock_search_all["search_blood_tests"].assert_called_once()
        mock_search_all["search_markers_hybrid"].assert_called_once()
        mock_search_all["search_conditions"].assert_called_once()

    def test_refuse_returns_canned_response(self):
        result = refuse(_make_state(intent="safety_refusal"))
        assert result["final_answer"] == SAFETY_REFUSAL_RESPONSE
        assert result["guard_passed"] is True

    def test_multi_intent_retrieval(self, mock_embedding, mock_search_all):
        state = _make_state(
            intent="multi_intent", is_multi_intent=True,
            sub_intents=["markers", "medications"], intent_confidence=0.85,
        )
        retrieve_multi_intent(state)
        mock_search_all["search_markers_hybrid"].assert_called()
        mock_search_all["search_medications"].assert_called()


# ═══════════════════════════════════════════════════════════════════════════
# C. Synthesis quality
# ═══════════════════════════════════════════════════════════════════════════


class TestSynthesis:

    def test_synthesis_with_context(self, mock_synthesizer):
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.__str__ = lambda self: "TG/HDL is 1.8, optimal. Consult your physician."
        mock_synthesizer.synthesize.return_value = mock_response
        state = _make_state(
            intent="markers",
            context_chunks=["TG/HDL: 1.8000 [optimal]"],
            retrieval_sources=["blood_marker_embeddings"],
            retrieval_scores=[0.9],
        )
        result = synthesize(state)
        assert "TG/HDL" in result["answer"]
        mock_synthesizer.synthesize.assert_called_once()

    def test_synthesis_includes_history(self, mock_synthesizer):
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.__str__ = lambda self: "Follow-up answer. Consult your physician."
        mock_synthesizer.synthesize.return_value = mock_response
        state = _make_state(
            intent="markers",
            context_chunks=["HDL: 55 mg/dL"],
            retrieval_sources=["blood_marker_embeddings"],
            retrieval_scores=[0.8],
            chat_history=[
                {"role": "user", "content": "What is my HDL?"},
                {"role": "assistant", "content": "55 mg/dL."},
            ],
        )
        synthesize(state)
        query_arg = mock_synthesizer.synthesize.call_args[0][0]
        assert "CONVERSATION HISTORY" in query_arg


# ═══════════════════════════════════════════════════════════════════════════
# D. Safety guard
# ═══════════════════════════════════════════════════════════════════════════


class TestSafetyGuard:

    def test_guard_passes_safe_response(self, mock_llm):
        mock_llm.return_value = json.dumps({"passed": True, "issues": []})
        state = _make_state(intent="markers", answer="HDL is 55. Consult your physician.")
        result = guard(state)
        assert result["guard_passed"] is True
        assert result["final_answer"] == state.answer

    def test_guard_catches_diagnosis(self, mock_llm):
        mock_llm.return_value = json.dumps({"passed": False, "issues": ["DIAGNOSIS"]})
        state = _make_state(intent="markers", answer="You have sepsis.")
        result = guard(state)
        assert result["guard_passed"] is False
        assert "educational purposes" in result["final_answer"].lower()

    def test_guard_handles_malformed_json(self, mock_llm):
        mock_llm.return_value = "not json"
        state = _make_state(intent="markers", answer="HDL is good.")
        result = guard(state)
        assert result["guard_passed"] is False

    def test_guard_never_removes_content(self, mock_llm):
        original = "Your HDL is 55 mg/dL."
        mock_llm.return_value = json.dumps({"passed": False, "issues": ["DIAGNOSIS"]})
        state = _make_state(intent="markers", answer=original)
        result = guard(state)
        assert original in result["final_answer"]


# ═══════════════════════════════════════════════════════════════════════════
# D2. Resynthesize
# ═══════════════════════════════════════════════════════════════════════════


class TestResynthesize:

    def test_resynthesize_increments_retries(self, mock_llm):
        mock_llm.return_value = "Fixed response. Consult your physician."
        state = _make_state(
            intent="markers", answer="You have diabetes.",
            guard_issues=["DIAGNOSIS"], guard_retries=0, context_chunks=["NLR: 7.5"],
        )
        result = resynthesize(state)
        assert result["guard_retries"] == 1

    def test_route_after_guard_retries_on_failure(self):
        state = _make_state(guard_passed=False, guard_retries=0)
        assert route_after_guard(state) == "resynthesize"

    def test_route_after_guard_ends_when_exhausted(self):
        state = _make_state(guard_passed=False, guard_retries=1)
        assert route_after_guard(state) == "__end__"

    def test_route_after_guard_ends_on_pass(self):
        state = _make_state(guard_passed=True, guard_retries=0)
        assert route_after_guard(state) == "__end__"


# ═══════════════════════════════════════════════════════════════════════════
# E. End-to-end with DeepEval
# ═══════════════════════════════════════════════════════════════════════════


@skip_no_judge
class TestEndToEndQuality:

    def _run_synthesis(self, query, context, intent="markers"):
        state = _make_state(
            query=query, intent=intent,
            context_chunks=context, retrieval_sources=["blood_marker_embeddings"],
        )
        return synthesize(state)["answer"]

    @pytest.mark.parametrize("query,context,expected_keywords", [
        (
            "What is a healthy TG/HDL ratio?",
            ["TG/HDL Ratio: 1.8000 [optimal]\nOptimal range: < 2.0"],
            ["2.0", "optimal"],
        ),
    ])
    def test_answer_uses_context(self, query, context, expected_keywords):
        answer = self._run_synthesis(query, context)
        for kw in expected_keywords:
            assert kw.lower() in answer.lower()

    def test_faithfulness_metric(self):
        context = ["HDL: 55 mg/dL (ref: 40-60) [normal]\nHDL/LDL Ratio: 0.4231 [optimal]"]
        answer = self._run_synthesis("How is my HDL/LDL ratio?", context)
        metric = make_geval(
            name="Faithfulness",
            criteria="Response must ONLY contain claims supported by the context.",
            evaluation_params=[
                LLMTestCaseParams.INPUT,
                LLMTestCaseParams.ACTUAL_OUTPUT,
                LLMTestCaseParams.RETRIEVAL_CONTEXT,
            ],
            threshold=0.7,
        )
        assert_test(LLMTestCase(
            input="How is my HDL/LDL ratio?",
            actual_output=answer,
            retrieval_context=context,
        ), [metric])


# ═══════════════════════════════════════════════════════════════════════════
# F. Edge cases
# ═══════════════════════════════════════════════════════════════════════════


class TestEdgeCases:

    def test_empty_query(self, mock_llm):
        mock_llm.return_value = json.dumps({
            "intent": "general_health", "confidence": 0.3, "entities": [],
            "multi_intent": False,
        })
        result = triage(_make_state(query=""))
        assert result["intent"] in {"general_health", "safety_refusal"}

    def test_multi_entity_trajectory_caps_at_3(self, mock_embedding, mock_search_all):
        state = _make_state(
            intent="trajectory",
            entities=["HDL", "LDL", "TG/HDL", "NLR", "TyG"],
            intent_confidence=0.9,
        )
        retrieve_trajectory(state)
        assert mock_search_all["search_marker_trend"].call_count == 3


# ═══════════════════════════════════════════════════════════════════════════
# G. System design
# ═══════════════════════════════════════════════════════════════════════════


class TestSystemDesign:

    def test_graph_has_expected_nodes(self):
        graph = build_graph()
        expected = {
            "triage", "re_triage", "refuse",
            *RETRIEVER_NODE_NAMES,
            "rerank", "synthesize", "guard", "resynthesize",
        }
        assert expected == set(graph.nodes.keys())

    def test_graph_entry_point_is_triage(self):
        graph = build_graph()
        start_targets = [t for s, t in graph.edges if s == "__start__"]
        assert "triage" in start_targets

    def test_refuse_goes_to_end(self):
        assert ("refuse", "__end__") in set(build_graph().edges)

    def test_all_retrievers_converge_to_rerank(self):
        edges = set(build_graph().edges)
        for r in RETRIEVER_NODE_NAMES:
            assert (r, "rerank") in edges

    def test_resynthesize_connects_to_guard(self):
        assert ("resynthesize", "guard") in set(build_graph().edges)

    def test_compiled_graph_is_runnable(self):
        assert hasattr(compiled_graph, "invoke")
        assert hasattr(compiled_graph, "ainvoke")

    def test_state_schema_has_all_required_fields(self):
        fields = set(GraphState.model_fields.keys())
        required = {
            "query", "user_id", "chat_history",
            "intent", "intent_confidence", "entities",
            "triage_attempts", "triage_max_attempts",
            "sub_intents", "sub_queries", "is_multi_intent",
            "context_chunks", "retrieval_sources", "retrieval_scores",
            "answer", "citations",
            "guard_passed", "guard_issues", "guard_retries", "final_answer",
        }
        assert not (required - fields)

    def test_triage_prompt_declares_all_intents(self):
        for intent in SINGLE_INTENTS:
            assert intent in TRIAGE_SYSTEM

    def test_safety_refusal_routes_to_refuse(self):
        state = _make_state(intent="safety_refusal", intent_confidence=0.95, triage_attempts=1)
        assert route_after_triage(state) == "refuse"

    def test_low_confidence_routes_to_re_triage(self):
        state = _make_state(intent="markers", intent_confidence=0.4, triage_attempts=1, triage_max_attempts=2)
        assert route_after_triage(state) == "re_triage"

    def test_high_confidence_routes_to_retriever(self):
        state = _make_state(intent="markers", intent_confidence=0.9, triage_attempts=1)
        assert route_after_triage(state) == "retrieve_markers"

    def test_every_single_intent_has_retriever_or_refuse(self):
        for intent in SINGLE_INTENTS:
            state = _make_state(intent=intent, intent_confidence=0.9, triage_attempts=1)
            target = route_after_triage(state)
            assert target.startswith("retrieve_") or target == "refuse"
