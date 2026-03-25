/**
 * Typed HTTP client for the LangGraph Python server.
 *
 * All LLM orchestration runs in the Python LangGraph server (default: :8002).
 * This client provides typed wrappers for each endpoint.
 */

const LANGGRAPH_URL =
  process.env.LANGGRAPH_URL || "http://localhost:8002";

async function callLangGraph<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${LANGGRAPH_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LangGraph ${endpoint} failed (${res.status}): ${text}`,
    );
  }
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

export interface ClassifyJobResult {
  is_remote_eu: boolean;
  confidence: string;
  reason: string;
  source: string;
}

export interface ResumeChatResult {
  answer: string;
}

export interface EmailOutreachResult {
  subject: string;
  text: string;
  html: string;
  contact_id: number | null;
}

// ── Typed wrappers ─────────────────────────────────────────

export function textToSql(
  question: string,
  databaseSchema?: string,
): Promise<TextToSqlResult> {
  return callLangGraph<TextToSqlResult>("/text-to-sql", {
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
  return callLangGraph<EmailReplyResult>("/email-reply", {
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
  return callLangGraph<AdminChatResult>("/admin-chat", {
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
  return callLangGraph<EmailComposeResult>("/email-compose", {
    recipient_name: input.recipientName,
    company_name: input.companyName ?? "",
    instructions: input.instructions ?? "",
    recipient_context: input.recipientContext ?? "",
    linkedin_post_content: input.linkedinPostContent ?? "",
  });
}

export function classifyJob(input: {
  title: string;
  location?: string;
  description?: string;
}): Promise<ClassifyJobResult> {
  return callLangGraph<ClassifyJobResult>("/classify-job", {
    title: input.title,
    location: input.location ?? "",
    description: input.description ?? "",
  });
}

export function resumeChat(
  userId: string,
  question: string,
): Promise<ResumeChatResult> {
  return callLangGraph<ResumeChatResult>("/resume-chat", {
    user_id: userId,
    question,
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
  return callLangGraph<EmailOutreachResult>("/email-outreach", {
    recipient_name: input.recipientName,
    recipient_role: input.recipientRole ?? "",
    recipient_email: input.recipientEmail,
    post_text: input.postText,
    post_url: input.postUrl ?? "",
    tone: input.tone ?? "professional and friendly",
  });
}
