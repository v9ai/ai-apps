import { NextRequest } from "next/server";
import OpenAI from "openai";
import { emailSchema } from "@/lib/email-schema";
import { buildComposePrompt } from "@/prompts/compose-email";

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

export async function POST(request: NextRequest) {
  try {
    const input: EmailGenerationRequest = await request.json();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const prompt = buildComposePrompt(input);

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
