import { NextResponse } from "next/server";
import { getAllPersonalities } from "@/lib/personalities";
import { getEnrichment } from "@/lib/enrichment";

const GH_GQL = "https://api.github.com/graphql";

const STARS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        isFork: false
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        nodes { stargazerCount }
      }
    }
  }
`;

async function fetchGitHubStats(
  username: string,
  token: string,
): Promise<{ stars: number; followers: number } | null> {
  try {
    const res = await fetch(GH_GQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: STARS_QUERY, variables: { login: username } }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const user = json.data?.user;
    if (!user) return null;

    const stars = (user.repositories.nodes as { stargazerCount: number }[]).reduce(
      (sum, n) => sum + n.stargazerCount,
      0,
    );
    return { stars, followers: user.followers.totalCount };
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

  const ghToken = process.env.GITHUB_TOKEN;
  const personalities = getAllPersonalities();
  const drifted: {
    slug: string;
    field: string;
    stored: number;
    live: number;
  }[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  const batch = personalities.filter((p) => p.github || p.hfUsername);
  const BATCH_SIZE = 5;

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (p) => {
        try {
          const enrichment = getEnrichment(p.slug);

          const [ghStats, hfStats] = await Promise.all([
            p.github && ghToken
              ? fetchGitHubStats(p.github, ghToken)
              : Promise.resolve(null),
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
    githubAuth: !!ghToken,
    drifted: drifted.length,
    drift: drifted,
    skipped: skipped.length,
    skippedDetails: skipped,
    redeployTriggered,
    errors,
    timestamp: new Date().toISOString(),
  });
}
