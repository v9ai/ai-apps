import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { feedbackId, language = "Romanian", minutes = 30 } =
    await request.json();
  if (!feedbackId) {
    return NextResponse.json(
      { error: "feedbackId required" },
      { status: 400 },
    );
  }

  try {
    const state = await runGraphAndWait("story", {
      input: {
        feedback_id: feedbackId,
        language,
        minutes,
      },
    });

    if (state.error) {
      return NextResponse.json(
        { error: state.error as string },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      storyId: state.story_id,
      storyText: state.story_text,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Story generation failed";
    console.error("[langgraph-story]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
