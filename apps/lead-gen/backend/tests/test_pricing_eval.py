"""Offline eval harness for the pricing graph.

Gated on ``EVAL=1`` — never runs in normal pytest. See ``tests/EVALS.md`` for
full docs on how to run, extend the golden set, and interpret pass/fail.

Flow per golden entry:
  1. Run the live pricing graph with ``product`` prepopulated so ``load_inputs``
     short-circuits the DB fetch (matches the deep_icp eval pattern).
  2. Serialize the output and score 5 metrics via an LLM judge:
       - value_metric_match       : does the chosen metric match the signals?
       - model_type_match         : is model_type in the expected set?
       - tier_count_in_range      : is the tier count within the expected band?
       - wtp_signals_covered      : do prices / WTP cues overlap?
       - risks_grounded           : are surfaced risks realistic for this product?
  3. Aggregate pass rate across (entry × metric) must be >= 0.80.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest

from leadgen_agent.pricing_graph import build_graph

from ._eval_utils import (
    AGGREGATE_PASS_THRESHOLD,
    aggregate_gate,
    build_judge_prompt,
    eval_enabled,
    judge_available,
    judge_model_label,
    run_judge,
)

GOLDEN_PATH = Path(__file__).parent / "golden" / "pricing.json"


eval_required = pytest.mark.skipif(
    not eval_enabled() or not judge_available(),
    reason="set EVAL=1 and DEEPSEEK_API_KEY (or STRONG_JUDGE=1 + ANTHROPIC_API_KEY) to run",
)


@pytest.fixture(scope="module")
def golden_pricing() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list) and data, "golden pricing set must be non-empty"
    return data


def _serialize_pricing(out: dict[str, Any]) -> str:
    pricing = out.get("pricing") or {}
    model = pricing.get("model") or {}
    rationale = pricing.get("rationale") or {}
    tiers = model.get("tiers") or []
    tier_lines = []
    for t in tiers:
        p = t.get("price_monthly_usd")
        price = f"${p}/mo" if p is not None else "custom"
        tier_lines.append(
            f"  - {t.get('name', '?')} ({price}, {t.get('billing_unit', '?')}) "
            f"persona={t.get('target_persona', '?')}"
        )
    return (
        f"value_metric: {model.get('value_metric', '?')}\n"
        f"model_type: {model.get('model_type', '?')}\n"
        f"free_offer: {model.get('free_offer', '')}\n"
        f"tier_count: {len(tiers)}\n"
        f"tiers:\n" + "\n".join(tier_lines) + "\n"
        f"wtp_estimate: {rationale.get('wtp_estimate', '')}\n"
        f"risks: {json.dumps(rationale.get('risks') or [])}\n"
        f"recommendation: {rationale.get('recommendation', '')}\n"
    )


async def _run(product: dict) -> dict:
    graph = build_graph()
    # Seed state with product already populated so load_inputs skips the DB.
    # The graph's load_inputs still tries psycopg — we bypass that by
    # invoking from choose_value_metric downstream. For simplicity + parity
    # with deep_icp tests, we just catch DB errors and skip those entries.
    try:
        return await graph.ainvoke({"product_id": product.get("id", 0), "product": product})
    except Exception as e:  # noqa: BLE001
        return {"_runtime_error": repr(e)}


METRICS: list[tuple[str, str, str]] = [
    (
        "value_metric_match",
        "expected_value_metric_signals",
        "Does the recommended value_metric match any of the expected signals (allow synonyms and close paraphrases)?",
    ),
    (
        "model_type_match",
        "expected_model_type",
        "Is model_type equal to (or a reasonable variant of) the expected model_type? "
        "E.g. 'hybrid' with a clear usage component scores the 'usage' expected as a near-match.",
    ),
    (
        "tier_count_in_range",
        "expected_tier_count_range",
        "Does the tier count fall within the expected [min,max] range?",
    ),
    (
        "wtp_signals_covered",
        "expected_wtp_signals",
        "Do the prices in tiers OR the wtp_estimate cover at least one expected WTP signal?",
    ),
    (
        "risks_grounded",
        "expected_risks",
        "Are the risks realistic for this product and overlap (semantically) with at least one expected risk?",
    ),
]


@eval_required
@pytest.mark.asyncio
async def test_pricing_eval_aggregate(golden_pricing: list[dict]) -> None:
    print(f"\n[pricing-eval] judge={judge_model_label()} entries={len(golden_pricing)}")

    passes = 0
    total = 0
    failures: list[str] = []
    runtime_errors: list[str] = []

    for entry in golden_pricing:
        product = entry["product"]
        out = await _run(product)
        if "_runtime_error" in out:
            runtime_errors.append(f"[{entry['id']}] {out['_runtime_error']}")
            # Each unreachable entry counts as a failure for every metric so
            # an entirely broken graph cannot accidentally pass.
            total += len(METRICS)
            continue

        actual = _serialize_pricing(out)
        for metric_name, expected_key, rubric in METRICS:
            total += 1
            expected = entry.get(expected_key)
            msgs = build_judge_prompt(
                product_name=product.get("name", "?"),
                metric_name=metric_name,
                rubric=rubric,
                expected=expected,
                actual=actual,
            )
            verdict = await run_judge(msgs)
            if verdict["verdict"] == "pass":
                passes += 1
            else:
                failures.append(
                    f"[{entry['id']}] {metric_name} "
                    f"score={verdict['score']:.2f} — {verdict['reason']}"
                )

    rate, ok = aggregate_gate(passes, total)
    header = (
        f"pricing-eval: {passes}/{total} = {rate:.2%} "
        f"(gate {AGGREGATE_PASS_THRESHOLD:.0%}, judge={judge_model_label()})"
    )
    detail = "\n  - ".join(failures[:25])
    runtime = "\n  - ".join(runtime_errors[:10])
    msg = (
        f"{header}\nFailures:\n  - {detail}"
        + (f"\nRuntime errors:\n  - {runtime}" if runtime_errors else "")
    )
    print("\n" + msg)
    assert ok, msg


if __name__ == "__main__":
    # Allow manual invocation outside pytest for debugging:  python -m tests.test_pricing_eval
    async def _main() -> None:
        with GOLDEN_PATH.open() as fh:
            data = json.load(fh)
        await test_pricing_eval_aggregate(data)

    asyncio.run(_main())
