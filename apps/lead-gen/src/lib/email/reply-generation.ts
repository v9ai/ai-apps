import { generateEmailReply } from "@/lib/langgraph-client";

export interface GenerateReplyRequest {
  originalEmailContent: string;
  originalSender: string;
  additionalDetails?: string | null;
  instructions?: string | null;
  tone?: string | null;
  replyType?: string | null;
  includeCalendly?: boolean | null;
}

export interface GenerateReplyResult {
  subject: string;
  body: string;
}

/**
 * Generate reply content via LangGraph server.
 */
export async function generateReplyContent(
  input: GenerateReplyRequest,
): Promise<GenerateReplyResult> {
  const result = await generateEmailReply({
    originalEmail: input.originalEmailContent,
    sender: input.originalSender,
    instructions: input.instructions ?? undefined,
    tone: input.tone ?? undefined,
    replyType: input.replyType ?? undefined,
    includeCalendly: input.includeCalendly ?? undefined,
    additionalDetails: input.additionalDetails ?? undefined,
  });

  return {
    subject: result.subject,
    body: result.body,
  };
}
