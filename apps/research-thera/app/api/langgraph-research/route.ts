import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import * as db from "@/src/db/index";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return NextResponse.json(
      { error: "User email not found" },
      { status: 401 },
    );
  }

  const { feedbackId } = await request.json();
  if (!feedbackId) {
    return NextResponse.json(
      { error: "feedbackId required" },
      { status: 400 },
    );
  }

  const feedback = await db.getContactFeedback(feedbackId, userEmail);
  if (!feedback) {
    return NextResponse.json(
      { error: "Feedback not found" },
      { status: 404 },
    );
  }

  // Build a research prompt from the feedback
  const prompt = [
    `Find evidence-based therapeutic research for the following clinical feedback:`,
    ``,
    `Feedback ID: ${feedbackId}`,
    `Subject: ${feedback.subject}`,
    `Content: ${feedback.content}`,
    feedback.tags ? `Tags: ${feedback.tags}` : "",
    ``,
    `Search for academic papers that address the issues described in this feedback.`,
    `Focus on evidence-based interventions, therapeutic techniques, and outcome measures.`,
    `After curating the papers, save them using save_research_papers with feedback_id=${feedbackId}.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await runGraphAndWait("research", {
      input: {
        messages: [{ role: "user", content: prompt }],
      },
    });

    // Extract the last AI message
    const messages = result?.messages as
      | Array<{ content: string; type?: string }>
      | undefined;
    const lastAiMessage = messages
      ?.filter((m) => m.type === "ai" && m.content)
      .pop();

    const output = lastAiMessage?.content || "No research results returned.";

    return NextResponse.json({
      success: true,
      output,
      messageCount: messages?.length ?? 0,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "LangGraph agent failed";
    console.error("[langgraph-research]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
