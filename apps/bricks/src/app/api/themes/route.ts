import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { themes, themeItems } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: themes.id,
      slug: themes.slug,
      name: themes.name,
      description: themes.description,
      createdAt: themes.createdAt,
      itemCount: sql<number>`count(${themeItems.id})::int`,
    })
    .from(themes)
    .leftJoin(themeItems, eq(themeItems.themeId, themes.id))
    .where(eq(themes.userId, session.user.id))
    .groupBy(themes.id)
    .orderBy(desc(themes.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase letters/numbers/hyphens" },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(themes)
    .values({ userId: session.user.id, slug, name, description })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Theme with that slug already exists" }, { status: 409 });
  }

  return NextResponse.json({ item: row });
}
