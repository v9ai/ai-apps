import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userHubs } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(userHubs)
    .where(eq(userHubs.userId, session.user.id))
    .orderBy(desc(userHubs.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, hubType, bleName } = await request.json();

  if (!name || !hubType) {
    return NextResponse.json(
      { error: "name and hubType are required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(userHubs)
    .values({
      userId: session.user.id,
      name,
      hubType,
      bleName: bleName || "",
    })
    .onConflictDoUpdate({
      target: [userHubs.userId, userHubs.name],
      set: { hubType, bleName: bleName || "" },
    })
    .returning();

  return NextResponse.json(row);
}
