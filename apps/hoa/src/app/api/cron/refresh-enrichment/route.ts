import { NextResponse } from "next/server";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { getAllPersonalities, getResearch } from "@/lib/personalities";
import type { EnrichedData, HFModel } from "@/lib/enrichment";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Jupyter: "#DA5B0B",
};

async function fetchGitHub(username: string): Promise<EnrichedData["github"]> {
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

    let profile = null;
    if (profileRes.ok) {
      const d = await profileRes.json();
      profile = {
        bio: d.bio,
        publicRepos: d.public_repos ?? 0,
        followers: d.followers ?? 0,
        location: d.location,
        createdAt: d.created_at,
      };
    }

    let repos: EnrichedData["github"] extends infer G
      ? G extends { repos: infer R }
        ? R
        : never[]
      : never[] = [];
    if (reposRes.ok) {
      const raw = await reposRes.json();
      repos = raw
        .filter((r: Record<string, unknown>) => !r.fork)
        .map((r: Record<string, unknown>) => ({
          name: r.name as string,
          description: r.description ?? null,
          url: r.html_url as string,
          stars: r.stargazers_count as number,
          forks: r.forks_count as number,
          language: r.language ?? null,
          topics: (r.topics as string[]) ?? [],
          updatedAt: r.updated_at as string,
          createdAt: r.created_at as string,
        }))
        .sort(
          (a: { stars: number }, b: { stars: number }) => b.stars - a.stars,
        );
    }

    if (!profile && repos.length === 0) return null;

    const totalStars = repos.reduce(
      (sum: number, r: { stars: number }) => sum + r.stars,
      0,
    );
    const langMap: Record<string, number> = {};
    for (const r of repos) {
      if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1;
    }
    const languages = Object.entries(langMap)
      .map(([name, count]) => ({
        name,
        count,
        color: LANG_COLORS[name] ?? "#8b8b8b",
      }))
      .sort((a, b) => b.count - a.count);

    return { profile, repos, totalStars, languages };
  } catch {
    return null;
  }
}

async function fetchHuggingFace(
  username: string,
): Promise<EnrichedData["huggingface"]> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/models?author=${username}&sort=likes`,
    );
    if (!res.ok) return null;
    const raw = await res.json();
    const models: HFModel[] = raw.map(
      (m: Record<string, unknown>) => ({
        id: (m.modelId as string) ?? (m.id as string),
        likes: (m.likes as number) ?? 0,
        downloads: (m.downloads as number) ?? 0,
        tags: (m.tags as string[]) ?? [],
        pipelineTag: (m.pipeline_tag as string) ?? null,
        createdAt: (m.createdAt as string) ?? null,
      }),
    );
    if (models.length === 0) return null;
    return {
      models,
      totalDownloads: models.reduce((s, m) => s + m.downloads, 0),
      totalLikes: models.reduce((s, m) => s + m.likes, 0),
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
  const enrichmentDir = join(process.cwd(), "src", "lib", "enrichment");

  const updates: string[] = [];
  const errors: string[] = [];

  const batch = personalities.filter((p) => p.github);
  const BATCH_SIZE = 5;

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map(async (p) => {
        try {
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

          const [github, huggingface] = await Promise.all([
            p.github ? fetchGitHub(p.github) : Promise.resolve(null),
            hfUsername
              ? fetchHuggingFace(hfUsername)
              : Promise.resolve(null),
          ]);

          let existing: EnrichedData | null = null;
          try {
            const raw = readFileSync(
              join(enrichmentDir, `${p.slug}.json`),
              "utf-8",
            );
            existing = JSON.parse(raw);
          } catch {
            // no existing enrichment
          }

          const imageUrl = existing?.imageUrl ?? null;
          const data: EnrichedData = { github, huggingface, imageUrl };

          const oldDownloads = existing?.huggingface?.totalDownloads ?? 0;
          const newDownloads = huggingface?.totalDownloads ?? 0;
          const oldStars = existing?.github?.totalStars ?? 0;
          const newStars = github?.totalStars ?? 0;

          const changed =
            Math.abs(newDownloads - oldDownloads) > 100 ||
            Math.abs(newStars - oldStars) > 0;

          if (changed) {
            writeFileSync(
              join(enrichmentDir, `${p.slug}.json`),
              JSON.stringify(data, null, 2) + "\n",
            );
            updates.push(
              `${p.slug}: stars ${oldStars}→${newStars}, downloads ${oldDownloads}→${newDownloads}`,
            );
          }

          return null;
        } catch (err) {
          errors.push(`${p.slug}: ${String(err)}`);
          return null;
        }
      }),
    );
    void results;
  }

  return NextResponse.json({
    processed: batch.length,
    updated: updates.length,
    updates,
    errors,
    timestamp: new Date().toISOString(),
  });
}
