import { NextRequest, NextResponse } from "next/server";
import { categories, getAllPersonalities } from "@/lib/personalities";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categorySlug = searchParams.get("category");

  let personalities;

  if (categorySlug) {
    const category = categories.find((c) => c.slug === categorySlug);
    if (!category) {
      return NextResponse.json(
        { error: `Unknown category: ${categorySlug}` },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    personalities = category.personalities;
  } else {
    personalities = getAllPersonalities();
  }

  const payload = personalities.map((p) => ({
    name: p.name,
    slug: p.slug,
    role: p.role,
    org: p.org,
    podcasts: p.podcasts,
    knownFor: p.knownFor ?? null,
    github: p.github ?? null,
  }));

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
