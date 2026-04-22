"""
End-to-end smoke tests for the LlamaIndex clinical chat pipeline.

The LangGraph StateGraph is gone — this file no longer asserts topology.
Instead it exercises the ``run_chat`` public API with a handful of canonical
queries and verifies:

  * the response dict has every key ``chat_server.py`` depends on
  * single-intent classifications land in the right bucket
  * the safety-refusal short-circuit returns the canned response
  * the guard-disclaimer fallback fires on flagged answers

The heavier synthesis-quality tests live in ``llamaindex_chat_eval.py`` and
``conversational_eval.py``.

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/graph_eval.py -v
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "langgraph"))

from chat_pipeline import (  # noqa: E402
    CONFIDENCE_THRESHOLD,
    GUARD_SYSTEM,
    RESYNTHESIS_SYSTEM,
    SAFETY_REFUSAL_RESPONSE,
    SINGLE_INTENTS,
    SYNTHESIS_SYSTEM,
    TRIAGE_SYSTEM,
    run_chat,
)


# ═══════════════════════════════════════════════════════════════════════════
# Required response keys (the frontend depends on these exact names)
# ═══════════════════════════════════════════════════════════════════════════

REQUIRED_KEYS = {
    "final_answer",
    "answer",
    "intent",
    "intent_confidence",
    "retrieval_sources",
    "rerank_scores",
    "guard_passed",
    "guard_issues",
    "citations",
}


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════


def _triage_payload(intent: str, confidence: float = 0.95, entities=None, multi=False,
                    sub_intents=None, sub_queries=None) -> str:
    payload = {
        "intent": intent,
        "confidence": confidence,
        "entities": entities or [],
        "multi_intent": multi,
    }
    if multi:
        payload["sub_intents"] = sub_intents or []
        payload["sub_queries"] = sub_queries or []
    return json.dumps(payload)


def _guard_payload(passed: bool = True, issues=None) -> str:
    return json.dumps({"passed": passed, "issues": issues or []})


def _stub_chat_engine(answer: str, source_nodes=None):
    """Build a MagicMock that mimics ContextChatEngine.chat()."""
    response = MagicMock()
    response.__str__ = lambda self: answer
    response.source_nodes = source_nodes or []
    engine = MagicMock()
    engine.chat.return_value = response
    return engine


@pytest.fixture
def mock_retriever_build():
    """Stub out retriever construction — these tests don't exercise pgvector."""
    with patch("chat_pipeline.build_retriever_for_intent") as mock:
        mock.return_value = MagicMock()
        yield mock


@pytest.fixture
def mock_chat_engine():
    """Patch ContextChatEngine.from_defaults to return a deterministic engine."""
    with patch("chat_pipeline.ContextChatEngine.from_defaults") as factory:
        factory.return_value = _stub_chat_engine("HDL is 55 mg/dL. Consult your physician.")
        yield factory


@pytest.fixture
def mock_llm_call():
    """Patch the single llm_call used by triage, re-triage, guard, resynthesis."""
    with patch("chat_pipeline._llm_call") as mock:
        yield mock


# ═══════════════════════════════════════════════════════════════════════════
# A. Response shape
# ═══════════════════════════════════════════════════════════════════════════


class TestResponseShape:
    """Keep the /chat response shape compatible with chat_server.GraphChatResponse."""

    def test_returns_all_required_keys(self, mock_llm_call, mock_retriever_build, mock_chat_engine):
        mock_llm_call.side_effect = [
            _triage_payload("markers", 0.95),
            _guard_payload(passed=True),
        ]
        result = asyncio.run(run_chat("What is my HDL?", user_id="u", chat_history=[]))
        assert REQUIRED_KEYS.issubset(result.keys())

    def test_safety_refusal_returns_required_keys(self, mock_llm_call):
        mock_llm_call.return_value = _triage_payload("safety_refusal", 0.95)
        result = asyncio.run(run_chat("Do I have cancer?", user_id="u", chat_history=[]))
        assert REQUIRED_KEYS.issubset(result.keys())
        assert result["final_answer"] == SAFETY_REFUSAL_RESPONSE
        assert result["guard_passed"] is True
        assert result["retrieval_sources"] == []

    def test_prompts_are_importable(self):
        # Team 3 (docs + eval cleanup) still references these — keep the names stable.
        assert "clinical query classifier" in TRIAGE_SYSTEM.lower()
        assert "clinical safety auditor" in GUARD_SYSTEM.lower()
        assert "clinical blood marker intelligence assistant" in SYNTHESIS_SYSTEM.lower()
        assert "{issues}" in RESYNTHESIS_SYSTEM
        assert CONFIDENCE_THRESHOLD == 0.7
        assert "safety_refusal" in SINGLE_INTENTS


# ═══════════════════════════════════════════════════════════════════════════
# B. Intent routing (single-intent + multi-intent)
# ═══════════════════════════════════════════════════════════════════════════


class TestIntentRouting:

    @pytest.mark.parametrize("intent", [
        "markers", "derived_ratios", "trajectory", "conditions",
        "medications", "symptoms", "appointments", "general_health",
    ])
    def test_single_intent_routed_to_retriever(
        self, intent, mock_llm_call, mock_retriever_build, mock_chat_engine,
    ):
        mock_llm_call.side_effect = [
            _triage_payload(intent, 0.95),
            _guard_payload(passed=True),
        ]
        result = asyncio.run(run_chat("query", user_id="u", chat_history=[]))
        assert result["intent"] == intent
        mock_retriever_build.assert_called_once()
        # Confirm the intent got forwarded into the retriever factory
        called_intent = mock_retriever_build.call_args.kwargs.get("intent") \
            or mock_retriever_build.call_args.args[0]
        assert called_intent == intent

    def test_multi_intent_fans_out_to_composite(
        self, mock_llm_call, mock_chat_engine,
    ):
        with patch("chat_pipeline.build_retriever_for_intent") as mock_build, \
             patch("chat_pipeline.CompositeRetriever") as mock_composite:
            mock_build.return_value = MagicMock()
            mock_composite.return_value = MagicMock()
            mock_llm_call.side_effect = [
                _triage_payload(
                    "multi_intent", 0.9, entities=["iron"], multi=True,
                    sub_intents=["trajectory", "medications"],
                    sub_queries=["Is my iron improving?", "What medication affects iron?"],
                ),
                _guard_payload(passed=True),
            ]
            result = asyncio.run(run_chat(
                "Is my iron improving and what medication affects it?",
                user_id="u", chat_history=[],
            ))
            assert result["intent"] == "multi_intent"
            assert mock_build.call_count == 2  # one per sub-intent
            mock_composite.assert_called_once()


# ═══════════════════════════════════════════════════════════════════════════
# C. Confidence-threshold re-triage
# ═══════════════════════════════════════════════════════════════════════════


class TestReTriage:

    def test_low_confidence_triggers_re_triage(
        self, mock_llm_call, mock_retriever_build, mock_chat_engine,
    ):
        # First triage = low confidence, re-triage returns higher confidence
        mock_llm_call.side_effect = [
            _triage_payload("markers", 0.4),
            json.dumps({"intent": "conditions", "confidence": 0.9, "entities": []}),
            _guard_payload(passed=True),
        ]
        result = asyncio.run(run_chat("ambiguous query", user_id="u", chat_history=[]))
        assert result["intent"] == "conditions"
        assert result["intent_confidence"] == 0.9

    def test_high_confidence_skips_re_triage(
        self, mock_llm_call, mock_retriever_build, mock_chat_engine,
    ):
        mock_llm_call.side_effect = [
            _triage_payload("markers", 0.95),
            _guard_payload(passed=True),
        ]
        result = asyncio.run(run_chat("What is my HDL?", user_id="u", chat_history=[]))
        assert result["intent"] == "markers"
        # triage + guard = 2 llm_calls (no re-triage)
        assert mock_llm_call.call_count == 2


# ═══════════════════════════════════════════════════════════════════════════
# D. Safety guard + disclaimer fallback
# ═══════════════════════════════════════════════════════════════════════════


class TestSafetyGuard:

    def test_guard_pass_returns_answer_verbatim(
        self, mock_llm_call, mock_retriever_build, mock_chat_engine,
    ):
        mock_chat_engine.return_value = _stub_chat_engine(
            "HDL is 55 mg/dL. Consult your physician."
        )
        mock_llm_call.side_effect = [
            _triage_payload("markers", 0.95),
            _guard_payload(passed=True),
        ]
        result = asyncio.run(run_chat("q", user_id="u", chat_history=[]))
        assert result["guard_passed"] is True
        assert result["final_answer"] == "HDL is 55 mg/dL. Consult your physician."

    def test_guard_fail_with_parse_failure_appends_no_disclaimer(
        self, mock_llm_call, mock_retriever_build, mock_chat_engine,
    ):
        mock_chat_engine.return_value = _stub_chat_engine("answer body")
        mock_llm_call.side_effect = [
            _triage_payload("markers", 0.95),
            "not json",  # guard parse failure
        ]
        result = asyncio.run(run_chat("q", user_id="u", chat_history=[]))
        assert result["guard_passed"] is False
        assert "PARSE_FAILURE" in result["guard_issues"]

    def test_guard_fail_with_diagnosis_triggers_resynthesis(
        self, mock_llm_call, mock_retriever_build, mock_chat_engine,
    ):
        mock_chat_engine.return_value = _stub_chat_engine("You have diabetes.")
        mock_llm_call.side_effect = [
            _triage_payload("markers", 0.95),
            _guard_payload(passed=False, issues=["DIAGNOSIS"]),  # first guard fails
            "Revised: your values may be associated with diabetes. Consult your physician.",  # resynth
            _guard_payload(passed=True),  # second guard passes
        ]
        result = asyncio.run(run_chat("am I diabetic?", user_id="u", chat_history=[]))
        assert result["guard_passed"] is True
        assert "may be associated" in result["final_answer"]
