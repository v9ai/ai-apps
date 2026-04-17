import { NextResponse } from "next/server";
import { getAllPersonalities } from "@/lib/personalities";
import { getEnrichment } from "@/lib/enrichment";
import type { EnrichedData, HFModel } from "@/lib/enrichment";

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function ghFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 401 && process.env.GITHUB_TOKEN) {
    return fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
  }
  return res;
}

async function fetchGitHubStats(
  username: string,
): Promise<{ stars: number; followers: number } | null> {
  try {
    const profileRes = await ghFetch(
      `https://api.github.com/users/${username}`,
    );
    if (!profileRes.ok) return null;

    const profile = await profileRes.json();
    const followers = profile.followers ?? 0;

    let totalStars = 0;
    let page = 1;

    while (page <= 5) {
      const reposRes = await ghFetch(
        `https://api.github.com/users/${username}/repos?sort=stars&per_page=100&page=${page}&type=owner`,
      );
      if (!reposRes.ok) return null;

      const repos = await reposRes.json();
      if (!Array.isArray(repos) || repos.length === 0) break;

      totalStars += repos
        .filter((r: Record<string, unknown>) => !r.fork)
        .reduce(
          (sum: number, r: Record<string, unknown>) =>
            sum + ((r.stargazers_count as number) ?? 0),
          0,
        );

      if (repos.length < 100) break;
      page++;
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

  const batch = personalities.filter((p) => p.github || p.hfUsername);
  const skipped: string[] = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (p) => {
        try {
          const enrichment = getEnrichment(p.slug);

          const [ghStats, hfStats] = await Promise.all([
            p.github ? fetchGitHubStats(p.github) : Promise.resolve(null),
            p.hfUsername ? fetchHFStats(p.hfUsername) : Promise.resolve(null),
          ]);

          if (p.github && !ghStats) {
            skipped.push(`${p.slug}:github`);
          }
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

          if (p.hfUsername && !hfStats) {
            skipped.push(`${p.slug}:hf`);
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
    skipped: skipped.length,
    skippedDetails: skipped,
    redeployTriggered,
    errors,
    timestamp: new Date().toISOString(),
  });
}
