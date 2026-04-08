/**
 * Lead ranking feature extraction from company and contact data.
 *
 * Defines the canonical 42-feature vector used by the lead ranker, and
 * provides extraction functions that map raw DB rows into numeric features.
 * All features are designed to be in [0, 1] or small bounded ranges for
 * stable gradient-based learning.
 */

import type { Company } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Full 42-feature vector for lead ranking.
 *
 * Group A: Company signals (16)
 * Group B: Contact signals (14)
 * Group C: Engagement metrics (8)
 * Group D: Temporal features (4)
 */
export interface LeadFeatureVector {
  // --- Group A: Company signals (0-15) ---
  /** 0: Company ICP score (0-1) */
  companyScore: number;
  /** 1: AI tier (0=none, 0.5=ai_first, 1=ai_native) */
  aiTierNorm: number;
  /** 2: Company size bucket (0-1 normalized) */
  companySizeNorm: number;
  /** 3: Has website (0/1) */
  hasWebsite: number;
  /** 4: Has LinkedIn URL (0/1) */
  hasLinkedin: number;
  /** 5: Has job board (0/1) */
  hasJobBoard: number;
  /** 6: Number of services (log-scaled) */
  serviceCount: number;
  /** 7: Number of tags (log-scaled) */
  tagCount: number;
  /** 8: Intent score (0-1 from 0-100) */
  intentScoreNorm: number;
  /** 9: Number of intent signals (log-scaled) */
  intentSignalCount: number;
  /** 10: GitHub AI score (0-1) */
  githubAiScore: number;
  /** 11: GitHub hiring score (0-1) */
  githubHiringScore: number;
  /** 12: GitHub activity score (0-1) */
  githubActivityScore: number;
  /** 13: HuggingFace presence (0-1 from 0-100) */
  hfPresenceNorm: number;
  /** 14: Has deep analysis (0/1) */
  hasDeepAnalysis: number;
  /** 15: AI classification confidence (0-1) */
  aiClassificationConfidence: number;

  // --- Group B: Contact signals (16-29) ---
  /** 16: Authority score (0-1) */
  authorityScore: number;
  /** 17: Is decision maker (0/1) */
  isDecisionMaker: number;
  /** 18: Email verified (0/1) */
  emailVerified: number;
  /** 19: Has LinkedIn URL (0/1) */
  contactHasLinkedin: number;
  /** 20: Has GitHub handle (0/1) */
  contactHasGithub: number;
  /** 21: Has Telegram (0/1) */
  contactHasTelegram: number;
  /** 22: Seniority level (0-1 ordinal) */
  seniorityNorm: number;
  /** 23: Number of known emails (log-scaled) */
  emailCount: number;
  /** 24: Has AI profile (0/1) */
  hasAiProfile: number;
  /** 25: Do-not-contact flag (0/1) */
  doNotContact: number;
  /** 26: Deletion score (0-1) */
  deletionScore: number;
  /** 27: Next touch score (0-1) */
  nextTouchScore: number;
  /** 28: Number of DM reasons (log-scaled) */
  dmReasonCount: number;
  /** 29: Has bounced emails (0/1) */
  hasBouncedEmails: number;

  // --- Group C: Engagement metrics (30-37) ---
  /** 30: Total emails sent (log-scaled) */
  totalEmailsSent: number;
  /** 31: Open rate (0-1) */
  openRate: number;
  /** 32: Reply rate (0-1) */
  replyRate: number;
  /** 33: Click rate (0-1) */
  clickRate: number;
  /** 34: Bounce rate (0-1) */
  bounceRate: number;
  /** 35: Lead temperature (0-1) */
  leadTemperature: number;
  /** 36: Sequence progress (0-1) */
  sequenceProgress: number;
  /** 37: Campaign count (log-scaled) */
  campaignCount: number;

  // --- Group D: Temporal features (38-41) ---
  /** 38: Days since last contact (log-scaled, inverted) */
  recency: number;
  /** 39: Days since company creation (log-scaled) */
  companyAge: number;
  /** 40: Hour-of-day sin component */
  hourSin: number;
  /** 41: Hour-of-day cos component */
  hourCos: number;
}

/** All feature names in order, for serialization and debugging. */
export const FEATURE_NAMES: (keyof LeadFeatureVector)[] = [
  "companyScore", "aiTierNorm", "companySizeNorm", "hasWebsite",
  "hasLinkedin", "hasJobBoard", "serviceCount", "tagCount",
  "intentScoreNorm", "intentSignalCount", "githubAiScore", "githubHiringScore",
  "githubActivityScore", "hfPresenceNorm", "hasDeepAnalysis", "aiClassificationConfidence",
  "authorityScore", "isDecisionMaker", "emailVerified", "contactHasLinkedin",
  "contactHasGithub", "contactHasTelegram", "seniorityNorm", "emailCount",
  "hasAiProfile", "doNotContact", "deletionScore", "nextTouchScore",
  "dmReasonCount", "hasBouncedEmails", "totalEmailsSent", "openRate",
  "replyRate", "clickRate", "bounceRate", "leadTemperature",
  "sequenceProgress", "campaignCount", "recency", "companyAge",
  "hourSin", "hourCos",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a JSON string that should be an array, returning [] on failure. */
export function parseJsonArray(json: string | null | undefined): unknown[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Clamp a value to [0, 1]. */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Log-scale normalization: log(1 + x) / log(1 + max). */
export function logScale(x: number, max: number): number {
  if (max <= 0) return 0;
  return Math.log(1 + Math.abs(x)) / Math.log(1 + max);
}

// ---------------------------------------------------------------------------
// Size bucket mapping
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<string, number> = {
  "1-10": 0.1,
  "11-50": 0.2,
  "51-200": 0.35,
  "201-500": 0.5,
  "501-1000": 0.65,
  "1001-5000": 0.8,
  "5001-10000": 0.9,
  "10001+": 1.0,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract the 16 company-level features from a Company row.
 *
 * Returns a partial LeadFeatureVector with only company features populated.
 * Missing fields default to 0 for safe numeric handling.
 */
export function extractCompanyFeatures(
  company: Company,
): Partial<LeadFeatureVector> {
  const services = parseJsonArray(company.services);
  const tags = parseJsonArray(company.tags);

  return {
    companyScore: clamp01(company.score ?? 0.5),
    aiTierNorm: clamp01((company.ai_tier ?? 0) / 2),
    companySizeNorm: SIZE_MAP[company.size ?? ""] ?? 0.3,
    hasWebsite: company.website ? 1 : 0,
    hasLinkedin: company.linkedin_url ? 1 : 0,
    hasJobBoard: company.job_board_url ? 1 : 0,
    serviceCount: logScale(services.length, 20),
    tagCount: logScale(tags.length, 15),
    intentScoreNorm: clamp01((company.intent_score ?? 0) / 100),
    intentSignalCount: logScale(company.intent_signals_count ?? 0, 50),
    githubAiScore: clamp01(company.github_ai_score ?? 0),
    githubHiringScore: clamp01(company.github_hiring_score ?? 0),
    githubActivityScore: clamp01(company.github_activity_score ?? 0),
    hfPresenceNorm: clamp01((company.hf_presence_score ?? 0) / 100),
    hasDeepAnalysis: company.deep_analysis ? 1 : 0,
    aiClassificationConfidence: clamp01(
      company.ai_classification_confidence ?? 0.5,
    ),
  };
}

/**
 * Convert a LeadFeatureVector into a flat number[] in canonical order.
 * Missing features default to 0.
 */
export function vectorToArray(vec: Partial<LeadFeatureVector>): number[] {
  return FEATURE_NAMES.map((name) => (vec[name] as number) ?? 0);
}
