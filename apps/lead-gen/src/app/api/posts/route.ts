import { NextRequest, NextResponse } from "next/server";

const LANCE_URL = process.env.LANCE_URL ?? "http://127.0.0.1:9876";

interface StoredPost {
  id: number;
  contact_id: number;
  post_url: string | null;
  post_text: string | null;
  posted_date: string | null;
  reactions_count: number;
  comments_count: number;
  reposts_count: number;
  media_type: string;
  is_repost: boolean;
  original_author: string | null;
  scraped_at: string;
  post_type: string;
  relevance_score: number;
  primary_intent: string;
}

interface ExportResponse {
  contacts: unknown[];
  posts: StoredPost[];
  likes: unknown[];
}

export async function GET(req: NextRequest) {
  const contactIds = req.nextUrl.searchParams.get("contactIds");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10);

  if (!contactIds) {
    return NextResponse.json({ error: "contactIds required" }, { status: 400 });
  }

  const ids = new Set(contactIds.split(",").map(Number).filter((n) => !isNaN(n)));
  if (ids.size === 0) {
    return NextResponse.json([]);
  }

  const res = await fetch(`${LANCE_URL}/export`);
  if (!res.ok) {
    return NextResponse.json(
      { error: `LanceDB server error: ${res.status}` },
      { status: 502 },
    );
  }

  const data: ExportResponse = await res.json();

  const posts = data.posts
    .filter((p) => ids.has(p.contact_id))
    .sort((a, b) => {
      if (!a.posted_date && !b.posted_date) return 0;
      if (!a.posted_date) return 1;
      if (!b.posted_date) return -1;
      return b.posted_date.localeCompare(a.posted_date);
    })
    .slice(0, limit);

  return NextResponse.json(posts);
}
