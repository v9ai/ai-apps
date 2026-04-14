import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { eq, desc } from "drizzle-orm";
import { checkIsAdmin } from "@/lib/admin";
import { db } from "@/db";
import { contactEmails, receivedEmails } from "@/db/schema";
import { stripQuotedText } from "@/lib/email/reply-classifier";
import { parseJsonContent } from "@/lib/email/prompt-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ReplyGenerationRequest {
  contactId: number;
  contactName: string;
  receivedEmailId: number;
  instructions?: string;
}

interface ThreadMessage {
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
  sentAt: string;
}

function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

async function getThreadContext(contactId: number): Promise<ThreadMessage[]> {
  const [outbound, inbound] = await Promise.all([
    db
      .select({
        subject: contactEmails.subject,
        text_content: contactEmails.text_content,
        sent_at: contactEmails.sent_at,
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
  messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  return messages;
}

export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await checkIsAdmin();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const input: ReplyGenerationRequest = await request.json();
    const thread = await getThreadContext(input.contactId);

    const threadText = thread
      .map((m) => `[${m.direction.toUpperCase()}] ${m.subject}\n${m.body}`)
      .join("\n\n---\n\n");

    const instructionBlock = input.instructions
      ? `\n\nUSER INSTRUCTIONS (most important — the reply must serve this goal):\n${input.instructions}`
      : "";

    const prompt = `You are Vadim Nicolai, writing a reply to ${input.contactName}. You're professional, direct, and friendly.

Write a contextual reply that:
- Directly addresses what they said in their latest message
- Is concise and natural (50-150 words)
- Ends with a clear next step or graceful close if appropriate
- Sign off with just "Vadim"
${instructionBlock}

FULL CONVERSATION THREAD:
${threadText}

Respond with ONLY valid JSON: {"subject": "Re: ...", "body": "..."}`;

    const client = getDeepSeekClient();
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: `You are composing an email reply on behalf of Vadim Nicolai to ${input.contactName}. Use the conversation thread for context.` },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    const encoder = new TextEncoder();
    let accumulated = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: delta, accumulated })}\n\n`),
              );
            }
          }

          const parsed = parseJsonContent(accumulated);
          if (parsed) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "complete", data: parsed })}\n\n`),
            );
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "complete", data: { subject: `Re: reply`, body: accumulated } })}\n\n`),
            );
          }
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate reply" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
