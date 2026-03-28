import { z } from "zod";

// ---------------------------------------------------------------------------
// Thresholds — tune these to tighten/loosen quality gates
// ---------------------------------------------------------------------------

export const DEFAULT_THRESHOLDS = {
  discovery: {
    minCompanies: 20,
    minWithWebsite: 0.8, // 80% should have a website
    minWithDescription: 0.6,
    maxStaleAgeDays: 30, // companies not updated in 30d are stale
  },
  enrichment: {
    minCategoryKnown: 0.7, // 70% should not be UNKNOWN
    minAiClassified: 0.5, // 50% should have ai_tier > 0
    minAvgConfidence: 0.6, // avg ai_classification_confidence
    minWithServices: 0.4,
  },
  contacts: {
    minPerCompany: 1, // at least 1 contact per enriched company
    minEmailVerified: 0.5, // 50% should have verified email
    minWithPosition: 0.7,
    maxBounceRate: 0.15, // hard-fail if > 15%
  },
  outreach: {
    minDeliveryRate: 0.85,
    minOpenRate: 0.15,
    minReplyRate: 0.03,
    maxErrorRate: 0.10,
  },
} as const;

export type Thresholds = typeof DEFAULT_THRESHOLDS;

// ---------------------------------------------------------------------------
// Check results
// ---------------------------------------------------------------------------

export const severitySchema = z.enum(["OK", "WARNING", "CRITICAL"]);
export type Severity = z.infer<typeof severitySchema>;

export interface StageCheck {
  name: string;
  score: number; // 0..1
  severity: Severity;
  metric: number; // raw measured value
  threshold: number; // expected minimum/maximum
  detail: string;
}

export interface StageResult {
  stage: "discovery" | "enrichment" | "contacts" | "outreach";
  score: number; // 0..1 composite
  severity: Severity;
  checks: StageCheck[];
  counts: Record<string, number>; // raw counts for debugging
}

export interface PipelineCheckResult {
  timestamp: string;
  compositeScore: number; // 0..1 weighted across stages
  severity: Severity;
  stages: StageResult[];
  improvements: Improvement[];
}

// ---------------------------------------------------------------------------
// Improvements
// ---------------------------------------------------------------------------

export const improvementPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type ImprovementPriority = z.infer<typeof improvementPrioritySchema>;

export const improvementActionSchema = z.enum([
  "RE_ENRICH", // re-run enrichment on low-confidence companies
  "RE_VERIFY", // re-verify contacts with stale/missing verification
  "FLAG_STALE", // mark stale companies for review
  "FILL_GAPS", // fill missing fields (website, description, services)
  "DEDUP", // deduplicate companies/contacts
  "EXPAND_CONTACTS", // find more contacts for companies with 0
  "BOOST_OUTREACH", // re-draft low-scoring emails
  "PAUSE_DOMAIN", // pause outreach to high-bounce domains
]);
export type ImprovementAction = z.infer<typeof improvementActionSchema>;

export interface Improvement {
  action: ImprovementAction;
  priority: ImprovementPriority;
  stage: StageResult["stage"];
  description: string;
  affectedCount: number; // how many rows would be affected
  expectedLift: number; // estimated score improvement 0..1
  /** IDs of rows to act on (company_id or contact_id) */
  targetIds: number[];
}

// ---------------------------------------------------------------------------
// Applier result
// ---------------------------------------------------------------------------

export interface ApplyResult {
  action: ImprovementAction;
  applied: number;
  skipped: number;
  errors: string[];
}
