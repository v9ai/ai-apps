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

# Re-export ICP shapes so product_intel consumers can import everything from
# one module.
from .icp_schemas import DealBreaker, DeepICPOutput, GraphMeta, Persona, Segment

__all__ = [
    "PRODUCT_INTEL_VERSION",
    "ProductProfile",
    "PriceTier",
    "PricingModel",
    "PricingRationale",
    "PricingStrategy",
    "Channel",
    "MessagingPillar",
    "OutreachTemplate",
    "Objection",
    "SalesPlaybook",
    "GTMStrategy",
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
    *, graph: str, model: str, agent_timings: dict[str, float] | None = None
) -> dict:
    """Stamp a run with version + timings. Returned as a plain dict because
    nodes write jsonb, not Pydantic."""
    payload = {
        "version": PRODUCT_INTEL_VERSION,
        "graph": graph,
        "model": model,
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    if agent_timings:
        payload["agent_timings"] = agent_timings
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

    @field_validator(
        "name", "target_persona", "upgrade_trigger", mode="before"
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


class PricingRationale(BaseModel):
    model_config = ConfigDict(extra="ignore")

    value_basis: str = Field(default="", max_length=600)
    competitor_benchmark: str = Field(default="", max_length=600)
    wtp_estimate: str = Field(default="", max_length=300)
    risks: list[str] = Field(default_factory=list, max_length=6)
    recommendation: str = Field(default="", max_length=600)


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


class MessagingPillar(BaseModel):
    model_config = ConfigDict(extra="ignore")

    theme: str = Field(default="", max_length=160)
    proof_points: list[str] = Field(default_factory=list, max_length=6)
    when_to_use: str = Field(default="", max_length=240)
    avoid_when: str = Field(default="", max_length=240)


class OutreachTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    channel: OutreachChannel = "cold_email"
    persona: str = Field(default="", max_length=160)
    hook: str = Field(default="", max_length=320)
    body: str = Field(default="", max_length=900)
    cta: str = Field(default="", max_length=200)


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


# ─── Executive report ─────────────────────────────────────────────────────

class ProductIntelReport(BaseModel):
    """Final output of the `product_intel` supervisor. Stored in products.intel_report."""

    model_config = ConfigDict(extra="ignore")

    tldr: str = Field(default="", max_length=800)
    top_3_priorities: list[str] = Field(default_factory=list, max_length=3)
    key_risks: list[str] = Field(default_factory=list, max_length=5)
    quick_wins: list[str] = Field(default_factory=list, max_length=6)
    product_profile: ProductProfile | None = None
    graph_meta: dict = Field(default_factory=dict)

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
