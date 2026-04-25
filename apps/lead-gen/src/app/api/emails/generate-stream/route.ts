import { NextRequest, NextResponse } from "next/server";
import { getDeepSeekClient, getDeepSeekModel } from "@/lib/deepseek/client";
import { checkIsAdmin } from "@/lib/admin";
import { buildBatchPrompt } from "@/lib/email/prompt-builder";
import { streamDeepSeekChat } from "@/lib/deepseek/streaming";

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

    return await streamDeepSeekChat({
      client: getDeepSeekClient(),
      model: getDeepSeekModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      fallbackSubject: "Generated Email",
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
