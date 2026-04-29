import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin";
import { composeOpportunityEmail } from "@/lib/langgraph-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface OpportunityEmailRequest {
  opportunityId: string;
  additionalInstructions?: string;
}

export async function POST(request: NextRequest) {
  const { isAdmin, userId } = await checkIsAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const input: OpportunityEmailRequest = await request.json();
  if (!input.opportunityId) {
    return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        const result = await composeOpportunityEmail({
          opportunityId: input.opportunityId,
          additionalInstructions: input.additionalInstructions,
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
            contact_id: result.contact_id,
            contact_email: result.contact_email,
            contact_first_name: result.contact_first_name,
            contact_last_name: result.contact_last_name,
            company_name: result.company_name,
            opportunity_title: result.opportunity_title,
            opportunity_applied: result.opportunity_applied,
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
