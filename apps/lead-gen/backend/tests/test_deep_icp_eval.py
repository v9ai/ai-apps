"""deepeval gate for the `deep_icp` LangGraph node.

Two layers, both required to pass:
  1. Deterministic (always runs): shape + range invariants on the output.
  2. LLM-judge via deepeval (skipped if deepeval or a judge LLM are unavailable).
     Uses the same LLM factory the graph itself does, so the judge runs
     locally against mlx_lm.server (preferred) or DeepSeek in CI.

Aggregate pass rate across all 15 golden products × 5 metrics must be >= 0.80.
See plan: /Users/vadimnicolai/.claude/plans/investigate-these-https-agenticleadgen-x-eager-map.md
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import pytest

from leadgen_agent.deep_icp_graph import WEIGHTS, build_graph

# ── Deterministic layer ────────────────────────────────────────────────

CRITERION_KEYS = set(WEIGHTS.keys())


def _run_graph(product: dict) -> dict:
    graph = build_graph()
    # product_id is required by the state, but `product` pre-populated makes
    # load_product short-circuit (no Neon hit).
    return asyncio.get_event_loop().run_until_complete(
        graph.ainvoke({"product_id": product.get("id", 0), "product": product})
    )


def _run_graph_async(product: dict):
    graph = build_graph()
    return graph.ainvoke(
        {"product_id": product.get("id", 0), "product": product}
    )


@pytest.mark.asyncio
async def test_deterministic_shape_and_ranges(golden_products: list[dict]) -> None:
    """Every golden product must produce a well-shaped output."""
    failures: list[str] = []

    for entry in golden_products:
        product = entry["product"]
        try:
            out = await _run_graph_async(product)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{entry['id']}] graph raised: {e!r}")
            continue

        # Top-level keys
        for k in (
            "criteria_scores",
            "weighted_total",
            "segments",
            "personas",
            "anti_icp",
            "deal_breakers",
        ):
            if k not in out:
                failures.append(f"[{entry['id']}] missing key: {k}")

        # Ranges
        wt = out.get("weighted_total", -1)
        if not (0.0 <= wt <= 1.0):
            failures.append(f"[{entry['id']}] weighted_total out of range: {wt}")

        # Criteria completeness + range
        cs = out.get("criteria_scores") or {}
        missing = CRITERION_KEYS - set(cs.keys())
        if missing:
            failures.append(f"[{entry['id']}] missing criteria: {missing}")
        for name, entry_c in cs.items():
            for field in ("score", "confidence"):
                v = entry_c.get(field, -1)
                try:
                    v = float(v)
                except (TypeError, ValueError):
                    failures.append(f"[{entry['id']}] {name}.{field} not numeric")
                    continue
                if not (0.0 <= v <= 1.0):
                    failures.append(
                        f"[{entry['id']}] {name}.{field} out of range: {v}"
                    )

        # Anti-ICP guaranteed non-empty (synthesize enforces this).
        if not out.get("anti_icp"):
            failures.append(f"[{entry['id']}] anti_icp is empty")

        # At least one segment and one persona expected for a well-formed brief.
        if not out.get("segments"):
            failures.append(f"[{entry['id']}] no segments extracted")
        if not out.get("personas"):
            failures.append(f"[{entry['id']}] no personas extracted")

    # Shape layer gate — strict, no partial credit.
    assert not failures, "Deterministic failures:\n  - " + "\n  - ".join(failures)


# ── deepeval layer ─────────────────────────────────────────────────────


def _deepeval_available() -> bool:
    try:
        import deepeval  # noqa: F401
        from deepeval.metrics import AnswerRelevancyMetric  # noqa: F401
        return True
    except ImportError:
        return False


def _judge_available() -> bool:
    # The judge runs via the same ChatOpenAI factory the graph uses. Local
    # mlx_lm.server is the default; CI swaps in DeepSeek via LLM_BASE_URL.
    return bool(os.environ.get("LLM_BASE_URL") or os.environ.get("DEEPSEEK_API_KEY"))


deepeval_required = pytest.mark.skipif(
    not _deepeval_available() or not _judge_available(),
    reason="deepeval not installed or no judge LLM configured",
)


def _serialize_output(out: dict[str, Any]) -> str:
    """Compact the graph output into a flat string for LLM-judge metrics."""
    segments = "; ".join(
        f"{s.get('name','')} ({s.get('industry','?')}, fit {s.get('fit',0):.2f})"
        for s in out.get("segments", [])
    )
    personas = "; ".join(
        f"{p.get('title','')} [{p.get('seniority','?')}/{p.get('department','?')}] — pain: {p.get('pain','')}"
        for p in out.get("personas", [])
    )
    anti = "; ".join(out.get("anti_icp", []))
    scores = "; ".join(
        f"{k}={v.get('score',0):.2f}" for k, v in (out.get("criteria_scores") or {}).items()
    )
    return (
        f"WEIGHTED_TOTAL: {out.get('weighted_total', 0):.2f}\n"
        f"SCORES: {scores}\n"
        f"SEGMENTS: {segments}\n"
        f"PERSONAS: {personas}\n"
        f"ANTI_ICP: {anti}\n"
    )


def _make_judge():
    """Wrap our ChatOpenAI in a deepeval BaseLLM so the judge honors LLM_BASE_URL."""
    from deepeval.models.base_model import DeepEvalBaseLLM

    from leadgen_agent.llm import make_llm

    class LocalJudge(DeepEvalBaseLLM):
        def __init__(self) -> None:
            self._m = make_llm(temperature=0.0)

        def load_model(self):
            return self._m

        def generate(self, prompt: str) -> str:
            resp = self._m.invoke(prompt)
            return str(getattr(resp, "content", resp))

        async def a_generate(self, prompt: str) -> str:
            resp = await self._m.ainvoke(prompt)
            return str(getattr(resp, "content", resp))

        def get_model_name(self) -> str:
            return os.environ.get("LLM_MODEL", "local")

    return LocalJudge()


@deepeval_required
@pytest.mark.asyncio
async def test_llm_judge_aggregate_pass_rate(
    golden_products: list[dict],
) -> None:
    """Run relevancy + faithfulness + 2 GEvals + segment-match heuristic.

    Aggregate pass rate across (product × metric) cells must be >= 0.80.
    """
    from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, GEval
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams

    judge = _make_judge()
    threshold = 0.7

    relevancy = AnswerRelevancyMetric(threshold=threshold, model=judge, async_mode=False)
    faithful = FaithfulnessMetric(threshold=threshold, model=judge, async_mode=False)
    segment_acc = GEval(
        name="Segment-Accuracy",
        evaluation_steps=[
            "Read the expected segments from the product card.",
            "Check whether the actual output names segments that are either the expected ones or close synonyms / superset groupings.",
            "Penalize hallucinated segments not implied by the product brief.",
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=threshold,
        model=judge,
        async_mode=False,
    )
    persona_spec = GEval(
        name="Persona-Specificity",
        evaluation_steps=[
            "A good persona has a concrete title (e.g. 'VP of RevOps'), seniority, and a real pain.",
            "Penalize vague labels like 'decision maker' or 'stakeholder'.",
            "Reward personas that match or refine the expected personas.",
        ],
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=threshold,
        model=judge,
        async_mode=False,
    )

    passes = 0
    total = 0
    failures: list[str] = []

    for entry in golden_products:
        product = entry["product"]
        try:
            out = await _run_graph_async(product)
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{entry['id']}] graph error: {e!r}")
            continue

        actual = _serialize_output(out)
        brief = (
            f"{product.get('name','')} — {product.get('description','')}"
        )
        expected = (
            f"segments: {entry['expected_segments']}; "
            f"personas: {entry['expected_personas']}; "
            f"anti_icp: {entry['expected_anti_icp']}"
        )

        tc = LLMTestCase(
            input=brief,
            actual_output=actual,
            expected_output=expected,
            retrieval_context=[brief],
        )

        # Heuristic: fraction of expected segments that appear (case-insensitive
        # substring) anywhere in the actual output. Cheap and doesn't spend
        # judge tokens.
        al = actual.lower()
        hits = sum(1 for s in entry["expected_segments"] if s.lower() in al)
        heuristic_pass = hits / max(1, len(entry["expected_segments"])) >= 0.5
        total += 1
        passes += int(heuristic_pass)
        if not heuristic_pass:
            failures.append(f"[{entry['id']}] segment-heuristic: {hits}/{len(entry['expected_segments'])}")

        for metric in (relevancy, faithful, segment_acc, persona_spec):
            total += 1
            try:
                metric.measure(tc)
                ok = bool(getattr(metric, "is_successful", lambda: False)())
            except Exception as e:  # noqa: BLE001
                ok = False
                failures.append(f"[{entry['id']}] {metric.__class__.__name__}: {e!r}")
            passes += int(ok)
            if not ok:
                reason = getattr(metric, "reason", "")
                failures.append(
                    f"[{entry['id']}] {metric.__class__.__name__} failed "
                    f"(score={getattr(metric, 'score', None)}): {reason[:200]}"
                )

    rate = passes / max(1, total)
    summary = (
        f"deepeval pass rate: {passes}/{total} = {rate:.2%} "
        f"(gate 0.80)\n  - " + "\n  - ".join(failures[:30])
    )
    assert rate >= 0.80, summary


# ── Lightweight smoke: verify the weights still sum to 1.0 ────────────


def test_weights_sum_to_one() -> None:
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-6
