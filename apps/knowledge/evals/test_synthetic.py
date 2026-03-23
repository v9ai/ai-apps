"""Synthetic dataset evaluation for the knowledge agent.

Loads pre-generated goldens from datasets/synthetic_goldens.json
and evaluates the LangGraph agent's responses across multiple dimensions:
quality (correctness, depth, relevancy), safety (hallucination, bias),
and completeness (task completion batch).

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_synthetic.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_synthetic.py -k "correctness"
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_synthetic.py -k "batch"
"""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.dataset import Golden
from deepeval.metrics import (
    AnswerRelevancyMetric,
    BiasMetric,
    GEval,
    HallucinationMetric,
    TaskCompletionMetric,
)
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel

DATASETS_DIR = Path(__file__).resolve().parent / "datasets"
GOLDENS_PATH = DATASETS_DIR / "synthetic_goldens.json"

model = DeepSeekModel()
THRESHOLD = 0.5


# -- Load synthetic goldens ---------------------------------------------------


def _load_goldens() -> list[Golden]:
    if not GOLDENS_PATH.exists():
        return []

    with open(GOLDENS_PATH) as f:
        data = json.load(f)

    return [
        Golden(
            input=item["input"],
            expected_output=item.get("expected_output"),
            context=item.get("context"),
            source_file=item.get("source_file"),
        )
        for item in data
    ]


GOLDENS = _load_goldens()


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


# -- Metrics -------------------------------------------------------------------

correctness_metric = GEval(
    name="Correctness",
    criteria=(
        "Evaluate whether the actual output is semantically correct and "
        "consistent with the expected output. Check that key facts, concepts, "
        "and relationships mentioned in the expected output are also present "
        "and accurate in the actual output. Minor differences in wording or "
        "additional correct information should not be penalized."
    ),
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    model=model,
    threshold=0.6,
)

depth_metric = GEval(
    name="Depth",
    criteria=(
        "Evaluate whether the response demonstrates deep understanding of "
        "the topic beyond surface-level facts. Check for explanation of "
        "underlying mechanisms, discussion of trade-offs, mention of "
        "relevant benchmarks, and practical implications."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

answer_relevancy_metric = AnswerRelevancyMetric(
    model=model,
    threshold=THRESHOLD,
)

hallucination_metric = HallucinationMetric(
    model=model,
    threshold=THRESHOLD,
)


# -- Helpers -------------------------------------------------------------------


def _golden_ids() -> list[pytest.param]:
    params = []
    for i, g in enumerate(GOLDENS):
        source = Path(g.source_file).stem if g.source_file else "golden"
        params.append(pytest.param(g, id=f"{source}-{i}"))
    return params


@pytest.fixture(autouse=True)
def _skip_if_no_dataset():
    if not GOLDENS:
        pytest.skip("No synthetic dataset found. Run synthesize.py first.")


# -- Quality tests (parametrized) ----------------------------------------------


@pytest.mark.parametrize("golden", _golden_ids())
def test_synthetic_correctness(golden: Golden, agent):
    """Agent's answer should match the golden's expected output."""
    actual_output = _invoke_agent(agent, golden.input)
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=actual_output,
        expected_output=golden.expected_output,
    )
    assert_test(test_case, [correctness_metric])


@pytest.mark.parametrize("golden", _golden_ids())
def test_synthetic_depth(golden: Golden, agent):
    """Agent's answer should demonstrate deep conceptual understanding."""
    actual_output = _invoke_agent(agent, golden.input)
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=actual_output,
    )
    assert_test(test_case, [depth_metric])


@pytest.mark.parametrize("golden", _golden_ids())
def test_synthetic_answer_relevancy(golden: Golden, agent):
    """Agent's answer should be relevant to the question asked."""
    actual_output = _invoke_agent(agent, golden.input)
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=actual_output,
    )
    assert_test(test_case, [answer_relevancy_metric])


# -- Safety tests (parametrized) -----------------------------------------------


@pytest.mark.parametrize("golden", _golden_ids())
def test_synthetic_hallucination(golden: Golden, agent):
    """Agent should not fabricate facts beyond what the context supports."""
    if not golden.context:
        pytest.skip("No context available for hallucination check")
    actual_output = _invoke_agent(agent, golden.input)
    test_case = LLMTestCase(
        input=golden.input,
        actual_output=actual_output,
        context=golden.context,
    )
    assert_test(test_case, [hallucination_metric])


# -- Batch tests ---------------------------------------------------------------


def _invoke_agents_batch(agent, goldens: list[Golden]) -> list[str]:
    """Run agent on all goldens in parallel. Returns outputs ordered by index."""
    with ThreadPoolExecutor(max_workers=min(4, len(goldens) or 1)) as pool:
        futures = {pool.submit(_invoke_agent, agent, g.input): i for i, g in enumerate(goldens)}
        outputs: list[str] = [""] * len(goldens)
        for future in as_completed(futures):
            i = futures[future]
            try:
                outputs[i] = future.result()
            except Exception:
                outputs[i] = ""
    return outputs


def test_synthetic_batch_task_completion(agent):
    """Run all goldens through the agent. 60% must pass TaskCompletion."""
    outputs = _invoke_agents_batch(agent, GOLDENS)

    def _measure(args: tuple) -> tuple:
        golden, actual_output = args
        m = TaskCompletionMetric(model=model, threshold=THRESHOLD)
        m.measure(LLMTestCase(
            input=golden.input,
            actual_output=actual_output,
            expected_output=golden.expected_output,
        ))
        return golden.input, m.score

    with ThreadPoolExecutor(max_workers=min(4, len(GOLDENS) or 1)) as pool:
        results = list(pool.map(_measure, zip(GOLDENS, outputs)))

    passing = sum(1 for _, score in results if score and score >= THRESHOLD)
    total = len(results)
    assert passing >= total * 0.6, (
        f"Only {passing}/{total} cases passed "
        f"(need 60%): {[(q[:80], s) for q, s in results if not s or s < THRESHOLD]}"
    )


def test_synthetic_batch_bias(agent):
    """Educational content should have near-zero bias. 90% must pass."""
    outputs = _invoke_agents_batch(agent, GOLDENS)

    def _measure(args: tuple) -> tuple:
        golden, actual_output = args
        m = BiasMetric(model=model, threshold=THRESHOLD)
        m.measure(LLMTestCase(input=golden.input, actual_output=actual_output))
        return golden.input, m.score

    with ThreadPoolExecutor(max_workers=min(4, len(GOLDENS) or 1)) as pool:
        results = list(pool.map(_measure, zip(GOLDENS, outputs)))

    passing = sum(1 for _, score in results if score is not None and score <= THRESHOLD)
    total = len(results)
    assert passing >= total * 0.9, (
        f"Only {passing}/{total} cases passed bias check "
        f"(need 90%): {[(q[:80], s) for q, s in results if s is None or s > THRESHOLD]}"
    )
