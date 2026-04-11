import { NextRequest, NextResponse } from "next/server";
import { categories, getAllPersonalities } from "@/lib/personalities";
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

export function GET(_request: NextRequest) {
  const allPersonalities = getAllPersonalities();

  // --- Aggregate counts ---
  const totalPersonalities = allPersonalities.length;

  const podcastNames = new Set<string>();
  for (const p of allPersonalities) {
    for (const name of p.podcasts) {
      podcastNames.add(name);
    }
  }
  const totalPodcasts = podcastNames.size;

  let totalEpisodes = 0;
  let totalGitHubStars = 0;
  let totalHFDownloads = 0;
  let totalPapers = 0;

  const starsBySlug: { slug: string; name: string; stars: number }[] = [];
  const podcastCountBySlug: {
    slug: string;
    name: string;
    count: number;
  }[] = [];

  for (const p of allPersonalities) {
    const episodes = getEpisodesForPerson(p.slug);
    totalEpisodes += episodes.length;

    const enrichment = getEnrichment(p.slug);

    const stars = enrichment.github?.totalStars ?? 0;
    totalGitHubStars += stars;
    starsBySlug.push({ slug: p.slug, name: p.name, stars });

    totalHFDownloads += enrichment.huggingface?.totalDownloads ?? 0;

    totalPapers += p.papers?.length ?? 0;

    podcastCountBySlug.push({
      slug: p.slug,
      name: p.name,
      count: p.podcasts.length,
    });
  }

  // --- Category breakdown ---
  const categoryCounts = categories.map((c) => ({
    slug: c.slug,
    title: c.title,
    count: c.personalities.length,
  }));

  // --- Top 5 leaderboards ---
  const topByStars = starsBySlug
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 5)
    .map(({ slug, name, stars }) => ({ slug, name, stars }));

  const topByPodcasts = podcastCountBySlug
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(({ slug, name, count }) => ({ slug, name, count }));

  return NextResponse.json(
    {
      totalPersonalities,
      totalPodcasts,
      totalEpisodes,
      totalGitHubStars,
      totalHFDownloads,
      totalPapers,
      categoryCounts,
      topByStars,
      topByPodcasts,
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
