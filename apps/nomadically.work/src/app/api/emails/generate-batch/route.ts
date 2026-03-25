import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin";
import { composeEmail } from "@/lib/langgraph-client";
import type {
  GenerateBatchEmailRequest,
  GenerateBatchEmailResponse,
} from "@/lib/email-prompt-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { isAdmin, userId } = await checkIsAdmin();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let input: GenerateBatchEmailRequest;

  try {
    const raw: unknown = await request.json();
    if (raw !== null && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      input = {
        companyName:
          typeof obj.companyName === "string" ? obj.companyName : undefined,
        instructions:
          typeof obj.instructions === "string" ? obj.instructions : undefined,
        recipientCount:
          typeof obj.recipientCount === "number"
            ? obj.recipientCount
            : undefined,
        jobContext:
          obj.jobContext && typeof obj.jobContext === "object"
            ? (obj.jobContext as GenerateBatchEmailRequest["jobContext"])
            : undefined,
        applicationContext:
          obj.applicationContext && typeof obj.applicationContext === "object"
            ? (obj.applicationContext as GenerateBatchEmailRequest["applicationContext"])
            : undefined,
      };
    } else {
      input = {};
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await composeEmail({
      recipientName: "{{name}}",
      companyName: input.companyName,
      instructions: input.instructions,
    });

    return NextResponse.json<GenerateBatchEmailResponse>({
      subject: result.subject,
      body: result.body,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LangGraph API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
