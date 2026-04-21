/**
 * Auto-draft reply generation.
 *
 * When an inbound email is classified as "interested" or "info_request",
 * generates a contextual reply draft and stores it in the reply_drafts table.
 * Drafts require user approval before sending.
 */

import OpenAI from "openai";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { replyDrafts, receivedEmails, contactEmails, contacts } from "@/db/schema";
import type { ReplyClass } from "./reply-classifier";
import { stripQuotedText } from "./reply-classifier";

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

interface ThreadMessage {
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
  sentAt: string;
}

/**
 * Fetch the full conversation thread for a contact.
 */
async function getThreadContext(contactId: number): Promise<ThreadMessage[]> {
  const [outbound, inbound] = await Promise.all([
    db
      .select({
        subject: contactEmails.subject,
        text_content: contactEmails.text_content,
        sent_at: contactEmails.sent_at,
        tags: contactEmails.tags,
      })
      .from(contactEmails)
      .where(eq(contactEmails.contact_id, contactId))
      .orderBy(desc(contactEmails.sent_at)),
    db
      .select({
        subject: receivedEmails.subject,
        text_content: receivedEmails.text_content,
        received_at: receivedEmails.received_at,
      })
      .from(receivedEmails)
      .where(eq(receivedEmails.matched_contact_id, contactId))
      .orderBy(desc(receivedEmails.received_at)),
  ]);

  const messages: ThreadMessage[] = [];

  for (const e of outbound) {
    messages.push({
      direction: "outbound",
      subject: e.subject,
      body: e.text_content || "",
      sentAt: e.sent_at || "",
    });
  }

  for (const e of inbound) {
    messages.push({
      direction: "inbound",
      subject: e.subject || "",
      body: stripQuotedText(e.text_content || ""),
      sentAt: e.received_at || "",
    });
  }

  // Sort chronologically (oldest first)
  messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

  return messages;
}

/**
 * Check if any outbound emails for this contact are tagged as CPN outreach.
 */
async function isCpnConversation(contactId: number): Promise<boolean> {
  const rows = await db
    .select({ tags: contactEmails.tags })
    .from(contactEmails)
    .where(eq(contactEmails.contact_id, contactId))
    .limit(5);

  return rows.some((r) => {
    try {
      const tags = JSON.parse(r.tags || "[]") as string[];
      return tags.some((t) => t.startsWith("cpn-"));
    } catch {
      return false;
    }
  });
}

function buildDraftPrompt(
  classification: ReplyClass,
  thread: ThreadMessage[],
  contactName: string,
  isCpn: boolean,
): string {
  const threadText = thread
    .map((m) => `[${m.direction.toUpperCase()}] ${m.subject}\n${m.body}`)
    .join("\n\n---\n\n");

  const classInstructions: Record<string, string> = {
    interested: `The contact expressed interest. Write an enthusiastic, helpful reply that:
- Thanks them for their interest
- Provides the next concrete step (share details, schedule a call, send a link)
- Keeps momentum — suggest a specific action
- Is warm but professional, 80-150 words`,

    info_request: `The contact asked specific questions. Write a reply that:
- Directly addresses their questions with specific, truthful answers
- Provides enough detail to move them toward a decision
- Ends with a clear next step
- Is informative but concise, 100-200 words`,
  };

  const cpnContext = isCpn
    ? `\n\nCPN CONTEXT: This conversation is about the Claude Partner Network training program. Key facts:
- Karl Kadon (Head of Partner Experience, Anthropic) is opening the partner training path
- Training covers Claude SDK, prompt engineering, and deployment patterns
- The cohort is limited — first training group
- Vadim is putting together the first training cohort
- Registration: https://forms.gle/cVtMYHDTnCLqJVBn8`
    : "";

  return `You are Vadim Nicolai, writing a reply to ${contactName}. You're professional, direct, and friendly.

${classInstructions[classification] || classInstructions.interested}
${cpnContext}

FULL CONVERSATION THREAD:
${threadText}

Write the reply body only (no subject line, no greeting like "Hi [Name]," — that will be added automatically).
Sign off with just "Vadim" (no last name, no links in the signature).

Respond with ONLY valid JSON: {"subject": "Re: ...", "body": "..."}`;
}

/**
 * Generate a reply draft for a received email and save it to the database.
 */
export async function generateReplyDraft(
  receivedEmailId: number,
  classification: ReplyClass,
  contactId: number,
): Promise<void> {
  // Check if a draft already exists for this received email
  const existing = await db
    .select({ id: replyDrafts.id })
    .from(replyDrafts)
    .where(eq(replyDrafts.received_email_id, receivedEmailId))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[AUTO_DRAFT] Draft already exists for received email ${receivedEmailId}`);
    return;
  }

  // Get contact info
  const [contact] = await db
    .select({
      first_name: contacts.first_name,
      last_name: contacts.last_name,
      company_id: contacts.company_id,
    })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact) {
    console.warn(`[AUTO_DRAFT] Contact ${contactId} not found`);
    return;
  }

  const contactName = `${contact.first_name} ${contact.last_name}`.trim();

  // Get thread context and CPN status in parallel
  const [thread, isCpn] = await Promise.all([
    getThreadContext(contactId),
    isCpnConversation(contactId),
  ]);

  // Generate the reply
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const prompt = buildDraftPrompt(classification, thread, contactName, isCpn);

  const res = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" } as any,
    temperature: 0.7,
    max_tokens: 512,
  });

  const content = res.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(content) as { subject: string; body: string };

  // Add greeting
  const bodyWithGreeting = `Hi ${contact.first_name},\n\n${parsed.body}`;

  // Save the draft
  await db.insert(replyDrafts).values({
    received_email_id: receivedEmailId,
    contact_id: contactId,
    status: "pending",
    draft_type: "reply",
    subject: parsed.subject,
    body_text: bodyWithGreeting,
    generation_model: model,
    thread_context: JSON.stringify(thread.slice(-6)), // Last 6 messages for context
  });

  console.log(
    `[AUTO_DRAFT] Generated ${classification} reply draft for contact ${contactId} (received email ${receivedEmailId})`,
  );
}
