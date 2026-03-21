import { NextResponse } from "next/server";
import { getEnrichment } from "@/lib/enrichment";
import { getEpisodesForPerson } from "@/lib/episodes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const enrichment = getEnrichment(slug);
  const episodes = getEpisodesForPerson(slug);

  return NextResponse.json(
    {
      github: enrichment.github
        ? {
            totalStars: enrichment.github.totalStars,
            followers: enrichment.github.profile?.followers ?? 0,
          }
        : null,
      huggingface: enrichment.huggingface
        ? {
            totalDownloads: enrichment.huggingface.totalDownloads,
            totalLikes: enrichment.huggingface.totalLikes,
          }
        : null,
      spotifyEpisodes: episodes.length,
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=3600" },
    },
  );
}
