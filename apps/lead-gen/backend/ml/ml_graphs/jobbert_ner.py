# ml container — jobbert_ner LangGraph: text -> SKILL spans via JobBERT NER.
"""``jobbert_ner`` leaf graph — thin wrapper over ``leadgen_agent.jobbert_infer``.

Single-node StateGraph. Validates input against ``JobbertNerInput`` on entry
and output against ``JobbertNerOutput`` on exit. The actual NER inference
lives in ``leadgen_agent.jobbert_infer.extract_skills`` — this module just
adapts it to the LangGraph state shape and enforces the contract.

No ``interrupt()`` anywhere: CI guard enforces pure-compute leaf graphs.
"""

from __future__ import annotations

import logging
from typing import Any

import anyio
from langgraph.graph import END, START, StateGraph

from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    JobbertNerInput,
    JobbertNerOutput,
    JobbertNerSpan,
)
from leadgen_agent.jobbert_infer import extract_skills

log = logging.getLogger(__name__)


async def _extract(state: dict[str, Any]) -> dict[str, Any]:
    """Validate input, run the sync extractor off-thread, validate output."""
    inp = JobbertNerInput.model_validate(state)

    # extract_skills is torch-backed and blocking; keep the event loop free.
    raw_spans = await anyio.to_thread.run_sync(lambda: extract_skills(inp.text))

    spans: list[JobbertNerSpan] = []
    for item in raw_spans:
        # jobbert_infer returns dicts with keys: span, label, score, start, end.
        # Validate individually so a single malformed span surfaces clearly.
        spans.append(JobbertNerSpan.model_validate(item))

    out = JobbertNerOutput(schema_version=SCHEMA_VERSION, spans=spans)
    return out.model_dump()


def _build() -> Any:
    builder: StateGraph = StateGraph(dict)
    builder.add_node("extract", _extract)
    builder.add_edge(START, "extract")
    builder.add_edge("extract", END)
    return builder.compile()


graph = _build()

__all__ = ["graph"]
