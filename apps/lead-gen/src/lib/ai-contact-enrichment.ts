import OpenAI from "openai";
import ogs from "open-graph-scraper";
import { z } from "zod";
import type { Contact } from "@/db/schema";

// ─── Zod schema for the stored JSON blob ─────────────────────────────────────

export const ContactAIProfileSchema = z.object({
  trigger: z.enum(["department", "tag"]),
  enriched_at: z.string(),
  linkedin_headline: z.string().nullable(),
  linkedin_bio: z.string().nullable(),
  github_bio: z.string().nullable(),
  github_top_languages: z.array(z.string()),
  github_ai_repos: z.array(z.object({
    name: z.string(),
    description: z.string().nullable(),
    stars: z.number(),
    topics: z.array(z.string()),
  })),
  github_total_stars: z.number(),
  specialization: z.string().nullable(),
  skills: z.array(z.string()),
  research_areas: z.array(z.string()),
  experience_level: z.enum(["junior", "mid", "senior", "principal", "unknown"]),
  synthesis_confidence: z.number(),
  synthesis_rationale: z.string().nullable(),
});

export type ContactAIProfile = z.infer<typeof ContactAIProfileSchema>;

// ─── AI-contact gate check ────────────────────────────────────────────────────

const AI_TAG_RE = /\b(ai|ml|llm|nlp|deep[- ]?learning|machine[- ]?learning|data[- ]?science)\b/i;

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

export function isAIContact(contact: Contact): boolean {
  if (contact.department === "AI/ML") return true;
  return parseJsonArray(contact.tags).some(t => AI_TAG_RE.test(t));
}

// ─── GitHub enrichment ────────────────────────────────────────────────────────

const AI_GITHUB_TOPICS = new Set([
  "machine-learning", "deep-learning", "nlp", "natural-language-processing",
  "pytorch", "tensorflow", "keras", "llm", "large-language-models",
  "transformers", "computer-vision", "reinforcement-learning", "ai",
  "artificial-intelligence", "neural-network", "bert", "gpt",
  "diffusion-model", "huggingface", "rag", "mlops", "data-science",
  "stable-diffusion", "openai", "langchain", "llamaindex",
]);

const AI_REPO_KEYWORD_RE = /\b(ai|ml|llm|nlp|neural|transformer|pytorch|tensorflow|deep.?learn|embedding|vector|rag|diffusion|generative|language.?model|gpt|bert|fine.?tun|candle|whisper|mistral|llama)\b/i;

interface GitHubProfile {
  bio: string | null;
  topLanguages: string[];
  aiRepos: Array<{ name: string; description: string | null; stars: number; topics: string[] }>;
  totalStars: number;
}

export async function fetchGitHubProfile(handle: string): Promise<GitHubProfile | null> {
  try {
    const headers: Record<string, string> = { "User-Agent": "lead-gen-enrichment/1.0" };
    const ghToken = process.env.GITHUB_TOKEN;
    if (ghToken) headers["Authorization"] = `token ${ghToken}`;

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`, { headers }),
      fetch(`https://api.github.com/users/${encodeURIComponent(handle)}/repos?sort=stars&per_page=50`, { headers }),
    ]);

    if (!userRes.ok || !reposRes.ok) return null;

    const user = await userRes.json() as Record<string, unknown>;
    const repos = await reposRes.json();
    if (!Array.isArray(repos)) return null;

    // Top languages by repo count
    const langCount: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) langCount[repo.language] = (langCount[repo.language] ?? 0) + 1;
    }
    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    // Filter repos that look AI-related
    const aiRepos = repos
      .filter((repo: Record<string, unknown>) => {
        const topics = (repo.topics as string[]) ?? [];
        if (topics.some(t => AI_GITHUB_TOPICS.has(t))) return true;
        const nameAndDesc = `${repo.name} ${repo.description ?? ""}`;
        return AI_REPO_KEYWORD_RE.test(nameAndDesc);
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.stargazers_count as number) ?? 0) - ((a.stargazers_count as number) ?? 0))
      .slice(0, 10)
      .map((repo: Record<string, unknown>) => ({
        name: repo.name as string,
        description: (repo.description as string | null) ?? null,
        stars: (repo.stargazers_count as number) ?? 0,
        topics: (repo.topics as string[]) ?? [],
      }));

    return {
      bio: (user.bio as string | null) ?? null,
      topLanguages,
      aiRepos,
      totalStars: aiRepos.reduce((sum, r) => sum + r.stars, 0),
    };
  } catch {
    return null;
  }
}

// ─── GitHub search by name ───────────────────────────────────────────────────

/**
 * Search GitHub for a user by full name. Returns the best-matching login
 * or null if nothing found. Uses the GitHub Search Users API.
 */
export async function searchGitHubByName(
  firstName: string,
  lastName: string,
): Promise<{ login: string; topLanguages: string[] } | null> {
  try {
    const headers: Record<string, string> = { "User-Agent": "lead-gen-enrichment/1.0" };
    const ghToken = process.env.GITHUB_TOKEN;
    if (ghToken) headers["Authorization"] = `token ${ghToken}`;

    const query = encodeURIComponent(`fullname:"${firstName} ${lastName}"`);
    const res = await fetch(`https://api.github.com/search/users?q=${query}&per_page=3`, { headers });
    if (!res.ok) return null;

    const data = await res.json() as { total_count: number; items: Array<{ login: string }> };
    if (!data.items?.length) return null;

    const login = data.items[0].login;

    // Fetch top languages from their repos
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(login)}/repos?sort=stars&per_page=20`,
      { headers },
    );
    if (!reposRes.ok) return { login, topLanguages: [] };

    const repos = await reposRes.json();
    if (!Array.isArray(repos)) return { login, topLanguages: [] };

    const langCount: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) langCount[repo.language] = (langCount[repo.language] ?? 0) + 1;
    }
    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    return { login, topLanguages };
  } catch {
    return null;
  }
}

// ─── LinkedIn OG enrichment ───────────────────────────────────────────────────

const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

interface LinkedInOGData {
  headline: string | null;
  bio: string | null;
}

export async function extractLinkedInOG(url: string): Promise<LinkedInOGData> {
  try {
    const { result } = await ogs({
      url,
      fetchOptions: { headers: { "User-Agent": GOOGLEBOT_UA } },
    });

    const title = result.ogTitle ?? null;
    const description = result.ogDescription ?? null;

    if (!title || /linkedin login|sign in/i.test(title)) {
      return { headline: null, bio: null };
    }

    // og:title for profiles is typically "Name on LinkedIn: headline"
    let headline: string | null = null;
    const colonIdx = title.indexOf(": ");
    if (colonIdx > 0) {
      headline = title.slice(colonIdx + 2).trim() || null;
    }

    return { headline, bio: description };
  } catch {
    return { headline: null, bio: null };
  }
}

// ─── LLM synthesis ────────────────────────────────────────────────────────────

const SynthesisOutputSchema = z.object({
  specialization: z.string().nullable(),
  skills: z.array(z.string()),
  research_areas: z.array(z.string()),
  experience_level: z.enum(["junior", "mid", "senior", "principal", "unknown"]),
  synthesis_confidence: z.number().min(0).max(1),
  synthesis_rationale: z.string().nullable(),
});

interface SynthesisInput {
  name: string;
  position: string | null;
  company: string | null;
  linkedinHeadline: string | null;
  linkedinBio: string | null;
  githubBio: string | null;
  githubTopLanguages: string[];
  githubAiRepoSummaries: string[];
}

async function synthesizeAIProfile(
  input: SynthesisInput,
): Promise<z.infer<typeof SynthesisOutputSchema> | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const hasData =
    input.position ||
    input.linkedinHeadline ||
    input.githubBio ||
    input.githubTopLanguages.length > 0 ||
    input.githubAiRepoSummaries.length > 0;
  if (!hasData) return null;

  const contextLines = [
    input.position && `Job title: ${input.position}`,
    input.company && `Company: ${input.company}`,
    input.linkedinHeadline && `LinkedIn headline: ${input.linkedinHeadline}`,
    input.linkedinBio && `LinkedIn bio: ${input.linkedinBio}`,
    input.githubBio && `GitHub bio: ${input.githubBio}`,
    input.githubTopLanguages.length > 0 && `Top languages: ${input.githubTopLanguages.join(", ")}`,
    input.githubAiRepoSummaries.length > 0 && `AI projects: ${input.githubAiRepoSummaries.join("; ")}`,
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are analyzing an AI professional's profile to extract structured information.
Return JSON with exactly these fields:
- specialization: string or null — primary AI specialization (e.g. "NLP", "Computer Vision", "MLOps", "LLM Engineering", "AI Research", "Reinforcement Learning", "Data Science", "Generative AI")
- skills: string[] — specific tools and frameworks (e.g. ["PyTorch", "Transformers", "CUDA", "MLflow"])
- research_areas: string[] — research topics or interests (e.g. ["RLHF", "RAG", "diffusion models"])
- experience_level: "junior" | "mid" | "senior" | "principal" | "unknown"
- synthesis_confidence: number 0-1 — confidence based on available data quality
- synthesis_rationale: string or null — one sentence explaining the classification`;

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    });

    const response = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Profile:\n${contextLines}` },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_format: { type: "json_object" } as any,
      temperature: 0.1,
      max_tokens: 512,
    });

    const raw = response.choices?.[0]?.message?.content ?? "{}";
    const parsed = SynthesisOutputSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function gatherAIContactProfile(contact: Contact): Promise<ContactAIProfile> {
  const trigger: "department" | "tag" = contact.department === "AI/ML" ? "department" : "tag";

  const [github, linkedin] = await Promise.all([
    contact.github_handle
      ? fetchGitHubProfile(contact.github_handle)
      : Promise.resolve(null),
    contact.linkedin_url
      ? extractLinkedInOG(contact.linkedin_url)
      : Promise.resolve({ headline: null, bio: null }),
  ]);

  const synthesis = await synthesizeAIProfile({
    name: `${contact.first_name} ${contact.last_name}`,
    position: contact.position ?? null,
    company: contact.company ?? null,
    linkedinHeadline: linkedin?.headline ?? null,
    linkedinBio: linkedin?.bio ?? null,
    githubBio: github?.bio ?? null,
    githubTopLanguages: github?.topLanguages ?? [],
    githubAiRepoSummaries: (github?.aiRepos ?? [])
      .slice(0, 5)
      .map(r => `${r.name}: ${r.description ?? ""} (⭐${r.stars})`),
  });

  return {
    trigger,
    enriched_at: new Date().toISOString(),
    linkedin_headline: linkedin?.headline ?? null,
    linkedin_bio: linkedin?.bio ?? null,
    github_bio: github?.bio ?? null,
    github_top_languages: github?.topLanguages ?? [],
    github_ai_repos: github?.aiRepos ?? [],
    github_total_stars: github?.totalStars ?? 0,
    specialization: synthesis?.specialization ?? null,
    skills: synthesis?.skills ?? [],
    research_areas: synthesis?.research_areas ?? [],
    experience_level: synthesis?.experience_level ?? "unknown",
    synthesis_confidence: synthesis?.synthesis_confidence ?? 0,
    synthesis_rationale: synthesis?.synthesis_rationale ?? null,
  };
}
