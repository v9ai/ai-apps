"""Offline eval harness for the GTM graph.

Gated on ``EVAL=1`` — never runs in normal pytest. See ``tests/EVALS.md``.

Flow per golden entry:
  1. Run the live gtm graph with ``product`` prepopulated.
  2. Serialize the output and score 4 metrics via an LLM judge:
       - channels_match        : at least one chosen channel aligns with expected
       - icp_match             : personas/templates target the expected ICPs
       - pain_points_covered   : pain points referenced match expected
       - positioning_axes      : messaging pillars implicitly invoke expected axes
  3. Aggregate pass rate across (entry × metric) must be >= 0.80.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest

from leadgen_agent.gtm_graph import build_graph

from ._eval_utils import (
    AGGREGATE_PASS_THRESHOLD,
    aggregate_gate,
    build_judge_prompt,
    eval_enabled,
    judge_available,
    judge_model_label,
    run_judge,
)

GOLDEN_PATH = Path(__file__).parent / "golden" / "gtm.json"


eval_required = pytest.mark.skipif(
    not eval_enabled() or not judge_available(),
    reason="set EVAL=1 and DEEPSEEK_API_KEY (or STRONG_JUDGE=1 + ANTHROPIC_API_KEY) to run",
)


@pytest.fixture(scope="module")
def golden_gtm() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list) and data, "golden gtm set must be non-empty"
    return data


def _serialize_gtm(out: dict[str, Any]) -> str:
    gtm = out.get("gtm") or {}
    channels = gtm.get("channels") or []
    pillars = gtm.get("messaging_pillars") or []
    templates = gtm.get("outreach_templates") or []
    playbook = gtm.get("sales_playbook") or {}
    first_90 = gtm.get("first_90_days") or []

    chan_lines = [
        f"  - {c.get('name', '?')}: {c.get('why', '')[:140]}"
        for c in channels
    ]
    pillar_lines = [
        f"  - {p.get('theme', '?')} (use-when: {p.get('when_to_use', '')[:120]})"
        for p in pillars
    ]
    template_lines = [
        f"  - {t.get('channel', '?')} → {t.get('persona', '?')} :: {t.get('hook', '')[:140]}"
        for t in templates[:6]
    ]
    disc_qs = playbook.get("discovery_questions") or []
    return (
        "channels:\n" + "\n".join(chan_lines) + "\n"
        "pillars:\n" + "\n".join(pillar_lines) + "\n"
        "templates:\n" + "\n".join(template_lines) + "\n"
        f"discovery_questions: {json.dumps(disc_qs)[:600]}\n"
        f"first_90_days: {json.dumps(first_90)[:800]}\n"
    )


async def _run(product: dict) -> dict:
    graph = build_graph()
    try:
        return await graph.ainvoke({"product_id": product.get("id", 0), "product": product})
    except Exception as e:  # noqa: BLE001
        return {"_runtime_error": repr(e)}


METRICS: list[tuple[str, str, str]] = [
    (
        "channels_match",
        "expected_channels",
        "Do at least 2 of the chosen channels semantically match expected channels? "
        "Credit synonyms (e.g. 'dev advocacy' vs 'developer advocacy / engineering blog').",
    ),
    (
        "icp_match",
        "expected_icps",
        "Do the personas targeted by templates and pillars align with expected ICPs? "
        "Credit supersets (e.g. 'engineering leaders' matches 'heads of engineering').",
    ),
    (
        "pain_points_covered",
        "expected_pain_points",
        "Are the pain points referenced in channels/pillars/templates semantically "
        "overlapping with at least 2 expected pain points?",
    ),
    (
        "positioning_axes",
        "expected_positioning_axes",
        "Do the messaging pillars implicitly invoke at least one expected positioning axis? "
        "The axis need not be quoted verbatim — look for the framing.",
    ),
]


@eval_required
@pytest.mark.asyncio
async def test_gtm_eval_aggregate(golden_gtm: list[dict]) -> None:
    print(f"\n[gtm-eval] judge={judge_model_label()} entries={len(golden_gtm)}")

    passes = 0
    total = 0
    failures: list[str] = []
    runtime_errors: list[str] = []

    for entry in golden_gtm:
        product = entry["product"]
        out = await _run(product)
        if "_runtime_error" in out:
            runtime_errors.append(f"[{entry['id']}] {out['_runtime_error']}")
            total += len(METRICS)
            continue

        actual = _serialize_gtm(out)
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
        f"gtm-eval: {passes}/{total} = {rate:.2%} "
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
    async def _main() -> None:
        with GOLDEN_PATH.open() as fh:
            data = json.load(fh)
        await test_gtm_eval_aggregate(data)

    asyncio.run(_main())
