/**
 * POST /api/favorites/[mocId]/extract-parts
 *
 * Local-only, LangGraph-only part extraction.
 * No Rebrickable API calls — all intelligence goes through the moc_parts
 * LangGraph graph (AI two-step pipeline: infer build type → generate parts).
 *
 * Flow:
 *   1. Verify the user owns this favorite
 *   2. Run the `moc_parts` LangGraph graph
 *   3. Persist extracted parts into the favorites record
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { favorites } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { runGraphAndWait } from "@/lib/langgraph-client";
import { fetchPartImage } from "@/lib/rebrickable";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mocId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mocId } = await params;

  const [row] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.mocId, mocId)));

  if (!row) {
    return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
  }

  // Run the local AI pipeline through LangGraph
  let result: Record<string, unknown>;
  try {
    result = await runGraphAndWait("moc_parts", {
      moc_id: mocId,
      moc_name: row.name,
      designer: row.designer,
      image_url: `https://cdn.rebrickable.com/media/mocs/${mocId.toLowerCase()}.jpg`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LangGraph unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const rawParts = (result.parts as { partNum: string; name: string; color: string; qty: number; imageUrl?: string }[]) ?? [];
  const source = (result.source as string) ?? "ai";

  // Enrich parts with Rebrickable images (parallel, best-effort)
  const parts = await Promise.all(
    rawParts.map(async (p) => {
      if (p.imageUrl) return p;
      const imgUrl = await fetchPartImage(p.partNum);
      return imgUrl ? { ...p, imageUrl: imgUrl } : p;
    })
  );

  const [updated] = await db
    .update(favorites)
    .set({ parts })
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.mocId, mocId)))
    .returning();

  return NextResponse.json({ item: updated, count: parts.length, source });
}
