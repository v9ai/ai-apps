/**
 * Voyager API -> Intent Signal Pipeline
 *
 * Generates intent signals (hiring_intent, tech_adoption, growth_signal,
 * velocity) from LinkedIn Voyager job postings stored in the linkedin_posts
 * table (type='job').
 *
 * Pipeline stages:
 *   1. Ingest:       Read Voyager job data from linkedin_posts
 *   2. Deduplicate:  Fingerprint jobs to prevent duplicate signals
 *   3. Score:        Compute confidence from freshness, remote match, skills, size
 *   4. Generate:     Create intent_signals rows (hiring, tech, growth, velocity)
 *   5. Aggregate:    Recalculate company-level intent_score with decay
 *
 * Scoring formulas are documented inline with weight justifications.
 */

import { db } from "@/db";
import {
  companies,
  intentSignals,
  linkedinPosts,
  type Company,
  type NewIntentSignal,
} from "@/db/schema";
import { eq, and, desc, gte, sql, count, inArray } from "drizzle-orm";
import { SKILL_TAXONOMY } from "@/schema/contracts/skill-taxonomy";
import type { ExtractedSkill } from "@/ml/post-analyzer";

// ── Types ────────────────────────────────────────────────────────────────────

/** A LinkedIn post with type='job' and parsed skill data. */
export interface VoyagerJob {
  id: number;
  company_id: number | null;
  title: string | null;
  content: string | null;
  location: string | null;
  employment_type: string | null;
  posted_at: string | null;
  scraped_at: string;
  url: string;
  skills: ExtractedSkill[];
  raw_data: Record<string, unknown> | null;
}

/** Confidence sub-scores before final aggregation. */
export interface ConfidenceBreakdown {
  /** How recently the job was posted (0-1). */
  freshnessScore: number;
  /** How well the job matches remote work criteria (0-1). */
  remoteMatchScore: number;
  /** Overlap between job skills and our taxonomy (0-1). */
  skillOverlapScore: number;
  /** Company size fit for our ICP (0-1). */
  companySizeFit: number;
  /** Final weighted confidence (0-1). */
  composite: number;
}

/** Result of processing a single Voyager job into signals. */
export interface VoyagerSignalResult {
  jobId: number;
  companyId: number;
  signals: NewIntentSignal[];
  confidence: ConfidenceBreakdown;
  dedupKey: string;
}

/** Summary returned from a batch pipeline run. */
export interface PipelineRunSummary {
  jobsProcessed: number;
  signalsGenerated: number;
  duplicatesSkipped: number;
  companiesUpdated: number;
  errors: string[];
  durationMs: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Confidence weight allocation for hiring_intent signals.
 *
 * Weights sum to 1.0. Rationale:
 * - Freshness (0.35): Recent jobs are much stronger signals. A 2-day-old
 *   posting is dramatically more actionable than a 45-day-old one.
 * - Remote match (0.30): For our ICP (remote-global AI engineering),
 *   remote compatibility is the primary filter. Non-remote jobs still
 *   indicate hiring intent but at much lower confidence.
 * - Skill overlap (0.25): Jobs requiring our taxonomy skills (AI/ML,
 *   TypeScript, Python, etc.) strongly correlate with ICP fit.
 * - Company size (0.10): Mid-size companies (51-500) are our sweet spot.
 *   Too small = no budget, too large = slow procurement.
 */
const HIRING_CONFIDENCE_WEIGHTS = {
  freshness: 0.35,
  remoteMatch: 0.30,
  skillOverlap: 0.25,
  companySize: 0.10,
} as const;

/**
 * Decay days by signal type. These represent the half-life of each signal
 * in the exponential decay function: strength = e^(-ln(2)/halfLife * days).
 *
 * - hiring_intent (30d): Remote jobs typically fill in 30-60 days.
 *   At 30d half-life, a signal retains 50% strength after a month.
 *   After 60 days (2 half-lives), it's at 25% — still nonzero but weak.
 * - tech_adoption (60d): Technology decisions unfold over quarters.
 *   A company adopting PyTorch today will still be hiring for it in 2 months.
 * - growth_signal (45d): Hiring bursts are episodic. A growth signal
 *   from a 5-job week decays faster than a tech adoption signal but
 *   slower than a single job posting.
 * - velocity (21d): Posting rate acceleration is the most ephemeral signal.
 *   A company that ramps from 2 to 8 jobs/week is hot NOW. After 3 weeks,
 *   the velocity may have already normalized.
 */
const DECAY_DAYS: Record<string, number> = {
  hiring_intent: 30,
  tech_adoption: 60,
  growth_signal: 45,
  velocity: 21,
};

/**
 * Intent score weights (mirrors the resolver/script weights).
 * These control how much each signal type contributes to the company's
 * aggregate intent_score (0-100).
 */
const INTENT_WEIGHTS: Record<string, number> = {
  hiring_intent: 30,
  tech_adoption: 20,
  growth_signal: 25,
  budget_cycle: 15,
  leadership_change: 5,
  product_launch: 5,
};

/**
 * Company size -> ICP fit score.
 * Our ICP favors mid-size companies (51-500 employees):
 * - They have budget for consultants/AI engineers
 * - Procurement is faster than enterprise
 * - They're actively building (not maintaining)
 */
const SIZE_FIT: Record<string, number> = {
  "1-10": 0.3,       // Seed stage, limited budget
  "11-50": 0.6,      // Growing, some budget
  "51-200": 0.95,    // Sweet spot: building AI teams
  "201-500": 0.90,   // Sweet spot: scaling AI
  "501-1000": 0.7,   // Large enough but still accessible
  "1001-5000": 0.5,  // Enterprise-adjacent, slower
  "5001-10000": 0.35, // Enterprise procurement
  "10001+": 0.2,     // Megacorp, very slow cycles
};

/**
 * Remote work indicator patterns. Matched case-insensitively against
 * job title, content, location, and employment_type fields.
 *
 * Tiered by strength:
 * - Tier 1 (strong): Explicitly states remote-first or worldwide
 * - Tier 2 (moderate): Remote mentioned but may be hybrid
 * - Tier 3 (weak): No remote signal, location-only (0 score)
 */
const REMOTE_PATTERNS_STRONG = [
  /\bremote[\s-]?first\b/i,
  /\bfully[\s-]?remote\b/i,
  /\b100%[\s-]?remote\b/i,
  /\bwork[\s-]?from[\s-]?anywhere\b/i,
  /\bglobal[\s-]?remote\b/i,
  /\bworldwide\b/i,
  /\bdistributed[\s-]?team\b/i,
  /\basync[\s-]?first\b/i,
];

const REMOTE_PATTERNS_MODERATE = [
  /\bremote\b/i,
  /\bhybrid[\s-]?remote\b/i,
  /\bwork[\s-]?from[\s-]?home\b/i,
  /\bwfh\b/i,
  /\btelecommut/i,
];

/**
 * AI/ML skill tags from our taxonomy that indicate high-value positions.
 * Jobs requiring these skills get a skill overlap bonus because they
 * directly align with our target candidate profile.
 */
const AI_ML_SKILL_TAGS = new Set([
  "machine-learning", "deep-learning", "tensorflow", "pytorch",
  "pandas", "numpy", "scikit", "nlp", "computer-vision",
  "llm", "rag", "prompt-engineering", "fine-tuning", "embeddings",
  "transformers", "agents", "agentic-ai", "langchain", "langgraph",
  "openai", "anthropic", "vercel-ai-sdk", "vector-db", "pinecone",
  "weaviate", "chromadb", "mlops", "huggingface", "model-evaluation",
  "structured-output", "function-calling",
]);

/**
 * Velocity detection thresholds.
 * We compare recent posting rate to historical average to detect acceleration.
 */
const VELOCITY_CONFIG = {
  /** Number of days in the "recent" window. */
  recentWindowDays: 14,
  /** Number of days in the "baseline" window. */
  baselineWindowDays: 60,
  /** Minimum jobs in recent window to even consider velocity. */
  minRecentJobs: 2,
  /** Acceleration ratio threshold: recent_rate / baseline_rate >= this triggers signal. */
  accelerationThreshold: 1.5,
  /** Maximum confidence for velocity signal. */
  maxVelocityConfidence: 0.85,
};

/**
 * Growth signal thresholds.
 * Detect companies with sustained hiring volume, not just one-off posts.
 */
const GROWTH_CONFIG = {
  /** Minimum active jobs to trigger a growth signal. */
  minActiveJobs: 3,
  /** Window in days to count active jobs. */
  windowDays: 30,
  /** Jobs above this count get maximum growth confidence. */
  saturatingJobCount: 15,
};

// ── Core: computeFreshness ───────────────────────────────────────────────────

/**
 * Exponential decay freshness score.
 * Identical to the function in detect-intent-signals.ts and the resolver.
 *
 * Formula: e^(-ln(2) / halfLife * daysSince)
 * - At t=0: returns 1.0 (perfectly fresh)
 * - At t=halfLife: returns 0.5
 * - At t=2*halfLife: returns 0.25
 * - Approaches 0 asymptotically
 *
 * @param detectedAt ISO timestamp of when the signal was detected.
 * @param decayDays Half-life in days.
 * @returns Freshness factor in [0, 1].
 */
export function computeFreshness(detectedAt: string, decayDays: number): number {
  const daysSince =
    (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (decayDays <= 0) return 0;
  const k = 0.693 / decayDays; // ln(2) / halfLife
  return Math.exp(-k * daysSince);
}

// ── Stage 1: Ingest — Read Voyager jobs ──────────────────────────────────────

/**
 * Parse the JSON skills column from a linkedin_posts row into typed ExtractedSkill[].
 */
function parseSkills(skillsJson: string | null): ExtractedSkill[] {
  if (!skillsJson) return [];
  try {
    const parsed = JSON.parse(skillsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: unknown): s is ExtractedSkill =>
        typeof s === "object" &&
        s !== null &&
        "tag" in s &&
        "confidence" in s,
    );
  } catch {
    return [];
  }
}

/**
 * Parse the raw_data JSON column.
 */
function parseRawData(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Fetch unprocessed Voyager job postings from linkedin_posts.
 *
 * "Unprocessed" = type='job' AND posted within the last N days AND
 * not already represented by a hiring_intent signal (dedup check).
 *
 * @param lookbackDays How far back to look for jobs (default: 90).
 * @param limit Max jobs to process per batch (default: 500).
 */
export async function fetchVoyagerJobs(
  lookbackDays = 90,
  limit = 500,
): Promise<VoyagerJob[]> {
  const cutoff = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const rows = await db
    .select()
    .from(linkedinPosts)
    .where(
      and(
        eq(linkedinPosts.type, "job"),
        gte(linkedinPosts.scraped_at, cutoff),
      ),
    )
    .orderBy(desc(linkedinPosts.scraped_at))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    title: row.title,
    content: row.content,
    location: row.location,
    employment_type: row.employment_type,
    posted_at: row.posted_at,
    scraped_at: row.scraped_at,
    url: row.url,
    skills: parseSkills(row.skills),
    raw_data: parseRawData(row.raw_data),
  }));
}

// ── Stage 2: Deduplication ───────────────────────────────────────────────────

/**
 * Generate a dedup fingerprint for a Voyager job.
 *
 * Two jobs produce the same signal if they represent the same position.
 * We hash: company_id + normalized_title + posted_week.
 *
 * Why this triple:
 * - company_id: Same company obviously.
 * - normalized_title: "Senior ML Engineer" and "senior ml engineer" are the same role.
 *   We strip whitespace, lowercase, remove common suffixes like "(Remote)" or "- Worldwide".
 * - posted_week: Same role re-posted in the same week = same signal.
 *   Different weeks = legitimately separate postings (re-opening or new headcount).
 *
 * The fingerprint is stored in intent_signals.metadata as dedup_key.
 */
export function computeDedupKey(job: VoyagerJob): string {
  const companyPart = job.company_id ?? "unknown";

  // Normalize title: lowercase, strip remote/location suffixes, collapse whitespace
  const titleRaw = (job.title ?? "untitled").toLowerCase();
  const titleNorm = titleRaw
    .replace(/\s*\(remote\)\s*/gi, "")
    .replace(/\s*-\s*(remote|worldwide|global|anywhere)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Week bucket: ISO week of posted_at (or scraped_at as fallback)
  const dateStr = job.posted_at ?? job.scraped_at;
  const date = new Date(dateStr);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay()); // Sunday of that week
  const weekKey = weekStart.toISOString().slice(0, 10); // YYYY-MM-DD

  return `voyager:${companyPart}:${titleNorm}:${weekKey}`;
}

/**
 * Check which dedup keys already exist in the intent_signals table.
 * Returns a Set of keys that should be skipped.
 *
 * Uses the metadata JSON column where we store {"dedup_key": "..."}.
 */
export async function getExistingDedupKeys(
  keys: string[],
): Promise<Set<string>> {
  if (keys.length === 0) return new Set();

  // Query intent_signals where metadata contains any of the dedup keys.
  // Since metadata is a JSON text column, we search with LIKE for each key.
  // For large batches, this is batched by company to use the index.
  const existing = new Set<string>();

  // Batch by 50 keys at a time to avoid overly large queries
  const batchSize = 50;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const conditions = batch.map(
      (key) => sql`${intentSignals.metadata}::text LIKE ${"%" + key + "%"}`,
    );

    const rows = await db
      .select({ metadata: intentSignals.metadata })
      .from(intentSignals)
      .where(sql`(${sql.join(conditions, sql` OR `)})`)
      .limit(batch.length);

    for (const row of rows) {
      if (!row.metadata) continue;
      try {
        const meta = JSON.parse(row.metadata);
        if (meta.dedup_key && batch.includes(meta.dedup_key)) {
          existing.add(meta.dedup_key);
        }
      } catch {
        // Corrupt metadata, skip
      }
    }
  }

  return existing;
}

// ── Stage 3: Confidence Scoring ──────────────────────────────────────────────

/**
 * Score job posting freshness on a 0-1 scale.
 *
 * Uses the same exponential decay as computeFreshness but with a shorter
 * reference half-life (14 days) because we want to heavily reward very
 * recent postings during the confidence calculation phase.
 *
 * The actual signal decay_days (30d for hiring_intent) governs how fast
 * the signal fades after creation. This function only scores how fresh
 * the job data is at the time we first see it.
 *
 * Formula: e^(-ln(2) / 14 * daysSincePosted)
 * - Posted today: 1.0
 * - Posted 7 days ago: 0.71 (still very fresh)
 * - Posted 14 days ago: 0.50
 * - Posted 30 days ago: 0.23
 * - Posted 60 days ago: 0.05 (stale)
 */
function scoreJobFreshness(job: VoyagerJob): number {
  const postedAt = job.posted_at ?? job.scraped_at;
  const daysSince =
    (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24);

  // 14-day half-life for freshness scoring
  const k = 0.693 / 14;
  return Math.max(0, Math.exp(-k * daysSince));
}

/**
 * Score remote work compatibility on a 0-1 scale.
 *
 * Tiered scoring:
 * - 1.0: Strong remote signal (remote-first, fully remote, worldwide, etc.)
 * - 0.6: Moderate remote signal (mentions "remote" or "hybrid remote")
 * - 0.2: No remote signal but no explicit on-site requirement
 * - 0.05: Explicitly on-site only
 *
 * Searches across title, content, location, and employment_type fields
 * to catch remote indicators in any field.
 */
function scoreRemoteMatch(job: VoyagerJob): number {
  const searchTexts = [
    job.title ?? "",
    job.content ?? "",
    job.location ?? "",
    job.employment_type ?? "",
  ].join(" ");

  // Check strong remote patterns first (highest value)
  for (const pattern of REMOTE_PATTERNS_STRONG) {
    if (pattern.test(searchTexts)) return 1.0;
  }

  // Check moderate remote patterns
  for (const pattern of REMOTE_PATTERNS_MODERATE) {
    if (pattern.test(searchTexts)) return 0.6;
  }

  // Check for explicit on-site signals (negative signal)
  const onSitePatterns = [
    /\bon[\s-]?site\b/i,
    /\bin[\s-]?office\b/i,
    /\bmust be located\b/i,
    /\bno remote\b/i,
    /\bin-person\b/i,
  ];
  for (const pattern of onSitePatterns) {
    if (pattern.test(searchTexts)) return 0.05;
  }

  // Ambiguous: no remote signal, no on-site signal
  return 0.2;
}

/**
 * Score skill overlap between job requirements and our taxonomy.
 *
 * Two-part score:
 * 1. Raw overlap: What fraction of the job's skills are in our taxonomy?
 *    Higher = more relevant position.
 * 2. AI/ML bonus: If the job requires AI/ML skills, add a bonus weighted
 *    by the fraction of skills that are AI/ML-specific.
 *
 * Formula: min(1, rawOverlap * 0.7 + aiBonus * 0.3)
 * - rawOverlap = (skills in taxonomy) / total_skills
 * - aiBonus = (AI/ML skills) / total_skills
 *
 * If the job has no extracted skills, return 0.3 (neutral — we can't tell).
 */
function scoreSkillOverlap(job: VoyagerJob): number {
  if (job.skills.length === 0) return 0.3; // Unknown, assume moderate

  const taxonomyTags = new Set(Object.keys(SKILL_TAXONOMY));
  let inTaxonomy = 0;
  let aiMlCount = 0;

  for (const skill of job.skills) {
    if (taxonomyTags.has(skill.tag)) inTaxonomy++;
    if (AI_ML_SKILL_TAGS.has(skill.tag)) aiMlCount++;
  }

  const total = job.skills.length;
  const rawOverlap = inTaxonomy / total;
  const aiBonus = aiMlCount / total;

  // Weighted combination: 70% general overlap + 30% AI/ML bonus
  return Math.min(1, rawOverlap * 0.7 + aiBonus * 0.3);
}

/**
 * Score company size fit for our ICP.
 *
 * @param company The company row (needs the `size` field).
 * @returns 0-1 ICP size fit score.
 */
function scoreCompanySizeFit(company: Company | null): number {
  if (!company?.size) return 0.5; // Unknown size, assume moderate
  return SIZE_FIT[company.size] ?? 0.5;
}

/**
 * Compute the composite confidence score for a hiring_intent signal.
 *
 * Aggregates the four sub-scores using the HIRING_CONFIDENCE_WEIGHTS.
 * The result is clamped to [0.1, 0.95] — we never assign 0 confidence
 * (a job posting always indicates *some* hiring intent) and we cap at
 * 0.95 because only verified, active interviews warrant near-certainty.
 *
 * @returns Full breakdown including the composite score.
 */
export function computeHiringConfidence(
  job: VoyagerJob,
  company: Company | null,
): ConfidenceBreakdown {
  const freshnessScore = scoreJobFreshness(job);
  const remoteMatchScore = scoreRemoteMatch(job);
  const skillOverlapScore = scoreSkillOverlap(job);
  const companySizeFit = scoreCompanySizeFit(company);

  const composite = Math.max(
    0.1,
    Math.min(
      0.95,
      freshnessScore * HIRING_CONFIDENCE_WEIGHTS.freshness +
        remoteMatchScore * HIRING_CONFIDENCE_WEIGHTS.remoteMatch +
        skillOverlapScore * HIRING_CONFIDENCE_WEIGHTS.skillOverlap +
        companySizeFit * HIRING_CONFIDENCE_WEIGHTS.companySize,
    ),
  );

  return {
    freshnessScore,
    remoteMatchScore,
    skillOverlapScore,
    companySizeFit,
    composite,
  };
}

// ── Stage 4: Signal Generation ───────────────────────────────────────────────

/**
 * Generate a hiring_intent signal from a single Voyager job.
 *
 * This is the primary signal: "This company is actively hiring for a role
 * that matches our ICP." Every Voyager job produces exactly one hiring_intent
 * signal (after dedup).
 */
function generateHiringSignal(
  job: VoyagerJob,
  confidence: ConfidenceBreakdown,
  dedupKey: string,
): NewIntentSignal {
  const now = new Date().toISOString();
  const decayDays = DECAY_DAYS.hiring_intent;
  const decaysAt = new Date(
    Date.now() + decayDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Build evidence array from available data
  const evidence: string[] = [];
  if (job.title) evidence.push(`Job: ${job.title}`);
  if (confidence.remoteMatchScore >= 0.6) evidence.push("Remote-compatible role");
  if (confidence.skillOverlapScore >= 0.5) {
    const topSkills = job.skills
      .filter((s) => AI_ML_SKILL_TAGS.has(s.tag))
      .slice(0, 5)
      .map((s) => s.tag);
    if (topSkills.length > 0) evidence.push(`AI/ML skills: ${topSkills.join(", ")}`);
  }

  return {
    company_id: job.company_id!,
    signal_type: "hiring_intent",
    source_type: "job_posting",
    source_url: job.url,
    raw_text: buildRawText(job),
    evidence: JSON.stringify(evidence),
    confidence: confidence.composite,
    detected_at: job.posted_at ?? now,
    decays_at: decaysAt,
    decay_days: decayDays,
    metadata: JSON.stringify({
      dedup_key: dedupKey,
      job_id: job.id,
      title: job.title,
      location: job.location,
      employment_type: job.employment_type,
      sub_scores: {
        freshness: confidence.freshnessScore,
        remote_match: confidence.remoteMatchScore,
        skill_overlap: confidence.skillOverlapScore,
        company_size_fit: confidence.companySizeFit,
      },
    }),
    model_version: "voyager-pipeline-v1",
  };
}

/**
 * Generate tech_adoption signals from skills detected in job postings.
 *
 * If a job requires recently-emerging technologies (defined as skills tagged
 * in our AI/ML taxonomy), it indicates the company is actively adopting
 * those technologies. We generate one tech_adoption signal per distinct
 * technology cluster found in the job.
 *
 * Technology clusters (to avoid generating 10 signals for one job):
 * - LLM/GenAI: llm, rag, prompt-engineering, fine-tuning, embeddings, etc.
 * - ML/DL: machine-learning, deep-learning, tensorflow, pytorch, etc.
 * - MLOps: mlops, model-evaluation, huggingface, etc.
 * - Vector DB: vector-db, pinecone, weaviate, chromadb
 * - AI Agents: agents, agentic-ai, langchain, langgraph
 */
function generateTechAdoptionSignals(
  job: VoyagerJob,
  dedupKey: string,
): NewIntentSignal[] {
  if (job.skills.length === 0 || !job.company_id) return [];

  const TECH_CLUSTERS: Record<string, string[]> = {
    "llm-genai": [
      "llm", "rag", "prompt-engineering", "fine-tuning", "embeddings",
      "transformers", "openai", "anthropic", "vercel-ai-sdk",
      "structured-output", "function-calling",
    ],
    "ml-dl": [
      "machine-learning", "deep-learning", "tensorflow", "pytorch",
      "pandas", "numpy", "scikit", "nlp", "computer-vision",
    ],
    "mlops": ["mlops", "model-evaluation", "huggingface"],
    "vector-db": ["vector-db", "pinecone", "weaviate", "chromadb"],
    "ai-agents": ["agents", "agentic-ai", "langchain", "langgraph"],
  };

  const jobSkillTags = new Set(job.skills.map((s) => s.tag));
  const signals: NewIntentSignal[] = [];
  const now = new Date().toISOString();
  const decayDays = DECAY_DAYS.tech_adoption;
  const decaysAt = new Date(
    Date.now() + decayDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  for (const [cluster, tags] of Object.entries(TECH_CLUSTERS)) {
    const matchedTags = tags.filter((t) => jobSkillTags.has(t));
    if (matchedTags.length === 0) continue;

    // Confidence scales with how many cluster skills the job requires.
    // 1 skill = 0.4, 2 skills = 0.55, 3+ skills = 0.7+
    // Capped at 0.85 (we haven't verified actual adoption, only job requirements).
    const clusterConfidence = Math.min(
      0.85,
      0.3 + matchedTags.length * 0.15,
    );

    // Get confidence-weighted evidence from the skills
    const avgSkillConfidence =
      job.skills
        .filter((s) => matchedTags.includes(s.tag))
        .reduce((sum, s) => sum + s.confidence, 0) / matchedTags.length;

    // Final confidence: cluster size * average skill extraction confidence
    const finalConfidence = Math.min(
      0.85,
      clusterConfidence * Math.max(0.5, avgSkillConfidence),
    );

    signals.push({
      company_id: job.company_id,
      signal_type: "tech_adoption",
      source_type: "job_posting",
      source_url: job.url,
      raw_text: `Tech adoption: ${cluster} (${matchedTags.join(", ")})`,
      evidence: JSON.stringify(matchedTags.map((t) => `Requires ${t}`)),
      confidence: finalConfidence,
      detected_at: job.posted_at ?? now,
      decays_at: decaysAt,
      decay_days: decayDays,
      metadata: JSON.stringify({
        dedup_key: `${dedupKey}:tech:${cluster}`,
        job_id: job.id,
        cluster,
        matched_tags: matchedTags,
        avg_skill_confidence: avgSkillConfidence,
      }),
      model_version: "voyager-pipeline-v1",
    });
  }

  return signals;
}

/**
 * Build a concise raw_text snippet from a Voyager job.
 * This gets stored in the intent_signals.raw_text column.
 */
function buildRawText(job: VoyagerJob): string {
  const parts: string[] = [];
  if (job.title) parts.push(job.title);
  if (job.location) parts.push(`Location: ${job.location}`);
  if (job.employment_type) parts.push(`Type: ${job.employment_type}`);
  if (job.content) parts.push(job.content.slice(0, 300));
  return parts.join(" | ").slice(0, 500);
}

/**
 * Process a single Voyager job into all applicable intent signals.
 *
 * Returns null if the job should be skipped (no company_id, duplicate, etc.).
 */
export function processVoyagerJob(
  job: VoyagerJob,
  company: Company | null,
  dedupKey: string,
): VoyagerSignalResult | null {
  if (!job.company_id) return null;

  const confidence = computeHiringConfidence(job, company);

  // Always generate hiring_intent (primary signal)
  const signals: NewIntentSignal[] = [
    generateHiringSignal(job, confidence, dedupKey),
  ];

  // Conditionally generate tech_adoption signals
  const techSignals = generateTechAdoptionSignals(job, dedupKey);
  signals.push(...techSignals);

  return {
    jobId: job.id,
    companyId: job.company_id,
    signals,
    confidence,
    dedupKey,
  };
}

// ── Stage 5: Growth Signal Detection ─────────────────────────────────────────

/**
 * Detect growth signals from job count trends.
 *
 * A growth signal fires when a company has >= GROWTH_CONFIG.minActiveJobs
 * postings within the last GROWTH_CONFIG.windowDays days. The confidence
 * scales with the number of active jobs using a logarithmic curve:
 *
 * confidence = min(0.9, 0.4 + 0.5 * log(jobCount) / log(saturatingCount))
 *
 * This gives:
 * - 3 jobs  -> 0.54
 * - 5 jobs  -> 0.63
 * - 10 jobs -> 0.74
 * - 15 jobs -> 0.90 (saturated)
 *
 * @param companyId Company to evaluate.
 * @returns A growth_signal NewIntentSignal, or null if below threshold.
 */
export async function detectGrowthSignal(
  companyId: number,
): Promise<NewIntentSignal | null> {
  const cutoff = new Date(
    Date.now() - GROWTH_CONFIG.windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [result] = await db
    .select({ count: count() })
    .from(linkedinPosts)
    .where(
      and(
        eq(linkedinPosts.company_id, companyId),
        eq(linkedinPosts.type, "job"),
        gte(linkedinPosts.scraped_at, cutoff),
      ),
    );

  const jobCount = result?.count ?? 0;
  if (jobCount < GROWTH_CONFIG.minActiveJobs) return null;

  // Logarithmic confidence curve (saturates at GROWTH_CONFIG.saturatingJobCount)
  const logRatio =
    Math.log(jobCount) / Math.log(GROWTH_CONFIG.saturatingJobCount);
  const confidence = Math.min(0.9, 0.4 + 0.5 * Math.min(1, logRatio));

  const now = new Date().toISOString();
  const decayDays = DECAY_DAYS.growth_signal;
  const decaysAt = new Date(
    Date.now() + decayDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    company_id: companyId,
    signal_type: "growth_signal",
    source_type: "job_posting",
    source_url: null,
    raw_text: `${jobCount} active job postings in last ${GROWTH_CONFIG.windowDays} days`,
    evidence: JSON.stringify([
      `${jobCount} jobs posted`,
      `Window: ${GROWTH_CONFIG.windowDays} days`,
      `Threshold: ${GROWTH_CONFIG.minActiveJobs} jobs`,
    ]),
    confidence,
    detected_at: now,
    decays_at: decaysAt,
    decay_days: decayDays,
    metadata: JSON.stringify({
      dedup_key: `growth:${companyId}:${now.slice(0, 10)}`,
      job_count: jobCount,
      window_days: GROWTH_CONFIG.windowDays,
    }),
    model_version: "voyager-pipeline-v1",
  };
}

// ── Stage 6: Velocity Signal Detection ───────────────────────────────────────

/**
 * Detect velocity signals from posting rate acceleration.
 *
 * Compares the company's recent posting rate (last 14 days) to their
 * historical baseline (last 60 days). If the recent rate exceeds the
 * baseline by >= VELOCITY_CONFIG.accelerationThreshold, a velocity
 * signal is generated.
 *
 * Confidence formula:
 *   acceleration = recentRate / baselineRate
 *   confidence = min(maxConf, 0.3 + 0.3 * (acceleration - threshold) / (3 - threshold))
 *
 * The denominator (3 - threshold) normalizes so that a 3x acceleration
 * produces near-maximum confidence. Accelerations beyond 3x are extremely
 * strong signals but don't increase confidence further.
 *
 * Examples (with threshold=1.5):
 * - 1.5x acceleration: confidence = 0.30 (just above threshold)
 * - 2.0x acceleration: confidence = 0.40
 * - 3.0x acceleration: confidence = 0.60
 * - 5.0x acceleration: confidence = 0.85 (capped)
 *
 * @returns A hiring_intent signal with velocity metadata, or null.
 */
export async function detectVelocitySignal(
  companyId: number,
): Promise<NewIntentSignal | null> {
  const now = Date.now();
  const recentCutoff = new Date(
    now - VELOCITY_CONFIG.recentWindowDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const baselineCutoff = new Date(
    now - VELOCITY_CONFIG.baselineWindowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Count jobs in recent and baseline windows in parallel
  const [recentResult, baselineResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.company_id, companyId),
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.scraped_at, recentCutoff),
        ),
      ),
    db
      .select({ count: count() })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.company_id, companyId),
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.scraped_at, baselineCutoff),
        ),
      ),
  ]);

  const recentCount = recentResult[0]?.count ?? 0;
  const baselineCount = baselineResult[0]?.count ?? 0;

  // Need minimum recent jobs to avoid noise
  if (recentCount < VELOCITY_CONFIG.minRecentJobs) return null;

  // Compute rates (jobs per day)
  const recentRate = recentCount / VELOCITY_CONFIG.recentWindowDays;

  // Baseline rate excludes the recent window to avoid self-correlation.
  // baselineCount includes recentCount, so subtract.
  const olderCount = baselineCount - recentCount;
  const olderDays =
    VELOCITY_CONFIG.baselineWindowDays - VELOCITY_CONFIG.recentWindowDays;
  const baselineRate = olderDays > 0 ? olderCount / olderDays : 0;

  // If no baseline (company is new or first time posting), use recent rate as-is
  // with a lower confidence cap
  if (baselineRate === 0) {
    if (recentCount >= 3) {
      // New burst of hiring with no history — moderate signal
      const nowIso = new Date().toISOString();
      const decayDays = DECAY_DAYS.velocity ?? 21;
      return {
        company_id: companyId,
        signal_type: "hiring_intent",
        source_type: "job_posting",
        source_url: null,
        raw_text: `New hiring burst: ${recentCount} jobs in ${VELOCITY_CONFIG.recentWindowDays} days (no prior history)`,
        evidence: JSON.stringify([
          `${recentCount} recent jobs`,
          "No prior posting history in baseline window",
          "Interpreted as new hiring initiative",
        ]),
        confidence: Math.min(0.65, 0.4 + recentCount * 0.05),
        detected_at: nowIso,
        decays_at: new Date(
          Date.now() + decayDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
        decay_days: decayDays,
        metadata: JSON.stringify({
          dedup_key: `velocity:${companyId}:${nowIso.slice(0, 10)}`,
          signal_subtype: "velocity",
          recent_count: recentCount,
          baseline_count: 0,
          acceleration: Infinity,
        }),
        model_version: "voyager-pipeline-v1",
      };
    }
    return null;
  }

  const acceleration = recentRate / baselineRate;
  if (acceleration < VELOCITY_CONFIG.accelerationThreshold) return null;

  // Confidence scales with acceleration magnitude
  const normalizedAccel =
    (acceleration - VELOCITY_CONFIG.accelerationThreshold) /
    (3 - VELOCITY_CONFIG.accelerationThreshold);
  const confidence = Math.min(
    VELOCITY_CONFIG.maxVelocityConfidence,
    0.3 + 0.3 * Math.min(1, normalizedAccel),
  );

  const nowIso = new Date().toISOString();
  const decayDays = DECAY_DAYS.velocity ?? 21;

  return {
    company_id: companyId,
    signal_type: "hiring_intent",
    source_type: "job_posting",
    source_url: null,
    raw_text: `Hiring velocity: ${acceleration.toFixed(1)}x acceleration (${recentCount} jobs in ${VELOCITY_CONFIG.recentWindowDays}d vs ${olderCount} in ${olderDays}d baseline)`,
    evidence: JSON.stringify([
      `Recent: ${recentCount} jobs / ${VELOCITY_CONFIG.recentWindowDays} days = ${recentRate.toFixed(2)}/day`,
      `Baseline: ${olderCount} jobs / ${olderDays} days = ${baselineRate.toFixed(2)}/day`,
      `Acceleration: ${acceleration.toFixed(1)}x (threshold: ${VELOCITY_CONFIG.accelerationThreshold}x)`,
    ]),
    confidence,
    detected_at: nowIso,
    decays_at: new Date(
      Date.now() + decayDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
    decay_days: decayDays,
    metadata: JSON.stringify({
      dedup_key: `velocity:${companyId}:${nowIso.slice(0, 10)}`,
      signal_subtype: "velocity",
      recent_count: recentCount,
      baseline_count: olderCount,
      recent_rate: recentRate,
      baseline_rate: baselineRate,
      acceleration,
    }),
    model_version: "voyager-pipeline-v1",
  };
}

// ── Stage 7: Company Intent Score Recalculation ──────────────────────────────

/**
 * Recompute a company's aggregate intent_score from all their signals.
 *
 * This is the same weighted-max formula used in the resolver and the
 * detect-intent-signals script:
 *
 * For each signal type, find the strongest active signal:
 *   best[type] = max(confidence * freshness) over all signals of that type
 *
 * Then compute the weighted average:
 *   intent_score = sum(best[type] * weight[type]) / sum(weight[type]) * 100
 *
 * This gives a score in [0, 100] where:
 * - 0: No active signals
 * - 30-50: Moderate intent (a few aging signals)
 * - 50-70: Strong intent (recent, high-confidence signals)
 * - 70+: Very strong intent (multiple fresh, high-confidence signals)
 *
 * @param companyId Company to recalculate.
 * @returns The new intent score, or null if the update failed.
 */
export async function recalculateCompanyIntentScore(
  companyId: number,
): Promise<number | null> {
  const signals = await db
    .select()
    .from(intentSignals)
    .where(eq(intentSignals.company_id, companyId));

  if (signals.length === 0) {
    // No signals — reset to zero
    await db
      .update(companies)
      .set({
        intent_score: 0,
        intent_score_updated_at: new Date().toISOString(),
        intent_signals_count: 0,
        intent_top_signal: null,
      })
      .where(eq(companies.id, companyId));
    return 0;
  }

  // Compute best (confidence * freshness) per signal type
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
    const best = signals
      .filter((s) => s.signal_type === signalType)
      .reduce((max, s) => {
        const f = computeFreshness(s.detected_at, s.decay_days);
        return Math.max(max, s.confidence * f);
      }, 0);

    weightedSum += best * weight;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  // Find top signal (highest effective strength)
  const topSignal = signals.reduce(
    (best, s) => {
      const eff = s.confidence * computeFreshness(s.detected_at, s.decay_days);
      if (eff > best.eff) return { signal: s, eff };
      return best;
    },
    { signal: signals[0], eff: 0 },
  );

  await db
    .update(companies)
    .set({
      intent_score: score,
      intent_score_updated_at: new Date().toISOString(),
      intent_signals_count: signals.length,
      intent_top_signal: JSON.stringify({
        signal_type: topSignal.signal.signal_type,
        confidence: topSignal.signal.confidence,
        freshness: computeFreshness(
          topSignal.signal.detected_at,
          topSignal.signal.decay_days,
        ),
      }),
    })
    .where(eq(companies.id, companyId));

  return score;
}

/**
 * Batch recalculate intent scores for multiple companies.
 * More efficient than calling recalculateCompanyIntentScore individually
 * because it fetches all signals in one query.
 */
export async function batchRecalculateIntentScores(
  companyIds: number[],
): Promise<Map<number, number>> {
  if (companyIds.length === 0) return new Map();

  // Fetch all signals for all companies in one query
  const allSignals = await db
    .select()
    .from(intentSignals)
    .where(inArray(intentSignals.company_id, companyIds));

  // Group by company
  const signalsByCompany = new Map<number, typeof allSignals>();
  for (const signal of allSignals) {
    const existing = signalsByCompany.get(signal.company_id) ?? [];
    existing.push(signal);
    signalsByCompany.set(signal.company_id, existing);
  }

  const scoreMap = new Map<number, number>();

  for (const companyId of companyIds) {
    const signals = signalsByCompany.get(companyId) ?? [];

    if (signals.length === 0) {
      await db
        .update(companies)
        .set({
          intent_score: 0,
          intent_score_updated_at: new Date().toISOString(),
          intent_signals_count: 0,
          intent_top_signal: null,
        })
        .where(eq(companies.id, companyId));
      scoreMap.set(companyId, 0);
      continue;
    }

    // Same weighted-max formula as recalculateCompanyIntentScore
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [signalType, weight] of Object.entries(INTENT_WEIGHTS)) {
      const best = signals
        .filter((s) => s.signal_type === signalType)
        .reduce((max, s) => {
          const f = computeFreshness(s.detected_at, s.decay_days);
          return Math.max(max, s.confidence * f);
        }, 0);

      weightedSum += best * weight;
      totalWeight += weight;
    }

    const score = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

    const topSignal = signals.reduce(
      (best, s) => {
        const eff =
          s.confidence * computeFreshness(s.detected_at, s.decay_days);
        if (eff > best.eff) return { signal: s, eff };
        return best;
      },
      { signal: signals[0], eff: 0 },
    );

    await db
      .update(companies)
      .set({
        intent_score: score,
        intent_score_updated_at: new Date().toISOString(),
        intent_signals_count: signals.length,
        intent_top_signal: JSON.stringify({
          signal_type: topSignal.signal.signal_type,
          confidence: topSignal.signal.confidence,
          freshness: computeFreshness(
            topSignal.signal.detected_at,
            topSignal.signal.decay_days,
          ),
        }),
      })
      .where(eq(companies.id, companyId));

    scoreMap.set(companyId, score);
  }

  return scoreMap;
}

// ── Stage 8: Full Batch Pipeline ─────────────────────────────────────────────

/**
 * Run the complete Voyager -> Intent Signal pipeline.
 *
 * This is the main entry point. It orchestrates all stages:
 * 1. Fetch Voyager jobs from linkedin_posts (type='job')
 * 2. Compute dedup keys and filter out already-processed jobs
 * 3. Fetch company data for size-fit scoring
 * 4. Generate hiring_intent + tech_adoption signals for each job
 * 5. Detect growth signals for companies with enough recent jobs
 * 6. Detect velocity signals for companies with posting acceleration
 * 7. Insert all new signals into intent_signals
 * 8. Recalculate intent_score for all affected companies
 *
 * @param options Pipeline configuration.
 * @returns Summary of the pipeline run.
 */
export async function runVoyagerPipeline(options?: {
  /** How far back to look for jobs (default: 90 days). */
  lookbackDays?: number;
  /** Max jobs to process per batch (default: 500). */
  limit?: number;
  /** Skip growth/velocity detection (default: false). */
  skipTrendSignals?: boolean;
  /** Dry run: compute signals but don't write to DB (default: false). */
  dryRun?: boolean;
}): Promise<PipelineRunSummary> {
  const startTime = Date.now();
  const {
    lookbackDays = 90,
    limit = 500,
    skipTrendSignals = false,
    dryRun = false,
  } = options ?? {};

  const summary: PipelineRunSummary = {
    jobsProcessed: 0,
    signalsGenerated: 0,
    duplicatesSkipped: 0,
    companiesUpdated: 0,
    errors: [],
    durationMs: 0,
  };

  // ── Step 1: Fetch jobs ──────────────────────────────────────────
  const jobs = await fetchVoyagerJobs(lookbackDays, limit);
  if (jobs.length === 0) {
    summary.durationMs = Date.now() - startTime;
    return summary;
  }

  // ── Step 2: Deduplication ───────────────────────────────────────
  const dedupKeys = new Map<number, string>(); // jobId -> dedupKey
  for (const job of jobs) {
    dedupKeys.set(job.id, computeDedupKey(job));
  }

  const existingKeys = await getExistingDedupKeys(
    Array.from(dedupKeys.values()),
  );

  // Filter out already-processed jobs
  const newJobs = jobs.filter((job) => {
    const key = dedupKeys.get(job.id)!;
    if (existingKeys.has(key)) {
      summary.duplicatesSkipped++;
      return false;
    }
    return true;
  });

  // ── Step 3: Fetch company data for scoring ──────────────────────
  const companyIds = Array.from(
    new Set(newJobs.map((j) => j.company_id).filter(Boolean) as number[]),
  );

  const companyRows =
    companyIds.length > 0
      ? await db
          .select()
          .from(companies)
          .where(inArray(companies.id, companyIds))
      : [];

  const companyMap = new Map<number, Company>();
  for (const c of companyRows) {
    companyMap.set(c.id, c);
  }

  // ── Step 4: Generate per-job signals ────────────────────────────
  const allSignals: NewIntentSignal[] = [];
  const affectedCompanyIds = new Set<number>();

  for (const job of newJobs) {
    try {
      if (!job.company_id) continue;

      const company = companyMap.get(job.company_id) ?? null;
      const dedupKey = dedupKeys.get(job.id)!;
      const result = processVoyagerJob(job, company, dedupKey);

      if (result) {
        allSignals.push(...result.signals);
        affectedCompanyIds.add(result.companyId);
        summary.jobsProcessed++;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`Job ${job.id}: ${msg}`);
    }
  }

  // ── Step 5: Growth + velocity signals ───────────────────────────
  if (!skipTrendSignals) {
    for (const companyId of Array.from(affectedCompanyIds)) {
      try {
        // Growth detection
        const growthSignal = await detectGrowthSignal(companyId);
        if (growthSignal) {
          // Check dedup for growth signals (one per company per day)
          const growthMeta = JSON.parse(growthSignal.metadata ?? "{}");
          if (!existingKeys.has(growthMeta.dedup_key)) {
            allSignals.push(growthSignal);
          }
        }

        // Velocity detection
        const velocitySignal = await detectVelocitySignal(companyId);
        if (velocitySignal) {
          const velMeta = JSON.parse(velocitySignal.metadata ?? "{}");
          if (!existingKeys.has(velMeta.dedup_key)) {
            allSignals.push(velocitySignal);
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        summary.errors.push(`Trend signals for company ${companyId}: ${msg}`);
      }
    }
  }

  // ── Step 6: Insert signals ──────────────────────────────────────
  const insertedSignalIds: number[] = [];
  if (!dryRun && allSignals.length > 0) {
    // Batch insert in chunks of 100 to avoid huge INSERT statements
    const insertChunkSize = 100;
    for (let i = 0; i < allSignals.length; i += insertChunkSize) {
      const chunk = allSignals.slice(i, i + insertChunkSize);
      const rows = await db
        .insert(intentSignals)
        .values(chunk)
        .returning({ id: intentSignals.id });
      for (const r of rows) insertedSignalIds.push(r.id);
    }
    summary.signalsGenerated = allSignals.length;
  } else if (dryRun) {
    summary.signalsGenerated = allSignals.length;
  }

  // ── Step 6b: Tag new signals with matching products ─────────────
  if (!dryRun && insertedSignalIds.length > 0) {
    try {
      const { tagIntentSignalsProducts } = await import(
        "../../../scripts/tag-intent-signals-products"
      );
      await tagIntentSignalsProducts({ signalIds: insertedSignalIds });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`Product tagger: ${msg}`);
    }
  }

  // ── Step 7: Recalculate company scores ──────────────────────────
  if (!dryRun && affectedCompanyIds.size > 0) {
    const scores = await batchRecalculateIntentScores(
      Array.from(affectedCompanyIds),
    );
    summary.companiesUpdated = scores.size;
  }

  summary.durationMs = Date.now() - startTime;
  return summary;
}

// ── Exported scoring utilities (for tests and external consumers) ────────────

/**
 * Re-export scoring functions for unit testing and external composition.
 */
export const scoring = {
  scoreJobFreshness,
  scoreRemoteMatch,
  scoreSkillOverlap,
  scoreCompanySizeFit,
  computeHiringConfidence,
};

export const config = {
  HIRING_CONFIDENCE_WEIGHTS,
  DECAY_DAYS,
  INTENT_WEIGHTS,
  SIZE_FIT,
  VELOCITY_CONFIG,
  GROWTH_CONFIG,
  AI_ML_SKILL_TAGS,
  REMOTE_PATTERNS_STRONG,
  REMOTE_PATTERNS_MODERATE,
};
