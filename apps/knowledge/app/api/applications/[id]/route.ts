import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { applications } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, session.user.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { company, position, url, status, notes, appliedAt, jobDescription, aiInterviewQuestions, aiTechStack, techDismissedTags } = body;

  const [row] = await db
    .update(applications)
    .set({
      ...(company !== undefined && { company }),
      ...(position !== undefined && { position }),
      ...(url !== undefined && { url }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(jobDescription !== undefined && { jobDescription }),
      ...(aiInterviewQuestions !== undefined && { aiInterviewQuestions }),
      ...(aiTechStack !== undefined && { aiTechStack }),
      ...(techDismissedTags !== undefined && { techDismissedTags }),
      ...(appliedAt !== undefined && { appliedAt: appliedAt ? new Date(appliedAt) : null }),
      updatedAt: new Date(),
    })
    .where(and(eq(applications.id, id), eq(applications.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [row] = await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
