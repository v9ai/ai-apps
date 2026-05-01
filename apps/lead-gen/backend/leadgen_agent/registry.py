"""Single source of truth for the lead-gen LangGraph registry.

Both runtimes (the local ``langgraph dev`` server on :8002 and the FastAPI/
Cloudflare Containers app at ``core/app.py``) read graph identity from this
file. ``core/langgraph.json`` is generated from ``GRAPHS`` via
``backend/scripts/gen_langgraph_json.py``; ``core/app.py`` imports ``GRAPHS``
directly and compiles each spec at lifespan startup.

To add a graph: drop a row in ``GRAPHS`` and run ``make gen-langgraph-json``.
That is the only edit needed.

Keep this module dependency-free — it must import nothing from
``leadgen_agent.*_graph`` at module top level so the JSON generator can build
the registry without compiling 50+ graphs (and without dragging in optional
LLM/DB deps that some graph modules import at import time).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GraphSpec:
    assistant_id: str  # public id used in /runs/wait, langgraph.json, TS client
    module: str  # dotted import path, e.g. "leadgen_agent.email_compose_graph"
    compiled_attr: str = "graph"  # module-level symbol referenced in langgraph.json
    builder_attr: str = "build_graph"  # callable(checkpointer) -> CompiledGraph


# Order is presentation only; runtime resolution is by ``assistant_id``.
GRAPHS: tuple[GraphSpec, ...] = (
    # ── Email graphs ────────────────────────────────────────────────────
    GraphSpec("email_compose", "leadgen_agent.email_compose_graph"),
    GraphSpec("email_opportunity", "leadgen_agent.email_opportunity_graph"),
    GraphSpec("email_reply", "leadgen_agent.email_reply_graph"),
    GraphSpec("email_outreach", "leadgen_agent.email_outreach_graph"),
    # ── Chat / SQL ──────────────────────────────────────────────────────
    GraphSpec("admin_chat", "leadgen_agent.admin_chat_graph"),
    GraphSpec("text_to_sql", "leadgen_agent.text_to_sql_graph"),
    # ── Product intel ───────────────────────────────────────────────────
    GraphSpec("deep_icp", "leadgen_agent.deep_icp_graph"),
    GraphSpec("icp_team", "leadgen_agent.icp_team_graph"),
    GraphSpec("competitors_team", "leadgen_agent.competitors_team_graph"),
    GraphSpec("deep_competitor", "leadgen_agent.deep_competitor_graph"),
    GraphSpec("pricing", "leadgen_agent.pricing_graph"),
    GraphSpec("gtm", "leadgen_agent.gtm_graph"),
    GraphSpec("product_intel", "leadgen_agent.product_intel_graph"),
    # Key/module-stem mismatch: v2 supervisor registers under a different id.
    GraphSpec("analyze_product_v2", "leadgen_agent.product_intel_v2_graph"),
    GraphSpec("freshness", "leadgen_agent.freshness_graph"),
    GraphSpec("positioning", "leadgen_agent.positioning_graph"),
    GraphSpec("lead_gen_team", "leadgen_agent.lead_gen_team_graph"),
    # ── Contact enrichment ──────────────────────────────────────────────
    GraphSpec("contact_enrich", "leadgen_agent.contact_enrich_graph"),
    GraphSpec("contact_enrich_sales", "leadgen_agent.contact_enrich_sales_graph"),
    GraphSpec(
        "contact_enrich_paper_author",
        "leadgen_agent.contact_enrich_paper_author_graph",
    ),
    # Same module, different exported symbol (batch fan-out variant).
    GraphSpec(
        "contact_enrich_paper_authors_batch",
        "leadgen_agent.contact_enrich_paper_author_graph",
        compiled_attr="batch_graph",
        builder_attr="build_batch_graph",
    ),
    # ── Classification ──────────────────────────────────────────────────
    GraphSpec("classify_paper", "leadgen_agent.classify_paper_graph"),
    GraphSpec("classify_recruitment", "leadgen_agent.classify_recruitment_graph"),
    GraphSpec(
        "classify_recruitment_bulk",
        "leadgen_agent.classify_recruitment_bulk_graph",
    ),
    GraphSpec(
        "apply_recruitment_verdicts",
        "leadgen_agent.apply_recruitment_verdicts_graph",
    ),
    GraphSpec("classify_ai_intent", "leadgen_agent.classify_ai_intent_graph"),
    GraphSpec("score_recruiter_fit", "leadgen_agent.score_recruiter_fit_graph"),
    # ── Discovery / scraping ────────────────────────────────────────────
    GraphSpec("deep_scrape", "leadgen_agent.deep_scrape_graph"),
    GraphSpec("company_discovery", "leadgen_agent.company_discovery_graph"),
    GraphSpec("company_enrichment", "leadgen_agent.company_enrichment_graph"),
    GraphSpec("company_problems", "leadgen_agent.company_problems_graph"),
    GraphSpec("contact_discovery", "leadgen_agent.contact_discovery_graph"),
    GraphSpec("find_decision_maker", "leadgen_agent.find_decision_maker_graph"),
    GraphSpec("score_contact", "leadgen_agent.score_contact_graph"),
    GraphSpec("vertical_discovery", "leadgen_agent.vertical_discovery_graph"),
    # ── Pipeline / orchestration ────────────────────────────────────────
    GraphSpec("pipeline", "leadgen_agent.pipeline_graph"),
    GraphSpec("sales_tech_outreach", "leadgen_agent.sales_tech_outreach_graph"),
    # ── Consultancies vertical ─────────────────────────────────────────
    GraphSpec("consultancies_discovery", "leadgen_agent.consultancies_discovery_graph"),
    GraphSpec(
        "consultancies_brave_discovery",
        "leadgen_agent.consultancies_brave_discovery_graph",
    ),
    GraphSpec("consultancies_enrich", "leadgen_agent.consultancies_enrich_graph"),
    GraphSpec("consultancies_features", "leadgen_agent.consultancies_features_graph"),
    GraphSpec(
        "consultancies_forecasting",
        "leadgen_agent.consultancies_forecasting_graph",
    ),
    GraphSpec("consultancies_learning", "leadgen_agent.consultancies_learning_graph"),
    GraphSpec("consultancies_nl_search", "leadgen_agent.consultancies_nl_search_graph"),
    # ── Company QA / cleanup ────────────────────────────────────────────
    GraphSpec("companies_verify", "leadgen_agent.companies_verify_graph"),
    GraphSpec("company_cleanup", "leadgen_agent.company_cleanup_graph"),
    GraphSpec("company_qa", "leadgen_agent.company_qa_graph"),
    # ── Tech extraction ─────────────────────────────────────────────────
    # Assistant id keeps the historical ``_graph`` suffix so existing TS
    # callers and webhooks don't break; the module path matches.
    GraphSpec("sales_tech_feature_graph", "leadgen_agent.sales_tech_feature_graph"),
    GraphSpec("extract_stack", "leadgen_agent.extract_stack_graph"),
    # ── Ashby (ATS ingest) ──────────────────────────────────────────────
    GraphSpec("ashby_ingest", "leadgen_agent.ashby_ingest_graph"),
    GraphSpec("ashby_discovery", "leadgen_agent.ashby_discovery_graph"),
)


# Fail loudly at import time if a typo introduces a duplicate id — both
# runtimes would otherwise silently route to the last-registered builder.
assert len({g.assistant_id for g in GRAPHS}) == len(GRAPHS), (
    "duplicate assistant_id in GRAPHS"
)
