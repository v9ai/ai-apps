import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topicResearch } from "@/lib/schema";
import { enrichPartsWithImages } from "@/lib/rebrickable";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicName, mocUrls, mocs, analysis, synthesis } = await request.json();
  if (!topicName || !mocs) {
    return NextResponse.json({ error: "topicName and mocs are required" }, { status: 400 });
  }

  // Enrich key parts with Rebrickable images before saving
  let enrichedAnalysis = analysis ?? {};
  if (enrichedAnalysis.key_parts?.length) {
    enrichedAnalysis = {
      ...enrichedAnalysis,
      key_parts: await enrichPartsWithImages(enrichedAnalysis.key_parts),
    };
  }

  const [row] = await db
    .insert(topicResearch)
    .values({
      userId: session.user.id,
      topicName,
      mocUrls: mocUrls ?? [],
      mocs,
      analysis: enrichedAnalysis,
      synthesis: synthesis ?? {},
    })
    .returning();

  return NextResponse.json({ success: true, id: row.id });
}
