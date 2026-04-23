"""TypedDict state schemas for the 5 LangGraph pipelines.

Each state matches the input/output shape expected by `src/lib/langgraph-client.ts`.
Input keys are populated by the caller via /runs/wait; output keys are set by
graph nodes. Intermediate keys (e.g. `analysis`, `hook`) are internal.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict


def _merge_dict(left: dict[str, Any] | None, right: dict[str, Any] | None) -> dict[str, Any]:
    """Reducer for dict state keys that multiple parallel nodes write to.

    Without this, LangGraph raises INVALID_CONCURRENT_GRAPH_UPDATE when two
    fan-out nodes both emit e.g. `agent_timings` — the graph can't pick one.
    """
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class EmailComposeState(TypedDict, total=False):
    # input
    recipient_name: str
    company_name: str
    instructions: str
    recipient_context: str
    linkedin_post_content: str
    # internal
    context_summary: str
    draft: str
    # output
    subject: str
    body: str


class EmailReplyState(TypedDict, total=False):
    # input
    original_email: str
    sender: str
    instructions: str
    tone: str
    reply_type: str
    include_calendly: bool
    additional_details: str
    # internal
    analysis: dict[str, Any]
    draft: str
    # output
    subject: str
    body: str


class EmailOutreachState(TypedDict, total=False):
    # input
    recipient_name: str
    recipient_role: str
    recipient_email: str
    post_text: str
    post_url: str
    tone: str
    # internal
    hook: str
    draft: str
    # output
    subject: str
    text: str
    html: str
    contact_id: int | None


class AdminChatState(TypedDict, total=False):
    # input
    prompt: str
    system: str
    # output
    response: str


class TextToSqlState(TypedDict, total=False):
    # input
    question: str
    database_schema: str
    # internal
    understanding: str
    # output
    sql: str
    explanation: str
    confidence: float
    tables_used: list[str]


class ScoreContactState(TypedDict, total=False):
    # input — either a raw profile blob or a DB id to load+serialize
    profile: str
    contact_id: int | None
    # output
    tier: str  # "A" | "B" | "C" | "D"
    score: float
    reasons: list[str]


class ClassifyPaperState(TypedDict, total=False):
    # input
    title: str
    abstract: str
    # output
    is_sales_leadgen: bool
    confidence: float  # 0.0 – 1.0
    reasons: list[str]  # <= 3 short bullets


class ContactEnrichState(TypedDict, total=False):
    # input
    contact_id: int
    # internal — populated by load_contact, consumed by downstream nodes
    contact: dict[str, Any]
    company: dict[str, Any]
    existing_tags: list[str]
    existing_research_areas: list[str]
    # output
    papers: list[dict[str, Any]]
    tags: list[str]
    tags_added: list[str]
    enriched_at: str
    error: str | None
    # populated by resolve_github_handle: "" if unresolved;
    # source is "existing" | "search" | "" (empty when lookup found no match)
    github_handle: str
    github_handle_source: str


class ContactEnrichPaperAuthorState(TypedDict, total=False):
    # input — inverted flow accepts a batch of pre-hydrated contacts tagged
    # "papers", each carrying its own paper list. The single-contact shape
    # (contact_id) is still accepted for backward-compatibility callers.
    contact_id: int
    contacts: list[dict[str, Any]]
    # populated by load_contact / load_contacts
    contact: dict[str, Any]
    valid_contacts: list[dict[str, Any]]
    # populated by resolve_openalex_author
    openalex_id: str
    orcid: str
    display_name: str
    institution: str
    institution_country: str
    works_count: int
    cited_by_count: int
    h_index: int
    i10_index: int
    topics: list[str]  # names of x_concepts with score >= threshold
    match_confidence: float  # 0..1 heuristic
    resolve_source: str  # "openalex" | "" if failed / no match
    # populated by process_contact (inverted flow)
    enriched: Annotated[list[dict[str, Any]], operator.add]
    # output
    enriched_at: str
    error: str | None
    # per-contact output surfaced when graph is called single-contact
    github_login: str
    github_confidence: float
    github_evidence: str
    match_status: str  # "matched" | "no_relevant_papers" | "no_github"


class ContactEnrichSalesState(TypedDict, total=False):
    # input
    contact_id: int
    # populated by load_contact
    contact: dict[str, Any]
    company: dict[str, Any]
    # populated by classify_seniority
    seniority: str  # "IC" | "Manager" | "Director" | "VP" | "C-level"
    department: str  # "Sales" | "Marketing" | "BD" | "Partnerships" | "CS" | "RevOps" | "Other"
    is_decision_maker: bool
    authority_score: float  # 0.0 – 1.0
    dm_reasons: list[str]
    classify_source: str  # "existing" | "llm" | "" (skip on LLM failure)
    # populated by scrape_linkedin
    linkedin_profile: dict[str, Any]  # {headline, bio, scraped_at}
    linkedin_scrape_source: str  # "og" | "existing" | "" if failed / skipped
    # populated by inherit_icp
    icp_bucket: str  # "high" | "medium" | "low" | ""
    icp_company_score: float | None
    # output
    enriched_at: str
    error: str | None


class DeepICPState(TypedDict, total=False):
    # input
    product_id: int
    # internal
    product: dict[str, Any]
    market_research: dict[str, Any]
    criterion_analyses: dict[str, dict[str, Any]]
    # output — see DeepICPOutput in icp_schemas.py for the Pydantic contract
    criteria_scores: dict[str, dict[str, Any]]
    weighted_total: float
    segments: list[dict[str, Any]]
    personas: list[dict[str, Any]]
    anti_icp: list[str]
    deal_breakers: list[dict[str, Any]]
    graph_meta: dict[str, Any]


class ICPTeamState(TypedDict, total=False):
    # input
    product_id: int
    # internal — specialists write their slice; synthesizer merges
    product: dict[str, Any]
    market_research: dict[str, Any]
    personas_research: list[dict[str, Any]]
    anti_icp_research: dict[str, Any]
    criteria_research: dict[str, Any]
    # agent_timings is written by every parallel specialist — reducer merges.
    agent_timings: Annotated[dict[str, float], _merge_dict]
    # output — same shape as DeepICPOutput so the existing UI is unchanged
    criteria_scores: dict[str, dict[str, Any]]
    weighted_total: float
    segments: list[dict[str, Any]]
    personas: list[dict[str, Any]]
    anti_icp: list[str]
    deal_breakers: list[dict[str, Any]]
    graph_meta: dict[str, Any]


class CompetitorsTeamState(TypedDict, total=False):
    # input
    product_id: int
    # internal
    product: dict[str, Any]
    candidates: list[dict[str, Any]]
    competitor_pages: dict[str, dict[str, Any]]  # keyed by candidate url: {markdown, pages, loader, error?}
    differentiation: dict[str, dict[str, Any]]   # keyed by candidate url
    threat_levels: dict[str, dict[str, Any]]     # keyed by candidate url
    agent_timings: Annotated[dict[str, float], _merge_dict]
    # output — list matches the `Competitor` DB/GraphQL row shape
    competitors: list[dict[str, Any]]
    graph_meta: dict[str, Any]


class PricingState(TypedDict, total=False):
    # input
    product_id: int
    # async-run webhook contract (optional — set by startGraphRun in the
    # Next.js client; absent for sync /runs/wait calls)
    webhook_url: str
    webhook_secret: str
    app_run_id: str
    # streaming progress — see notify.update_progress + migration 0063
    _progress_started_at: float
    _completed_stages: Annotated[list[str], operator.add]
    # internal — populated by load_inputs
    product: dict[str, Any]
    icp: dict[str, Any]                         # products.icp_analysis jsonb or {}
    competitor_pricing: list[dict[str, Any]]    # rows from competitor_pricing_tiers
    competitor_summary: list[dict[str, Any]]    # minimal competitor rows (name, url, positioning)
    # populated by parallel nodes
    benchmark: dict[str, Any]
    value_metric: dict[str, Any]
    agent_timings: Annotated[dict[str, float], _merge_dict]
    # populated by design_model
    model: dict[str, Any]
    # populated by write_rationale
    rationale: dict[str, Any]
    # output — matches PricingStrategy.model_dump()
    pricing: dict[str, Any]
    graph_meta: dict[str, Any]


class GTMState(TypedDict, total=False):
    # input
    product_id: int
    # async-run webhook contract (optional — same as PricingState)
    webhook_url: str
    webhook_secret: str
    app_run_id: str
    # streaming progress — see notify.update_progress + migration 0063
    _progress_started_at: float
    _completed_stages: Annotated[list[str], operator.add]
    # internal
    product: dict[str, Any]
    icp: dict[str, Any]
    competitive: dict[str, Any]                 # {competitors: [...], differentiation_angles: [...]}
    pricing: dict[str, Any]                     # products.pricing_analysis jsonb (optional)
    # populated by parallel nodes
    channels: list[dict[str, Any]]
    pillars: list[dict[str, Any]]
    agent_timings: Annotated[dict[str, float], _merge_dict]
    # populated by sequential nodes
    templates: list[dict[str, Any]]
    playbook: dict[str, Any]
    first_90_days: list[str]
    # output — matches GTMStrategy.model_dump()
    gtm: dict[str, Any]
    graph_meta: dict[str, Any]


class DeepCompetitorState(TypedDict, total=False):
    # input
    competitor_id: int
    # async-run webhook contract (optional)
    webhook_url: str
    webhook_secret: str
    app_run_id: str
    # internal — populated by load_competitor
    competitor: dict[str, Any]
    product: dict[str, Any]
    # page caches populated by individual specialists (via loaders.fetch_url)
    pages: Annotated[dict[str, dict[str, Any]], _merge_dict]
    # specialist outputs — each node writes its own slot
    pricing_deep: dict[str, Any]
    features_deep: dict[str, Any]
    integrations_deep: dict[str, Any]
    changelog: dict[str, Any]
    positioning_shift: dict[str, Any]
    funding_headcount: dict[str, Any]
    # agent_timings is written by every parallel specialist — reducer merges.
    agent_timings: Annotated[dict[str, float], _merge_dict]
    # output
    analysis: dict[str, Any]
    graph_meta: dict[str, Any]


class ProductIntelState(TypedDict, total=False):
    # input
    product_id: int
    force_refresh: bool     # when true, ignore cached icp/pricing/gtm and re-run everything
    # async-run webhook contract (optional — same as PricingState)
    webhook_url: str
    webhook_secret: str
    app_run_id: str
    # streaming progress — see notify.update_progress + migration 0063
    _progress_started_at: float
    _completed_stages: Annotated[list[str], operator.add]
    # internal
    product: dict[str, Any]
    product_profile: dict[str, Any]
    icp: dict[str, Any]
    competitive: dict[str, Any]
    pricing: dict[str, Any]
    gtm: dict[str, Any]
    agent_timings: Annotated[dict[str, float], _merge_dict]
    # output — matches ProductIntelReport.model_dump()
    report: dict[str, Any]
    graph_meta: dict[str, Any]
