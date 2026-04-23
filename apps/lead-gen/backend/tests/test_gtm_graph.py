"""Shape + compile tests for the GTM graph. Mirrors test_pricing_graph.py."""

from __future__ import annotations

import os

import pytest
from pydantic import ValidationError

from leadgen_agent.gtm_graph import build_graph
from leadgen_agent.product_intel_schemas import (
    Channel,
    GTMStrategy,
    MessagingPillar,
    Objection,
    OutreachTemplate,
    SalesPlaybook,
)


def _live_available() -> bool:
    return bool(
        os.environ.get("DEEPSEEK_API_KEY")
        and (os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL"))
        and os.environ.get("GTM_LIVE_PRODUCT_ID")
    )


live_required = pytest.mark.skipif(
    not _live_available(),
    reason="set DEEPSEEK_API_KEY + NEON_DATABASE_URL + GTM_LIVE_PRODUCT_ID to run the live GTM graph",
)


# ── 1. Compile ─────────────────────────────────────────────────────────

def test_gtm_graph_compiles() -> None:
    graph = build_graph()
    assert graph is not None


# ── 2. Schema roundtrips ───────────────────────────────────────────────

def test_gtm_strategy_validates_well_formed_payload() -> None:
    payload = {
        "channels": [
            {
                "name": "LinkedIn outbound",
                "why": "ICP is active on LinkedIn",
                "icp_presence": "#saas #founders #demandgen hashtags",
                "tactics": ["DM 10/day", "comment on target posts"],
                "effort": "medium",
                "time_to_first_lead": "1-2 weeks",
            },
            {
                "name": "Community",
                "why": "Early evangelists live in Slack communities",
                "icp_presence": "RevGenius, Pavilion",
                "tactics": ["thoughtful replies", "AMA"],
                "effort": "low",
                "time_to_first_lead": "3-4 weeks",
            },
        ],
        "messaging_pillars": [
            {
                "theme": "Cut research time 10x",
                "proof_points": ["avg 45min → 5min", "beta users reclaim 6hrs/week"],
                "when_to_use": "to overworked ICs",
                "avoid_when": "to execs (lead with $ impact)",
            },
            {
                "theme": "No new tool to learn",
                "proof_points": ["Slack integration", "Chrome extension"],
                "when_to_use": "tool-fatigued teams",
                "avoid_when": "greenfield orgs",
            },
            {
                "theme": "Keep data in your stack",
                "proof_points": ["SOC2 in progress", "data residency"],
                "when_to_use": "security-conscious",
                "avoid_when": "",
            },
        ],
        "outreach_templates": [
            {
                "channel": "cold_email",
                "persona": "Growth Lead",
                "hook": "Saw you posted about lead dedup pain",
                "body": "Hi {{first_name}}, quick thought on your dedup problem at {{company}}...",
                "cta": "Open to a 15min chat Thu?",
            }
        ],
        "sales_playbook": {
            "discovery_questions": [
                "How are you currently qualifying leads?",
                "What does a 'good' lead look like for you?",
            ],
            "objections": [
                {
                    "objection": "We already have Apollo",
                    "response": "Apollo is great for data; we're the enrichment on top.",
                    "evidence_to_show": ["Apollo partner integration demo"],
                }
            ],
            "battlecards": {
                "Apollo": "We're complementary, not competitive — they're the database, we're the intelligence.",
            },
        },
        "first_90_days": [
            "Week 1: DM top 20 ICP prospects on LinkedIn",
            "Week 2-3: Publish 2 case studies, pin to LinkedIn profile",
            "Month 2: Launch in RevGenius + Pavilion with offer",
            "Month 3: Measure conversion → iterate on hook",
        ],
    }
    gtm = GTMStrategy.model_validate(payload)
    dumped = gtm.model_dump()
    assert len(dumped["channels"]) == 2
    assert len(dumped["messaging_pillars"]) == 3
    assert dumped["sales_playbook"]["battlecards"]["Apollo"]
    assert len(dumped["first_90_days"]) == 4


def test_channel_defaults_to_medium_effort() -> None:
    c = Channel.model_validate({"name": "X", "why": "y"})
    assert c.effort == "medium"


def test_outreach_template_channel_accepts_all_expected() -> None:
    for ch in [
        "cold_email",
        "linkedin_dm",
        "linkedin_connect",
        "linkedin_post",
        "reply_guy",
        "community",
        "webinar",
    ]:
        OutreachTemplate.model_validate({"channel": ch, "persona": "x", "hook": "y", "body": "z", "cta": "w"})


def test_gtm_strategy_requires_at_least_one_channel() -> None:
    with pytest.raises(ValidationError):
        GTMStrategy.model_validate(
            {"channels": [], "messaging_pillars": [{"theme": "x"}]}
        )


def test_sales_playbook_defaults_to_empty() -> None:
    pb = SalesPlaybook()
    assert pb.discovery_questions == []
    assert pb.objections == []
    assert pb.battlecards == {}


def test_objection_truncates_long_response() -> None:
    long = "x" * 1000
    o = Objection.model_validate({"objection": "y", "response": long})
    assert len(o.response) <= 600


def test_messaging_pillar_allows_empty_avoid_when() -> None:
    p = MessagingPillar.model_validate({"theme": "x"})
    assert p.avoid_when == ""


# ── 3. Live end-to-end (opt-in) ────────────────────────────────────────

@live_required
@pytest.mark.asyncio
async def test_gtm_graph_produces_valid_strategy() -> None:
    graph = build_graph()
    product_id = int(os.environ["GTM_LIVE_PRODUCT_ID"])
    result = await graph.ainvoke({"product_id": product_id})
    gtm = result.get("gtm")
    assert gtm, "graph produced no gtm payload"
    GTMStrategy.model_validate(gtm)
    assert gtm["channels"], "GTM must recommend at least one channel"
    assert gtm["messaging_pillars"], "GTM must produce messaging pillars"
    assert gtm["first_90_days"], "GTM must produce a 90-day plan"
