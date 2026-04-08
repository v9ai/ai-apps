/**
 * Quality gate for company records.
 *
 * Evaluates multiple risk signals (anomaly score, data completeness,
 * freshness, bounce risk, duplicate cluster membership) and produces
 * a pass/fail verdict with flags, an adjusted lead score, and
 * human-readable recommendations.
 *
 * Each flag carries a fixed penalty subtracted from a base score of 1.0.
 * The gate passes when the adjusted score stays above the threshold (0.40).
 */

import type { Company } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QualityFlag =
  | "anomalous_record"
  | "suspected_duplicate"
  | "incomplete_data"
  | "stale_data"
  | "high_bounce_risk"
  | "disposable_domain"
  | "no_reachability";

export interface QualityGateResult {
  /** Whether the company passes the quality gate. */
  pass: boolean;
  /** Active quality flags for this record. */
  flags: QualityFlag[];
  /** Score after penalties (0-1). */
  adjustedScore: number;
  /** Human-readable next-step recommendations. */
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Penalty subtracted from the base score (1.0) for each active flag. */
const FLAG_PENALTIES: Record<QualityFlag, number> = {
  anomalous_record: 0.30,
  suspected_duplicate: 0.15,
  incomplete_data: 0.10,
  stale_data: 0.10,
  high_bounce_risk: 0.20,
  disposable_domain: 0.25,
  no_reachability: 0.20,
};

/** Gate passes when adjusted score is at or above this threshold. */
const PASS_THRESHOLD = 0.40;

/** Anomaly z-score above which a record is flagged as anomalous. */
const ANOMALY_THRESHOLD = 2.0;

/** Completeness below this triggers the incomplete_data flag. */
const COMPLETENESS_THRESHOLD = 0.50;

/** Freshness below this triggers the stale_data flag. */
const FRESHNESS_THRESHOLD = 0.30;

/** Bounce risk above this triggers the high_bounce_risk flag. */
const BOUNCE_RISK_THRESHOLD = 0.50;

/**
 * Well-known disposable/temporary email domain suffixes.
 * Checked against the company's canonical_domain or website.
 */
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "trashmail.com",
  "10minutemail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "mailnesia.com",
  "maildrop.cc",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractDomain(company: Company): string | null {
  const raw = company.canonical_domain ?? company.website ?? null;
  if (!raw) return null;
  try {
    const hostname = raw.includes("://") ? new URL(raw).hostname : raw;
    return hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function hasReachability(company: Company): boolean {
  return !!(company.email || company.linkedin_url || company.job_board_url);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a company record against the quality gate.
 *
 * @param company         The company row to evaluate.
 * @param anomalyScore    Z-score from anomaly detection (higher = more anomalous).
 * @param dataQuality     Pre-computed completeness and freshness scores (0-1 each).
 * @param bounceRisk      Predicted email bounce probability (0-1).
 * @param duplicateCluster Whether this company belongs to a suspected duplicate cluster.
 * @returns A {@link QualityGateResult} with pass/fail, flags, adjusted score, and recommendations.
 */
export function evaluateQualityGate(
  company: Company,
  anomalyScore: number,
  dataQuality: { completeness: number; freshness: number },
  bounceRisk: number,
  duplicateCluster: boolean,
): QualityGateResult {
  const flags: QualityFlag[] = [];
  const recommendations: string[] = [];

  // --- Flag detection ---

  if (anomalyScore > ANOMALY_THRESHOLD) {
    flags.push("anomalous_record");
    recommendations.push(
      `Anomaly z-score ${anomalyScore.toFixed(2)} exceeds threshold — review record for data corruption or bot-generated content.`,
    );
  }

  if (duplicateCluster) {
    flags.push("suspected_duplicate");
    recommendations.push(
      "Record belongs to a duplicate cluster — merge or deduplicate before outreach.",
    );
  }

  if (dataQuality.completeness < COMPLETENESS_THRESHOLD) {
    flags.push("incomplete_data");
    recommendations.push(
      `Completeness ${(dataQuality.completeness * 100).toFixed(0)}% is below ${COMPLETENESS_THRESHOLD * 100}% — run enrichment pipeline.`,
    );
  }

  if (dataQuality.freshness < FRESHNESS_THRESHOLD) {
    flags.push("stale_data");
    recommendations.push(
      `Freshness ${(dataQuality.freshness * 100).toFixed(0)}% is below ${FRESHNESS_THRESHOLD * 100}% — re-crawl or re-enrich.`,
    );
  }

  if (bounceRisk > BOUNCE_RISK_THRESHOLD) {
    flags.push("high_bounce_risk");
    recommendations.push(
      `Bounce risk ${(bounceRisk * 100).toFixed(0)}% — verify email address before sending.`,
    );
  }

  const domain = extractDomain(company);
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    flags.push("disposable_domain");
    recommendations.push(
      `Domain "${domain}" is a known disposable email provider — do not use for outreach.`,
    );
  }

  if (!hasReachability(company)) {
    flags.push("no_reachability");
    recommendations.push(
      "No email, LinkedIn, or job board URL — run contact discovery before outreach.",
    );
  }

  // --- Adjusted score ---

  let adjustedScore = 1.0;
  for (const flag of flags) {
    adjustedScore -= FLAG_PENALTIES[flag];
  }
  adjustedScore = Math.max(0, Math.min(1, adjustedScore));
  adjustedScore = Math.round(adjustedScore * 1000) / 1000;

  return {
    pass: adjustedScore >= PASS_THRESHOLD,
    flags,
    adjustedScore,
    recommendations,
  };
}
