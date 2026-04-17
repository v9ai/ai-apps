import { NextResponse } from "next/server";
import { getAllPersonalities, getResearch } from "@/lib/personalities";
import { getEnrichment } from "@/lib/enrichment";
import type { EnrichedData, HFModel } from "@/lib/enrichment";

async function fetchGitHubStats(
  username: string,
): Promise<{ stars: number; followers: number } | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `token ${token}`;

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(
        `https://api.github.com/users/${username}/repos?sort=stars&per_page=30&type=owner`,
        { headers },
      ),
    ]);

    const followers = profileRes.ok
      ? ((await profileRes.json()).followers ?? 0)
      : 0;

    let totalStars = 0;
    if (reposRes.ok) {
      const repos = await reposRes.json();
      totalStars = repos
        .filter((r: Record<string, unknown>) => !r.fork)
        .reduce(
          (sum: number, r: Record<string, unknown>) =>
            sum + ((r.stargazers_count as number) ?? 0),
          0,
        );
    }

    return { stars: totalStars, followers };
  } catch {
    return null;
  }
}

async function fetchHFStats(
  username: string,
): Promise<{ downloads: number; likes: number } | null> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/models?author=${username}&sort=likes`,
    );
    if (!res.ok) return null;
    const models: Record<string, unknown>[] = await res.json();
    return {
      downloads: models.reduce(
        (s, m) => s + ((m.downloads as number) ?? 0),
        0,
      ),
      likes: models.reduce((s, m) => s + ((m.likes as number) ?? 0), 0),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personalities = getAllPersonalities();
  const drifted: {
    slug: string;
    field: string;
    stored: number;
    live: number;
  }[] = [];
  const errors: string[] = [];

  const batch = personalities.filter((p) => p.github);
  const BATCH_SIZE = 5;

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (p) => {
        try {
          const enrichment = getEnrichment(p.slug);
          const research = getResearch(p.slug);

          let hfUsername: string | null = null;
          if (research?.social) {
            const hfUrl =
              research.social["hugging face"] ??
              research.social["huggingface"] ??
              "";
            if (hfUrl) {
              const parts = hfUrl.replace(/\/$/, "").split("/");
              hfUsername = parts[parts.length - 1] || null;
            }
          }

          const [ghStats, hfStats] = await Promise.all([
            p.github ? fetchGitHubStats(p.github) : Promise.resolve(null),
            hfUsername ? fetchHFStats(hfUsername) : Promise.resolve(null),
          ]);

          if (ghStats) {
            const storedStars = enrichment.github?.totalStars ?? 0;
            if (Math.abs(ghStats.stars - storedStars) > 5) {
              drifted.push({
                slug: p.slug,
                field: "github_stars",
                stored: storedStars,
                live: ghStats.stars,
              });
            }
          }

          if (hfStats) {
            const storedDownloads =
              enrichment.huggingface?.totalDownloads ?? 0;
            if (Math.abs(hfStats.downloads - storedDownloads) > 500) {
              drifted.push({
                slug: p.slug,
                field: "hf_downloads",
                stored: storedDownloads,
                live: hfStats.downloads,
              });
            }
          }
        } catch (err) {
          errors.push(`${p.slug}: ${String(err)}`);
        }
      }),
    );
  }

  // Trigger redeploy if significant drift detected
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK;
  let redeployTriggered = false;
  if (drifted.length > 0 && deployHookUrl) {
    try {
      await fetch(deployHookUrl, { method: "POST" });
      redeployTriggered = true;
    } catch {
      errors.push("Failed to trigger redeploy");
    }
  }

  return NextResponse.json({
    processed: batch.length,
    drifted: drifted.length,
    drift: drifted,
    redeployTriggered,
    errors,
    timestamp: new Date().toISOString(),
  });
}
