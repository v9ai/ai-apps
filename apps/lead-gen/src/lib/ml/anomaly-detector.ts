/**
 * Online anomaly detection using Welford's algorithm + Mahalanobis distance.
 *
 * Maintains running mean and variance for each feature dimension using
 * Welford's numerically stable online algorithm. Anomaly scoring uses the
 * diagonal Mahalanobis distance (assumes feature independence), which is
 * equivalent to the sum of squared z-scores.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnomalyDetector {
  /** Number of samples observed so far */
  count: number;
  /** Running mean for each feature (length = numFeatures) */
  mean: Float64Array;
  /** Running M2 = sum of squares of differences from mean (Welford) */
  m2: Float64Array;
  /** Number of features this detector tracks */
  numFeatures: number;
  /** Mahalanobis distance threshold for anomaly flag (default 3.5) */
  threshold: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum samples before anomaly scoring is meaningful. */
const MIN_SAMPLES = 30;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new anomaly detector for the given feature dimensionality.
 *
 * @param numFeatures Number of features per observation (default 12).
 * @param threshold   Mahalanobis distance threshold (default 3.5).
 */
export function createDetector(
  numFeatures = 12,
  threshold = 3.5,
): AnomalyDetector {
  return {
    count: 0,
    mean: new Float64Array(numFeatures),
    m2: new Float64Array(numFeatures),
    numFeatures,
    threshold,
  };
}

/**
 * Update the detector with a new observation (Welford's online algorithm).
 * Mutates the detector in place for efficiency.
 *
 * @param detector The anomaly detector state.
 * @param features Feature vector (length must match detector.numFeatures).
 */
export function updateDetector(
  detector: AnomalyDetector,
  features: number[],
): void {
  const n = Math.min(features.length, detector.numFeatures);
  detector.count += 1;

  for (let i = 0; i < n; i++) {
    const delta = features[i] - detector.mean[i];
    detector.mean[i] += delta / detector.count;
    const delta2 = features[i] - detector.mean[i];
    detector.m2[i] += delta * delta2;
  }
}

/**
 * Compute the diagonal Mahalanobis distance for a feature vector.
 *
 * d(x) = sqrt( Σ (x_i - μ_i)^2 / σ_i^2 )
 *
 * Returns Infinity if fewer than MIN_SAMPLES have been observed, since
 * variance estimates are unreliable with small samples.
 *
 * @param detector The anomaly detector state.
 * @param features Feature vector to score.
 */
export function anomalyScore(
  detector: AnomalyDetector,
  features: number[],
): number {
  if (detector.count < MIN_SAMPLES) return Infinity;

  const n = Math.min(features.length, detector.numFeatures);
  let sumSqZ = 0;

  for (let i = 0; i < n; i++) {
    const variance = detector.m2[i] / (detector.count - 1);
    if (variance < 1e-12) continue; // skip near-constant features
    const z = (features[i] - detector.mean[i]) / Math.sqrt(variance);
    sumSqZ += z * z;
  }

  return Math.sqrt(sumSqZ);
}

/**
 * Check whether a feature vector is anomalous.
 *
 * Returns false if fewer than MIN_SAMPLES have been observed (insufficient
 * data to judge). Otherwise compares the Mahalanobis distance against the
 * configured threshold.
 *
 * @param detector The anomaly detector state.
 * @param features Feature vector to test.
 */
export function isAnomalous(
  detector: AnomalyDetector,
  features: number[],
): boolean {
  if (detector.count < MIN_SAMPLES) return false;
  return anomalyScore(detector, features) > detector.threshold;
}

/**
 * Get the current variance estimates for each feature.
 * Useful for debugging and understanding which features are most variable.
 *
 * @param detector The anomaly detector state.
 */
export function getVariances(detector: AnomalyDetector): number[] {
  if (detector.count < 2) {
    return new Array(detector.numFeatures).fill(0);
  }
  const variances: number[] = [];
  for (let i = 0; i < detector.numFeatures; i++) {
    variances.push(detector.m2[i] / (detector.count - 1));
  }
  return variances;
}
