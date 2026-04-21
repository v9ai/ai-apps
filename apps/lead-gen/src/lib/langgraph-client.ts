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
    signal: AbortSignal.timeout(60_000),
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
