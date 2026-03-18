import {
  RunnableLambda,
  RunnableParallel,
  RunnableSequence,
} from "@langchain/core/runnables";

/* ─── Types ────────────────────────────────────────────── */

export type GitHubRepo = {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
};

export type GitHubProfile = {
  bio: string | null;
  publicRepos: number;
  followers: number;
  location: string | null;
  createdAt: string;
};

export type HFModel = {
  id: string;
  likes: number;
  downloads: number;
  tags: string[];
  pipelineTag: string | null;
};

export type EnrichedData = {
  github: {
    profile: GitHubProfile | null;
    repos: GitHubRepo[];
    totalStars: number;
    languages: { name: string; count: number; color: string }[];
  } | null;
  huggingface: {
    models: HFModel[];
    totalDownloads: number;
    totalLikes: number;
  } | null;
};

/* ─── Helpers ──────────────────────────────────────────── */

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
  "Jupyter Notebook": "#DA5B0B",
  Dockerfile: "#384d54",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

function extractUsername(url?: string): string | null {
  if (!url) return null;
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/* ─── Fetch runnables ──────────────────────────────────── */

type Input = { githubUsername: string | null; hfUsername: string | null };

const fetchGitHubProfile = RunnableLambda.from(
  async (input: Input): Promise<GitHubProfile | null> => {
    if (!input.githubUsername) return null;
    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(input.githubUsername)}`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 3600 },
        } as RequestInit,
      );
      if (!res.ok) return null;
      const d = await res.json();
      return {
        bio: d.bio,
        publicRepos: d.public_repos,
        followers: d.followers,
        location: d.location,
        createdAt: d.created_at,
      };
    } catch {
      return null;
    }
  },
);

const fetchGitHubRepos = RunnableLambda.from(
  async (input: Input): Promise<GitHubRepo[]> => {
    if (!input.githubUsername) return [];
    try {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(input.githubUsername)}/repos?sort=stars&per_page=30&type=owner`,
        {
          headers: { Accept: "application/vnd.github.v3+json" },
          next: { revalidate: 3600 },
        } as RequestInit,
      );
      if (!res.ok) return [];
      const data: any[] = await res.json();
      return data
        .filter((r) => !r.fork)
        .map((r) => ({
          name: r.name,
          description: r.description,
          url: r.html_url,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          topics: r.topics || [],
          updatedAt: r.updated_at,
        }))
        .sort((a: GitHubRepo, b: GitHubRepo) => b.stars - a.stars);
    } catch {
      return [];
    }
  },
);

const fetchHFModels = RunnableLambda.from(
  async (input: Input): Promise<HFModel[]> => {
    if (!input.hfUsername) return [];
    try {
      const res = await fetch(
        `https://huggingface.co/api/models?author=${encodeURIComponent(input.hfUsername)}&sort=likes`,
        { next: { revalidate: 3600 } } as RequestInit,
      );
      if (!res.ok) return [];
      const data: any[] = await res.json();
      return data.map((m) => ({
        id: m.modelId || m.id,
        likes: m.likes || 0,
        downloads: m.downloads || 0,
        tags: m.tags || [],
        pipelineTag: m.pipeline_tag || null,
      }));
    } catch {
      return [];
    }
  },
);

/* ─── LangChain enrichment pipeline (LCEL) ─────────────── */

const fetchAll = RunnableParallel.from({
  githubProfile: fetchGitHubProfile,
  githubRepos: fetchGitHubRepos,
  hfModels: fetchHFModels,
});

const postProcess = RunnableLambda.from(
  async (raw: {
    githubProfile: GitHubProfile | null;
    githubRepos: GitHubRepo[];
    hfModels: HFModel[];
  }): Promise<EnrichedData> => {
    const result: EnrichedData = { github: null, huggingface: null };

    if (raw.githubProfile || raw.githubRepos.length) {
      const totalStars = raw.githubRepos.reduce((s, r) => s + r.stars, 0);
      const langMap: Record<string, number> = {};
      for (const r of raw.githubRepos) {
        if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
      result.github = {
        profile: raw.githubProfile,
        repos: raw.githubRepos,
        totalStars,
        languages: Object.entries(langMap)
          .map(([name, count]) => ({
            name,
            count,
            color: LANG_COLORS[name] || "#8b8b8b",
          }))
          .sort((a, b) => b.count - a.count),
      };
    }

    if (raw.hfModels.length) {
      result.huggingface = {
        models: raw.hfModels,
        totalDownloads: raw.hfModels.reduce((s, m) => s + m.downloads, 0),
        totalLikes: raw.hfModels.reduce((s, m) => s + m.likes, 0),
      };
    }

    return result;
  },
);

const enrichPipeline = RunnableSequence.from([fetchAll, postProcess]);

/* ─── Public API ───────────────────────────────────────── */

export async function enrichPerson(
  githubUser?: string,
  social?: Record<string, string>,
): Promise<EnrichedData> {
  const githubUsername = githubUser || extractUsername(social?.github);
  const hfUsername = extractUsername(social?.huggingface);
  if (!githubUsername && !hfUsername) return { github: null, huggingface: null };
  return enrichPipeline.invoke({ githubUsername, hfUsername });
}
