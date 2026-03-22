import { NextRequest, NextResponse } from "next/server";
import { runGraphAndWait } from "@/lib/langgraph-client";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { topicName, mocUrls } = await request.json();
  if (!topicName || !mocUrls?.length) {
    return NextResponse.json(
      { error: "topicName and mocUrls[] are required" },
      { status: 400 },
    );
  }

  try {
    const result = await runGraphAndWait("research_topic", {
      topic_name: topicName,
      moc_urls: mocUrls,
    });

    return NextResponse.json({
      success: true,
      mocs: result.mocs,
      analysis: result.analysis,
      synthesis: result.synthesis,
      error: result.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
