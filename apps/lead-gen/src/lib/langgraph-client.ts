/**
 * Typed HTTP client for the LangGraph backend.
 *
 * Calls the standard LangGraph REST API (`POST /runs/wait`) exposed by
 * `langgraph dev` from `apps/lead-gen/backend/`. Start it with `pnpm backend-dev`.
 *
 * The 5 wrappers below route to the 5 graphs declared in `backend/langgraph.json`.
 */

const LANGGRAPH_URL =
  process.env.LANGGRAPH_URL || "http://127.0.0.1:8002";

// Optional shared secret used when the backend is exposed via a public tunnel.
// When set, must match LANGGRAPH_AUTH_TOKEN in backend/.env.
const LANGGRAPH_AUTH_TOKEN = process.env.LANGGRAPH_AUTH_TOKEN;

/**
 * Resolves the LangGraph assistant id for the product-intel supervisor based
 * on PRODUCT_INTEL_GRAPH_VERSION (default "v1"). v2 registers as the separate
 * assistant "analyze_product_v2" in backend/langgraph.json and fans out deep
 * competitor + pricing + GTM in parallel.
 */
export function productIntelAssistantId(): string {
  const v = (process.env.PRODUCT_INTEL_GRAPH_VERSION ?? "v1").toLowerCase();
  return v === "v2" ? "analyze_product_v2" : "product_intel";
}

async function runGraph<T>(
  assistantId: string,
  input: Record<string, unknown>,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (LANGGRAPH_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${LANGGRAPH_AUTH_TOKEN}`;
  }
  const res = await fetch(`${LANGGRAPH_URL}/runs/wait`, {
    method: "POST",
    headers,
    body: JSON.stringify({ assistant_id: assistantId, input }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LangGraph ${assistantId} failed (${res.status}): ${text}`,
    );
  }
  // /runs/wait returns the final graph state as a flat JSON object.
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────

export interface TextToSqlResult {
  sql: string;
  explanation: string;
  confidence: number;
  tables_used: string[];
}

export interface EmailReplyResult {
  subject: string;
  body: string;
}

export interface AdminChatResult {
  response: string;
}

export interface EmailComposeResult {
  subject: string;
  body: string;
}

export interface EmailOutreachResult {
  subject: string;
  text: string;
  html: string;
  contact_id: number | null;
}

export type ContactLoraTier = "A" | "B" | "C" | "D";

export interface ScoreContactLoraResult {
  tier: ContactLoraTier;
  score: number;
  reasons: string[];
}

export interface ContactPaper {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  citation_count: number | null;
  source: string | null;
}

export interface ContactEnrichResult {
  papers: ContactPaper[];
  tags: string[];
  tags_added: string[];
  enriched_at: string;
  error?: string | null;
}

export interface CompanyDiscoveryResult {
  inserted_ids: number[];
  skipped_existing: number;
  summary: {
    seed_query: string;
    vertical?: string | null;
    keywords?: string[];
    candidates_count: number;
    filtered_count: number;
    scored_count: number;
    inserted_count: number;
    inserted_ids: number[];
    skipped_existing: number;
    graph_meta?: Record<string, unknown>;
  };
  _error?: string;
}

export interface CompanyEnrichmentResult {
  facts_persisted: number;
  updated: boolean;
  classification: {
    category: "CONSULTANCY" | "STAFFING" | "AGENCY" | "PRODUCT" | "UNKNOWN";
    ai_tier: 0 | 1 | 2;
    industry: string;
    confidence: number;
    reason: string;
    remote_policy: "full_remote" | "hybrid" | "onsite" | "unknown";
    has_open_roles: boolean;
  };
  scores: {
    score: number;
    reasons: string[];
    needs_review: boolean;
  };
  classify_source: "llm" | "heuristic";
  _error?: string;
}

export interface ContactDiscoveryResult {
  candidates_inserted: number;
  skipped_existing: number;
  _error?: string;
}

export interface ClassifyPaperResult {
  is_sales_leadgen: boolean;
  confidence: number;
  reasons: string[];
}

export interface DeepICPCriterion {
  score: number;
  confidence: number;
  justification: string;
  evidence: string[];
}

export interface DeepICPSegment {
  name: string;
  industry: string;
  stage: string;
  geo: string;
  fit: number;
  reasoning: string;
}

export interface DeepICPPersona {
  title: string;
  seniority: string;
  department: string;
  pain: string;
  channel: string;
}

export interface DeepICPDealBreaker {
  name: string;
  severity: "low" | "medium" | "high";
  reason: string;
}

export interface DeepICPGraphMeta {
  version: string;
  weights_hash: string;
  run_at: string;
  model: string;
}

export interface DeepICPResult {
  criteria_scores: Record<string, DeepICPCriterion>;
  weighted_total: number;
  segments: DeepICPSegment[];
  personas: DeepICPPersona[];
  anti_icp: string[];
  deal_breakers: DeepICPDealBreaker[];
  graph_meta?: DeepICPGraphMeta;
}

// ── Typed wrappers ─────────────────────────────────────────

export function textToSql(
  question: string,
  databaseSchema?: string,
): Promise<TextToSqlResult> {
  if (question.length > 4_000) {
    return Promise.reject(new Error("textToSql: question exceeds 4000 character limit"));
  }
  return runGraph<TextToSqlResult>("text_to_sql", {
    question,
    database_schema: databaseSchema ?? "",
  });
}

export function generateEmailReply(input: {
  originalEmail: string;
  sender: string;
  instructions?: string;
  tone?: string;
  replyType?: string;
  includeCalendly?: boolean;
  additionalDetails?: string;
}): Promise<EmailReplyResult> {
  return runGraph<EmailReplyResult>("email_reply", {
    original_email: input.originalEmail,
    sender: input.sender,
    instructions: input.instructions ?? "",
    tone: input.tone ?? "professional",
    reply_type: input.replyType ?? "",
    include_calendly: input.includeCalendly ?? false,
    additional_details: input.additionalDetails ?? "",
  });
}

export function adminChat(
  prompt: string,
  system?: string,
): Promise<AdminChatResult> {
  return runGraph<AdminChatResult>("admin_chat", {
    prompt,
    system: system ?? "",
  });
}

export function composeEmail(input: {
  recipientName: string;
  companyName?: string;
  instructions?: string;
  recipientContext?: string;
  linkedinPostContent?: string;
}): Promise<EmailComposeResult> {
  return runGraph<EmailComposeResult>("email_compose", {
    recipient_name: input.recipientName,
    company_name: input.companyName ?? "",
    instructions: input.instructions ?? "",
    recipient_context: input.recipientContext ?? "",
    linkedin_post_content: input.linkedinPostContent ?? "",
  });
}

export function emailOutreach(input: {
  recipientName: string;
  recipientRole?: string;
  recipientEmail: string;
  postText: string;
  postUrl?: string;
  tone?: string;
  productId?: number;
  personaMatchThreshold?: number;
}): Promise<EmailOutreachResult> {
  const payload: Record<string, unknown> = {
    recipient_name: input.recipientName,
    recipient_role: input.recipientRole ?? "",
    recipient_email: input.recipientEmail,
    post_text: input.postText,
    post_url: input.postUrl ?? "",
    tone: input.tone ?? "professional and friendly",
  };
  if (input.productId !== undefined) payload.product_id = input.productId;
  if (input.personaMatchThreshold !== undefined) {
    payload.persona_match_threshold = input.personaMatchThreshold;
  }
  return runGraph<EmailOutreachResult>("email_outreach", payload);
}

/**
 * Score a contact via the Llama-3.1-8B-Instruct LoRA on Cloudflare Workers AI.
 *
 * Two input modes:
 * - Pass `contactId` to have the backend load + serialize the profile from Neon.
 * - Pass `profile` (pre-serialized text) when the caller already has the blob.
 *
 * Returns tier A/B/C/D + confidence score + rationale bullets.
 */
export function scoreContactLora(input: {
  contactId?: number;
  profile?: string;
}): Promise<ScoreContactLoraResult> {
  if (input.contactId === undefined && !input.profile) {
    return Promise.reject(
      new Error("scoreContactLora: provide either contactId or profile"),
    );
  }
  return runGraph<ScoreContactLoraResult>("score_contact", {
    contact_id: input.contactId ?? null,
    profile: input.profile ?? "",
  });
}

/**
 * Enrich a contact with academic papers (OpenAlex/Crossref/Semantic Scholar)
 * and normalized research tags. Graph is read-only; the caller persists the
 * returned papers/tags back to the contacts row.
 */
export function enrichContactPapers(input: {
  contactId: number;
}): Promise<ContactEnrichResult> {
  return runGraph<ContactEnrichResult>(
    "contact_enrich",
    { contact_id: input.contactId },
    // Paper search fans out to three APIs + one LLM call. Network bursts can
    // exceed the 60s default on cold OpenAlex responses.
    { timeoutMs: 120_000 },
  );
}

/**
 * Discover new companies from a fuzzy seed query. LLM-only — deepseek-v4-pro
 * brainstorms 12–20 real companies, the graph dedupes against existing
 * `companies` rows by `canonical_domain` and inserts the rest with
 * `tags=['discovery-candidate']` and `score=pre_score` (0.2–1.0).
 * `company_enrichment` fills in category / ai_tier afterwards.
 */
export function discoverCompanies(input: {
  seedQuery: string;
  vertical?: string;
  geography?: string;
  sizeBand?: string;
}): Promise<CompanyDiscoveryResult> {
  return runGraph<CompanyDiscoveryResult>(
    "company_discovery",
    {
      seed_query: input.seedQuery,
      vertical: input.vertical ?? null,
      geography: input.geography ?? null,
      size_band: input.sizeBand ?? null,
    },
    { timeoutMs: 120_000 },
  );
}

/**
 * Enrich an existing company by id: fetch home + careers pages, classify
 * (CONSULTANCY/STAFFING/AGENCY/PRODUCT) + ai_tier + score, UPDATE `companies`
 * and append two provenance rows to `company_facts` with
 * `extractor_version='python-qwen-2026-04'` so the Python rows coexist with
 * the Rust enricher's `rust-bge-*` rows.
 */
export function enrichCompany(input: {
  companyId: number;
}): Promise<CompanyEnrichmentResult> {
  return runGraph<CompanyEnrichmentResult>(
    "company_enrichment",
    { company_id: input.companyId },
    { timeoutMs: 120_000 },
  );
}

export interface CompanyProblem {
  problem: string;
  role_affected: string;
  ai_solution: string;
  evidence: string;
  confidence: number;
}

export interface CompanyProblemsResult {
  company_id: number;
  company_name: string | null;
  category: string | null;
  problems: CompanyProblem[];
  facts_persisted: number;
  model: string;
  telemetry: Record<string, unknown>;
  totals: Record<string, unknown>;
}

/**
 * Run after `enrichCompany` to identify operational problems at the company
 * that an AI engineering shop can plausibly solve. Persists each problem as
 * a row in `company_facts` with `extractor_version='problems-v1'`.
 */
export function analyzeCompanyProblems(input: {
  companyId: number;
}): Promise<CompanyProblemsResult> {
  return runGraph<CompanyProblemsResult>(
    "company_problems",
    { company_id: input.companyId },
    { timeoutMs: 60_000 },
  );
}

/**
 * Discover new contacts for a company via three parallel sources: GitHub org
 * members (capped at 25), paper authors from research_client.search_papers,
 * and the company team/about page. Dedupes by name + email + github_handle,
 * then inserts new rows with `tags=['contact-discovery', ...sources]`.
 * Inserted contacts are picked up by `contact_enrich` via the
 * `papers_enriched_at IS NULL` queue.
 */
export function discoverContacts(input: {
  companyId: number;
}): Promise<ContactDiscoveryResult> {
  return runGraph<ContactDiscoveryResult>(
    "contact_discovery",
    { company_id: input.companyId },
    { timeoutMs: 180_000 },
  );
}

/**
 * Classify whether a single paper is about B2B sales / lead-gen / outbound.
 * Used to verify `tag:papers` contacts imported from the 2025–2026 corpus.
 */
export function classifyPaper(input: {
  title: string;
  abstract?: string;
}): Promise<ClassifyPaperResult> {
  return runGraph<ClassifyPaperResult>("classify_paper", {
    title: input.title,
    abstract: input.abstract ?? "",
  });
}

/**
 * Run the deep product-market ICP analysis graph for a product.
 *
 * Loads the row from Neon, then scores 5 weighted criteria (segment clarity,
 * buyer persona specificity, pain-solution fit, GTM signal, anti-ICP clarity)
 * and emits structured segments, personas, anti-ICP, and deal-breakers. See
 * `backend/leadgen_agent/deep_icp_graph.py` for the server side.
 */
export function analyzeProductICP(input: {
  productId: number;
}): Promise<DeepICPResult> {
  return runGraph<DeepICPResult>(
    "deep_icp",
    { product_id: input.productId },
    // ICP runs two LLM calls; the default 60s can be tight on a cold container.
    { timeoutMs: 120_000 },
  );
}

/**
 * Multi-agent ICP team (fan-out specialists → synthesizer). Produces the same
 * DeepICPResult shape as analyzeProductICP, with graph_meta.team = "icp_team"
 * and per-agent timings.
 */
export function enhanceProductIcpTeam(input: {
  productId: number;
}): Promise<DeepICPResult> {
  return runGraph<DeepICPResult>(
    "icp_team",
    { product_id: input.productId },
    { timeoutMs: 180_000 },
  );
}

export interface CompetitorTeamSuggestion {
  name: string;
  url: string;
  domain: string;
  description: string;
  positioning_headline: string;
  positioning_tagline: string;
  target_audience: string;
  differentiation_angles: string[];
  threat_score: number;
  market_overlap: number;
  threat_rationale: string;
}

export interface CompetitorsTeamResult {
  competitors: CompetitorTeamSuggestion[];
  graph_meta?: {
    version: string;
    team: string;
    model: string;
    agent_timings: Record<string, number>;
  };
}

/**
 * Multi-agent competitor discovery team: discovery_scout → (differentiator ||
 * threat_assessor) → synthesizer. Replaces the single-shot suggestCompetitors
 * LLM call with richer, structured output.
 */
export function discoverCompetitorsTeam(input: {
  productId: number;
}): Promise<CompetitorsTeamResult> {
  return runGraph<CompetitorsTeamResult>(
    "competitors_team",
    { product_id: input.productId },
    { timeoutMs: 180_000 },
  );
}

// ─── Pricing / GTM / Product Intelligence ─────────────────────────────────
//
// These call the new DeepSeek-backed graphs in
// `backend/leadgen_agent/{pricing,gtm,product_intel}_graph.py`. Output shapes
// mirror the Pydantic models in `product_intel_schemas.py` (keep these types in
// sync with that module when the contract changes).

export interface PriceTier {
  name: string;
  price_monthly_usd: number | null;
  billing_unit: "per_seat" | "per_usage" | "flat" | "hybrid" | "custom";
  target_persona: string;
  included: string[];
  limits: string[];
  upgrade_trigger: string;
  price_justification?: string;
  anchor_competitors?: string[];
  value_math?: string;
}

export type PriceAnchorRelation =
  | "below"
  | "at_parity"
  | "premium"
  | "undercut";

export interface PriceAnchor {
  competitor: string;
  tier: string;
  monthly_price_usd: number | null;
  relation: PriceAnchorRelation;
  note: string;
}

export interface PricingStrategyResult {
  model: {
    value_metric: string;
    model_type:
      | "subscription"
      | "usage"
      | "hybrid"
      | "per_outcome"
      | "freemium";
    free_offer: string;
    tiers: PriceTier[];
    addons: string[];
    discounting_strategy: string;
    value_metric_reasoning?: string;
    model_type_reasoning?: string;
  };
  rationale: {
    value_basis: string;
    competitor_benchmark: string;
    wtp_estimate: string;
    risks: string[];
    recommendation: string;
    price_anchors?: PriceAnchor[];
  };
  graph_meta?: Record<string, unknown>;
}

export interface GTMChannel {
  name: string;
  why: string;
  icp_presence: string;
  tactics: string[];
  effort: "low" | "medium" | "high";
  time_to_first_lead: string;
}

export interface MessagingPillar {
  theme: string;
  proof_points: string[];
  when_to_use: string;
  avoid_when: string;
}

export interface OutreachTemplate {
  channel:
    | "cold_email"
    | "linkedin_dm"
    | "linkedin_connect"
    | "linkedin_post"
    | "reply_guy"
    | "community"
    | "webinar";
  persona: string;
  hook: string;
  body: string;
  cta: string;
}

export interface SalesPlaybook {
  discovery_questions: string[];
  objections: {
    objection: string;
    response: string;
    evidence_to_show: string[];
  }[];
  battlecards: Record<string, string>;
}

export interface GTMStrategyResult {
  channels: GTMChannel[];
  messaging_pillars: MessagingPillar[];
  outreach_templates: OutreachTemplate[];
  sales_playbook: SalesPlaybook;
  first_90_days: string[];
  graph_meta?: Record<string, unknown>;
}

export interface ProductIntelReportResult {
  tldr: string;
  top_3_priorities: string[];
  key_risks: string[];
  quick_wins: string[];
  product_profile?: {
    name: string;
    one_liner: string;
    category: string;
    core_jobs: string[];
    key_features: string[];
    stated_audience: string;
    visible_pricing: string;
    tech_signals: string[];
  } | null;
  graph_meta?: Record<string, unknown>;
}

/** Pricing strategy graph — benchmark + value-metric (parallel) → design → rationale. */
export function analyzeProductPricing(input: {
  productId: number;
}): Promise<{ pricing: PricingStrategyResult; graph_meta?: Record<string, unknown> }> {
  return runGraph<{ pricing: PricingStrategyResult; graph_meta?: Record<string, unknown> }>(
    "pricing",
    { product_id: input.productId },
    { timeoutMs: 180_000 },
  );
}

/** Go-to-market graph — channels + pillars (parallel) → templates + playbook → 90-day plan. */
export function analyzeProductGTM(input: {
  productId: number;
}): Promise<{ gtm: GTMStrategyResult; graph_meta?: Record<string, unknown> }> {
  return runGraph<{ gtm: GTMStrategyResult; graph_meta?: Record<string, unknown> }>(
    "gtm",
    { product_id: input.productId },
    { timeoutMs: 180_000 },
  );
}

/**
 * Product intelligence supervisor — orchestrates ICP (re-used or fresh) →
 * competitor check → pricing + GTM (parallel) → executive synthesis. Persists
 * every stage to the products row.
 *
 * 300s timeout matches the Vercel maxDuration in vercel.json. Pass
 * force_refresh=true to ignore cached ICP and re-run deep_icp first.
 */
export function runFullProductIntel(input: {
  productId: number;
  forceRefresh?: boolean;
}): Promise<{ report: ProductIntelReportResult; graph_meta?: Record<string, unknown> }> {
  return runGraph<{ report: ProductIntelReportResult; graph_meta?: Record<string, unknown> }>(
    productIntelAssistantId(),
    {
      product_id: input.productId,
      force_refresh: Boolean(input.forceRefresh),
    },
    { timeoutMs: 300_000 },
  );
}

// ─── Async run pattern ─────────────────────────────────────────────────────
//
// The sync wrappers above block a Vercel function up to 300s — fine for Apollo
// Sandbox, cron, and tests, too long for real UI flows. The async helpers
// below kick off the run on the CF Container, return a run id in <2s, and let
// the container POST back to /api/webhooks/langgraph when it finishes.
//
// See migrations/0058_add_product_intel_runs.sql for the tracking table and
// backend/leadgen_agent/notify.py for the graph-side webhook notifier.

import { randomBytes, randomUUID } from "node:crypto";

export interface StartRunResult {
  /** UUID used as the PK in product_intel_runs + passed to the graph as app_run_id. */
  appRunId: string;
  /** LangGraph's own run_id. Null only if the backend returned a malformed body. */
  lgRunId: string;
  /** LangGraph thread_id — needed for getRunStatus reconciliation. */
  threadId: string;
  /** Per-run HMAC secret — store in product_intel_runs.webhook_secret. */
  webhookSecret: string;
}

async function lgFetch(path: string, init: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (LANGGRAPH_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${LANGGRAPH_AUTH_TOKEN}`;
  }
  return fetch(`${LANGGRAPH_URL}${path}`, { ...init, headers });
}

/**
 * Kick off a LangGraph run in the background. Returns as soon as the container
 * accepts the run — does NOT wait for the graph to finish. The graph's
 * `notify_complete` terminal node POSTs the final state to
 * `${APP_URL}/api/webhooks/langgraph` signed with `webhookSecret`.
 *
 * Callers should INSERT a product_intel_runs row with the returned ids BEFORE
 * returning to the GraphQL client, so a fast webhook can't arrive before the
 * row exists.
 *
 * When `options.resumeThreadId` is set, the new run is created on the existing
 * LangGraph thread so AsyncPostgresSaver rehydrates prior node outputs. Nodes
 * in the pricing / gtm / product_intel graphs short-circuit when their output
 * state channels are already populated, so only the nodes that failed on the
 * previous run actually re-execute (LLM-free happy path).
 */
export async function startGraphRun(
  assistantId: string,
  input: Record<string, unknown>,
  options: { resumeThreadId?: string | null } = {},
): Promise<StartRunResult> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("APP_URL (or NEXT_PUBLIC_APP_URL) must be set for async runs");
  }

  const appRunId = randomUUID();
  const webhookSecret = randomBytes(32).toString("hex");

  let threadId: string;
  if (options.resumeThreadId) {
    // Reuse the thread from the previous (failed) run — AsyncPostgresSaver
    // rehydrates all earlier state channels, so idempotent nodes short-circuit.
    threadId = options.resumeThreadId;
  } else {
    // 1. Create a fresh thread
    const threadRes = await lgFetch("/threads", {
      method: "POST",
      body: JSON.stringify({
        metadata: { app_run_id: appRunId, kind: assistantId },
      }),
    });
    if (!threadRes.ok) {
      throw new Error(
        `LangGraph thread create failed (${threadRes.status}): ${await threadRes.text().catch(() => "")}`,
      );
    }
    const threadBody = (await threadRes.json()) as { thread_id: string };
    threadId = threadBody.thread_id;
  }

  // 2. Kick off background run — /runs, NOT /runs/wait
  const runRes = await lgFetch(`/threads/${threadId}/runs`, {
    method: "POST",
    body: JSON.stringify({
      assistant_id: assistantId,
      input: {
        ...input,
        webhook_url: `${appUrl.replace(/\/$/, "")}/api/webhooks/langgraph`,
        webhook_secret: webhookSecret,
        app_run_id: appRunId,
      },
      multitask_strategy: "enqueue",
    }),
  });
  if (!runRes.ok) {
    throw new Error(
      `LangGraph run create failed (${runRes.status}): ${await runRes.text().catch(() => "")}`,
    );
  }
  const runBody = (await runRes.json()) as { run_id: string };

  return {
    appRunId,
    lgRunId: runBody.run_id,
    threadId,
    webhookSecret,
  };
}

/**
 * Reconcile a run's state directly from LangGraph. Used when the webhook is
 * unusually delayed or dropped — kicks the product_intel_runs row to `error`
 * if the remote run already finished badly.
 */
export async function getRunStatus(
  threadId: string,
  lgRunId: string,
): Promise<{ status: string; output?: Record<string, unknown> }> {
  try {
    const res = await lgFetch(`/threads/${threadId}/runs/${lgRunId}`, {
      method: "GET",
    });
    if (!res.ok) return { status: "unknown" };
    return (await res.json()) as { status: string; output?: Record<string, unknown> };
  } catch {
    return { status: "unknown" };
  }
}
