import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { favorites } from "@/lib/schema";
import { parseMocUrl } from "@/lib/moc-url";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, session.user.id))
    .orderBy(desc(favorites.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseMocUrl(url);
  } catch {
    return NextResponse.json({ error: "Invalid Rebrickable MOC URL" }, { status: 400 });
  }

  const [row] = await db
    .insert(favorites)
    .values({
      userId: session.user.id,
      mocId: parsed.mocId,
      designer: parsed.designer,
      name: parsed.name,
      url: parsed.url,
    })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ item: row ?? null, alreadyExists: !row });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mocId } = await req.json();
  if (!mocId || typeof mocId !== "string") {
    return NextResponse.json({ error: "mocId is required" }, { status: 400 });
  }

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.mocId, mocId)));

  return NextResponse.json({ ok: true });
}
