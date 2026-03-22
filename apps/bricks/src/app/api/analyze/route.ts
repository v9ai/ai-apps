import { NextRequest, NextResponse } from "next/server";
import { runGraphAndWait } from "@/lib/langgraph-client";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { youtubeUrl } = await request.json();
  if (!youtubeUrl) {
    return NextResponse.json({ error: "youtubeUrl is required" }, { status: 400 });
  }

  try {
    const result = await runGraphAndWait("analyze_video", {
      youtube_url: youtubeUrl,
    });

    return NextResponse.json({
      success: true,
      video_info: result.video_info,
      parts_list: result.parts_list,
      building_steps: result.building_steps,
      scheme: result.scheme,
      error: result.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
