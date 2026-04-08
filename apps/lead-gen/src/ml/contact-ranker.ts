/**
 * BPR-logistic contact ranker for prioritising contacts within a company.
 *
 * Scores contacts by 12 features and ranks them for outreach priority.
 * Uses a logistic-style weighted sum with hand-tuned domain weights.
 */

export interface ContactRankFeatures {
  /** Authority score from classifyContactML (0..1) */
  authorityScore: number;
  /** Is this contact a decision-maker? (0 or 1) */
  isDecisionMaker: number;
  /** Does the contact have a verified email? (0 or 1) */
  hasVerifiedEmail: number;
  /** Number of known email addresses */
  emailCount: number;
  /** Has a LinkedIn URL? (0 or 1) */
  hasLinkedin: number;
  /** Has a GitHub handle? (0 or 1) */
  hasGithub: number;
  /** Department relevance for AI outreach (0..1) */
  departmentRelevance: number;
  /** Number of prior emails sent to this contact */
  emailsSent: number;
  /** Days since last contact (0 = never contacted, higher = staler) */
  daysSinceLastContact: number;
  /** Has the contact replied before? (0 or 1) */
  hasReplied: number;
  /** Is flagged do-not-contact? (0 or 1) */
  doNotContact: number;
  /** Next touch score from prior ML scoring */
  nextTouchScore: number;
}

// ── Hand-tuned weights ───────────────────────────────────────────────────

const WEIGHTS: Record<keyof ContactRankFeatures, number> = {
  authorityScore: 0.25,
  isDecisionMaker: 0.15,
  hasVerifiedEmail: 0.12,
  emailCount: 0.03,
  hasLinkedin: 0.04,
  hasGithub: 0.03,
  departmentRelevance: 0.10,
  emailsSent: -0.05,        // penalise over-contacted
  daysSinceLastContact: 0.02, // slightly prefer contacts not recently touched
  hasReplied: 0.08,
  doNotContact: -1.0,       // hard penalty
  nextTouchScore: 0.10,
};

const BIAS = 0.05;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Score a single contact for outreach priority.
 *
 * @returns A score between 0 and 1 (higher = better outreach target).
 */
export function scoreContact(features: ContactRankFeatures): number {
  let logit = BIAS;
  for (const key of Object.keys(WEIGHTS) as (keyof ContactRankFeatures)[]) {
    logit += WEIGHTS[key] * features[key];
  }
  return Math.round(sigmoid(logit) * 1000) / 1000;
}

/**
 * Rank a list of contacts by their computed outreach score.
 *
 * @returns Sorted array (descending score) with reasons for top features.
 */
export function rankContacts(
  contacts: { id: number; features: ContactRankFeatures }[],
): { id: number; score: number; reasons: string[] }[] {
  return contacts
    .map(({ id, features }) => {
      const score = scoreContact(features);

      // Build reasons from top contributing features
      const contributions: { name: string; value: number }[] = [];
      for (const key of Object.keys(WEIGHTS) as (keyof ContactRankFeatures)[]) {
        const c = WEIGHTS[key] * features[key];
        if (Math.abs(c) >= 0.02) {
          contributions.push({ name: key, value: c });
        }
      }
      contributions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      const reasons = contributions.slice(0, 4).map((c) => {
        const dir = c.value > 0 ? "+" : "";
        return `${c.name}: ${dir}${c.value.toFixed(3)}`;
      });

      return { id, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
