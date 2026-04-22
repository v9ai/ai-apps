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
}): Promise<EmailOutreachResult> {
  return runGraph<EmailOutreachResult>("email_outreach", {
    recipient_name: input.recipientName,
    recipient_role: input.recipientRole ?? "",
    recipient_email: input.recipientEmail,
    post_text: input.postText,
    post_url: input.postUrl ?? "",
    tone: input.tone ?? "professional and friendly",
  });
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
