import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin";
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

// SSE event payloads:
//   { type: "draft",    data: { subject, body } }                          // pass 1
//   { type: "refined",  data: { subject, body } }                          // pass 2 (or draft on fallback)
//   { type: "complete", data: { subject, body, draft_subject, draft_body,
//                               prompt_version, model,
//                               prompt_tokens, completion_tokens } }
//   { type: "error",    error: string }
//
// TODO(v2): swap the synchronous composeEmail() call for runGraphStream()
// posting to /runs/stream so the UI can render tokens as they arrive instead
// of waiting for the full graph to complete. Today both DeepSeek calls run
// server-side and the UI sees three coarse events.

export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await checkIsAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const input: EmailGenerationRequest = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        const result = await composeEmail({
          recipientName: input.recipientName,
          companyName: input.companyName,
          instructions: input.instructions,
          recipientContext: input.recipientContext,
          linkedinPostContent: input.linkedinPostContent,
        });

        const draftSubject = result.draft_subject ?? result.subject;
        const draftBody = result.draft_body ?? result.body;

        send({ type: "draft", data: { subject: draftSubject, body: draftBody } });
        send({ type: "refined", data: { subject: result.subject, body: result.body } });
        send({
          type: "complete",
          data: {
            subject: result.subject,
            body: result.body,
            draft_subject: draftSubject,
            draft_body: draftBody,
            prompt_version: result.prompt_version,
            model: result.model,
            prompt_tokens: result.prompt_tokens,
            completion_tokens: result.completion_tokens,
          },
        });
        controller.close();
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Failed to generate email",
        });
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
