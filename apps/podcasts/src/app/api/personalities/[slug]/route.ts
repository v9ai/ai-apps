import { NextRequest, NextResponse } from "next/server";
import {
  getPersonalityBySlug,
  getCategoryForPersonality,
  getResearch,
  getEnrichedTimeline,
} from "@/lib/personalities";
import { getEnrichment } from "@/lib/enrichment";
import { getEpisodesForPerson } from "@/lib/episodes";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const personality = getPersonalityBySlug(slug);

  if (!personality) {
    return NextResponse.json(
      { error: `Personality not found: ${slug}` },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const category = getCategoryForPersonality(slug) ?? null;
  const enrichment = getEnrichment(slug);
  const episodes = getEpisodesForPerson(slug);
  const research = getResearch(slug);
  const timeline = getEnrichedTimeline(slug);

  return NextResponse.json(
    {
      personality,
      category: category
        ? { title: category.title, slug: category.slug }
        : null,
      enrichment,
      episodes,
      research,
      timeline,
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, s-maxage=3600",
      },
    },
  );
}
