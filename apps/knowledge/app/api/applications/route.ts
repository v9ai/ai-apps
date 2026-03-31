import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { contentDb as db } from "@/src/db/content";
import { applications } from "@/src/db/content-schema";
import { eq, desc } from "drizzle-orm";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, session.user.id))
    .orderBy(desc(applications.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { company, position, url, status, notes, appliedAt, jobDescription } = body;

  if (!company || !position) {
    return NextResponse.json({ error: "company and position are required" }, { status: 400 });
  }

  const [row] = await db
    .insert(applications)
    .values({
      userId: session.user.id,
      company,
      position,
      url: url || null,
      status: status || "saved",
      notes: notes || null,
      jobDescription: jobDescription || null,
      appliedAt: appliedAt ? new Date(appliedAt) : null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
