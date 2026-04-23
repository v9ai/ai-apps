"""Shape + compile tests for the pricing graph.

End-to-end runs require both a DeepSeek key and a live Neon DB with at least
one product row, so the LLM-driven tests are gated on
``DEEPSEEK_API_KEY + NEON_DATABASE_URL + PRICING_LIVE_PRODUCT_ID``. The
compile + schema tests always run.
"""

from __future__ import annotations

import os

import pytest
from pydantic import ValidationError

from leadgen_agent.pricing_graph import build_graph
from leadgen_agent.product_intel_schemas import (
    PRODUCT_INTEL_VERSION,
    PriceAnchor,
    PriceTier,
    PricingModel,
    PricingRationale,
    PricingStrategy,
)


def _live_available() -> bool:
    return bool(
        os.environ.get("DEEPSEEK_API_KEY")
        and (os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL"))
        and os.environ.get("PRICING_LIVE_PRODUCT_ID")
    )


live_required = pytest.mark.skipif(
    not _live_available(),
    reason="set DEEPSEEK_API_KEY + NEON_DATABASE_URL + PRICING_LIVE_PRODUCT_ID to run the live pricing graph",
)


# ── 1. Compile ─────────────────────────────────────────────────────────

def test_pricing_graph_compiles() -> None:
    """build_graph() must return a compiled graph — verifies imports + edges."""
    graph = build_graph()
    assert graph is not None


# ── 2. Schema roundtrips ───────────────────────────────────────────────

def test_pricing_strategy_validates_well_formed_payload() -> None:
    payload = {
        "model": {
            "value_metric": "per verified lead",
            "model_type": "hybrid",
            "free_offer": "Free tier: 50 leads/month",
            "tiers": [
                {
                    "name": "Starter",
                    "price_monthly_usd": 49,
                    "billing_unit": "flat",
                    "target_persona": "solo founder",
                    "included": ["500 leads/mo", "email verification"],
                    "limits": ["no team seats"],
                    "upgrade_trigger": "needs > 500 leads",
                },
                {
                    "name": "Team",
                    "price_monthly_usd": 249,
                    "billing_unit": "per_seat",
                    "target_persona": "growth lead",
                    "included": ["5 seats", "5k leads/mo"],
                    "limits": ["no API"],
                    "upgrade_trigger": "needs API",
                },
                {
                    "name": "Enterprise",
                    "price_monthly_usd": None,
                    "billing_unit": "custom",
                    "target_persona": "VP RevOps",
                    "included": ["unlimited seats", "SSO", "SLA"],
                    "limits": [],
                    "upgrade_trigger": "procurement process",
                },
            ],
            "addons": ["Phone verification +$0.05/lead"],
            "discounting_strategy": "20% annual prepay",
        },
        "rationale": {
            "value_basis": "Every verified lead saves ~15 min of research (= $7.50 @ $30/hr)",
            "competitor_benchmark": "Median $99-199/mo for comparable tools",
            "wtp_estimate": "$50-300/mo for solo; $500-2000/mo for team",
            "risks": ["Race-to-bottom on per-lead price", "Free tier cannibalizes Starter"],
            "recommendation": "Ship Starter + Team + Enterprise. Defer freemium until PMF signal.",
        },
    }
    strategy = PricingStrategy.model_validate(payload)
    dumped = strategy.model_dump()
    assert len(dumped["model"]["tiers"]) == 3
    assert dumped["model"]["tiers"][2]["price_monthly_usd"] is None
    assert dumped["rationale"]["risks"]


def test_price_tier_coerces_custom_price_string() -> None:
    tier = PriceTier.model_validate(
        {"name": "Enterprise", "price_monthly_usd": "custom", "billing_unit": "custom"}
    )
    assert tier.price_monthly_usd is None


def test_pricing_model_requires_at_least_one_tier() -> None:
    with pytest.raises(ValidationError):
        PricingModel.model_validate({"tiers": [], "value_metric": "x"})


def test_pricing_rationale_allows_empty_risks() -> None:
    r = PricingRationale.model_validate({"recommendation": "Ship it."})
    assert r.risks == []


def test_product_intel_version_is_stable_string() -> None:
    # Cheap guard — if someone bumps the constant, confirm it's still a semver-ish string.
    parts = PRODUCT_INTEL_VERSION.split(".")
    assert len(parts) == 3
    for p in parts:
        assert p.isdigit()


# ── 3. Live end-to-end (opt-in) ────────────────────────────────────────

@live_required
@pytest.mark.asyncio
async def test_pricing_graph_produces_valid_strategy() -> None:
    """Runs the full pricing graph against a real product row + DeepSeek.
    Only runs when all three env vars are set."""
    graph = build_graph()
    product_id = int(os.environ["PRICING_LIVE_PRODUCT_ID"])
    result = await graph.ainvoke({"product_id": product_id})
    pricing = result.get("pricing")
    assert pricing, "graph produced no pricing payload"
    # Must round-trip through Pydantic.
    PricingStrategy.model_validate(pricing)
    # Must have at least 2 tiers (sanity — pricing with 1 tier is almost never right).
    assert len(pricing["model"]["tiers"]) >= 2
    # Rationale must have a non-empty recommendation.
    assert pricing["rationale"]["recommendation"].strip()
