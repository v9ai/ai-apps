/**
 * Opportunity golden-dataset feature extraction.
 *
 * Extracts a 7-feature vector from each opportunity row for evaluation
 * and JSONL export. Compatible with the Rust eval pipeline's
 * `eval_labels.jsonl` format.
 */

import { clamp01 } from "./feature-vector";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OpportunityEvalRow {
  id: string;
  score: number | null;
  source: string | null;
  tags: string | null;
  reward_usd: number | null;
  company_id: number | null;
  contact_id: number | null;
  first_seen: string | null;
  created_at: string;
}

export interface SourceBreakdown {
  source: string;
  total: number;
  positive: number;
  negative: number;
  precision: number;
  avgScore: number;
}

export interface OpportunityEvalReport {
  scoring: import("./eval-metrics").ScoringEval;
  sourceBreakdown: SourceBreakdown[];
  goldenCount: number;
  excludedCount: number;
  nullScoreCount: number;
  timestamp: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SOURCE_SIGNAL: Record<string, number> = {
  referral: 1.0,
  linkedin: 0.7,
  website: 0.5,
};
const SOURCE_DEFAULT = 0.3;

/** Tags that carry operational meaning, not skill signal. */
const META_TAGS = new Set(["excluded", "priority", "applied", "remote", "referral"]);

/** Recency decay constant (matches Rust LogisticScorer::smooth_recency). */
const RECENCY_DECAY = 0.015;

// ── Feature extraction ───────────────────────────────────────────────────────

/**
 * Extract the 7-feature vector from an opportunity row.
 *
 * | Idx | Feature        | Range |
 * |-----|----------------|-------|
 * |  0  | score_norm     | 0-1   |
 * |  1  | has_company    | 0/1   |
 * |  2  | has_contact    | 0/1   |
 * |  3  | has_reward     | 0/1   |
 * |  4  | source_signal  | 0-1   |
 * |  5  | tag_richness   | 0-1   |
 * |  6  | recency_smooth | 0-1   |
 */
export function extractOpportunityFeatures(opp: OpportunityEvalRow): number[] {
  const tags = parseTags(opp.tags);

  // 0: score normalized to [0,1], default 0.5 if null
  const scoreNorm = opp.score != null ? clamp01(opp.score / 100) : 0.5;

  // 1-3: binary presence features
  const hasCompany = opp.company_id != null ? 1.0 : 0.0;
  const hasContact = opp.contact_id != null ? 1.0 : 0.0;
  const hasReward = opp.reward_usd != null && opp.reward_usd > 0 ? 1.0 : 0.0;

  // 4: source quality signal
  const sourceSignal = opp.source
    ? (SOURCE_SIGNAL[opp.source.toLowerCase()] ?? SOURCE_DEFAULT)
    : SOURCE_DEFAULT;

  // 5: tag richness (non-meta tags only, capped at 5)
  const skillTags = tags.filter((t) => !META_TAGS.has(t));
  const tagRichness = clamp01(skillTags.length / 5);

  // 6: recency smooth decay from first_seen or created_at
  const refDate = opp.first_seen ?? opp.created_at;
  const daysOld = Math.max(0, (Date.now() - new Date(refDate).getTime()) / 86_400_000);
  const recencySmooth = Math.exp(-RECENCY_DECAY * daysOld);

  return [scoreNorm, hasCompany, hasContact, hasReward, sourceSignal, tagRichness, recencySmooth];
}

// ── Label derivation ─────────────────────────────────────────────────────────

/** Derive binary label from tags: excluded = 0.0, otherwise = 1.0. */
export function labelFromTags(tags: string | null): number {
  return parseTags(tags).includes("excluded") ? 0.0 : 1.0;
}

// ── JSONL formatting ─────────────────────────────────────────────────────────

/** Format a single labeled sample as a JSONL line. */
export function formatAsJsonl(features: number[], label: number): string {
  return JSON.stringify({ features, label });
}

// ── Source breakdown ─────────────────────────────────────────────────────────

/** Compute per-source aggregation stats. */
export function computeSourceBreakdown(opps: OpportunityEvalRow[]): SourceBreakdown[] {
  const map = new Map<string, { total: number; positive: number; negative: number; scoreSum: number }>();

  for (const opp of opps) {
    const src = opp.source?.toLowerCase() ?? "unknown";
    const label = labelFromTags(opp.tags);
    const entry = map.get(src) ?? { total: 0, positive: 0, negative: 0, scoreSum: 0 };

    entry.total++;
    if (label === 1.0) entry.positive++;
    else entry.negative++;
    entry.scoreSum += opp.score ?? 0;

    map.set(src, entry);
  }

  return Array.from(map.entries())
    .map(([source, s]) => ({
      source,
      total: s.total,
      positive: s.positive,
      negative: s.negative,
      precision: s.total > 0 ? s.positive / s.total : 0,
      avgScore: s.total > 0 ? Math.round(s.scoreSum / s.total) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
