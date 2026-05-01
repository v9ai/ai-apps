"""Shared helper for streaming a compiled subgraph and collecting final state
plus per-node progress.

Extracted so the v1 (``product_intel_graph``) and v2 (``product_intel_v2_graph``)
supervisors emit consistent progress events — otherwise a v2 cutover regresses
the "N/M nodes done" UI badge that v1 renders via ``pricing_subgraph_progress``
/ ``gtm_subgraph_progress``.
"""

from __future__ import annotations

from typing import Any


async def stream_subgraph(
    compiled: Any,
    inputs: dict[str, Any],
    business_nodes: frozenset[str],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Run a compiled subgraph via ``astream(stream_mode='updates')``.

    Returns ``(final_state, progress)`` where ``progress`` has the shape
    ``{"current_node": str, "completed": [str,...], "total": int}``.
    ``total`` is the number of business nodes in the subgraph (notify_*
    bookkeeping excluded) so UIs can render an accurate "N/M done" badge.

    LangGraph's ``astream`` in ``stream_mode='updates'`` yields one dict per
    node execution keyed by node name with that node's state-delta as value.
    We fold those deltas into ``final_state`` to mirror what ``ainvoke`` would
    have returned.
    """
    final_state: dict[str, Any] = {}
    completed: list[str] = []
    current: str = ""
    # Hold an explicit reference to the async iterator so we can ``aclose()``
    # it on early exit (parent task cancellation, timeout, client disconnect).
    # Without this the subgraph keeps issuing LLM calls and DB writes after
    # the parent has moved on.
    stream = compiled.astream(inputs, stream_mode="updates")
    try:
        async for chunk in stream:
            if not isinstance(chunk, dict):
                continue
            for node_name, delta in chunk.items():
                current = node_name
                if node_name in business_nodes and node_name not in completed:
                    completed.append(node_name)
                if isinstance(delta, dict):
                    # Sticky ``_error`` — once a child node reports a failure
                    # don't let a later partial-state delta clobber it.
                    if delta.get("_error") and final_state.get("_error"):
                        delta = {k: v for k, v in delta.items() if k != "_error"}
                    final_state.update(delta)
    finally:
        aclose = getattr(stream, "aclose", None)
        if aclose is not None:
            try:
                await aclose()
            except Exception:  # noqa: BLE001 — close-on-exit is best-effort
                pass
    progress = {
        "current_node": current,
        "completed": completed,
        "total": len(business_nodes),
    }
    return final_state, progress
