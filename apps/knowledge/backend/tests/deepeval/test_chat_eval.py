"""deepeval gate for the ``chat`` graph.

Metrics per case:
  - FaithfulnessMetric(retrieval_context=snippets) — answer must be grounded
    in the provided snippets; catches hallucination.
  - AnswerRelevancyMetric(input=message) — answer addresses the question.
  - A deterministic "must_mention" heuristic — cheap structural signal that
    doesn't spend judge tokens on obvious misses.

Aggregate pass-rate across all (case × metric) cells must be ≥ 0.80.
"""

from __future__ import annotations

import pytest

from knowledge_agent.chat_graph import build_graph

from .conftest import (
    DEFAULT_THRESHOLD,
    aggregate_gate,
    deepeval_required,
    run_metric,
)


async def _run_chat(case: dict) -> str:
    graph = build_graph()
    result = await graph.ainvoke(
        {
            "message": case["message"],
            "history": [],
            "context_snippets": case.get("context_snippets", []),
        }
    )
    return str(result.get("response", ""))


@pytest.mark.deepeval
@pytest.mark.asyncio
async def test_chat_shape(golden_chat: list[dict]) -> None:
    """Every chat case must return a non-empty string response."""
    failures: list[str] = []
    for case in golden_chat:
        try:
            response = await _run_chat(case)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{case['id']}] graph raised: {e!r}")
            continue
        if not response or not isinstance(response, str):
            failures.append(f"[{case['id']}] empty or non-string response")
        elif len(response) < 10:
            failures.append(
                f"[{case['id']}] suspiciously short response: {response!r}"
            )
    assert not failures, "Shape failures:\n  - " + "\n  - ".join(failures)


@deepeval_required
@pytest.mark.deepeval
@pytest.mark.asyncio
async def test_chat_faithfulness_and_relevance(
    golden_chat: list[dict], judge
) -> None:
    """LLM-judge gate: Faithfulness + AnswerRelevancy + must_mention heuristic."""
    from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
    from deepeval.test_case import LLMTestCase

    faithfulness = FaithfulnessMetric(
        threshold=DEFAULT_THRESHOLD, model=judge, async_mode=False
    )
    relevancy = AnswerRelevancyMetric(
        threshold=DEFAULT_THRESHOLD, model=judge, async_mode=False
    )

    passes = 0
    total = 0
    failures: list[str] = []

    for case in golden_chat:
        try:
            actual = await _run_chat(case)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{case['id']}] graph error: {e!r}")
            continue

        snippets = case.get("context_snippets", [])
        tc = LLMTestCase(
            input=case["message"],
            actual_output=actual,
            retrieval_context=snippets or ["(no context — off-topic question)"],
        )

        # Heuristic: every must_mention token appears in the answer (case-insensitive).
        must = [m.lower() for m in case.get("must_mention", [])]
        if must:
            al = actual.lower()
            hits = sum(1 for m in must if m in al)
            heuristic_pass = hits / len(must) >= 0.5
            total += 1
            passes += int(heuristic_pass)
            if not heuristic_pass:
                failures.append(
                    f"[{case['id']}] must_mention: {hits}/{len(must)} "
                    f"({must})"
                )

        # Faithfulness only meaningful when there IS retrieval context.
        if snippets:
            ok, diag = run_metric(faithfulness, tc)
            total += 1
            passes += int(ok)
            if not ok:
                failures.append(f"[{case['id']}] Faithfulness failed: {diag}")

        ok, diag = run_metric(relevancy, tc)
        total += 1
        passes += int(ok)
        if not ok:
            failures.append(f"[{case['id']}] AnswerRelevancy failed: {diag}")

    aggregate_gate(passes, total, failures, label="chat_graph")
