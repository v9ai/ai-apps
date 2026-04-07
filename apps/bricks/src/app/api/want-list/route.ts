import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wantList } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(wantList)
    .where(eq(wantList.userId, session.user.id))
    .orderBy(desc(wantList.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemType, itemNum, name, color, qty, price, url, imageUrl, notes } =
    await req.json();

  if (!itemType || !itemNum || !name) {
    return NextResponse.json(
      { error: "itemType, itemNum, and name are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(wantList)
    .values({
      userId: session.user.id,
      itemType,
      itemNum: itemNum.trim(),
      name: name.trim(),
      color: itemType === "part" ? (color || "").trim() : "",
      qty: qty ?? 1,
      price: price ?? null,
      url: url || null,
      imageUrl: imageUrl || null,
      notes: notes || null,
    })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ item: row ?? null, alreadyExists: !row });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...fields } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const allowed = [
    "qty",
    "price",
    "url",
    "notes",
    "status",
    "name",
    "color",
    "imageUrl",
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(wantList)
    .set(updates)
    .where(and(eq(wantList.userId, session.user.id), eq(wantList.id, id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item: row });
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
    .delete(wantList)
    .where(and(eq(wantList.userId, session.user.id), eq(wantList.id, id)));

  return NextResponse.json({ ok: true });
}
