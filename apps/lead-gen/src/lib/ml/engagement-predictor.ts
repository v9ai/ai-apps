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
 * @param model    Trained ensemble model.
 * @param features 12-element numeric feature vector.
 */
export function predictEngagement(
  model: EngagementModel,
  features: number[],
): EngagementPrediction {
  let logOddsOpen = model.baseScore;
  let logOddsReply = model.baseScore * 0.6; // reply model shares stumps, scaled

  const stumpVotes: number[] = [];

  for (const stump of model.stumps) {
    const pred = stumpPredict(stump, features);
    logOddsOpen += model.learningRate * pred;
    logOddsReply += model.learningRate * pred * 0.5;
    stumpVotes.push(pred > 0 ? 1 : 0);
  }

  const pOpen = sigmoid(logOddsOpen);
  const pReply = sigmoid(logOddsReply);

  // Confidence: agreement among stumps (proportion voting same direction)
  const positiveVotes = stumpVotes.filter((v) => v === 1).length;
  const total = stumpVotes.length || 1;
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
