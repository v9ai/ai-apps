import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedVideos } from "@/lib/schema";
import { parseYoutubeUrl } from "@/lib/youtube-url";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(savedVideos)
    .where(eq(savedVideos.userId, session.user.id))
    .orderBy(desc(savedVideos.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const url = body.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let videoId: string;
  try {
    videoId = parseYoutubeUrl(url);
  } catch {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  // Fetch metadata via YouTube oEmbed
  let title = "Untitled";
  let channelName = "Unknown";
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (oembed.ok) {
      const data = await oembed.json();
      title = data.title || title;
      channelName = data.author_name || channelName;
    }
  } catch {
    // oEmbed failed — proceed with defaults
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const [row] = await db
    .insert(savedVideos)
    .values({
      userId: session.user.id,
      videoId,
      title,
      channelName,
      thumbnailUrl,
      url,
    })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ item: row ?? null, alreadyExists: !row });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId } = await req.json();
  if (!videoId || typeof videoId !== "string") {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  await db
    .delete(savedVideos)
    .where(and(eq(savedVideos.userId, session.user.id), eq(savedVideos.videoId, videoId)));

  return NextResponse.json({ ok: true });
}
