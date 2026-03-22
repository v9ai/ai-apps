import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userParts } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(userParts)
    .where(eq(userParts.userId, session.user.id))
    .orderBy(desc(userParts.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { partNum, name, color, qty, imageUrl } = await req.json();
  if (!partNum || typeof partNum !== "string") {
    return NextResponse.json({ error: "partNum is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(userParts)
    .values({
      userId: session.user.id,
      partNum: partNum.trim(),
      name: name || partNum.trim(),
      color: color || "Any",
      qty: qty ?? 1,
      imageUrl: imageUrl || null,
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

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await db
    .delete(userParts)
    .where(and(eq(userParts.userId, session.user.id), eq(userParts.id, id)));

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, qty } = await req.json();
  if (!id || typeof qty !== "number" || qty < 1) {
    return NextResponse.json({ error: "id and qty (>=1) are required" }, { status: 400 });
  }

  const [row] = await db
    .update(userParts)
    .set({ qty })
    .where(and(eq(userParts.userId, session.user.id), eq(userParts.id, id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item: row });
}
