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

// ── Feature key ordering (stable, used by typed-array paths) ────────────
const CONTACT_FEATURE_KEYS: (keyof ContactRankFeatures)[] = Object.keys(WEIGHTS) as (keyof ContactRankFeatures)[];
const NUM_CONTACT_FEATURES = CONTACT_FEATURE_KEYS.length;

// ── INT8 quantized weights ──────────────────────────────────────────────
// Scale: max(|w|) maps to 127. Dequantize: float_w ≈ int8_w * CONTACT_WEIGHT_SCALE
const _contactAbsMax = Math.max(...CONTACT_FEATURE_KEYS.map((k) => Math.abs(WEIGHTS[k])));
export const CONTACT_WEIGHT_SCALE = _contactAbsMax / 127;
export const CONTACT_WEIGHTS_INT8 = new Int8Array(
  CONTACT_FEATURE_KEYS.map((k) => Math.round(WEIGHTS[k] / CONTACT_WEIGHT_SCALE)),
);
// Pre-compute float32 weight vector for batch path
const CONTACT_WEIGHTS_F32 = new Float32Array(CONTACT_FEATURE_KEYS.map((k) => WEIGHTS[k]));

// ── Sigmoid LUT for fast batch scoring ─────────────────────────────────
// Optimization: 1024-entry Float64Array LUT avoids Math.exp() per contact
// in batch scoring paths. Range [-8, 8] covers typical logit outputs for
// 12-feature contact scoring. Pre-computed inverse range eliminates division.
const SIGMOID_LUT_SIZE = 1024;
const SIGMOID_LUT_MIN = -8;
const SIGMOID_LUT_MAX = 8;
const SIGMOID_LUT_RANGE = SIGMOID_LUT_MAX - SIGMOID_LUT_MIN;
const SIGMOID_LUT_INV_RANGE = (SIGMOID_LUT_SIZE - 1) / SIGMOID_LUT_RANGE;
const SIGMOID_LUT = new Float64Array(SIGMOID_LUT_SIZE);
for (let _i = 0; _i < SIGMOID_LUT_SIZE; _i++) {
  const _x = SIGMOID_LUT_MIN + (_i / (SIGMOID_LUT_SIZE - 1)) * SIGMOID_LUT_RANGE;
  SIGMOID_LUT[_i] = 1 / (1 + Math.exp(-_x));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Fast sigmoid via LUT with linear interpolation for batch paths. */
function sigmoidFast(x: number): number {
  if (x <= SIGMOID_LUT_MIN) return 0;
  if (x >= SIGMOID_LUT_MAX) return 1;
  const t = (x - SIGMOID_LUT_MIN) * SIGMOID_LUT_INV_RANGE;
  const idx = t | 0;
  const frac = t - idx;
  return SIGMOID_LUT[idx]! + frac * (SIGMOID_LUT[idx + 1]! - SIGMOID_LUT[idx]!);
}

/**
 * Score a single contact for outreach priority.
 *
 * Optimization: uses indexed CONTACT_WEIGHTS_F32 instead of Record property
 * lookup per feature, reducing dynamic dispatch overhead.
 *
 * @returns A score between 0 and 1 (higher = better outreach target).
 */
export function scoreContact(features: ContactRankFeatures): number {
  let logit = BIAS;
  for (let i = 0; i < NUM_CONTACT_FEATURES; i++) {
    logit += CONTACT_WEIGHTS_F32[i]! * features[CONTACT_FEATURE_KEYS[i]!];
  }
  return Math.round(sigmoid(logit) * 1000) / 1000;
}

/**
 * Score a single contact using INT8 quantized weights.
 *
 * @param features - Float32Array of length NUM_CONTACT_FEATURES (same order as CONTACT_FEATURE_KEYS)
 * @returns score (0..1) via sigmoid
 */
export function scoreContactQuantized(features: Float32Array): number {
  let fMax = 0;
  for (let i = 0; i < NUM_CONTACT_FEATURES; i++) {
    const a = Math.abs(features[i]!);
    if (a > fMax) fMax = a;
  }
  const featureScale = fMax > 0 ? fMax / 127 : 1;

  let acc = 0;
  for (let i = 0; i < NUM_CONTACT_FEATURES; i++) {
    const qi = Math.round(features[i]! / featureScale);
    acc += CONTACT_WEIGHTS_INT8[i]! * qi;
  }

  const logit = acc * CONTACT_WEIGHT_SCALE * featureScale + BIAS;
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
      for (const key of CONTACT_FEATURE_KEYS) {
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

// ── Batch scoring ───────────────────────────────────────────────────────

/**
 * Batch-score contacts using typed arrays for cache-friendly memory access.
 *
 * Extracts all contact features into a contiguous Float32Array matrix,
 * then performs batch matrix-vector multiplication with sigmoid activation.
 *
 * @param contacts - Array of ContactRankFeatures objects
 * @returns Float32Array of scores (same order as input), values in (0..1)
 */
export function rankContactsBatch(contacts: ContactRankFeatures[]): Float32Array {
  const batchSize = contacts.length;
  if (batchSize === 0) return new Float32Array(0);

  // Build contiguous feature matrix: batchSize x NUM_CONTACT_FEATURES
  const matrix = new Float32Array(batchSize * NUM_CONTACT_FEATURES);
  for (let row = 0; row < batchSize; row++) {
    const f = contacts[row]!;
    const offset = row * NUM_CONTACT_FEATURES;
    for (let j = 0; j < NUM_CONTACT_FEATURES; j++) {
      matrix[offset + j] = f[CONTACT_FEATURE_KEYS[j]!];
    }
  }

  // Batch dot product: scores[i] = sigmoid(matrix[i] . WEIGHTS + BIAS)
  const scores = new Float32Array(batchSize);
  for (let row = 0; row < batchSize; row++) {
    const offset = row * NUM_CONTACT_FEATURES;
    let logit = BIAS;
    for (let j = 0; j < NUM_CONTACT_FEATURES; j++) {
      logit += matrix[offset + j]! * CONTACT_WEIGHTS_F32[j]!;
    }
    scores[row] = Math.round(sigmoid(logit) * 1000) / 1000;
  }

  return scores;
}
