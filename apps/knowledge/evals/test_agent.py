"""End-to-end agent evaluations via DeepEval.

Uses TaskCompletionMetric for per-case evaluation,
and EvaluationDataset for batch runs.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_agent.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_agent.py -k "test_agent_task_completion"
"""

import pytest
from concurrent.futures import ThreadPoolExecutor, as_completed
from deepeval import assert_test
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.metrics import TaskCompletionMetric
from deepeval.test_case import LLMTestCase

from deepseek_model import DeepSeekModel

model = DeepSeekModel()
THRESHOLD = 0.5

# ── Golden test cases ─────────────────────────────────────────────────

AGENT_CASES = [
    pytest.param(
        "How do transformer attention mechanisms work?",
        "Explain the self-attention mechanism including query, key, value matrices and multi-head attention.",
        id="transformer-attention",
    ),
    pytest.param(
        "What is retrieval augmented generation and how does it improve LLMs?",
        "Describe RAG architecture: retrieval from knowledge base, context injection, and how it reduces hallucination.",
        id="rag",
    ),
    pytest.param(
        "What is LoRA and how does it enable efficient fine-tuning?",
        "Explain Low-Rank Adaptation: freezing pretrained weights, training low-rank decomposition matrices, and parameter efficiency.",
        id="lora",
    ),
    pytest.param(
        "What are the key scaling laws for large language models?",
        "Discuss the Chinchilla/Kaplan scaling laws relating model size, data size, and compute to performance.",
        id="scaling-laws",
    ),
    pytest.param(
        "What are effective chunking strategies for RAG systems?",
        "Cover fixed-size, semantic, recursive, and document-aware chunking approaches with trade-offs.",
        id="chunking-strategies",
    ),
    pytest.param(
        "What is LLM-as-Judge evaluation and what are its main biases?",
        "Explain how LLM judges evaluate outputs, covering position bias, verbosity bias, self-enhancement bias, and mitigation strategies like order swapping.",
        id="llm-as-judge-biases",
    ),
    pytest.param(
        "How does the G-Eval protocol improve LLM-based evaluation?",
        "Describe G-Eval's three stages: criteria decomposition, chain-of-thought evaluation, and probability-weighted scoring, and explain why it outperforms simple judge prompts.",
        id="geval-protocol",
    ),
    pytest.param(
        "How can DeepEval be used to implement LLM-as-Judge evaluation pipelines?",
        "Explain DeepEval's GEval metric, custom judge model integration via DeepEvalBaseLLM, and how it enables multi-dimensional article evaluation with pytest integration.",
        id="deepeval-llm-judge",
    ),
]


def _invoke_agent(agent, query: str) -> str:
    """Invoke the LangGraph agent and extract the final AI response."""
    result = agent.invoke(
        input={"messages": [{"role": "user", "content": query}]},
    )
    messages = result.get("messages", [])
    for msg in reversed(messages):
        content = getattr(msg, "content", None) or ""
        if content and getattr(msg, "type", None) == "ai":
            return content
    return ""


# ── Per-case tests ────────────────────────────────────────────────────


@pytest.mark.parametrize("query, expected_task", AGENT_CASES)
def test_agent_task_completion(query: str, expected_task: str, agent):
    """Evaluate whether the agent completes the task."""
    actual_output = _invoke_agent(agent, query)
    metric = TaskCompletionMetric(model=model, threshold=THRESHOLD)

    test_case = LLMTestCase(
        input=query,
        actual_output=actual_output,
        expected_output=expected_task,
    )
    assert_test(test_case, [metric])


# ── Batch evaluation ──────────────────────────────────────────────────


def test_agent_batch(agent):
    """Run all golden cases through the agent via EvaluationDataset."""
    goldens = [
        Golden(input=case.values[0], expected_output=case.values[1])
        for case in AGENT_CASES
    ]
    metric = TaskCompletionMetric(model=model, threshold=THRESHOLD)

    # Parallelize agent invocations — compiled graph is stateless and thread-safe.
    with ThreadPoolExecutor(max_workers=min(4, len(goldens))) as pool:
        futures = {pool.submit(_invoke_agent, agent, g.input): i for i, g in enumerate(goldens)}
        outputs: list[str] = [""] * len(goldens)
        for future in as_completed(futures):
            i = futures[future]
            try:
                outputs[i] = future.result()
            except Exception:
                outputs[i] = ""

    results = []
    for golden, actual_output in zip(goldens, outputs):
        metric.measure(
            LLMTestCase(
                input=golden.input,
                actual_output=actual_output,
                expected_output=golden.expected_output,
            )
        )
        results.append((golden.input, actual_output, metric.score))

    # At least 60% of cases should pass
    passing = sum(1 for _, _, score in results if score and score >= THRESHOLD)
    assert passing >= len(results) * 0.6, (
        f"Only {passing}/{len(results)} cases passed "
        f"(need 60%): {[(q, s) for q, _, s in results]}"
    )
