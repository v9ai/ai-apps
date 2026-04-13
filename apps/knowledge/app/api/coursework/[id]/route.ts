import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { coursework } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db
    .delete(coursework)
    .where(and(eq(coursework.id, id), eq(coursework.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await del(row.fileUrl);
  } catch {
    // blob deletion is best-effort
  }

  return NextResponse.json({ ok: true });
}
