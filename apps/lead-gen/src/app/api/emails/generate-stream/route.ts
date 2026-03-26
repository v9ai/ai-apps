import { NextRequest } from "next/server";
import { composeEmail } from "@/lib/langgraph-client";

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

export async function POST(request: NextRequest) {
  try {
    const input: EmailGenerationRequest = await request.json();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await composeEmail({
            recipientName: input.recipientName,
            companyName: input.companyName,
            instructions: input.instructions,
            recipientContext: input.recipientContext,
            linkedinPostContent: input.linkedinPostContent,
          });

          // Send the complete result as SSE chunks to maintain API compatibility
          const jsonStr = JSON.stringify(result);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "chunk", content: jsonStr, accumulated: jsonStr })}\n\n`,
            ),
          );

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "complete", data: result })}\n\n`,
            ),
          );

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
