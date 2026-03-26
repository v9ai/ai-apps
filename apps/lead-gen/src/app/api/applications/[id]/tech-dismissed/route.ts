import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const appId = Number(id);
  if (isNaN(appId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [row] = await db
    .select({ tech_dismissed_tags: applications.tech_dismissed_tags })
    .from(applications)
    .where(eq(applications.id, appId));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dismissed: string[] = row.tech_dismissed_tags
    ? JSON.parse(row.tech_dismissed_tags)
    : [];

  return NextResponse.json({ dismissed });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const appId = Number(id);
  if (isNaN(appId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const dismissed: string[] = Array.isArray(body.dismissed) ? body.dismissed : [];

  await db
    .update(applications)
    .set({
      tech_dismissed_tags: JSON.stringify(dismissed),
      updated_at: new Date().toISOString(),
    })
    .where(eq(applications.id, appId));

  return NextResponse.json({ dismissed });
}
