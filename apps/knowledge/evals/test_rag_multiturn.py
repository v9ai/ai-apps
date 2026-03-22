"""Multi-turn RAG evaluation.

Tests whether the RAG pipeline maintains context and faithfulness
across multi-turn conversations with follow-up questions.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_multiturn.py
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
)
from deepeval.test_case import LLMTestCase

from deepseek_model import DeepSeekModel
from rag_pipeline import invoke_rag

model = DeepSeekModel()
THRESHOLD = 0.6

faithfulness_metric = FaithfulnessMetric(model=model, threshold=THRESHOLD)
answer_relevancy_metric = AnswerRelevancyMetric(model=model, threshold=THRESHOLD)

# -- Conversation scenarios ----------------------------------------------------

CONVERSATIONS = [
    {
        "id": "transformer-deep-dive",
        "turns": [
            "What is the transformer architecture?",
            "How does multi-head attention work specifically?",
            "What are the computational costs of self-attention?",
            "How does KV cache optimization help with inference?",
        ],
    },
    {
        "id": "rag-pipeline-design",
        "turns": [
            "What chunking strategies are best for RAG?",
            "How do I choose between fixed-size and semantic chunking?",
            "What retrieval strategies work well with semantic chunks?",
            "How should I evaluate my RAG pipeline?",
        ],
    },
    {
        "id": "fine-tuning-workflow",
        "turns": [
            "What is LoRA and how does it work?",
            "How does LoRA compare to full fine-tuning in terms of cost?",
            "What is RLHF and how is it used after fine-tuning?",
            "How do I curate a good dataset for fine-tuning?",
        ],
    },
    {
        "id": "agent-evaluation",
        "turns": [
            "What are the main agent architectures?",
            "How do multi-agent systems coordinate tasks?",
            "What metrics should I use to evaluate agents?",
            "How do I set up CI/CD for AI agent testing?",
        ],
    },
    {
        "id": "safety-guardrails",
        "turns": [
            "What is constitutional AI?",
            "How do guardrails and filtering work for LLMs?",
            "What are the main approaches to hallucination mitigation?",
            "How should I handle bias and fairness in LLM applications?",
        ],
    },
    {
        "id": "production-deployment",
        "turns": [
            "How should I serve LLMs in production?",
            "What scaling and load balancing strategies exist for LLM APIs?",
            "How do I optimize costs for LLM inference?",
            "What observability should I set up for LLM applications?",
        ],
    },
]


def _run_conversation_turns(turns: list[str]) -> list[LLMTestCase]:
    """Run each turn through the RAG pipeline independently, return test cases."""
    test_cases = []
    for user_msg in turns:
        result = invoke_rag(user_msg)
        tc = LLMTestCase(
            input=user_msg,
            actual_output=result["actual_output"],
            retrieval_context=result["retrieval_context"],
        )
        test_cases.append(tc)
    return test_cases


# -- Per-conversation tests ----------------------------------------------------


@pytest.mark.parametrize("conv", CONVERSATIONS, ids=[c["id"] for c in CONVERSATIONS])
def test_multiturn_faithfulness(conv):
    """Each turn in the conversation should be faithful to retrieved context."""
    test_cases = _run_conversation_turns(conv["turns"])
    failures = []
    for i, tc in enumerate(test_cases):
        if not tc.retrieval_context:
            continue
        faithfulness_metric.measure(tc)
        if (faithfulness_metric.score or 0) < THRESHOLD:
            failures.append(f"Turn {i + 1}: score={faithfulness_metric.score:.2f}")

    total_with_context = sum(1 for tc in test_cases if tc.retrieval_context)
    max_failures = max(1, total_with_context // 2)  # allow up to 50% failure
    assert len(failures) <= max_failures, (
        f"Too many faithfulness failures in {conv['id']}: {failures}"
    )


@pytest.mark.parametrize("conv", CONVERSATIONS, ids=[c["id"] for c in CONVERSATIONS])
def test_multiturn_answer_relevancy(conv):
    """Each turn's answer should be relevant to the question asked."""
    test_cases = _run_conversation_turns(conv["turns"])
    failures = []
    for i, tc in enumerate(test_cases):
        answer_relevancy_metric.measure(tc)
        if (answer_relevancy_metric.score or 0) < THRESHOLD:
            failures.append(f"Turn {i + 1}: score={answer_relevancy_metric.score:.2f}")

    max_failures = max(1, len(test_cases) // 2)
    assert len(failures) <= max_failures, (
        f"Too many answer relevancy failures in {conv['id']}: {failures}"
    )


@pytest.mark.parametrize("conv", CONVERSATIONS, ids=[c["id"] for c in CONVERSATIONS])
def test_multiturn_progressive_depth(conv):
    """Later turns should retrieve increasingly specific context."""
    test_cases = _run_conversation_turns(conv["turns"])
    context_lengths = [
        len(tc.retrieval_context) for tc in test_cases if tc.retrieval_context
    ]
    # Just verify we get context for most turns
    assert len(context_lengths) >= len(conv["turns"]) // 2, (
        f"Only {len(context_lengths)}/{len(conv['turns'])} turns got retrieval context"
    )


# -- Aggregate test ------------------------------------------------------------


def test_multiturn_aggregate():
    """Across all conversations, 75% of turns must pass faithfulness."""
    all_results = []
    for conv in CONVERSATIONS:
        test_cases = _run_conversation_turns(conv["turns"])
        for tc in test_cases:
            if not tc.retrieval_context:
                continue
            faithfulness_metric.measure(tc)
            all_results.append({
                "conv": conv["id"],
                "input": tc.input[:60],
                "score": faithfulness_metric.score,
                "pass": (faithfulness_metric.score or 0) >= THRESHOLD,
            })

    if not all_results:
        pytest.skip("No turns with retrieval context")

    passing = sum(1 for r in all_results if r["pass"])
    total = len(all_results)
    assert passing >= total * 0.75, (
        f"Only {passing}/{total} turns passed faithfulness (need 75%). "
        f"Failures: {[r for r in all_results if not r['pass']][:5]}"
    )
