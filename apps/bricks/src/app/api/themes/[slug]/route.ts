import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { themes, themeItems } from "@/lib/schema";
import { and, asc, eq } from "drizzle-orm";

export async function GET(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await db
    .select()
    .from(themeItems)
    .where(eq(themeItems.themeId, theme.id))
    .orderBy(asc(themeItems.addedAt));

  return NextResponse.json({ theme, items });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  await db
    .delete(themes)
    .where(and(eq(themes.userId, session.user.id), eq(themes.slug, slug)));

  return NextResponse.json({ ok: true });
}
