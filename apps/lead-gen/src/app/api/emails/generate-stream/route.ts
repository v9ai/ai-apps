import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkIsAdmin } from "@/lib/admin";
import { buildBatchPrompt, parseJsonContent } from "@/lib/email/prompt-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EmailGenerationRequest {
  recipientName: string;
  recipientContext?: string;
  companyName?: string;
  instructions?: string;
  linkedinPostContent?: string;
}

function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY not set");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await checkIsAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input: EmailGenerationRequest = await request.json();

    const prompt = buildBatchPrompt({
      companyName: input.companyName,
      instructions: input.instructions,
    });

    const systemPrompt = input.recipientContext
      ? `You are an email composer. Recipient: ${input.recipientName}. Context: ${input.recipientContext}${input.linkedinPostContent ? `\nLinkedIn post: ${input.linkedinPostContent}` : ""}`
      : `You are an email composer. Recipient: ${input.recipientName}.${input.linkedinPostContent ? `\nLinkedIn post: ${input.linkedinPostContent}` : ""}`;

    const client = getDeepSeekClient();
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
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
                encoder.encode(
                  `data: ${JSON.stringify({ type: "chunk", content: delta, accumulated })}\n\n`,
                ),
              );
            }
          }

          // Parse the accumulated JSON response into structured email content
          const parsed = parseJsonContent(accumulated);
          if (parsed) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "complete", data: parsed })}\n\n`,
              ),
            );
          } else {
            // Fallback: send raw accumulated text as body
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "complete",
                  data: { subject: "Generated Email", body: accumulated },
                })}\n\n`,
              ),
            );
          }

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`,
            ),
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
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to generate email",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
