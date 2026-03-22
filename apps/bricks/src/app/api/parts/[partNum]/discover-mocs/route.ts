import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partMocsCache } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { runGraphAndWait } from "@/lib/langgraph-client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partNum: string }> }
) {
  const { partNum } = await params;

  // Check cache first
  const [cached] = await db
    .select()
    .from(partMocsCache)
    .where(eq(partMocsCache.partNum, partNum));

  if (cached) {
    return NextResponse.json({
      partNum,
      partName: cached.partName,
      isSet: false,
      setsCount: 0,
      mocs: cached.mocs,
      summary: cached.summary,
      cached: true,
    });
  }

  // Cache miss — run LangGraph pipeline
  try {
    const result = await runGraphAndWait("part_mocs", { part_num: partNum });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    const mocs = result.ranked_mocs ?? result.mocs ?? [];
    const partName = (result.part_name as string) || partNum;
    const summary = (result.ranking_summary as string) || "";

    // Persist to cache
    await db
      .insert(partMocsCache)
      .values({ partNum, partName, summary, mocs })
      .onConflictDoNothing();

    return NextResponse.json({
      partNum,
      partName,
      partImageUrl: result.part_image_url,
      isSet: result.is_set,
      setsCount: (result.sets as unknown[])?.length ?? 0,
      mocs,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Graph failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
