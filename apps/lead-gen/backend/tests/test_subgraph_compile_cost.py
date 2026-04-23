"""Benchmark: module-level subgraph compilation vs per-invocation compilation.

The supervisor (``product_intel_graph.py``) used to call
``pricing_graph.build_graph()`` and ``gtm_graph.build_graph()`` from inside
the ``run_pricing`` / ``run_gtm`` nodes, which recompiled both subgraphs on
every supervisor invocation. The refactor lifts those into module-level
constants (``_PRICING_GRAPH`` / ``_GTM_GRAPH``), relying on LangGraph's
nested-checkpointer inheritance so subgraphs can be compiled once with
``checkpointer=None`` and still participate in parent-graph persistence.

This test quantifies the saving. We benchmark N iterations of:
  * OLD path: ``pricing_graph.build_graph() + gtm_graph.build_graph()``
    (simulating what ``run_pricing`` + ``run_gtm`` did together, per run)
  * NEW path: a no-op lookup of the module-level constants
    (``_PRICING_GRAPH`` / ``_GTM_GRAPH``)

and assert NEW is materially faster. Target claimed in the task brief is
~1.5s off a full pipeline run; the benchmark here isolates compile cost
so even a conservative 50ms-per-subgraph saving × 2 subgraphs × N=5
runs = 500ms shows up clearly.
"""

from __future__ import annotations

import time

from leadgen_agent import gtm_graph, pricing_graph, product_intel_graph


N_ITERATIONS = 5


def test_precompiled_subgraphs_are_reused() -> None:
    """Sanity: module-level constants exist and are the same object across
    imports (i.e. they're not re-created per attribute access)."""
    assert product_intel_graph._PRICING_GRAPH is not None
    assert product_intel_graph._GTM_GRAPH is not None
    # Two lookups of the module attribute must return the same compiled graph.
    # If someone accidentally replaces the constant with a property/function,
    # this guard will catch it.
    first = product_intel_graph._PRICING_GRAPH
    second = product_intel_graph._PRICING_GRAPH
    assert first is second
    first_gtm = product_intel_graph._GTM_GRAPH
    second_gtm = product_intel_graph._GTM_GRAPH
    assert first_gtm is second_gtm


def test_module_level_compile_is_faster_than_per_run_compile() -> None:
    """Compare ``N`` runs of (rebuild pricing + rebuild gtm) against ``N``
    runs of (attr-access the precompiled). The delta is the compile cost
    we save per supervisor invocation.

    Prints a human-readable summary so the benchmark is useful even when
    the assertion bar is very loose (CI jitter is real; we don't want
    flakes, but we do want visibility).
    """
    # Warm up once so the first-run JIT / import cost doesn't get charged
    # to whichever path we run first.
    _ = pricing_graph.build_graph(checkpointer=None)
    _ = gtm_graph.build_graph(checkpointer=None)

    # OLD path: recompile both subgraphs per iteration.
    t0 = time.perf_counter()
    for _ in range(N_ITERATIONS):
        _ = pricing_graph.build_graph(checkpointer=None)
        _ = gtm_graph.build_graph(checkpointer=None)
    old_total = time.perf_counter() - t0

    # NEW path: attr-access the module-level precompiled graphs.
    t1 = time.perf_counter()
    for _ in range(N_ITERATIONS):
        _ = product_intel_graph._PRICING_GRAPH
        _ = product_intel_graph._GTM_GRAPH
    new_total = time.perf_counter() - t1

    saved = old_total - new_total
    per_run = saved / N_ITERATIONS
    # Use print so -s shows the numbers; pytest captures but surfaces on fail.
    print(
        f"\n[subgraph-compile-bench] N={N_ITERATIONS} | "
        f"old={old_total*1000:.1f}ms | new={new_total*1000:.3f}ms | "
        f"saved={saved*1000:.1f}ms ({per_run*1000:.1f}ms/run)"
    )

    # Assert the new path is at least 100x faster in aggregate. Compile is
    # typically 50–200ms per subgraph × 2 per run; attr-access is sub-microsecond.
    # A 100x bar is well below the real ratio and robust to CI jitter.
    assert new_total * 100 < old_total, (
        f"precompiled path not meaningfully faster: "
        f"old={old_total*1000:.1f}ms new={new_total*1000:.1f}ms"
    )
    # And at least some absolute saving — guards against someone stubbing
    # build_graph to a no-op and silently regressing the optimization.
    assert saved > 0.010, f"expected >10ms total savings, got {saved*1000:.1f}ms"


def test_per_run_compile_cost_is_nontrivial() -> None:
    """Independently confirm that ``build_graph()`` compile cost is real —
    i.e. the old path genuinely paid for something. If this ever drops to
    microseconds, the optimization is moot and this test can be deleted.
    """
    # Warm-up avoids paying for first-call import side effects.
    _ = pricing_graph.build_graph(checkpointer=None)

    t0 = time.perf_counter()
    for _ in range(N_ITERATIONS):
        _ = pricing_graph.build_graph(checkpointer=None)
    pricing_compile = time.perf_counter() - t0

    t1 = time.perf_counter()
    for _ in range(N_ITERATIONS):
        _ = gtm_graph.build_graph(checkpointer=None)
    gtm_compile = time.perf_counter() - t1

    print(
        f"\n[per-run compile] pricing x{N_ITERATIONS}={pricing_compile*1000:.1f}ms "
        f"gtm x{N_ITERATIONS}={gtm_compile*1000:.1f}ms | "
        f"per-run savings={(pricing_compile + gtm_compile) / N_ITERATIONS * 1000:.1f}ms"
    )
    # Floor: compiling both subgraphs must cost at least 1ms combined per run.
    # Anything less and there's nothing to optimize.
    assert (pricing_compile + gtm_compile) / N_ITERATIONS > 0.001
