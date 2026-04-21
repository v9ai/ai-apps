"""Pydantic schemas for the `deep_icp` graph output.

Why Pydantic and not TypedDict:
 - Validation at node boundaries makes shape drift a unit-test failure, not a
   runtime render bug in the UI.
 - Structured types let evals assert component-level invariants (a Segment has
   an industry, a Persona has a title) without re-deriving the schema from
   dict lookups across multiple files.
 - The JSON schema is auto-derivable via `DeepICPOutput.model_json_schema()`
   for OpenAPI docs, prompt-embedded schemas, and Confident AI synthesizers.

Keep in sync with:
 - `apps/lead-gen/src/lib/langgraph-client.ts::DeepICPResult` (TS mirror)
 - `apps/lead-gen/backend/leadgen_agent/state.py::DeepICPState` (LangGraph
   state — stays TypedDict so LangGraph's state machinery keeps working)

The graph itself still returns plain dicts from each node. `synthesize`
validates the final dict through `DeepICPOutput.model_validate(...)` before
emitting, and stamps `graph_meta` with the version + weights hash.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Bump when the output contract changes (new field, renamed field, weights
# change, rubric prompt rewrite that alters score distribution). Old rows in
# `products.icp_analysis` remain readable; callers compare `graph_meta.version`
# to decide whether to re-run.
GRAPH_VERSION = "1.0.0"


# 5-dimension weights. Must match `deep_icp_graph.WEIGHTS`. Hashed into
# `graph_meta.weights_hash` so a weights tweak invalidates cached outputs
# without needing a full GRAPH_VERSION bump.
WEIGHTS: dict[str, float] = {
    "segment_clarity": 0.25,
    "buyer_persona_specificity": 0.25,
    "pain_solution_fit": 0.20,
    "distribution_gtm_signal": 0.15,
    "anti_icp_clarity": 0.15,
}

CRITERION_NAMES = tuple(WEIGHTS.keys())
CriterionName = Literal[
    "segment_clarity",
    "buyer_persona_specificity",
    "pain_solution_fit",
    "distribution_gtm_signal",
    "anti_icp_clarity",
]

Severity = Literal["low", "medium", "high"]


def weights_hash(weights: dict[str, float] = WEIGHTS) -> str:
    payload = json.dumps(weights, sort_keys=True).encode()
    return hashlib.sha256(payload).hexdigest()[:12]


class CriterionScore(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    justification: str = Field(default="", max_length=600)
    evidence: list[str] = Field(default_factory=list, max_length=6)

    @field_validator("evidence", mode="before")
    @classmethod
    def _truncate_evidence(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(x)[:240] for x in v if isinstance(x, (str, int, float))][:6]


class Segment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=120)
    industry: str = Field(default="", max_length=120)
    stage: str = Field(default="", max_length=80)
    geo: str = Field(default="", max_length=80)
    fit: float = Field(default=0.5, ge=0.0, le=1.0)
    reasoning: str = Field(default="", max_length=400)


class Persona(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(default="", max_length=120)
    seniority: str = Field(default="", max_length=60)
    department: str = Field(default="", max_length=80)
    pain: str = Field(default="", max_length=400)
    channel: str = Field(default="", max_length=120)


class DealBreaker(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=120)
    severity: Severity = "medium"
    reason: str = Field(default="", max_length=400)


class GraphMeta(BaseModel):
    """Provenance stamped onto every ICP run so callers can reason about
    staleness, eval regressions, and prompt drift."""

    model_config = ConfigDict(extra="ignore")

    version: str = GRAPH_VERSION
    weights_hash: str = Field(default_factory=weights_hash)
    run_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )
    model: str = ""


class DeepICPOutput(BaseModel):
    """The full output contract of the deep_icp graph.

    `synthesize` calls `DeepICPOutput.model_validate(...)` and emits
    `.model_dump()` — so every graph run either produces a shape that matches
    this class, or raises. That's what we want: a test that the graph output
    is well-formed is just a pydantic validation.
    """

    model_config = ConfigDict(extra="ignore")

    criteria_scores: dict[CriterionName, CriterionScore]
    weighted_total: float = Field(ge=0.0, le=1.0)
    segments: list[Segment] = Field(default_factory=list, max_length=6)
    personas: list[Persona] = Field(default_factory=list, max_length=6)
    anti_icp: list[str] = Field(default_factory=list, max_length=8)
    deal_breakers: list[DealBreaker] = Field(default_factory=list)
    graph_meta: GraphMeta = Field(default_factory=GraphMeta)

    @field_validator("anti_icp", mode="before")
    @classmethod
    def _truncate_anti_icp(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(x)[:240] for x in v if isinstance(x, (str, int, float))][:8]

    @field_validator("criteria_scores")
    @classmethod
    def _require_all_criteria(
        cls, v: dict[CriterionName, CriterionScore]
    ) -> dict[CriterionName, CriterionScore]:
        missing = set(CRITERION_NAMES) - set(v.keys())
        if missing:
            raise ValueError(f"criteria_scores missing: {sorted(missing)}")
        return v
