import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Client } from "@langchain/langgraph-sdk";
import * as d1Tools from "@/src/db/index";

export const runtime = "nodejs";
export const maxDuration = 300;

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:2024";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) {
    return NextResponse.json(
      { error: "User email not found" },
      { status: 401 },
    );
  }

  const { feedbackId, language = "Romanian", minutes = 10 } = await request.json();
  if (!feedbackId) {
    return NextResponse.json(
      { error: "feedbackId required" },
      { status: 400 },
    );
  }

  const feedback = await d1Tools.getContactFeedback(feedbackId, userEmail);
  if (!feedback) {
    return NextResponse.json(
      { error: "Feedback not found" },
      { status: 404 },
    );
  }

  try {
    const client = new Client({ apiUrl: LANGGRAPH_URL, timeoutMs: 300_000 });

    const result = await client.runs.wait(null, "story", {
      input: {
        feedback_id: feedbackId,
        language,
        minutes,
      },
    });

    const state = result as Record<string, unknown>;

    if (state.error) {
      return NextResponse.json({ error: state.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      storyId: state.story_id,
      storyText: state.story_text,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "LangGraph story generation failed";
    console.error("[langgraph-story]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
