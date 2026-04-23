"""Pydantic schemas for the pricing / gtm / product_intel graphs.

Kept separate from `icp_schemas.py` so the ICP contract (consumed by the
`/products/[slug]/icp` UI and the `products.icp_analysis` jsonb column) stays
immutable. New graphs land their output in new jsonb columns:

    products.pricing_analysis  ← PricingStrategy.model_dump()
    products.gtm_analysis      ← GTMStrategy.model_dump()
    products.intel_report      ← ProductIntelReport.model_dump()

Bump ``PRODUCT_INTEL_VERSION`` on any breaking contract change so callers can
decide whether to re-run by comparing ``graph_meta.version``.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# Re-export ICP shapes so product_intel consumers can import everything from
# one module.
from .icp_schemas import (  # noqa: F401 — re-exported via __all__
    DealBreaker,
    DeepICPOutput,
    GraphMeta,
    Persona,
    Segment,
)


def _none_to_empty_str(payload: dict[str, Any] | Any, fields: tuple[str, ...]) -> dict[str, Any] | Any:
    """LLMs frequently emit `null` for string fields that have no applicable
    value. This helper replaces `None` with `""` for the listed fields so the
    model validator's string type check doesn't fail. Used across the DeepSeek-
    driven graphs (pricing / gtm / product_intel)."""
    if not isinstance(payload, dict):
        return payload
    for f in fields:
        if payload.get(f) is None:
            payload[f] = ""
    return payload


__all__ = [
    "PRODUCT_INTEL_VERSION",
    "ProductProfile",
    "PriceTier",
    "PriceAnchor",
    "PricingModel",
    "PricingRationale",
    "PricingStrategy",
    "Channel",
    "MessagingPillar",
    "OutreachTemplate",
    "Objection",
    "SalesPlaybook",
    "GTMStrategy",
    "PositioningStatement",
    "ProductIntelReport",
    "product_intel_graph_meta",
    # re-exports
    "DeepICPOutput",
    "Segment",
    "Persona",
    "DealBreaker",
    "GraphMeta",
]

PRODUCT_INTEL_VERSION = "1.0.0"


def product_intel_graph_meta(
    *,
    graph: str,
    model: str,
    agent_timings: dict[str, float] | None = None,
    telemetry: dict[str, Any] | None = None,
    totals: dict[str, Any] | None = None,
) -> dict:
    """Stamp a run with version + timings + optional cost/latency telemetry.

    ``telemetry`` is the per-node dict built via
    ``llm.merge_node_telemetry`` — one entry per graph node that made an LLM
    call, each carrying ``{model, input_tokens, output_tokens, cost_usd,
    latency_ms, calls}``. ``totals`` is the aggregate computed by
    ``llm.compute_totals`` (sum of cost / tokens / llm latency across nodes).

    Both are optional so graphs that don't wire telemetry still pass this
    through unchanged. Returned as a plain dict because nodes write jsonb, not
    Pydantic.
    """
    payload = {
        "version": PRODUCT_INTEL_VERSION,
        "graph": graph,
        "model": model,
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    if agent_timings:
        payload["agent_timings"] = agent_timings
    if telemetry:
        payload["telemetry"] = telemetry
    if totals:
        payload["totals"] = totals
    return payload


# ─── Product profile ──────────────────────────────────────────────────────

class ProductProfile(BaseModel):
    """Normalized profile extracted from the landing page + DB row."""

    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=160)
    one_liner: str = Field(default="", max_length=240)
    category: str = Field(default="", max_length=120)
    core_jobs: list[str] = Field(default_factory=list, max_length=8)
    key_features: list[str] = Field(default_factory=list, max_length=12)
    stated_audience: str = Field(default="", max_length=240)
    visible_pricing: str = Field(default="", max_length=240)
    tech_signals: list[str] = Field(default_factory=list, max_length=12)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(
            v, ("name", "one_liner", "category", "stated_audience", "visible_pricing")
        )

    @field_validator("core_jobs", "key_features", "tech_signals", mode="before")
    @classmethod
    def _truncate_list(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(x)[:240] for x in v if isinstance(x, (str, int, float))][:12]


# ─── Pricing ──────────────────────────────────────────────────────────────

BillingUnit = Literal["per_seat", "per_usage", "flat", "hybrid", "custom"]
ModelType = Literal["subscription", "usage", "hybrid", "per_outcome", "freemium"]


class PriceTier(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=80)
    price_monthly_usd: float | None = Field(
        default=None,
        description="Monthly USD price. None means custom/contact-sales.",
    )
    billing_unit: BillingUnit = "flat"
    target_persona: str = Field(default="", max_length=200)
    included: list[str] = Field(default_factory=list, max_length=12)
    limits: list[str] = Field(default_factory=list, max_length=8)
    upgrade_trigger: str = Field(default="", max_length=240)
    # Grounding fields — additive, all default empty for backwards compat with
    # rows persisted before these were introduced.
    price_justification: str = Field(default="", max_length=500)
    anchor_competitors: list[str] = Field(default_factory=list, max_length=4)
    value_math: str = Field(default="", max_length=300)

    @field_validator(
        "name",
        "target_persona",
        "upgrade_trigger",
        "price_justification",
        "value_math",
        mode="before",
    )
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        # LLMs frequently emit `null` for non-applicable fields (e.g. custom
        # tier has no upgrade_trigger). Coerce to empty string so Pydantic's
        # str type accepts it — max_length still enforces the upper bound.
        if v is None:
            return ""
        return str(v)

    @field_validator("billing_unit", mode="before")
    @classmethod
    def _coerce_billing_unit(cls, v: object) -> str:
        if v is None or v == "":
            return "flat"
        return str(v)

    @field_validator("included", "limits", mode="before")
    @classmethod
    def _coerce_list(cls, v: object) -> list:
        if v is None:
            return []
        return v if isinstance(v, list) else []

    @field_validator("anchor_competitors", mode="before")
    @classmethod
    def _coerce_anchor_competitors(cls, v: object) -> list:
        if v is None or not isinstance(v, list):
            return []
        return [str(x)[:240] for x in v if isinstance(x, (str, int, float))]

    @field_validator("price_monthly_usd", mode="before")
    @classmethod
    def _coerce_price(cls, v: object) -> float | None:
        if v is None or v == "":
            return None
        if isinstance(v, str) and v.strip().lower() in {"custom", "contact", "contact sales"}:
            return None
        try:
            return max(0.0, float(v))
        except (TypeError, ValueError):
            return None


class PricingModel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    value_metric: str = Field(default="", max_length=200)
    model_type: ModelType = "subscription"
    free_offer: str = Field(default="", max_length=200)
    tiers: list[PriceTier] = Field(default_factory=list, min_length=1, max_length=6)
    addons: list[str] = Field(default_factory=list, max_length=8)
    discounting_strategy: str = Field(default="", max_length=300)
    # Top-level "why" reasoning, surfaced in the UI so readers can see why this
    # metric / model shape was chosen. Additive — default empty.
    value_metric_reasoning: str = Field(default="", max_length=400)
    model_type_reasoning: str = Field(default="", max_length=400)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(
            v,
            (
                "value_metric",
                "free_offer",
                "discounting_strategy",
                "value_metric_reasoning",
                "model_type_reasoning",
            ),
        )

    @field_validator("model_type", mode="before")
    @classmethod
    def _coerce_model_type(cls, v: object) -> str:
        if v is None or v == "":
            return "subscription"
        return str(v)


PriceAnchorRelation = Literal["below", "at_parity", "premium", "undercut"]


class PriceAnchor(BaseModel):
    """One competitor tier used as a reference point for a recommended price.

    Surfaced in the UI as a structured anchors table so readers can see at a
    glance which competitor each price is benchmarked against and how the
    recommendation compares (below / at parity / premium / undercut).
    """

    model_config = ConfigDict(extra="ignore")

    competitor: str = Field(default="", max_length=160)
    tier: str = Field(default="", max_length=80)
    monthly_price_usd: float | None = None
    relation: PriceAnchorRelation = "at_parity"
    note: str = Field(default="", max_length=240)

    @field_validator("competitor", "tier", "note", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v)

    @field_validator("relation", mode="before")
    @classmethod
    def _coerce_relation(cls, v: object) -> str:
        if v is None or v == "":
            return "at_parity"
        s = str(v).lower().strip()
        if s in {"below", "at_parity", "premium", "undercut"}:
            return s
        # Common LLM variants.
        if s in {"at parity", "parity", "equal", "match"}:
            return "at_parity"
        if s in {"above", "higher", "more_expensive"}:
            return "premium"
        if s in {"lower", "cheaper", "under"}:
            return "below"
        return "at_parity"

    @field_validator("monthly_price_usd", mode="before")
    @classmethod
    def _coerce_price(cls, v: object) -> float | None:
        if v is None or v == "":
            return None
        if isinstance(v, str) and v.strip().lower() in {"custom", "contact", "contact sales"}:
            return None
        try:
            return max(0.0, float(v))
        except (TypeError, ValueError):
            return None


class PricingRationale(BaseModel):
    model_config = ConfigDict(extra="ignore")

    value_basis: str = Field(default="", max_length=600)
    competitor_benchmark: str = Field(default="", max_length=600)
    wtp_estimate: str = Field(default="", max_length=300)
    risks: list[str] = Field(default_factory=list, max_length=6)
    recommendation: str = Field(default="", max_length=600)
    # Structured version of competitor_benchmark — an explicit list of anchor
    # tiers so the UI can render a comparison table instead of a wall of text.
    price_anchors: list[PriceAnchor] = Field(default_factory=list, max_length=8)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(
            v, ("value_basis", "competitor_benchmark", "wtp_estimate", "recommendation")
        )

    @field_validator("price_anchors", mode="before")
    @classmethod
    def _coerce_anchors(cls, v: object) -> list:
        if v is None or not isinstance(v, list):
            return []
        # Drop non-dict entries so a malformed LLM response doesn't crash the
        # whole run — each PriceAnchor validates itself downstream.
        return [item for item in v if isinstance(item, dict)]


class PricingStrategy(BaseModel):
    """Final output of the `pricing` graph. Stored in products.pricing_analysis."""

    model_config = ConfigDict(extra="ignore")

    model: PricingModel
    rationale: PricingRationale
    graph_meta: dict = Field(default_factory=dict)


# ─── GTM ──────────────────────────────────────────────────────────────────

ChannelEffort = Literal["low", "medium", "high"]
OutreachChannel = Literal[
    "cold_email",
    "linkedin_dm",
    "linkedin_connect",
    "linkedin_post",
    "reply_guy",
    "community",
    "webinar",
]


class Channel(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(default="", max_length=120)
    why: str = Field(default="", max_length=400)
    icp_presence: str = Field(default="", max_length=300)
    tactics: list[str] = Field(default_factory=list, max_length=6)
    effort: ChannelEffort = "medium"
    time_to_first_lead: str = Field(default="", max_length=80)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(
            v, ("name", "why", "icp_presence", "time_to_first_lead")
        )

    @field_validator("effort", mode="before")
    @classmethod
    def _coerce_effort(cls, v: object) -> str:
        if v is None or v == "":
            return "medium"
        return str(v)


class MessagingPillar(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: str = Field(default="", max_length=160)
    proof_points: list[str] = Field(default_factory=list, max_length=6)
    when_to_use: str = Field(default="", max_length=240)
    avoid_when: str = Field(default="", max_length=240)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(v, ("theme", "when_to_use", "avoid_when"))


class OutreachTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    channel: OutreachChannel = "cold_email"
    persona: str = Field(default="", max_length=160)
    hook: str = Field(default="", max_length=320)
    body: str = Field(default="", max_length=900)
    cta: str = Field(default="", max_length=200)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(v, ("persona", "hook", "body", "cta"))

    @field_validator("channel", mode="before")
    @classmethod
    def _coerce_channel(cls, v: object) -> str:
        if v is None or v == "":
            return "cold_email"
        return str(v)


class Objection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    objection: str = Field(default="", max_length=400)
    response: str = Field(default="", max_length=900)
    evidence_to_show: list[str] = Field(default_factory=list, max_length=5)

    @field_validator("objection", "response", mode="before")
    @classmethod
    def _truncate_str(cls, v: object) -> str:
        # LLMs occasionally overshoot length hints by a few dozen chars; rather
        # than raise and crash the whole graph, truncate to the soft caps
        # below. Caps match the Field max_length values — keep in sync.
        if v is None:
            return ""
        s = str(v)
        # Use the stricter of the two caps for either field; Pydantic max_length
        # still enforces the final ceiling.
        return s[:900]


class SalesPlaybook(BaseModel):
    model_config = ConfigDict(extra="ignore")

    discovery_questions: list[str] = Field(default_factory=list, max_length=10)
    objections: list[Objection] = Field(default_factory=list, max_length=8)
    battlecards: dict[str, str] = Field(default_factory=dict)


class GTMStrategy(BaseModel):
    """Final output of the `gtm` graph. Stored in products.gtm_analysis."""

    model_config = ConfigDict(extra="ignore")

    channels: list[Channel] = Field(default_factory=list, min_length=1, max_length=6)
    messaging_pillars: list[MessagingPillar] = Field(default_factory=list, min_length=1, max_length=6)
    outreach_templates: list[OutreachTemplate] = Field(default_factory=list, max_length=8)
    sales_playbook: SalesPlaybook = Field(default_factory=SalesPlaybook)
    first_90_days: list[str] = Field(default_factory=list, max_length=12)
    graph_meta: dict = Field(default_factory=dict)


# ─── Positioning ──────────────────────────────────────────────────────────

class PositioningStatement(BaseModel):
    """Final output of the ``positioning`` graph. Stored in
    ``products.positioning_analysis`` (migration 0064)."""

    model_config = ConfigDict(extra="ignore")

    category: str = Field(default="", max_length=160)
    category_conventions: list[str] = Field(default_factory=list, max_length=10)
    white_space: list[str] = Field(default_factory=list, max_length=8)
    differentiators: list[str] = Field(default_factory=list, max_length=8)
    positioning_axes: list[str] = Field(default_factory=list, max_length=6)
    competitor_frame: list[str] = Field(default_factory=list, max_length=8)
    narrative_hooks: list[str] = Field(default_factory=list, max_length=6)
    positioning_statement: str = Field(default="", max_length=600)
    critic_rounds: int = Field(default=0, ge=0, le=3)
    graph_meta: dict = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(v, ("category", "positioning_statement"))

    @field_validator(
        "category_conventions",
        "white_space",
        "differentiators",
        "positioning_axes",
        "competitor_frame",
        "narrative_hooks",
        mode="before",
    )
    @classmethod
    def _truncate_list(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(x)[:400] for x in v if isinstance(x, (str, int, float))]


# ─── Executive report ─────────────────────────────────────────────────────

class ProductIntelReport(BaseModel):
    """Final output of the `product_intel` supervisor. Stored in products.intel_report."""

    model_config = ConfigDict(extra="ignore")

    tldr: str = Field(default="", max_length=800)
    top_3_priorities: list[str] = Field(default_factory=list, max_length=3)
    key_risks: list[str] = Field(default_factory=list, max_length=5)
    quick_wins: list[str] = Field(default_factory=list, max_length=6)
    product_profile: ProductProfile | None = None
    positioning: PositioningStatement | None = None
    graph_meta: dict = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, v: Any) -> Any:
        return _none_to_empty_str(v, ("tldr",))

    @field_validator("top_3_priorities", "key_risks", "quick_wins", mode="before")
    @classmethod
    def _truncate_list(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        return [str(x)[:400] for x in v if isinstance(x, (str, int, float))]


def config_hash() -> str:
    """Hash of the version + module tuple — lets callers detect prompt drift."""
    payload = json.dumps({"version": PRODUCT_INTEL_VERSION}, sort_keys=True).encode()
    return hashlib.sha256(payload).hexdigest()[:12]
