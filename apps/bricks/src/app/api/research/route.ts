import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topicResearch } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(topicResearch)
    .where(eq(topicResearch.userId, session.user.id))
    .orderBy(desc(topicResearch.createdAt))
    .limit(50);

  return NextResponse.json({ items: rows });
}
