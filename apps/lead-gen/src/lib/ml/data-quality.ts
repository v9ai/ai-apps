/**
 * Data quality scoring for company records.
 *
 * Produces a composite score from two axes:
 *   - **Completeness** — weighted proportion of populated fields.
 *   - **Freshness** — exponential-decay score for timestamped fields
 *     using a per-field half-life (more volatile data decays faster).
 *
 * The composite blends both: `0.65 * completeness + 0.35 * freshness`.
 */

import type { Company } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataQualityScore {
  /** Weighted proportion of non-empty fields (0-1). */
  completeness: number;
  /** Exponential-decay freshness across timestamped fields (0-1). */
  freshness: number;
  /** Blended quality score: 0.65 * completeness + 0.35 * freshness (0-1). */
  composite: number;
  /** Field names that are null/empty and contribute to incompleteness. */
  missingFields: string[];
  /** Timestamped field names whose age exceeds their half-life. */
  staleFields: string[];
}

// ---------------------------------------------------------------------------
// Weight tables
// ---------------------------------------------------------------------------

/**
 * Importance weight for each company field. Weights sum to 1.0.
 * Higher weight = larger impact on the completeness score when missing.
 */
const FIELD_WEIGHTS: Record<string, number> = {
  name: 0.05,
  website: 0.12,
  description: 0.10,
  linkedin_url: 0.08,
  email: 0.08,
  industry: 0.06,
  size: 0.04,
  location: 0.05,
  canonical_domain: 0.06,
  services: 0.05,
  service_taxonomy: 0.04,
  github_url: 0.03,
  deep_analysis: 0.08,
  ai_classification_reason: 0.04,
  job_board_url: 0.03,
  logo_url: 0.02,
  hf_org_name: 0.02,
  github_org: 0.03,
  industries: 0.02,
};

/**
 * Half-life in days for each timestamped field.
 * After one half-life the freshness contribution drops to 0.5.
 */
const FRESHNESS_HALF_LIFE_DAYS: Record<string, number> = {
  github_analyzed_at: 30,
  intent_score_updated_at: 14,
  updated_at: 60,
  last_seen_capture_timestamp: 90,
};

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/**
 * Parse an ISO-ish timestamp string into epoch-ms, returning null on failure.
 */
function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score a company record on data completeness and freshness.
 *
 * @param company - A full company row (Drizzle `Company` select type).
 * @returns A {@link DataQualityScore} with per-axis and composite scores.
 */
export function scoreDataQuality(company: Company): DataQualityScore {
  const record = company as unknown as Record<string, unknown>;

  // --- Completeness ---
  let weightedPresent = 0;
  const missingFields: string[] = [];

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    if (isPopulated(record[field])) {
      weightedPresent += weight;
    } else {
      missingFields.push(field);
    }
  }

  const totalWeight = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);
  const completeness = Math.min(1, weightedPresent / totalWeight);

  // --- Freshness ---
  const now = Date.now();
  const staleFields: string[] = [];
  let freshnessSum = 0;
  let freshnessCount = 0;

  for (const [field, halfLifeDays] of Object.entries(FRESHNESS_HALF_LIFE_DAYS)) {
    const ts = parseTimestamp(record[field]);
    if (ts === null) {
      // Missing timestamp counts as fully stale
      staleFields.push(field);
      freshnessCount++;
      continue;
    }

    const ageDays = Math.max(0, (now - ts) / MS_PER_DAY);
    // Exponential decay: score = exp(-ln(2) * age / halfLife)
    const decay = Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
    freshnessSum += decay;
    freshnessCount++;

    if (ageDays > halfLifeDays) {
      staleFields.push(field);
    }
  }

  const freshness = freshnessCount > 0 ? freshnessSum / freshnessCount : 0;

  // --- Composite ---
  const composite = 0.65 * completeness + 0.35 * freshness;

  return {
    completeness: Math.round(completeness * 1000) / 1000,
    freshness: Math.round(freshness * 1000) / 1000,
    composite: Math.round(composite * 1000) / 1000,
    missingFields,
    staleFields,
  };
}
