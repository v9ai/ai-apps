/**
 * 20-feature logistic regression for email bounce prediction.
 *
 * A lightweight, interpretable model that scores the probability an email
 * will bounce based on domain reputation, mailbox signals, and historical
 * delivery patterns. No external dependencies — pure sigmoid computation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BouncePredictorWeights {
  /** 20-element weight vector */
  weights: number[];
  /** Intercept / bias term */
  bias: number;
}

export type BounceRisk = "low" | "medium" | "high";

export interface BouncePrediction {
  /** Bounce probability (0-1) */
  probability: number;
  /** Risk category */
  risk: BounceRisk;
}

// ---------------------------------------------------------------------------
// Feature names (documentation / debugging)
// ---------------------------------------------------------------------------

/**
 * 20 features for bounce prediction, in order:
 *
 *  0: has_mx_record           (0/1)
 *  1: domain_age_years        (0+)
 *  2: is_free_provider        (0/1) — gmail, yahoo, hotmail, etc.
 *  3: is_disposable           (0/1) — tempmail, guerrillamail, etc.
 *  4: is_role_account         (0/1) — info@, admin@, support@
 *  5: is_catchall             (0/1)
 *  6: has_dmarc               (0/1)
 *  7: has_spf                 (0/1)
 *  8: domain_bounce_rate      (0-1) — historical bounce rate for this domain
 *  9: mailbox_exists_score    (0-1) — SMTP verification score
 * 10: email_length            (normalized 0-1)
 * 11: has_plus_alias          (0/1) — user+tag@domain
 * 12: local_part_entropy      (0-1) — randomness of local part
 * 13: domain_tld_risk         (0-1) — TLD risk score
 * 14: previous_bounces        (0+) — count of prior bounces to this address
 * 15: previous_deliveries     (0+) — count of prior successful deliveries
 * 16: days_since_last_valid   (0+) — days since last successful delivery
 * 17: provider_reputation     (0-1)
 * 18: list_unsubscribe_seen   (0/1) — has this address ever unsubscribed
 * 19: contact_engagement_rate (0-1) — overall engagement with this contact
 */
export const BOUNCE_FEATURE_NAMES = [
  "has_mx_record",
  "domain_age_years",
  "is_free_provider",
  "is_disposable",
  "is_role_account",
  "is_catchall",
  "has_dmarc",
  "has_spf",
  "domain_bounce_rate",
  "mailbox_exists_score",
  "email_length",
  "has_plus_alias",
  "local_part_entropy",
  "domain_tld_risk",
  "previous_bounces",
  "previous_deliveries",
  "days_since_last_valid",
  "provider_reputation",
  "list_unsubscribe_seen",
  "contact_engagement_rate",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Numerically stable sigmoid function. */
function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

// ── Sigmoid LUT for fast batch scoring ─────────────────────────────────
// Optimization: 1024-entry Float64Array LUT avoids Math.exp() per email
// in batch scoring. Range [-10, 10] covers bounce prediction logit range
// (max weight magnitude ~3.0 x 20 features). Pre-computed at module load.
const SIGMOID_LUT_SIZE = 1024;
const SIGMOID_LUT_MIN = -10;
const SIGMOID_LUT_MAX = 10;
const SIGMOID_LUT_RANGE = SIGMOID_LUT_MAX - SIGMOID_LUT_MIN;
const SIGMOID_LUT_INV_RANGE = (SIGMOID_LUT_SIZE - 1) / SIGMOID_LUT_RANGE;
const SIGMOID_LUT = new Float64Array(SIGMOID_LUT_SIZE);
for (let _i = 0; _i < SIGMOID_LUT_SIZE; _i++) {
  const _x = SIGMOID_LUT_MIN + (_i / (SIGMOID_LUT_SIZE - 1)) * SIGMOID_LUT_RANGE;
  SIGMOID_LUT[_i] = 1 / (1 + Math.exp(-_x));
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

/** Number of bounce prediction features. */
const NUM_BOUNCE_FEATURES = 20;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create default (hand-tuned) bounce predictor weights.
 *
 * Positive weights increase bounce probability; negative weights decrease it.
 * Magnitudes reflect feature importance from domain knowledge.
 */
export function createDefaultBounceWeights(): BouncePredictorWeights {
  return {
    weights: [
      -1.8, //  0: has_mx_record          — MX present → less likely to bounce
      -0.3, //  1: domain_age_years       — older domain → more stable
      -0.4, //  2: is_free_provider       — gmail/yahoo → less bounce
      2.5, //  3: is_disposable          — tempmail → high bounce
      0.8, //  4: is_role_account        — info@/admin@ → moderate bounce risk
      0.3, //  5: is_catchall            — catchall can mask invalids
      -0.5, //  6: has_dmarc              — DMARC → reputable domain
      -0.4, //  7: has_spf                — SPF → reputable domain
      3.0, //  8: domain_bounce_rate     — strong historical signal
      -2.2, //  9: mailbox_exists_score   — SMTP verified → safe
      0.2, // 10: email_length           — very long emails slightly riskier
      0.6, // 11: has_plus_alias         — plus aliases sometimes fail
      0.4, // 12: local_part_entropy     — random-looking local part
      1.2, // 13: domain_tld_risk        — .xyz, .info, .tk → risky
      1.5, // 14: previous_bounces       — past bounces → future bounces
      -0.8, // 15: previous_deliveries    — past success → lower risk
      0.1, // 16: days_since_last_valid  — stale address → slight risk
      -1.0, // 17: provider_reputation    — reputable provider → safe
      0.3, // 18: list_unsubscribe_seen  — mild signal
      -0.6, // 19: contact_engagement_rate— engaged contact → valid address
    ],
    bias: -0.5, // slight prior toward "not bounce"
  };
}

/**
 * Predict the bounce probability for a single email address.
 *
 * Optimization: 4-way unrolled dot product for the 20-feature vector
 * (20 / 4 = 5 full iterations, 0 remainder).
 *
 * @param features 20-element numeric feature vector (see BOUNCE_FEATURE_NAMES).
 * @param weights  Model weights (use createDefaultBounceWeights for baseline).
 */
export function predictBounce(
  features: number[],
  weights: BouncePredictorWeights,
): BouncePrediction {
  let z = weights.bias;
  const n = Math.min(features.length, weights.weights.length);
  const w = weights.weights;

  // 4-way unrolled dot product
  let i = 0;
  for (; i + 3 < n; i += 4) {
    z +=
      w[i] * features[i] +
      w[i + 1] * features[i + 1] +
      w[i + 2] * features[i + 2] +
      w[i + 3] * features[i + 3];
  }
  for (; i < n; i++) {
    z += w[i] * features[i];
  }

  const probability = sigmoid(z);

  const risk: BounceRisk = probability < 0.15 ? "low"
    : probability < 0.5 ? "medium"
    : "high";

  return { probability, risk };
}

// ---------------------------------------------------------------------------
// Batch scoring
// ---------------------------------------------------------------------------

/**
 * Batch predict bounce probability for multiple email addresses.
 *
 * Packs all features into a contiguous Float64Array and uses the sigmoid
 * LUT for fast activation. Returns a Float64Array of probabilities and a
 * parallel array of risk categories.
 *
 * Optimizations:
 * - Contiguous Float64Array matrix for cache-friendly memory access
 * - 4-way unrolled dot product (20 features = 5 full iterations)
 * - Pre-packed Float64Array weights avoids repeated number[] indexing
 * - Sigmoid LUT instead of Math.exp() per email
 * - Pre-allocated output arrays
 *
 * @param featureBatch Array of 20-element feature vectors.
 * @param weights Model weights.
 * @returns { probabilities, risks } parallel arrays.
 */
export function predictBounceBatch(
  featureBatch: number[][],
  weights: BouncePredictorWeights,
): { probabilities: Float64Array; risks: BounceRisk[] } {
  const batchSize = featureBatch.length;
  if (batchSize === 0) {
    return { probabilities: new Float64Array(0), risks: [] };
  }

  // Pack weights into Float64Array once
  const wLen = Math.min(weights.weights.length, NUM_BOUNCE_FEATURES);
  const w = new Float64Array(NUM_BOUNCE_FEATURES);
  for (let i = 0; i < wLen; i++) {
    w[i] = weights.weights[i];
  }
  const bias = weights.bias;

  // Pack features into contiguous Float64Array (row-major)
  const matrix = new Float64Array(batchSize * NUM_BOUNCE_FEATURES);
  for (let row = 0; row < batchSize; row++) {
    const src = featureBatch[row];
    const base = row * NUM_BOUNCE_FEATURES;
    const srcLen = Math.min(src.length, NUM_BOUNCE_FEATURES);
    for (let j = 0; j < srcLen; j++) {
      matrix[base + j] = src[j];
    }
    // Remaining features stay 0 (Float64Array is zero-initialized)
  }

  // Batch dot product with sigmoid LUT
  const probabilities = new Float64Array(batchSize);
  const risks: BounceRisk[] = new Array(batchSize);

  for (let row = 0; row < batchSize; row++) {
    const base = row * NUM_BOUNCE_FEATURES;
    let z = bias;

    // 4-way unrolled dot product
    let j = 0;
    for (; j + 3 < NUM_BOUNCE_FEATURES; j += 4) {
      z +=
        w[j] * matrix[base + j] +
        w[j + 1] * matrix[base + j + 1] +
        w[j + 2] * matrix[base + j + 2] +
        w[j + 3] * matrix[base + j + 3];
    }
    for (; j < NUM_BOUNCE_FEATURES; j++) {
      z += w[j] * matrix[base + j];
    }

    const prob = sigmoidFast(z);
    probabilities[row] = prob;
    risks[row] = prob < 0.15 ? "low" : prob < 0.5 ? "medium" : "high";
  }

  return { probabilities, risks };
}
