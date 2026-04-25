import type OpenAI from "openai";
import { parseJsonContent } from "@/lib/email/prompt-builder";

interface StreamDeepSeekChatOptions {
  client: OpenAI;
  model: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  /** Subject used in the fallback complete frame when JSON parsing fails. */
  fallbackSubject: string;
}

export async function streamDeepSeekChat(opts: StreamDeepSeekChatOptions): Promise<Response> {
  const completion = await opts.client.chat.completions.create({
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature,
    max_tokens: opts.max_tokens,
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

        const parsed = parseJsonContent(accumulated);
        const completePayload = parsed
          ? { type: "complete", data: parsed }
          : { type: "complete", data: { subject: opts.fallbackSubject, body: accumulated } };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completePayload)}\n\n`));
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
}
