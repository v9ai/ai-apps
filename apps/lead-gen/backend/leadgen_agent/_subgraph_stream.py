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
    async for chunk in compiled.astream(inputs, stream_mode="updates"):
        if not isinstance(chunk, dict):
            continue
        for node_name, delta in chunk.items():
            current = node_name
            if node_name in business_nodes and node_name not in completed:
                completed.append(node_name)
            if isinstance(delta, dict):
                final_state.update(delta)
    progress = {
        "current_node": current,
        "completed": completed,
        "total": len(business_nodes),
    }
    return final_state, progress
