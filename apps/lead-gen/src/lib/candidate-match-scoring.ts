/**
 * Candidate-opportunity match scoring engine.
 *
 * Scores sourced candidates against a specific opportunity's requirements.
 * Unlike `authority_score` (decision-maker power) or `rising_score` (undiscovered
 * talent), this score measures **how well a candidate fits THIS job**.
 */

import type { ContactAIProfile } from "./ai-contact-enrichment";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CandidateData {
  tags: string[];
  authority_score: number | null;
  ai_profile: ContactAIProfile | null;
  github_handle: string | null;
  position: string | null;
}

export interface OpportunityData {
  tags: string[];
  raw_context: string | null;
}

export interface MatchBreakdown {
  /** Overall match score 0.0-1.0 */
  score: number;
  /** Skill overlap ratio */
  skillMatch: number;
  /** Number of matched / total required skills */
  skillsMatched: number;
  skillsRequired: number;
  /** GitHub depth score */
  githubDepth: number;
  /** Experience fit score */
  experienceFit: number;
  /** Profile completeness */
  profileDepth: number;
}

// ─── Skill extraction from opportunity ───────────────────────────────────────

/** Known AI/ML skill keywords that appear in opportunity tags. */
const SKILL_SYNONYMS: Record<string, string[]> = {
  rag: ["rag", "retrieval-augmented", "retrieval augmented"],
  llm: ["llm", "llms", "large-language-model", "large language model"],
  python: ["python"],
  "machine-learning": ["machine-learning", "machine learning", "ml"],
  "deep-learning": ["deep-learning", "deep learning", "dl"],
  nlp: ["nlp", "natural-language-processing", "natural language processing"],
  pytorch: ["pytorch", "torch"],
  tensorflow: ["tensorflow", "tf"],
  transformers: ["transformers", "huggingface", "hugging face"],
  "computer-vision": ["computer-vision", "computer vision", "cv"],
  mlops: ["mlops", "ml-ops", "ml ops"],
  "generative-ai": ["generative-ai", "generative ai", "genai", "gen-ai"],
  langchain: ["langchain", "lang-chain"],
  llamaindex: ["llamaindex", "llama-index", "llama index"],
  crewai: ["crewai", "crew-ai", "crew ai"],
  langgraph: ["langgraph", "lang-graph", "lang graph"],
  claude: ["claude", "anthropic"],
  openai: ["openai", "open-ai", "gpt"],
  "fine-tuning": ["fine-tuning", "fine tuning", "finetuning", "lora", "qlora"],
  embeddings: ["embeddings", "embedding", "vector"],
  inference: ["inference", "vllm", "onnx", "tensorrt"],
  "vector-db": ["vector-db", "vector database", "pinecone", "weaviate", "pgvector", "faiss", "lancedb"],
  rust: ["rust"],
  typescript: ["typescript", "ts"],
  docker: ["docker", "kubernetes", "k8s"],
  aws: ["aws", "amazon web services"],
  gcp: ["gcp", "google cloud"],
  azure: ["azure"],
};

/** Normalize a skill string for matching. */
function normalizeSkill(s: string): string {
  return s.toLowerCase().trim().replace(/[-_]/g, "-");
}

/** Map a raw skill tag to its canonical form. */
function canonicalize(raw: string): string {
  const norm = normalizeSkill(raw);
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (synonyms.includes(norm)) return canonical;
  }
  return norm;
}

/**
 * Extract required skills from opportunity tags and job description.
 * Opportunity tags often contain raw keywords like "rag", "llm", "python".
 */
export function extractRequiredSkills(
  oppTags: string[],
  rawContext: string | null,
): string[] {
  const skills = new Set<string>();

  // From tags: each tag that looks like a skill keyword
  for (const tag of oppTags) {
    const canon = canonicalize(tag);
    if (SKILL_SYNONYMS[canon]) {
      skills.add(canon);
    }
  }

  // From job description: scan for known skill keywords
  if (rawContext) {
    const lower = rawContext.toLowerCase();
    for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
      if (synonyms.some((syn) => lower.includes(syn))) {
        skills.add(canonical);
      }
    }
  }

  return [...skills];
}

// ─── Scoring components ──────────────────────────────────────────────────────

/** Skill overlap: what fraction of required skills does the candidate have? */
function scoreSkillMatch(
  candidateSkills: string[],
  requiredSkills: string[],
): { ratio: number; matched: number; total: number } {
  if (requiredSkills.length === 0) return { ratio: 0.5, matched: 0, total: 0 };

  const candSet = new Set(candidateSkills.map(canonicalize));
  let matched = 0;
  for (const req of requiredSkills) {
    if (candSet.has(req)) matched++;
  }

  return {
    ratio: matched / requiredSkills.length,
    matched,
    total: requiredSkills.length,
  };
}

/**
 * GitHub depth: evaluates the quality and depth of GitHub activity.
 *
 * Unlike `rising_score` which rewards obscurity, this rewards:
 * - Number and quality of AI repos
 * - Total stars (indicates project quality)
 * - Recent push activity (active contributor)
 * - Follower count (professional standing)
 * - Language breadth in AI context
 * - Having a GitHub presence at all
 */
function scoreGitHubDepth(
  tags: string[],
  profile: ContactAIProfile | null,
): number {
  // Base: tier from Rust pipeline
  const tierTag = tags.find((t) => t.startsWith("github:score:"));
  const tier = tierTag?.replace("github:score:", "") ?? null;
  const base = tier === "A" ? 0.85 : tier === "B" ? 0.60 : tier ? 0.30 : 0.0;

  if (!profile) return base;

  // If we have the enhanced activity_score from deep enrichment, weight it heavily
  const activityScore = profile.github_activity_score ?? 0;
  if (activityScore > 0) {
    // Blend: 60% activity score + 40% profile signals
    const profileSignals = computeProfileSignals(profile);
    return 0.60 * activityScore + 0.40 * profileSignals;
  }

  // Fallback: use basic profile data
  const profileScore = computeProfileSignals(profile);
  return Math.max(base, profileScore);
}

function computeProfileSignals(profile: ContactAIProfile): number {
  const aiRepoCount = profile.github_ai_repos?.length ?? 0;
  const totalStars = profile.github_total_stars ?? 0;
  const langCount = profile.github_top_languages?.length ?? 0;
  const recentPushes = profile.github_recent_push_count ?? 0;
  const followers = profile.github_followers ?? 0;
  const publicRepos = profile.github_public_repos ?? 0;

  // AI repo depth: 0-0.25 (5+ AI repos is max)
  const repoDepth = Math.min(1.0, aiRepoCount / 5) * 0.25;

  // Stars: 0-0.15 (100+ total stars = strong)
  const starsSignal = Math.min(1.0, totalStars / 100) * 0.15;

  // Recent activity: 0-0.25 (20+ pushes in 90 days = very active)
  const recencySignal = Math.min(1.0, recentPushes / 20) * 0.25;

  // Professional standing: 0-0.10 (50+ followers = notable)
  const standingSignal = Math.min(1.0, followers / 50) * 0.10;

  // Builder: 0-0.10 (20+ public repos)
  const builderSignal = Math.min(1.0, publicRepos / 20) * 0.10;

  // Language breadth: 0-0.05 (3+ languages is good)
  const langSignal = Math.min(1.0, langCount / 3) * 0.05;

  // Has GitHub at all: 0.10
  const presenceSignal = 0.10;

  return repoDepth + starsSignal + recencySignal + standingSignal + builderSignal + langSignal + presenceSignal;
}

/**
 * Experience fit: how well does the candidate's experience level
 * match the seniority required by the job?
 */
function scoreExperienceFit(
  profile: ContactAIProfile | null,
  position: string | null,
  oppTags: string[],
): number {
  // Determine required seniority from opportunity
  const oppTitle = oppTags.join(" ").toLowerCase();
  let requiredLevel: "junior" | "mid" | "senior" | "principal" = "senior"; // default
  if (oppTitle.includes("principal") || oppTitle.includes("staff") || oppTitle.includes("lead")) {
    requiredLevel = "principal";
  } else if (oppTitle.includes("senior") || oppTitle.includes("sr")) {
    requiredLevel = "senior";
  } else if (oppTitle.includes("junior") || oppTitle.includes("jr") || oppTitle.includes("entry")) {
    requiredLevel = "junior";
  }

  // Determine candidate level
  const candLevel = profile?.experience_level ?? inferLevelFromPosition(position);

  // Scoring matrix: closer match = higher score
  const LEVEL_ORDER = { junior: 0, mid: 1, senior: 2, principal: 3, unknown: 1 };
  const reqIdx = LEVEL_ORDER[requiredLevel];
  const candIdx = LEVEL_ORDER[candLevel as keyof typeof LEVEL_ORDER] ?? 1;
  const diff = Math.abs(reqIdx - candIdx);

  if (diff === 0) return 1.0; // exact match
  if (diff === 1) return 0.7; // one level off
  if (diff === 2) return 0.3; // two levels off
  return 0.1; // way off
}

function inferLevelFromPosition(position: string | null): string {
  if (!position) return "unknown";
  const lower = position.toLowerCase();
  if (lower.includes("principal") || lower.includes("staff") || lower.includes("lead architect")) return "principal";
  if (lower.includes("senior") || lower.includes("sr.") || lower.includes("lead")) return "senior";
  if (lower.includes("junior") || lower.includes("jr.") || lower.includes("intern")) return "junior";
  return "mid";
}

/**
 * Profile completeness: how much data do we have on this candidate?
 * More data = higher confidence in other scores.
 */
function scoreProfileDepth(
  tags: string[],
  profile: ContactAIProfile | null,
  hasGithub: boolean,
): number {
  let score = 0;

  // Has GitHub handle: 0.2
  if (hasGithub) score += 0.2;

  // Has AI profile: 0.2
  if (profile) score += 0.2;

  // Has skills detected: 0-0.2
  const skillTags = tags.filter((t) => t.startsWith("skill:"));
  score += Math.min(0.2, skillTags.length * 0.04);

  // Has specialization: 0.1
  if (profile?.specialization) score += 0.1;

  // Has research areas: 0.1
  if (profile?.research_areas && profile.research_areas.length > 0) score += 0.1;

  // Has synthesis confidence: 0-0.2
  if (profile?.synthesis_confidence) {
    score += profile.synthesis_confidence * 0.2;
  }

  return Math.min(1.0, score);
}

// ─── Main scoring function ───────────────────────────────────────────────────

const WEIGHTS = {
  skillMatch: 0.40,
  githubDepth: 0.25,
  experienceFit: 0.20,
  profileDepth: 0.15,
};

/**
 * Compute a candidate's match score against a specific opportunity.
 *
 * Returns a score 0.0-1.0 and a breakdown of component scores.
 */
export function computeCandidateMatchScore(
  candidate: CandidateData,
  opportunity: OpportunityData,
): MatchBreakdown {
  const requiredSkills = extractRequiredSkills(opportunity.tags, opportunity.raw_context);

  // Candidate skills from tags
  const candSkills = candidate.tags
    .filter((t) => t.startsWith("skill:"))
    .map((t) => t.replace("skill:", ""));

  // Also include skills from AI profile
  if (candidate.ai_profile?.skills) {
    for (const s of candidate.ai_profile.skills) {
      candSkills.push(s.toLowerCase());
    }
  }

  const skillResult = scoreSkillMatch(candSkills, requiredSkills);
  const githubDepth = scoreGitHubDepth(candidate.tags, candidate.ai_profile);
  const experienceFit = scoreExperienceFit(candidate.ai_profile, candidate.position, opportunity.tags);
  const profileDepth = scoreProfileDepth(candidate.tags, candidate.ai_profile, !!candidate.github_handle);

  const score =
    WEIGHTS.skillMatch * skillResult.ratio +
    WEIGHTS.githubDepth * githubDepth +
    WEIGHTS.experienceFit * experienceFit +
    WEIGHTS.profileDepth * profileDepth;

  return {
    score: Math.round(score * 1000) / 1000,
    skillMatch: Math.round(skillResult.ratio * 1000) / 1000,
    skillsMatched: skillResult.matched,
    skillsRequired: skillResult.total,
    githubDepth: Math.round(githubDepth * 1000) / 1000,
    experienceFit: Math.round(experienceFit * 1000) / 1000,
    profileDepth: Math.round(profileDepth * 1000) / 1000,
  };
}
