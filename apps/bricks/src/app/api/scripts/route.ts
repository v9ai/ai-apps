import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scripts } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(scripts)
    .where(eq(scripts.userId, session.user.id))
    .orderBy(desc(scripts.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hub, template, devices, hasRemote, instructions, code } =
    await request.json();

  if (!hub || !template || !code) {
    return NextResponse.json(
      { error: "hub, template and code are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(scripts)
    .values({
      userId: session.user.id,
      hub,
      template,
      devices: devices ?? [],
      hasRemote: hasRemote ? 1 : 0,
      instructions: instructions ?? "",
      code,
    })
    .returning();

  return NextResponse.json({ success: true, id: row.id });
}
