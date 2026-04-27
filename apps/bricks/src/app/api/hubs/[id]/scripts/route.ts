import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userHubs } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAllScripts } from "@/lib/scripts";
import { slugify } from "@/lib/parser";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const hubId = Number(id);
  if (!Number.isInteger(hubId)) {
    return NextResponse.json({ error: "Invalid hub id" }, { status: 400 });
  }

  const [hubRow] = await db
    .select({ hubType: userHubs.hubType })
    .from(userHubs)
    .where(and(eq(userHubs.id, hubId), eq(userHubs.userId, session.user.id)))
    .limit(1);

  if (!hubRow) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  // Filesystem scripts whose detected `Hub()` matches this user-hub's type.
  // Scripts that don't bind a hub (e.g. multi-hub probe scripts) are skipped —
  // we only want unambiguous matches surfaced on a specific hub page.
  const all = getAllScripts();
  const scripts = all
    .filter((s) => s.hubType === hubRow.hubType)
    .map((s) => ({
      slug: slugify(s.filename),
      filename: s.filename,
      title: s.lessonTitle ?? s.filename.replace(/\.py$/, "").replace(/[-_]/g, " "),
      titleRo: s.lessonTitleRo ?? null,
      hubType: s.hubType,
      devices: s.devices,
      hasRemote: s.hasRemote,
      heroImage: s.heroImage,
    }));

  return NextResponse.json({ hubType: hubRow.hubType, scripts });
}
