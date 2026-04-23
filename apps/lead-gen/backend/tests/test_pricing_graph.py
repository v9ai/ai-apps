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


# ── 2b. Additive grounding fields (backwards compat) ───────────────────
#
# PriceTier, PricingModel, and PricingRationale all grew optional fields
# recently (price_justification / anchor_competitors / value_math on tier,
# value_metric_reasoning / model_type_reasoning on model, price_anchors on
# rationale). Every net-new field MUST default cleanly so older rows in
# products.pricing_analysis jsonb still deserialize. These tests pin that
# contract.


def test_price_tier_accepts_new_grounding_fields() -> None:
    """``price_justification``, ``anchor_competitors``, ``value_math`` are
    additive — they populate when supplied, but are not required."""
    tier = PriceTier.model_validate(
        {
            "name": "Team",
            "price_monthly_usd": 99,
            "billing_unit": "per_seat",
            "price_justification": "Benchmarked against Linear $8/seat and Jira $7.75/seat — at parity.",
            "anchor_competitors": ["Linear", "Jira", "Asana"],
            "value_math": "5 seats × $20 saves ~10h/wk = $500 dev-time @ $100/hr.",
        }
    )
    assert tier.price_justification.startswith("Benchmarked")
    assert tier.anchor_competitors == ["Linear", "Jira", "Asana"]
    assert tier.value_math.startswith("5 seats")


def test_price_tier_defaults_are_backwards_compatible() -> None:
    """Old rows persisted before the grounding fields existed must still load."""
    tier = PriceTier.model_validate(
        {"name": "Starter", "price_monthly_usd": 49, "billing_unit": "flat"}
    )
    assert tier.price_justification == ""
    assert tier.anchor_competitors == []
    assert tier.value_math == ""


def test_price_tier_coerces_null_grounding_fields() -> None:
    """LLMs emit ``null`` for non-applicable reasoning — coerce to defaults
    instead of raising."""
    tier = PriceTier.model_validate(
        {
            "name": "Starter",
            "price_monthly_usd": 49,
            "price_justification": None,
            "anchor_competitors": None,
            "value_math": None,
        }
    )
    assert tier.price_justification == ""
    assert tier.anchor_competitors == []
    assert tier.value_math == ""


def test_price_tier_anchor_competitors_filters_non_strings() -> None:
    """Drop garbage entries silently instead of crashing the whole run."""
    tier = PriceTier.model_validate(
        {
            "name": "Team",
            "price_monthly_usd": 99,
            "anchor_competitors": ["Linear", None, {"bad": "entry"}, 42, "Jira"],
        }
    )
    # ``None`` and dict are dropped; 42 is coerced to "42".
    assert "Linear" in tier.anchor_competitors
    assert "Jira" in tier.anchor_competitors
    assert all(isinstance(x, str) for x in tier.anchor_competitors)


def test_pricing_model_accepts_new_reasoning_fields() -> None:
    model = PricingModel.model_validate(
        {
            "value_metric": "per seat",
            "model_type": "subscription",
            "tiers": [{"name": "Starter", "price_monthly_usd": 49}],
            "value_metric_reasoning": "Seat count correlates directly with active usage across the ICP.",
            "model_type_reasoning": "ARR predictability outweighs usage-based upside for the target persona.",
        }
    )
    assert "correlates" in model.value_metric_reasoning
    assert "ARR" in model.model_type_reasoning


def test_pricing_model_reasoning_defaults_empty_for_old_rows() -> None:
    """Rows persisted before these fields existed must still deserialize."""
    model = PricingModel.model_validate(
        {
            "value_metric": "per seat",
            "tiers": [{"name": "Starter", "price_monthly_usd": 49}],
        }
    )
    assert model.value_metric_reasoning == ""
    assert model.model_type_reasoning == ""


def test_pricing_rationale_accepts_structured_price_anchors() -> None:
    rationale = PricingRationale.model_validate(
        {
            "recommendation": "Ship Team at $99.",
            "price_anchors": [
                {
                    "competitor": "Linear",
                    "tier": "Business",
                    "monthly_price_usd": 14,
                    "relation": "premium",
                    "note": "Higher price justified by more integrations.",
                },
                {
                    "competitor": "Asana",
                    "tier": "Starter",
                    "monthly_price_usd": 10.99,
                    "relation": "at_parity",
                },
            ],
        }
    )
    assert len(rationale.price_anchors) == 2
    assert rationale.price_anchors[0].relation == "premium"
    assert rationale.price_anchors[1].monthly_price_usd == 10.99


def test_pricing_rationale_price_anchors_default_empty_list() -> None:
    r = PricingRationale.model_validate({"recommendation": "Ship it."})
    assert r.price_anchors == []


def test_pricing_rationale_price_anchors_drops_non_dict_entries() -> None:
    """A malformed LLM emitting a mix of dicts and strings must not crash the
    whole run — non-dict entries are skipped and the rest validate."""
    r = PricingRationale.model_validate(
        {
            "recommendation": "Ship it.",
            "price_anchors": [
                "garbage string",
                {"competitor": "Linear", "tier": "Business", "monthly_price_usd": 14},
                None,
                42,
            ],
        }
    )
    assert len(r.price_anchors) == 1
    assert r.price_anchors[0].competitor == "Linear"


def test_price_anchor_relation_coerces_common_llm_variants() -> None:
    """LLMs emit 'at parity', 'higher', 'cheaper' etc. — all must normalize
    to the four allowed values without crashing."""
    cases = {
        "at parity": "at_parity",
        "parity": "at_parity",
        "equal": "at_parity",
        "match": "at_parity",
        "above": "premium",
        "higher": "premium",
        "more_expensive": "premium",
        "lower": "below",
        "cheaper": "below",
        "under": "below",
        # The canonical values must pass through unchanged.
        "below": "below",
        "at_parity": "at_parity",
        "premium": "premium",
        "undercut": "undercut",
    }
    for input_rel, expected in cases.items():
        a = PriceAnchor.model_validate(
            {"competitor": "X", "tier": "Pro", "relation": input_rel}
        )
        assert a.relation == expected, f"{input_rel!r} coerced to {a.relation!r}, expected {expected!r}"


def test_price_anchor_handles_custom_price_string() -> None:
    """Enterprise anchors often lack a public price — the schema must coerce
    'custom' / 'contact' strings to None rather than crashing."""
    for custom in ["custom", "Custom", "contact", "Contact Sales"]:
        a = PriceAnchor.model_validate(
            {"competitor": "X", "tier": "Enterprise", "monthly_price_usd": custom}
        )
        assert a.monthly_price_usd is None


def test_pricing_strategy_with_all_new_fields_roundtrips() -> None:
    """Integration: a payload using every new optional field must validate
    AND ``model_dump`` must include them all at their expected paths."""
    payload = {
        "model": {
            "value_metric": "per seat",
            "model_type": "subscription",
            "tiers": [
                {
                    "name": "Team",
                    "price_monthly_usd": 99,
                    "billing_unit": "per_seat",
                    "price_justification": "At parity with Linear Business.",
                    "anchor_competitors": ["Linear", "Jira"],
                    "value_math": "5 seats × $20 = $100 saved in dev time.",
                }
            ],
            "value_metric_reasoning": "Seats = active editors.",
            "model_type_reasoning": "Predictable ARR.",
        },
        "rationale": {
            "recommendation": "Ship it.",
            "price_anchors": [
                {
                    "competitor": "Linear",
                    "tier": "Business",
                    "monthly_price_usd": 14,
                    "relation": "at_parity",
                }
            ],
        },
    }
    strat = PricingStrategy.model_validate(payload)
    dumped = strat.model_dump()
    tier0 = dumped["model"]["tiers"][0]
    assert tier0["price_justification"] == "At parity with Linear Business."
    assert tier0["anchor_competitors"] == ["Linear", "Jira"]
    assert tier0["value_math"].startswith("5 seats")
    assert dumped["model"]["value_metric_reasoning"] == "Seats = active editors."
    assert dumped["model"]["model_type_reasoning"] == "Predictable ARR."
    anchors = dumped["rationale"]["price_anchors"]
    assert anchors and anchors[0]["competitor"] == "Linear"


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
