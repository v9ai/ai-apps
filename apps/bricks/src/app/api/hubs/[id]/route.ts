import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userHubs, hubTypeDocs } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { resolveHub } from "@/lib/hub-resolve";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resolved = await resolveHub(id, session.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  const [row] = await db
    .select({
      id: userHubs.id,
      name: userHubs.name,
      hubType: userHubs.hubType,
      bleName: userHubs.bleName,
      createdAt: userHubs.createdAt,
      docsUrl: hubTypeDocs.docsUrl,
    })
    .from(userHubs)
    .leftJoin(hubTypeDocs, eq(hubTypeDocs.hubType, userHubs.hubType))
    .where(and(eq(userHubs.id, resolved.id), eq(userHubs.userId, session.user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resolved = await resolveHub(id, session.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  await db
    .delete(userHubs)
    .where(
      and(eq(userHubs.id, resolved.id), eq(userHubs.userId, session.user.id))
    );

  return NextResponse.json({ success: true });
}
