"""Offline eval harness for the positioning graph.

Gated on ``EVAL=1`` — never runs in normal pytest. See ``tests/EVALS.md``.

Team 4 is building ``positioning_graph.py`` in a parallel worktree. If it does
not yet exist, the whole module emits a **warning** via pytest.skip — the
golden set still validates structurally so broken JSON is caught early.

Once the graph lands, it MUST expose:
  - ``build_graph()`` returning a compiled LangGraph.
  - Output keys (on the final state): ``positioning`` or ``strategy`` dict
    containing at least ``category``, ``differentiators``, ``positioning_axes``,
    ``competitor_frame`` (or ``competitor_landscape``), ``narrative_hooks``
    (or ``messaging_hooks``).
If the shape differs, adjust ``_serialize_positioning`` to match.

Flow per golden entry (once the graph exists):
  1. Run the graph with ``product`` prepopulated.
  2. Serialize + score 5 metrics via LLM judge:
       - category_match
       - differentiators_covered
       - positioning_axes_alignment
       - competitor_frame_recognized
       - narrative_hook_resonance
  3. Aggregate pass rate across (entry × metric) must be >= 0.80.
"""

from __future__ import annotations

import asyncio
import importlib
import json
import warnings
from pathlib import Path
from typing import Any

import pytest

from ._eval_utils import (
    AGGREGATE_PASS_THRESHOLD,
    aggregate_gate,
    build_judge_prompt,
    eval_enabled,
    judge_available,
    judge_model_label,
    run_judge,
)

GOLDEN_PATH = Path(__file__).parent / "golden" / "positioning.json"


def _positioning_graph_available() -> bool:
    try:
        importlib.import_module("leadgen_agent.positioning_graph")
        return True
    except ImportError:
        return False


eval_required = pytest.mark.skipif(
    not eval_enabled() or not judge_available(),
    reason="set EVAL=1 and DEEPSEEK_API_KEY (or STRONG_JUDGE=1 + ANTHROPIC_API_KEY) to run",
)


# ── Always-on: structural validation of the golden set itself ───────────

def test_positioning_golden_set_is_structurally_valid() -> None:
    """Runs unconditionally — catches golden-JSON drift even without EVAL=1."""
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list) and data, "positioning golden set must be non-empty"
    required_keys = {
        "id",
        "product",
        "expected_category",
        "expected_differentiators",
        "expected_positioning_axes",
        "expected_competitor_frame",
        "expected_narrative_hooks",
    }
    for entry in data:
        missing = required_keys - set(entry.keys())
        assert not missing, f"entry {entry.get('id')} missing keys: {missing}"
        assert isinstance(entry["expected_differentiators"], list)
        assert isinstance(entry["expected_positioning_axes"], list)
        assert isinstance(entry["expected_competitor_frame"], list)
        assert isinstance(entry["expected_narrative_hooks"], list)


# ── Eval: gated on EVAL=1 AND graph existing ───────────────────────────

@pytest.fixture(scope="module")
def golden_positioning() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _serialize_positioning(out: dict[str, Any]) -> str:
    # Be liberal in what we accept: team 4's final key naming may differ.
    payload = (
        out.get("positioning")
        or out.get("strategy")
        or out.get("report")
        or out
    )
    if not isinstance(payload, dict):
        return str(payload)
    category = payload.get("category") or payload.get("product_category") or ""
    differentiators = payload.get("differentiators") or payload.get("key_differentiators") or []
    axes = payload.get("positioning_axes") or payload.get("axes") or []
    comp_frame = (
        payload.get("competitor_frame")
        or payload.get("competitor_landscape")
        or payload.get("competitors")
        or []
    )
    hooks = (
        payload.get("narrative_hooks")
        or payload.get("messaging_hooks")
        or payload.get("headlines")
        or []
    )
    return (
        f"category: {category}\n"
        f"differentiators: {json.dumps(differentiators)[:800]}\n"
        f"positioning_axes: {json.dumps(axes)[:600]}\n"
        f"competitor_frame: {json.dumps(comp_frame)[:800]}\n"
        f"narrative_hooks: {json.dumps(hooks)[:600]}\n"
    )


async def _run(product: dict) -> dict:
    mod = importlib.import_module("leadgen_agent.positioning_graph")
    build_graph = getattr(mod, "build_graph")
    graph = build_graph()
    try:
        return await graph.ainvoke({"product_id": product.get("id", 0), "product": product})
    except Exception as e:  # noqa: BLE001
        return {"_runtime_error": repr(e)}


METRICS: list[tuple[str, str, str]] = [
    (
        "category_match",
        "expected_category",
        "Does the category identified match (or reasonably paraphrase) the expected category?",
    ),
    (
        "differentiators_covered",
        "expected_differentiators",
        "Do the listed differentiators overlap (semantically) with at least 2 expected differentiators?",
    ),
    (
        "positioning_axes_alignment",
        "expected_positioning_axes",
        "Do the identified positioning axes align with at least 1 expected axis? "
        "Axes are two-sided framings like 'X vs Y' — credit semantic equivalents.",
    ),
    (
        "competitor_frame_recognized",
        "expected_competitor_frame",
        "Does the competitor frame name at least 2 competitors that appear (by name or close synonym) "
        "in the expected list?",
    ),
    (
        "narrative_hook_resonance",
        "expected_narrative_hooks",
        "Do any of the produced narrative hooks capture the same message as one of the expected hooks? "
        "Exact wording not required — match the intent.",
    ),
]


@eval_required
@pytest.mark.asyncio
async def test_positioning_eval_aggregate(golden_positioning: list[dict]) -> None:
    if not _positioning_graph_available():
        warnings.warn(
            "leadgen_agent.positioning_graph not found — skipping the live eval. "
            "Golden set is ready; land the graph in a parallel worktree to activate.",
            stacklevel=2,
        )
        pytest.skip("positioning_graph not yet implemented")

    print(f"\n[positioning-eval] judge={judge_model_label()} entries={len(golden_positioning)}")

    passes = 0
    total = 0
    failures: list[str] = []
    runtime_errors: list[str] = []

    for entry in golden_positioning:
        product = entry["product"]
        out = await _run(product)
        if "_runtime_error" in out:
            runtime_errors.append(f"[{entry['id']}] {out['_runtime_error']}")
            total += len(METRICS)
            continue

        actual = _serialize_positioning(out)
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
        f"positioning-eval: {passes}/{total} = {rate:.2%} "
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
        await test_positioning_eval_aggregate(data)

    asyncio.run(_main())
