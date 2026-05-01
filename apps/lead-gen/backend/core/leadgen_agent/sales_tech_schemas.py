"""Pydantic schemas for the sales-tech feature extraction graph.

Every extracted feature carries provenance: a ``source_url`` and a short
``evidence_quote`` lifted from the page that supports the claim. Per-field
``confidence`` lets downstream code (UI, scoring) distinguish strong evidence
from a single-sentence mention.

Mirrors the shape persisted to ``company_facts.value_text`` (JSONB) under
``field='salestech.summary'`` and a per-aspect row for each of the nine
aspects emitted by the graph.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    source_url: str
    quote: str = Field(default="", max_length=400)


class PricingTier(BaseModel):
    name: str
    price_usd: float | None = None
    billing: Literal["monthly", "annual", "custom", "one_time"] | None = None
    seats_included: int | None = None
    features: list[str] = Field(default_factory=list)


# ── Per-aspect outputs (what each fan-out node returns) ────────────────────


class AspectOverview(BaseModel):
    tagline: str | None = None
    one_liner: str | None = None
    taxonomy: list[str] = Field(default_factory=list)
    target_segments: list[str] = Field(default_factory=list)


class AspectICP(BaseModel):
    industries: list[str] = Field(default_factory=list)
    company_sizes: list[str] = Field(default_factory=list)
    buyer_roles: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    jobs_to_be_done: list[str] = Field(default_factory=list)


class AspectPricing(BaseModel):
    pricing_model: Literal[
        "free", "freemium", "paid", "contact_sales", "unknown"
    ] = "unknown"
    tiers: list[PricingTier] = Field(default_factory=list)
    free_trial_days: int | None = None
    money_back_guarantee: bool | None = None
    annual_minimum_usd: float | None = None


class AspectIntegrations(BaseModel):
    channels: list[str] = Field(default_factory=list)
    crms_supported: list[str] = Field(default_factory=list)
    native_integrations: list[str] = Field(default_factory=list)
    has_public_api: bool | None = None
    has_webhooks: bool | None = None
    zapier_make_n8n: list[str] = Field(default_factory=list)


class AspectGTM(BaseModel):
    motion: Literal["PLG", "SLG", "hybrid", "unknown"] = "unknown"
    customer_logos: list[str] = Field(default_factory=list)
    case_studies: list[str] = Field(default_factory=list)
    partner_program: bool | None = None
    channel_partners: list[str] = Field(default_factory=list)


class AspectDifferentiators(BaseModel):
    unique_value: str | None = None
    moats: list[str] = Field(default_factory=list)
    competitors_named: list[str] = Field(default_factory=list)


class AspectSecurity(BaseModel):
    certifications: list[str] = Field(default_factory=list)
    data_residency: list[str] = Field(default_factory=list)
    encryption_at_rest: bool | None = None


class AspectAI(BaseModel):
    capabilities: list[str] = Field(default_factory=list)
    is_agentic: bool | None = None
    models_referenced: list[str] = Field(default_factory=list)


class AspectCompetitors(BaseModel):
    named_on_site: list[str] = Field(default_factory=list)


# Wrapper that every fan-out node returns: payload + evidence + a list of
# additional URLs the node would like fetched to firm up its output.
class AspectExtraction(BaseModel):
    aspect: str
    payload: dict[str, Any]
    evidence: dict[str, list[Evidence]] = Field(default_factory=dict)
    completeness: float = Field(default=0.0, ge=0.0, le=1.0)
    refetch_suggestions: list[str] = Field(default_factory=list)


# ── Final synthesized record ───────────────────────────────────────────────


class SalesTechFeatures(BaseModel):
    # overview
    tagline: str | None = None
    one_liner: str | None = None
    taxonomy: list[str] = Field(default_factory=list)
    target_segments: list[str] = Field(default_factory=list)

    # ICP
    icp_industries: list[str] = Field(default_factory=list)
    icp_company_sizes: list[str] = Field(default_factory=list)
    icp_buyer_roles: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    jobs_to_be_done: list[str] = Field(default_factory=list)

    # pricing
    pricing_model: Literal[
        "free", "freemium", "paid", "contact_sales", "unknown"
    ] = "unknown"
    pricing_tiers: list[PricingTier] = Field(default_factory=list)
    free_trial_days: int | None = None
    money_back_guarantee: bool | None = None
    annual_minimum_usd: float | None = None

    # integrations
    channels: list[str] = Field(default_factory=list)
    crms_supported: list[str] = Field(default_factory=list)
    native_integrations: list[str] = Field(default_factory=list)
    has_public_api: bool | None = None
    has_webhooks: bool | None = None
    zapier_make_n8n: list[str] = Field(default_factory=list)

    # GTM
    gtm_motion: Literal["PLG", "SLG", "hybrid", "unknown"] = "unknown"
    customer_logos: list[str] = Field(default_factory=list)
    case_studies: list[str] = Field(default_factory=list)
    partner_program: bool | None = None
    channel_partners: list[str] = Field(default_factory=list)

    # differentiation
    unique_value: str | None = None
    moats: list[str] = Field(default_factory=list)
    competitors_named: list[str] = Field(default_factory=list)

    # security
    certifications: list[str] = Field(default_factory=list)
    data_residency: list[str] = Field(default_factory=list)
    encryption_at_rest: bool | None = None

    # AI
    ai_capabilities: list[str] = Field(default_factory=list)
    ai_is_agentic: bool | None = None
    models_referenced: list[str] = Field(default_factory=list)

    # provenance + scoring
    evidence_index: dict[str, list[Evidence]] = Field(default_factory=dict)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    contradictions: list[str] = Field(default_factory=list)


ASPECT_NAMES: tuple[str, ...] = (
    "overview",
    "icp",
    "pricing",
    "integrations",
    "gtm",
    "differentiators",
    "security",
    "ai_capabilities",
    "competitors",
)
