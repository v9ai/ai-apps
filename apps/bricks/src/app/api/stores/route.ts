import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { favoriteStores } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(favoriteStores)
    .where(eq(favoriteStores.userId, session.user.id))
    .orderBy(desc(favoriteStores.createdAt));

  return NextResponse.json({ stores: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeName, url, notes } = await req.json();

  if (!storeName || !url) {
    return NextResponse.json(
      { error: "storeName and url are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(favoriteStores)
    .values({
      userId: session.user.id,
      storeName: storeName.trim(),
      url: url.trim(),
      notes: notes || null,
    })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ store: row ?? null, alreadyExists: !row });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await db
    .delete(favoriteStores)
    .where(and(eq(favoriteStores.userId, session.user.id), eq(favoriteStores.id, id)));

  return NextResponse.json({ ok: true });
}
