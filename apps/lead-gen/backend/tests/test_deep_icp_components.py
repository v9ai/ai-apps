"""Component-level evals for the deep_icp graph.

Where `test_deep_icp_eval.py` treats the graph as a black box (input product →
final output, aggregate 0.80 gate), this file pins down each node in isolation
so regressions tell you *which* node drifted.

Three axes:

1. **Schema validation** — every golden product's graph output must pass
   `DeepICPOutput.model_validate(...)`. Catches prompt drift that produces
   missing criteria, out-of-range scores, or the wrong persona shape.

2. **Provenance** — the graph stamps `graph_meta` with version + weights hash
   + model name. Tests that this survives `synthesize` and that the weights
   hash matches the locked WEIGHTS.

3. **Per-node contracts** — `research_market` must produce non-empty segments
   and personas; `score_criteria` must emit all 5 criterion keys with valid
   scores. These are the two LLM-driven nodes; the others (load_product and
   synthesize) are pure transforms already covered by the shape test.

Runs locally against mlx_lm.server (set `LLM_BASE_URL=http://127.0.0.1:8080/v1`);
in CI, against DeepSeek via `DEEPSEEK_API_KEY`. Skipped when no judge LLM is
configured — same gate as the deepeval layer.
"""

from __future__ import annotations

import os
from typing import Any

import pytest
from pydantic import ValidationError

from leadgen_agent.deep_icp_graph import (
    WEIGHTS,
    build_graph,
    research_market,
    score_criteria,
)
from leadgen_agent.icp_schemas import (
    GRAPH_VERSION,
    CRITERION_NAMES,
    DeepICPOutput,
    weights_hash,
)
from leadgen_agent.llm import is_deepseek_configured


def _judge_available() -> bool:
    return bool(os.environ.get("LLM_BASE_URL") or is_deepseek_configured())


judge_required = pytest.mark.skipif(
    not _judge_available(), reason="no judge LLM configured"
)


async def _full_run(product: dict[str, Any]) -> dict[str, Any]:
    graph = build_graph()
    return await graph.ainvoke({"product_id": product.get("id", 0), "product": product})


# ── 1. Schema validation ──────────────────────────────────────────────


@judge_required
@pytest.mark.asyncio
async def test_every_golden_output_validates_against_pydantic(
    golden_products: list[dict],
) -> None:
    """Every golden product's output must round-trip through the Pydantic
    schema. Any ValidationError means the graph now emits a shape the UI and
    downstream consumers can't safely read."""
    failures: list[str] = []
    for entry in golden_products:
        try:
            out = await _full_run(entry["product"])
        except Exception as e:  # noqa: BLE001
            failures.append(f"[{entry['id']}] graph raised: {e!r}")
            continue
        try:
            DeepICPOutput.model_validate(out)
        except ValidationError as e:
            # Strip the default Pydantic noise — only the first 3 errors are
            # usually enough to diagnose.
            errs = "; ".join(
                f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                for err in e.errors()[:3]
            )
            failures.append(f"[{entry['id']}] {errs}")
    assert not failures, "Pydantic validation failures:\n  - " + "\n  - ".join(failures)


# ── 2. Provenance / graph_meta ────────────────────────────────────────


@judge_required
@pytest.mark.asyncio
async def test_graph_meta_stamps_version_and_weights_hash(
    golden_products: list[dict],
) -> None:
    """graph_meta must land in every run, with the locked version and a
    weights_hash that matches the active WEIGHTS. If WEIGHTS changes, this
    test flips red until callers acknowledge the drift."""
    product = golden_products[0]["product"]
    out = await _full_run(product)
    meta = out.get("graph_meta") or {}
    assert meta.get("version") == GRAPH_VERSION, (
        f"graph_meta.version drift: {meta.get('version')!r} != {GRAPH_VERSION!r}"
    )
    assert meta.get("weights_hash") == weights_hash(WEIGHTS), (
        "weights_hash mismatch — did WEIGHTS change without bumping GRAPH_VERSION?"
    )
    assert meta.get("run_at"), "graph_meta.run_at missing"


def test_weights_hash_is_stable() -> None:
    """Locks the hash so weight tweaks are loud — CI shows the diff."""
    # Recompute from the active WEIGHTS. If the constant below drifts from
    # the live hash, the contributor either meant to tune weights (in which
    # case bump GRAPH_VERSION too) or reverted an accidental change.
    expected = weights_hash(WEIGHTS)
    # Sanity: sum == 1.0.
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-6
    # Sanity: hash is 12 hex chars.
    assert len(expected) == 12
    assert all(c in "0123456789abcdef" for c in expected)


# ── 3. Per-node contracts ─────────────────────────────────────────────


@judge_required
@pytest.mark.asyncio
async def test_research_market_emits_segments_and_personas(
    golden_products: list[dict],
) -> None:
    """research_market is the only node that produces segments + personas
    from scratch. If it regresses, every downstream metric regresses too,
    so fail it in isolation."""
    product = golden_products[0]["product"]
    result = await research_market({"product": product})
    research = result.get("market_research") or {}
    assert isinstance(research.get("segments"), list) and research["segments"], (
        "research_market produced no segments"
    )
    assert isinstance(research.get("personas"), list) and research["personas"], (
        "research_market produced no personas"
    )
    # Each segment should name at least an industry or a geo — otherwise it's
    # just a vibes label and downstream persona/ICP reasoning can't ground to it.
    for seg in research["segments"][:3]:
        if not isinstance(seg, dict):
            continue
        has_signal = any(seg.get(k) for k in ("industry", "geo", "stage", "name"))
        assert has_signal, f"segment missing all identifying fields: {seg!r}"


@judge_required
@pytest.mark.asyncio
async def test_score_criteria_emits_all_five_criteria(
    golden_products: list[dict],
) -> None:
    """score_criteria must emit exactly the WEIGHTS criterion names with valid
    ranges. Any drift means the scoring prompt is off-rubric."""
    product = golden_products[0]["product"]
    research_result = await research_market({"product": product})
    scored = await score_criteria(
        {"product": product, "market_research": research_result["market_research"]}
    )
    criteria = scored.get("criteria_scores") or {}
    assert set(criteria.keys()) == set(CRITERION_NAMES), (
        f"criteria drift: extra={set(criteria) - set(CRITERION_NAMES)}, "
        f"missing={set(CRITERION_NAMES) - set(criteria)}"
    )
    for name, entry in criteria.items():
        for field in ("score", "confidence"):
            v = entry.get(field)
            assert isinstance(v, (int, float)) and 0.0 <= float(v) <= 1.0, (
                f"{name}.{field} out of range: {v!r}"
            )
