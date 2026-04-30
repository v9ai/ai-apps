import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { themes } from "@/lib/schema";
import { runGraphAndWait } from "@/lib/langgraph-client";
import { and, eq } from "drizzle-orm";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.userId, session.user.id), eq(themes.slug, slug)));

  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  try {
    const result = await runGraphAndWait("theme_mocs", {
      theme_name: theme.name,
      theme_slug: theme.slug,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      themeName: theme.name,
      themeSummary: result.theme_summary ?? "",
      relatedKeywords: result.related_keywords ?? [],
      mocs: result.ranked_mocs ?? result.mocs ?? [],
      summary: result.ranking_summary ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Graph failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
