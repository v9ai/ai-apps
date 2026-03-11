import { NextRequest } from "next/server";
import OpenAI from "openai";
import { emailSchema } from "@/lib/email-schema";
import { ingestLangfuseEvents, isLangfuseConfigured } from "@/langfuse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

interface EmailGenerationRequest {
  recipientName: string;
  recipientContext?: string;
  companyName?: string;
  instructions?: string;
  linkedinPostContent?: string;
}

function buildPrompt(input: EmailGenerationRequest): string {
  const firstName = input.recipientName.split(" ")[0] || input.recipientName;

  return `You are helping Vadim Nicolai (Senior Frontend Engineer) craft a personalized outreach email.

RECIPIENT DETAILS:
- Name: ${input.recipientName} (use "${firstName}" in greeting)
${input.companyName ? `- Company: ${input.companyName}` : ""}
${input.recipientContext ? `- Context: ${input.recipientContext}` : ""}

VADIM'S BACKGROUND:
- Senior Frontend Engineer with 10+ years experience
- Expertise: React, TypeScript, Rust
- Looking for: remote EU opportunities

${input.instructions ? `SPECIAL INSTRUCTIONS (CRITICAL):\n${input.instructions}\n` : ""}
${input.linkedinPostContent ? `LINKEDIN POST CONTEXT:\nThe recipient recently shared this on LinkedIn:\n---\n${input.linkedinPostContent}\n---\nReference their post naturally in the email — show genuine interest in their perspective. Do NOT quote verbatim or sound like you scraped their content.\n` : ""}
REQUIREMENTS:
1. Generate a professional email
2. Start with "Hey ${firstName},"
3. Keep it concise (150-300 words)
4. Include a clear CTA
5. End with "Thanks,\\nVadim"
6. Do NOT make up facts about the recipient

Generate the email as a JSON object:
{
  "subject": "Your subject line here",
  "body": "Your email body here"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const input: EmailGenerationRequest = await request.json();

    const encoder = new TextEncoder();

    const traceId = crypto.randomUUID();
    const generationId = crypto.randomUUID();
    const hasLinkedIn = !!input.linkedinPostContent;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const prompt = buildPrompt(input);
          const startTime = new Date().toISOString();

          const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
              role: "system",
              content:
                "You are an expert email writer. Always respond with valid JSON matching the requested structure.",
            },
            {
              role: "user",
              content: prompt,
            },
          ];

          if (isLangfuseConfigured()) {
            void ingestLangfuseEvents([
              {
                id: crypto.randomUUID(),
                type: "trace-create",
                body: {
                  id: traceId,
                  name: "email-generate-stream",
                  tags: [
                    "feature:email-compose",
                    ...(hasLinkedIn ? ["source:linkedin"] : []),
                  ],
                  metadata: {
                    recipientName: input.recipientName,
                    companyName: input.companyName,
                    hasLinkedInContent: hasLinkedIn,
                  },
                },
              },
              {
                id: crypto.randomUUID(),
                type: "observation-create",
                body: {
                  id: generationId,
                  traceId,
                  type: "GENERATION",
                  name: "deepseek-chat",
                  model: "deepseek-chat",
                  input: messages,
                  startTime,
                  modelParameters: { temperature: 1.3, response_format: "json_object" },
                },
              },
            ]);
          }

          const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages,
            temperature: 1.3,
            stream: true,
            response_format: { type: "json_object" },
          });

          let fullText = "";

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;

              const message = {
                type: "chunk",
                content: content,
                accumulated: fullText,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(message)}\n\n`),
              );
            }
          }

          try {
            const parsed = JSON.parse(fullText);
            const validated = emailSchema.parse(parsed);

            if (isLangfuseConfigured()) {
              void ingestLangfuseEvents([
                {
                  id: crypto.randomUUID(),
                  type: "observation-update",
                  body: {
                    id: generationId,
                    traceId,
                    type: "GENERATION",
                    output: validated,
                    endTime: new Date().toISOString(),
                    statusMessage: "success",
                  },
                },
              ]);
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "complete", data: validated })}\n\n`,
              ),
            );
          } catch {
            const subjectMatch = fullText.match(/"subject":\s*"([^"]+)"/);
            const bodyMatch = fullText.match(/"body":\s*"([^"]+)"/);

            const fallback = {
              subject: subjectMatch?.[1] || "Follow up",
              body: bodyMatch?.[1] || fullText,
            };

            if (isLangfuseConfigured()) {
              void ingestLangfuseEvents([
                {
                  id: crypto.randomUUID(),
                  type: "observation-update",
                  body: {
                    id: generationId,
                    traceId,
                    type: "GENERATION",
                    output: fallback,
                    endTime: new Date().toISOString(),
                    statusMessage: "fallback-parse",
                  },
                },
              ]);
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "complete",
                  data: fallback,
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
