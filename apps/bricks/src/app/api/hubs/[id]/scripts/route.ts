import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scripts as userScriptsTable } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAllScripts } from "@/lib/scripts";
import { slugify } from "@/lib/parser";
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

  // Filesystem scripts whose detected `Hub()` matches this user-hub's type.
  // Scripts that don't bind a hub (e.g. multi-hub probe scripts) are skipped —
  // we only want unambiguous matches surfaced on a specific hub page.
  const all = getAllScripts();
  const scripts = all
    .filter((s) => s.hubType === resolved.hubType)
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

  const userScripts = await db
    .select({
      id: userScriptsTable.id,
      name: userScriptsTable.name,
      hub: userScriptsTable.hub,
      createdAt: userScriptsTable.createdAt,
    })
    .from(userScriptsTable)
    .where(
      and(
        eq(userScriptsTable.userId, session.user.id),
        eq(userScriptsTable.hub, resolved.hubType),
      ),
    )
    .orderBy(desc(userScriptsTable.createdAt));

  return NextResponse.json({ hubType: resolved.hubType, scripts, userScripts });
}
