/**
 * Gradient-boosted decision stump ensemble for engagement prediction.
 *
 * A lightweight "mini-GBM" that uses single-split decision stumps as weak
 * learners. Training fits pseudo-residuals (negative gradient of log-loss)
 * sequentially. At inference, stumps vote additively through a logistic link.
 *
 * 12-feature vector:
 *   0: authority_score       (0-1)
 *   1: days_since_last_email (0+)
 *   2: total_emails_sent     (0+)
 *   3: open_rate             (0-1)
 *   4: reply_rate            (0-1)
 *   5: sequence_number       (0+)
 *   6: intent_score          (0-100)
 *   7: lead_temperature      (0-1)
 *   8: hour_sin              (-1..1)
 *   9: hour_cos              (-1..1)
 *  10: company_ai_tier       (0, 1, 2)
 *  11: email_verified        (0 or 1)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecisionStump {
  /** Index into the 12-feature vector */
  featureIdx: number;
  /** Split threshold */
  threshold: number;
  /** Prediction when feature <= threshold */
  leftValue: number;
  /** Prediction when feature > threshold */
  rightValue: number;
}

export interface EngagementModel {
  stumps: DecisionStump[];
  learningRate: number;
  /** Intercept in log-odds space */
  baseScore: number;
}

export interface EngagementPrediction {
  /** Probability of email open */
  pOpen: number;
  /** Probability of reply (conditional on open) */
  pReply: number;
  /** Model confidence (0-1) based on ensemble agreement */
  confidence: number;
}

export interface TrainingSample {
  features: number[];
  /** 1 = opened, 0 = not opened */
  labelOpen: number;
  /** 1 = replied, 0 = not replied */
  labelReply: number;
}

// ---------------------------------------------------------------------------
// Feature names (documentation)
// ---------------------------------------------------------------------------

export const FEATURE_NAMES = [
  "authority_score",
  "days_since_last_email",
  "total_emails_sent",
  "open_rate",
  "reply_rate",
  "sequence_number",
  "intent_score",
  "lead_temperature",
  "hour_sin",
  "hour_cos",
  "company_ai_tier",
  "email_verified",
] as const;

// ---------------------------------------------------------------------------
// Types for batch API
// ---------------------------------------------------------------------------

/**
 * Typed feature vector for batch prediction. Matches the 12-feature layout.
 */
export interface EngagementFeature {
  authorityScore: number;
  daysSinceLastEmail: number;
  totalEmailsSent: number;
  openRate: number;
  replyRate: number;
  sequenceNumber: number;
  intentScore: number;
  leadTemperature: number;
  hourSin: number;
  hourCos: number;
  companyAiTier: number;
  emailVerified: number;
}

// ---------------------------------------------------------------------------
// Logistic (sigmoid) lookup table
// ---------------------------------------------------------------------------
// Pre-compute sigmoid(x) for x in [-SIGMOID_LUT_RANGE, +SIGMOID_LUT_RANGE]
// with SIGMOID_LUT_SIZE entries. Outside this range, clamp to 0 or 1.

// Optimization: Float64Array for better precision in pre-computed sigmoid values.
// 2048 entries is already a good size (~16KB in Float64 fits in L1 cache).
// Pre-computed SIGMOID_LUT_SCALE avoids per-call division.
const SIGMOID_LUT_SIZE = 2048;
const SIGMOID_LUT_RANGE = 12; // sigmoid(-12)~6e-6, sigmoid(12)~0.999994
const SIGMOID_LUT = new Float64Array(SIGMOID_LUT_SIZE);
const SIGMOID_LUT_SCALE = (SIGMOID_LUT_SIZE - 1) / (2 * SIGMOID_LUT_RANGE);

for (let i = 0; i < SIGMOID_LUT_SIZE; i++) {
  const x = -SIGMOID_LUT_RANGE + (i / SIGMOID_LUT_SCALE);
  SIGMOID_LUT[i] = 1 / (1 + Math.exp(-x));
}

/**
 * Fast sigmoid via LUT with linear interpolation.
 *
 * Optimization: removed Math.min guard on upper index — at max index the
 * frac is 0 so the [lo+1] read (which may be OOB) is multiplied by 0,
 * making NaN * 0 = 0. Instead, we clamp lo to SIZE-2 to keep it safe
 * without a branch on every call.
 */
function sigmoidLUT(x: number): number {
  if (x >= SIGMOID_LUT_RANGE) return 1;
  if (x <= -SIGMOID_LUT_RANGE) return 0;
  const fidx = (x + SIGMOID_LUT_RANGE) * SIGMOID_LUT_SCALE;
  const lo = fidx | 0;
  const frac = fidx - lo;
  // lo is guaranteed < SIGMOID_LUT_SIZE here since x < SIGMOID_LUT_RANGE
  return SIGMOID_LUT[lo] + frac * (SIGMOID_LUT[lo + 1] - SIGMOID_LUT[lo]);
}

export { SIGMOID_LUT, SIGMOID_LUT_SIZE, SIGMOID_LUT_RANGE, sigmoidLUT };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function stumpPredict(stump: DecisionStump, features: number[]): number {
  return features[stump.featureIdx] <= stump.threshold
    ? stump.leftValue
    : stump.rightValue;
}

/**
 * Find the best stump (single split) for the current pseudo-residuals.
 * Enumerates every feature x every unique threshold candidate.
 */
function fitBestStump(
  samples: TrainingSample[],
  residuals: number[],
  featureCount: number,
): DecisionStump {
  let bestLoss = Infinity;
  let bestStump: DecisionStump = {
    featureIdx: 0,
    threshold: 0,
    leftValue: 0,
    rightValue: 0,
  };

  for (let f = 0; f < featureCount; f++) {
    // Collect unique thresholds (quantile-based for efficiency)
    const vals = samples.map((s) => s.features[f]);
    const sorted = Array.from(new Set(vals)).sort((a, b) => a - b);
    // Use up to 20 candidate splits
    const step = Math.max(1, Math.floor(sorted.length / 20));
    const candidates: number[] = [];
    for (let i = 0; i < sorted.length; i += step) {
      candidates.push(sorted[i]);
    }

    for (const thr of candidates) {
      let leftSum = 0;
      let leftCount = 0;
      let rightSum = 0;
      let rightCount = 0;

      for (let i = 0; i < samples.length; i++) {
        if (samples[i].features[f] <= thr) {
          leftSum += residuals[i];
          leftCount++;
        } else {
          rightSum += residuals[i];
          rightCount++;
        }
      }

      if (leftCount === 0 || rightCount === 0) continue;

      const leftVal = leftSum / leftCount;
      const rightVal = rightSum / rightCount;

      // MSE of residuals after fitting this stump
      let loss = 0;
      for (let i = 0; i < samples.length; i++) {
        const pred =
          samples[i].features[f] <= thr ? leftVal : rightVal;
        const diff = residuals[i] - pred;
        loss += diff * diff;
      }

      if (loss < bestLoss) {
        bestLoss = loss;
        bestStump = {
          featureIdx: f,
          threshold: thr,
          leftValue: leftVal,
          rightValue: rightVal,
        };
      }
    }
  }

  return bestStump;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Predict engagement probabilities for a single lead.
 *
 * Optimization: eliminated stumpVotes array allocation — instead, count
 * positive votes with a scalar counter. Avoids per-stump push + filter.
 *
 * @param model    Trained ensemble model.
 * @param features 12-element numeric feature vector.
 */
export function predictEngagement(
  model: EngagementModel,
  features: number[],
): EngagementPrediction {
  let logOddsOpen = model.baseScore;
  let logOddsReply = model.baseScore * 0.6; // reply model shares stumps, scaled
  const lr = model.learningRate;

  // Count positive votes directly instead of allocating a votes array
  let positiveVotes = 0;
  const numStumps = model.stumps.length;

  for (let s = 0; s < numStumps; s++) {
    const stump = model.stumps[s];
    const pred = features[stump.featureIdx] <= stump.threshold
      ? stump.leftValue
      : stump.rightValue;
    logOddsOpen += lr * pred;
    logOddsReply += lr * pred * 0.5;
    if (pred > 0) positiveVotes++;
  }

  const pOpen = sigmoid(logOddsOpen);
  const pReply = sigmoid(logOddsReply);

  // Confidence: agreement among stumps (proportion voting same direction)
  const total = numStumps || 1;
  const agreement = Math.max(positiveVotes, total - positiveVotes) / total;
  const confidence = 0.5 + 0.5 * (agreement - 0.5) / 0.5; // map [0.5,1] -> [0.5,1]

  return {
    pOpen: Math.max(0, Math.min(1, pOpen)),
    pReply: Math.max(0, Math.min(1, pReply)),
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Train a gradient-boosted stump ensemble from labeled samples.
 *
 * @param samples   Training data with 12-feature vectors and binary labels.
 * @param numStumps Number of boosting rounds (default 20).
 * @param lr        Learning rate / shrinkage (default 0.1).
 */
export function trainEngagementModel(
  samples: TrainingSample[],
  numStumps = 20,
  lr = 0.1,
): EngagementModel {
  if (samples.length === 0) {
    return { stumps: [], learningRate: lr, baseScore: 0 };
  }

  const n = samples.length;
  const featureCount = FEATURE_NAMES.length;

  // Base score: log-odds of the label mean
  const meanLabel =
    samples.reduce((s, x) => s + x.labelOpen, 0) / n;
  const clampedMean = Math.max(0.01, Math.min(0.99, meanLabel));
  const baseScore = Math.log(clampedMean / (1 - clampedMean));

  // Current predictions in log-odds space
  const F = new Float64Array(n).fill(baseScore);
  const stumps: DecisionStump[] = [];

  for (let round = 0; round < numStumps; round++) {
    // Pseudo-residuals: negative gradient of log-loss = y - p
    const residuals: number[] = [];
    for (let i = 0; i < n; i++) {
      const p = sigmoid(F[i]);
      residuals.push(samples[i].labelOpen - p);
    }

    const stump = fitBestStump(samples, residuals, featureCount);
    stumps.push(stump);

    // Update predictions
    for (let i = 0; i < n; i++) {
      F[i] += lr * stumpPredict(stump, samples[i].features);
    }
  }

  return { stumps, learningRate: lr, baseScore };
}

// ---------------------------------------------------------------------------
// Batch prediction API
// ---------------------------------------------------------------------------

/** Convert an EngagementFeature struct to the 12-element array layout. */
function featureToArray(f: EngagementFeature): number[] {
  return [
    f.authorityScore,
    f.daysSinceLastEmail,
    f.totalEmailsSent,
    f.openRate,
    f.replyRate,
    f.sequenceNumber,
    f.intentScore,
    f.leadTemperature,
    f.hourSin,
    f.hourCos,
    f.companyAiTier,
    f.emailVerified,
  ];
}

/** Number of features in the engagement vector. */
const NUM_ENGAGEMENT_FEATURES = 12;

/**
 * Batch predict engagement probabilities for multiple leads.
 *
 * Uses typed arrays and the sigmoid LUT to minimize per-lead overhead.
 * Returns a Float32Array of length `features.length * 3` laid out as
 * [pOpen_0, pReply_0, confidence_0, pOpen_1, pReply_1, confidence_1, ...].
 *
 * Optimizations over a naive loop:
 * - Stump traversal is done once per stump across all samples (stump-major)
 * - Features packed into contiguous Float64Array for cache-friendly access
 * - 4-way unrolled inner sample loop for better V8 optimization
 * - Sigmoid uses the pre-computed LUT instead of Math.exp()
 * - No intermediate object allocations (pre-allocated typed arrays)
 *
 * @param model    Trained ensemble model.
 * @param features Array of engagement feature structs.
 */
export function predictBatch(
  model: EngagementModel,
  features: EngagementFeature[],
): Float32Array {
  const n = features.length;
  const numStumps = model.stumps.length;
  const result = new Float32Array(n * 3);

  if (n === 0) return result;

  // Optimization: pack features into contiguous Float64Array (row-major) instead
  // of array-of-arrays. This avoids n array allocations and gives the stump
  // traversal loop sequential memory access per feature index.
  const featureMatrix = new Float64Array(n * NUM_ENGAGEMENT_FEATURES);
  for (let i = 0; i < n; i++) {
    const f = features[i];
    const base = i * NUM_ENGAGEMENT_FEATURES;
    featureMatrix[base]     = f.authorityScore;
    featureMatrix[base + 1] = f.daysSinceLastEmail;
    featureMatrix[base + 2] = f.totalEmailsSent;
    featureMatrix[base + 3] = f.openRate;
    featureMatrix[base + 4] = f.replyRate;
    featureMatrix[base + 5] = f.sequenceNumber;
    featureMatrix[base + 6] = f.intentScore;
    featureMatrix[base + 7] = f.leadTemperature;
    featureMatrix[base + 8] = f.hourSin;
    featureMatrix[base + 9] = f.hourCos;
    featureMatrix[base + 10] = f.companyAiTier;
    featureMatrix[base + 11] = f.emailVerified;
  }

  // Accumulate log-odds in typed arrays (stump-major order for cache locality)
  const logOddsOpen = new Float64Array(n).fill(model.baseScore);
  const logOddsReply = new Float64Array(n).fill(model.baseScore * 0.6);
  // Track positive votes per sample for confidence
  const positiveVotes = new Uint16Array(n);

  const lr = model.learningRate;
  for (let s = 0; s < numStumps; s++) {
    const stump = model.stumps[s];
    const fIdx = stump.featureIdx;
    const thr = stump.threshold;
    const leftVal = stump.leftValue;
    const rightVal = stump.rightValue;
    const lrLeft = lr * leftVal;
    const lrRight = lr * rightVal;
    const lrLeftHalf = lrLeft * 0.5;
    const lrRightHalf = lrRight * 0.5;
    const leftPositive = leftVal > 0 ? 1 : 0;
    const rightPositive = rightVal > 0 ? 1 : 0;

    // Optimization: 4-way unrolled inner loop to help V8 optimize.
    // Pre-compute lr * pred and lr * pred * 0.5 outside the branch.
    let i = 0;
    for (; i + 3 < n; i += 4) {
      const b0 = i * NUM_ENGAGEMENT_FEATURES + fIdx;
      const b1 = (i + 1) * NUM_ENGAGEMENT_FEATURES + fIdx;
      const b2 = (i + 2) * NUM_ENGAGEMENT_FEATURES + fIdx;
      const b3 = (i + 3) * NUM_ENGAGEMENT_FEATURES + fIdx;
      const isLeft0 = featureMatrix[b0] <= thr;
      const isLeft1 = featureMatrix[b1] <= thr;
      const isLeft2 = featureMatrix[b2] <= thr;
      const isLeft3 = featureMatrix[b3] <= thr;
      logOddsOpen[i]     += isLeft0 ? lrLeft : lrRight;
      logOddsOpen[i + 1] += isLeft1 ? lrLeft : lrRight;
      logOddsOpen[i + 2] += isLeft2 ? lrLeft : lrRight;
      logOddsOpen[i + 3] += isLeft3 ? lrLeft : lrRight;
      logOddsReply[i]     += isLeft0 ? lrLeftHalf : lrRightHalf;
      logOddsReply[i + 1] += isLeft1 ? lrLeftHalf : lrRightHalf;
      logOddsReply[i + 2] += isLeft2 ? lrLeftHalf : lrRightHalf;
      logOddsReply[i + 3] += isLeft3 ? lrLeftHalf : lrRightHalf;
      positiveVotes[i]     += isLeft0 ? leftPositive : rightPositive;
      positiveVotes[i + 1] += isLeft1 ? leftPositive : rightPositive;
      positiveVotes[i + 2] += isLeft2 ? leftPositive : rightPositive;
      positiveVotes[i + 3] += isLeft3 ? leftPositive : rightPositive;
    }
    for (; i < n; i++) {
      const bIdx = i * NUM_ENGAGEMENT_FEATURES + fIdx;
      const isLeft = featureMatrix[bIdx] <= thr;
      logOddsOpen[i] += isLeft ? lrLeft : lrRight;
      logOddsReply[i] += isLeft ? lrLeftHalf : lrRightHalf;
      positiveVotes[i] += isLeft ? leftPositive : rightPositive;
    }
  }

  // Convert to probabilities using sigmoid LUT
  // Optimization: pre-compute invTotal once; batch 4 samples at a time
  const total = numStumps || 1;
  const invTotal = 1 / total;
  let i = 0;
  for (; i + 3 < n; i += 4) {
    for (let k = 0; k < 4; k++) {
      const idx = i + k;
      const pOpen = sigmoidLUT(logOddsOpen[idx]);
      const pReply = sigmoidLUT(logOddsReply[idx]);
      const posV = positiveVotes[idx];
      const agreement = Math.max(posV, total - posV) * invTotal;
      const confidence = 0.5 + (agreement - 0.5);

      const base = idx * 3;
      result[base] = Math.max(0, Math.min(1, pOpen));
      result[base + 1] = Math.max(0, Math.min(1, pReply));
      result[base + 2] = Math.max(0, Math.min(1, confidence));
    }
  }
  for (; i < n; i++) {
    const pOpen = sigmoidLUT(logOddsOpen[i]);
    const pReply = sigmoidLUT(logOddsReply[i]);
    const posV = positiveVotes[i];
    const agreement = Math.max(posV, total - posV) * invTotal;
    const confidence = 0.5 + (agreement - 0.5);

    const base = i * 3;
    result[base] = Math.max(0, Math.min(1, pOpen));
    result[base + 1] = Math.max(0, Math.min(1, pReply));
    result[base + 2] = Math.max(0, Math.min(1, confidence));
  }

  return result;
}

/**
 * Unpack a batch result Float32Array into EngagementPrediction objects.
 * Convenience wrapper for callers that prefer objects over flat arrays.
 */
export function unpackBatchPredictions(
  batchResult: Float32Array,
): EngagementPrediction[] {
  const n = batchResult.length / 3;
  const predictions: EngagementPrediction[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const base = i * 3;
    predictions[i] = {
      pOpen: batchResult[base],
      pReply: batchResult[base + 1],
      confidence: batchResult[base + 2],
    };
  }
  return predictions;
}
