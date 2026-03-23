import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkIsAdmin } from "@/lib/admin";
import {
  buildBatchPrompt,
  parseJsonContent,
  type GenerateBatchEmailRequest,
  type GenerateBatchEmailResponse,
} from "@/lib/email-prompt-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // reasoner takes longer

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

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

  const prompt = buildBatchPrompt(input);

  let rawContent: string;

  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content:
            "You are an expert email writer. Your top priority is the PRIMARY GOAL in the user prompt — every sentence must serve it. Respond ONLY with a JSON object: {\"subject\": \"...\", \"body\": \"...\"}. The body must use {{name}} as the placeholder for the recipient's first name. Never add fluff. Keep it under 180 words.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Model returned an empty response" },
        { status: 500 },
      );
    }
    rawContent = content;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const parsed = parseJsonContent(rawContent);

  if (!parsed) {
    return NextResponse.json(
      { error: "Failed to parse model response as JSON" },
      { status: 500 },
    );
  }

  return NextResponse.json<GenerateBatchEmailResponse>(parsed);
}
