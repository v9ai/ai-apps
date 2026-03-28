/**
 * ML scoring engine — pure numerical, no LLM calls.
 *
 * - Weighted linear scoring with learned feature weights
 * - Welford online variance for z-score outlier detection
 * - Isotonic calibration (piecewise-linear interpolation)
 * - Conformal prediction intervals (split conformal)
 * - ADWIN-style drift detection via sliding window Wasserstein-1
 * - Per-feature SHAP-lite contributions (marginal * weight)
 */

import type {
  FeatureVector,
  FeatureStats,
  EMAState,
  ScoredEntity,
  DriftSignal,
  StageModelState,
  Stage,
} from "./schema";
import { FEATURE_NAMES } from "./schema";

// ---------------------------------------------------------------------------
// Welford online statistics
// ---------------------------------------------------------------------------

export function initFeatureStats(dim: number): FeatureStats[] {
  return Array.from({ length: dim }, () => ({
    mean: 0,
    variance: 0,
    min: Infinity,
    max: -Infinity,
    count: 0,
  }));
}

/** Welford single-pass update. */
export function updateStats(stats: FeatureStats, x: number): void {
  stats.count++;
  const delta = x - stats.mean;
  stats.mean += delta / stats.count;
  const delta2 = x - stats.mean;
  // M2 stored as variance * count for numerical stability
  stats.variance += (delta * delta2 - stats.variance) / stats.count;
  if (x < stats.min) stats.min = x;
  if (x > stats.max) stats.max = x;
}

/** Batch update stats from a set of feature vectors. */
export function batchUpdateStats(
  stats: FeatureStats[],
  vectors: FeatureVector[],
): void {
  for (const vec of vectors) {
    for (let j = 0; j < vec.values.length; j++) {
      updateStats(stats[j], vec.values[j]);
    }
  }
}

/** z-score of a value given feature stats. */
export function zScore(stats: FeatureStats, x: number): number {
  const std = Math.sqrt(Math.max(stats.variance, 1e-10));
  return (x - stats.mean) / std;
}

// ---------------------------------------------------------------------------
// EMA (exponential moving average)
// ---------------------------------------------------------------------------

export function initEMA(alpha = 0.1): EMAState {
  return { value: 0, alpha, count: 0 };
}

export function updateEMA(ema: EMAState, x: number): void {
  if (ema.count === 0) {
    ema.value = x;
  } else {
    ema.value = ema.alpha * x + (1 - ema.alpha) * ema.value;
  }
  ema.count++;
}

// ---------------------------------------------------------------------------
// Weighted linear scorer
// ---------------------------------------------------------------------------

/** Default uniform weights — will be learned via online gradient. */
export function initWeights(dim: number): number[] {
  const w = 1 / dim;
  return Array.from({ length: dim }, () => w);
}

/** Compute weighted score from feature vector and weights. */
export function weightedScore(values: Float64Array, weights: number[]): number {
  let score = 0;
  for (let i = 0; i < values.length; i++) {
    score += values[i] * weights[i];
  }
  return Math.max(0, Math.min(1, score));
}

/** Per-feature contribution (SHAP-lite: (value - mean) * weight). */
export function featureContributions(
  values: Float64Array,
  weights: number[],
  stats: FeatureStats[],
): number[] {
  return Array.from(values, (v, i) => (v - stats[i].mean) * weights[i]);
}

// ---------------------------------------------------------------------------
// Online weight update (single-step SGD toward observed outcome)
// ---------------------------------------------------------------------------

/**
 * Update weights using a single gradient step.
 * loss = (predicted - target)^2 / 2
 * grad_w_i = (predicted - target) * x_i
 */
export function updateWeights(
  weights: number[],
  values: Float64Array,
  predicted: number,
  target: number,
  lr = 0.01,
): void {
  const error = predicted - target;
  for (let i = 0; i < weights.length; i++) {
    weights[i] -= lr * error * values[i];
    // Clamp weights to prevent divergence
    weights[i] = Math.max(-2, Math.min(2, weights[i]));
  }
  // Re-normalize so weights sum to ~1
  const sum = weights.reduce((a, b) => a + Math.abs(b), 0);
  if (sum > 0) {
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sum;
    }
  }
}

// ---------------------------------------------------------------------------
// Isotonic calibration (piecewise-linear interpolation)
// ---------------------------------------------------------------------------

/**
 * Fit isotonic calibration from (raw, actual) pairs.
 * Uses pool-adjacent-violators algorithm (PAVA).
 */
export function fitIsotonicCalibration(
  pairs: { raw: number; actual: number }[],
): [number, number][] {
  if (pairs.length === 0) return [[0, 0], [1, 1]];

  // Sort by raw score
  const sorted = [...pairs].sort((a, b) => a.raw - b.raw);

  // PAVA: merge adjacent blocks that violate monotonicity
  const blocks: { sum: number; count: number; rawMid: number }[] =
    sorted.map((p) => ({ sum: p.actual, count: 1, rawMid: p.raw }));

  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const curAvg = blocks[i].sum / blocks[i].count;
      const nextAvg = blocks[i + 1].sum / blocks[i + 1].count;
      if (curAvg > nextAvg) {
        // Merge blocks[i+1] into blocks[i]
        blocks[i].sum += blocks[i + 1].sum;
        blocks[i].count += blocks[i + 1].count;
        blocks[i].rawMid = (blocks[i].rawMid + blocks[i + 1].rawMid) / 2;
        blocks.splice(i + 1, 1);
        merged = true;
      }
    }
  }

  return blocks.map((b) => [b.rawMid, b.sum / b.count]);
}

/** Interpolate calibrated score from calibration table. */
export function calibrate(
  raw: number,
  table: [number, number][],
): number {
  if (table.length === 0) return raw;
  if (raw <= table[0][0]) return table[0][1];
  if (raw >= table[table.length - 1][0]) return table[table.length - 1][1];

  // Binary search for bracket
  let lo = 0;
  let hi = table.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid][0] <= raw) lo = mid;
    else hi = mid;
  }

  // Linear interpolation
  const [x0, y0] = table[lo];
  const [x1, y1] = table[hi];
  const t = (raw - x0) / (x1 - x0 || 1);
  return y0 + t * (y1 - y0);
}

// ---------------------------------------------------------------------------
// Conformal prediction
// ---------------------------------------------------------------------------

/** Add a residual (|predicted - actual|) to the buffer. */
export function addConformalResidual(
  residuals: number[],
  predicted: number,
  actual: number,
  maxSize = 500,
): void {
  residuals.push(Math.abs(predicted - actual));
  if (residuals.length > maxSize) {
    residuals.shift(); // sliding window
  }
}

/**
 * Compute conformal interval at a given coverage level.
 * Uses quantile of absolute residuals.
 */
export function conformalInterval(
  score: number,
  residuals: number[],
  alpha = 0.05,
): [number, number] {
  if (residuals.length < 10) {
    // Not enough data — return wide interval
    return [Math.max(0, score - 0.3), Math.min(1, score + 0.3)];
  }

  const sorted = [...residuals].sort((a, b) => a - b);
  const qIdx = Math.ceil((1 - alpha) * sorted.length) - 1;
  const q = sorted[Math.min(qIdx, sorted.length - 1)];

  return [Math.max(0, score - q), Math.min(1, score + q)];
}

// ---------------------------------------------------------------------------
// Drift detection (ADWIN-inspired sliding window)
// ---------------------------------------------------------------------------

/**
 * Detect distribution drift per feature.
 * Compares the mean of recent window vs. reference means.
 * Uses Wasserstein-1 (absolute difference of means for 1D).
 */
export function detectDrift(
  stage: Stage,
  referenceMeans: number[],
  currentVectors: FeatureVector[],
  threshold = 0.15,
): DriftSignal[] {
  const names = FEATURE_NAMES[stage];
  const dim = names.length;
  const signals: DriftSignal[] = [];

  if (currentVectors.length === 0) return signals;

  // Compute current means
  const currentMeans = new Float64Array(dim);
  for (const vec of currentVectors) {
    for (let j = 0; j < dim; j++) {
      currentMeans[j] += vec.values[j];
    }
  }
  for (let j = 0; j < dim; j++) {
    currentMeans[j] /= currentVectors.length;
  }

  for (let j = 0; j < dim; j++) {
    const distance = Math.abs(currentMeans[j] - (referenceMeans[j] ?? 0));
    signals.push({
      feature: names[j],
      stage,
      currentMean: currentMeans[j],
      referenceMean: referenceMeans[j] ?? 0,
      distance,
      drifted: distance > threshold,
    });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Score a batch of entities
// ---------------------------------------------------------------------------

export function scoreBatch(
  vectors: FeatureVector[],
  state: StageModelState,
): ScoredEntity[] {
  return vectors.map((vec) => {
    const raw = weightedScore(vec.values, state.weights);
    const cal = calibrate(raw, state.calibrationTable);
    const interval = conformalInterval(cal, state.conformalResiduals);
    const zScores = Array.from(vec.values, (v, i) =>
      zScore(state.featureStats[i], v),
    );
    const contributions = featureContributions(
      vec.values,
      state.weights,
      state.featureStats,
    );

    return {
      id: vec.id,
      stage: vec.stage,
      score: raw,
      calibratedScore: cal,
      conformalInterval: interval,
      zScores,
      contributions,
    };
  });
}

// ---------------------------------------------------------------------------
// Initialize stage model state
// ---------------------------------------------------------------------------

export function initStageModel(stage: Stage): StageModelState {
  const dim = FEATURE_NAMES[stage].length;
  return {
    featureStats: initFeatureStats(dim),
    ema: initEMA(0.1),
    calibrationTable: [[0, 0], [1, 1]],
    conformalResiduals: [],
    referenceMeans: new Array(dim).fill(0.5),
    weights: initWeights(dim),
  };
}
