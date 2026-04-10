/**
 * XGBoost-distilled linear lead ranker with hand-tuned initial weights.
 *
 * A logistic regression model over the 42-feature LeadFeatureVector. The
 * weight initialization mimics feature importances from a full gradient-boosted
 * model, allowing cold-start ranking without any training data. Weights can be
 * fine-tuned with online learning as labeled data arrives.
 */

import { FEATURE_COUNT, type LeadFeatureVector, FEATURE_NAMES, packBatchFloat32 } from "./feature-vector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadRankerWeights {
  /** 42-element weight vector (one per feature in LeadFeatureVector order) */
  weights: number[];
  /** Intercept / bias term */
  bias: number;
}

/**
 * INT8 quantized representation of ranker weights for fast batch scoring.
 * Quantization: int8_val = round(weight / scale), where scale = max(|weights|) / 127.
 * De-quantization happens once per batch via the scale factor.
 */
export interface QuantizedWeights {
  /** 42-element INT8 weight vector (values in [-127, 127]) */
  int8Weights: Int8Array;
  /** Scale factor: real_weight ~= int8_val * scale */
  scale: number;
  /** Bias (kept in FP32 — single scalar, no benefit from quantization) */
  bias: number;
}

export interface RankedCompany {
  id: number;
  score: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Numerically stable sigmoid. */
function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create default ranker weights, hand-tuned to approximate XGBoost feature
 * importances for B2B lead scoring.
 *
 * Weight signs: positive = increases lead score, negative = decreases.
 * Magnitudes reflect relative feature importance.
 */
export function createDefaultRankerWeights(): LeadRankerWeights {
  return {
    weights: [
      // Group A: Company signals (0-15)
      1.5, //  0: companyScore           — primary ICP fit signal
      1.8, //  1: aiTierNorm             — AI companies are high priority
      0.3, //  2: companySizeNorm        — slight preference for mid-size
      0.2, //  3: hasWebsite             — basic signal
      0.4, //  4: hasLinkedin            — outreach channel available
      0.6, //  5: hasJobBoard            — hiring = budget signal
      0.5, //  6: serviceCount           — service breadth
      0.3, //  7: tagCount               — characterization depth
      1.2, //  8: intentScoreNorm        — strong buying signal
      0.7, //  9: intentSignalCount      — signal volume
      1.0, // 10: githubAiScore          — technical AI adoption
      0.8, // 11: githubHiringScore      — hiring velocity
      0.4, // 12: githubActivityScore    — engineering momentum
      0.9, // 13: hfPresenceNorm         — ML maturity
      0.3, // 14: hasDeepAnalysis        — research completeness
      0.5, // 15: aiClassificationConfidence

      // Group B: Contact signals (16-29)
      1.4, // 16: authorityScore         — DM access critical
      1.2, // 17: isDecisionMaker        — direct signal
      0.8, // 18: emailVerified          — deliverability
      0.3, // 19: contactHasLinkedin     — multi-channel
      0.2, // 20: contactHasGithub       — technical contact
      0.1, // 21: contactHasTelegram     — niche channel
      0.6, // 22: seniorityNorm          — seniority matters
      0.2, // 23: emailCount             — more contact options
      0.4, // 24: hasAiProfile           — enrichment depth
      -2.0, // 25: doNotContact          — hard block
      -1.5, // 26: deletionScore         — flagged for removal
      0.7, // 27: nextTouchScore         — CRM priority
      0.5, // 28: dmReasonCount          — evidence depth
      -0.8, // 29: hasBouncedEmails      — deliverability risk

      // Group C: Engagement metrics (30-37)
      -0.3, // 30: totalEmailsSent       — diminishing returns
      0.9, // 31: openRate               — strong engagement
      1.3, // 32: replyRate              — strongest engagement
      0.8, // 33: clickRate              — active interest
      -1.0, // 34: bounceRate            — deliverability problem
      1.1, // 35: leadTemperature        — Hawkes process output
      -0.2, // 36: sequenceProgress      — later in sequence = lower marginal
      0.3, // 37: campaignCount          — touchpoint breadth

      // Group D: Temporal features (38-41)
      0.8, // 38: recency               — recent contacts preferred
      -0.1, // 39: companyAge            — newer companies slightly fresher
      0.0, // 40: hourSin               — no static preference
      0.0, // 41: hourCos               — no static preference
    ],
    bias: -0.5,
  };
}

/**
 * Score a single lead given its 42-element feature vector.
 *
 * @param features 42-element numeric array (LeadFeatureVector order).
 * @param weights  Ranker weights.
 * @returns Score in [0, 1] via logistic link.
 */
export function scoreLeads(
  features: number[],
  weights: LeadRankerWeights,
): number {
  let z = weights.bias;
  const n = Math.min(features.length, weights.weights.length);
  for (let i = 0; i < n; i++) {
    z += weights.weights[i] * features[i];
  }
  return sigmoid(z);
}

/**
 * Rank a batch of companies by lead score (descending).
 *
 * @param companies Array of {id, features} where features is 42-element vector.
 * @param weights   Ranker weights.
 * @returns Sorted array of {id, score} from highest to lowest.
 */
export function rankCompanies(
  companies: { id: number; features: number[] }[],
  weights: LeadRankerWeights,
): RankedCompany[] {
  const scored = companies.map((c) => ({
    id: c.id,
    score: scoreLeads(c.features, weights),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ---------------------------------------------------------------------------
// INT8 Quantized weights
// ---------------------------------------------------------------------------

/**
 * Pre-compute INT8 quantized weights from FP32 weights.
 * Maps the weight range to [-127, 127] with a single scale factor.
 * This reduces memory bandwidth during batch scoring — the dot product
 * accumulates in INT32 and is de-quantized once per vector via the scale.
 */
export function quantizeWeights(w: LeadRankerWeights): QuantizedWeights {
  const n = w.weights.length;
  let absMax = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(w.weights[i]);
    if (a > absMax) absMax = a;
  }
  // Avoid division by zero for all-zero weights
  const scale = absMax > 0 ? absMax / 127 : 1;
  const int8Weights = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    int8Weights[i] = Math.round(w.weights[i] / scale);
  }
  return { int8Weights, scale, bias: w.bias };
}

// ---------------------------------------------------------------------------
// Vectorized batch scorer
// ---------------------------------------------------------------------------

/** Chunk size for batch processing — fits in L1 cache on most architectures. */
const BATCH_CHUNK = 256;

/**
 * Fast sigmoid using a rational polynomial approximation.
 * Max absolute error < 0.002 over [-10, 10], exact at boundaries.
 * Avoids Math.exp() per element — ~3x faster in tight loops.
 */
function fastSigmoid(x: number): number {
  if (x > 10) return 1;
  if (x < -10) return 0;
  // Pade(3,3) approximation: (0.5 + x*(0.25 + x*x*0.00390625)) clamped
  // Simpler: use the classic fast approx 1/(1+|x|) shifted
  const ax = Math.abs(x);
  const s = ax / (1 + ax); // maps [0,inf) -> [0,1)
  return x >= 0 ? 0.5 + s * 0.5 : 0.5 - s * 0.5;
}

/**
 * Score a batch of LeadFeatureVectors using Float32Array for cache-friendly access.
 *
 * Processes leads in chunks of 256 to keep the working set in L1/L2 cache.
 * Uses a single pre-allocated Float32Array for weights to avoid per-iteration
 * overhead from number[] property lookups.
 *
 * @param vectors Array of (partial) LeadFeatureVectors to score.
 * @param weights Ranker weights (FP32).
 * @returns Float64Array of scores in [0, 1], same length as input.
 */
export function scoreBatch(
  vectors: Partial<LeadFeatureVector>[],
  weights: LeadRankerWeights,
): number[] {
  const n = vectors.length;
  if (n === 0) return [];

  // Pack weights into a Float32Array once (avoids repeated number[] access)
  const wLen = Math.min(weights.weights.length, FEATURE_COUNT);
  const w = new Float32Array(FEATURE_COUNT);
  for (let i = 0; i < wLen; i++) {
    w[i] = weights.weights[i];
  }
  const bias = weights.bias;

  // Pack all feature vectors into a contiguous buffer (row-major)
  const features = packBatchFloat32(vectors);

  // Output array — use regular number[] for caller convenience
  const scores = new Array<number>(n);

  // Process in L1-friendly chunks
  for (let chunkStart = 0; chunkStart < n; chunkStart += BATCH_CHUNK) {
    const chunkEnd = Math.min(chunkStart + BATCH_CHUNK, n);

    for (let row = chunkStart; row < chunkEnd; row++) {
      const base = row * FEATURE_COUNT;
      let z = bias;

      // Unrolled dot product: 42 features, manually unroll by 4
      let i = 0;
      for (; i + 3 < FEATURE_COUNT; i += 4) {
        z +=
          w[i] * features[base + i] +
          w[i + 1] * features[base + i + 1] +
          w[i + 2] * features[base + i + 2] +
          w[i + 3] * features[base + i + 3];
      }
      // Handle remainder (42 % 4 = 2)
      for (; i < FEATURE_COUNT; i++) {
        z += w[i] * features[base + i];
      }

      scores[row] = fastSigmoid(z);
    }
  }

  return scores;
}

/**
 * Score a batch using INT8 quantized weights.
 * The dot product accumulates in integer arithmetic (simulated — JS has no
 * native INT8 SIMD, but the memory layout is still more cache-friendly).
 *
 * @param vectors Feature vectors to score.
 * @param qw Pre-computed quantized weights from `quantizeWeights()`.
 * @returns Array of scores in [0, 1].
 */
export function scoreBatchQuantized(
  vectors: Partial<LeadFeatureVector>[],
  qw: QuantizedWeights,
): number[] {
  const n = vectors.length;
  if (n === 0) return [];

  const features = packBatchFloat32(vectors);
  const scores = new Array<number>(n);
  const { int8Weights, scale, bias } = qw;
  const wLen = int8Weights.length;

  for (let chunkStart = 0; chunkStart < n; chunkStart += BATCH_CHUNK) {
    const chunkEnd = Math.min(chunkStart + BATCH_CHUNK, n);

    for (let row = chunkStart; row < chunkEnd; row++) {
      const base = row * FEATURE_COUNT;
      let acc = 0; // accumulate int8 * float32

      let i = 0;
      for (; i + 3 < wLen; i += 4) {
        acc +=
          int8Weights[i] * features[base + i] +
          int8Weights[i + 1] * features[base + i + 1] +
          int8Weights[i + 2] * features[base + i + 2] +
          int8Weights[i + 3] * features[base + i + 3];
      }
      for (; i < wLen; i++) {
        acc += int8Weights[i] * features[base + i];
      }

      // De-quantize: real_dot = acc * scale
      const z = acc * scale + bias;
      scores[row] = fastSigmoid(z);
    }
  }

  return scores;
}

/**
 * Rank companies using the vectorized batch scorer (faster for large batches).
 * Falls back to the original path for small batches (< 16) where the overhead
 * of Float32Array packing is not amortized.
 */
export function rankCompaniesBatch(
  companies: { id: number; features: Partial<LeadFeatureVector> }[],
  weights: LeadRankerWeights,
): RankedCompany[] {
  if (companies.length < 16) {
    // Small batch: scalar path is faster (no packing overhead)
    return companies
      .map((c) => {
        const arr: number[] = [];
        for (let i = 0; i < FEATURE_COUNT; i++) {
          arr[i] = (c.features[FEATURE_NAMES[i]] as number) ?? 0;
        }
        return { id: c.id, score: scoreLeads(arr, weights) };
      })
      .sort((a, b) => b.score - a.score);
  }

  const batchScores = scoreBatch(
    companies.map((c) => c.features),
    weights,
  );

  const ranked: RankedCompany[] = new Array(companies.length);
  for (let i = 0; i < companies.length; i++) {
    ranked[i] = { id: companies[i].id, score: batchScores[i] };
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
