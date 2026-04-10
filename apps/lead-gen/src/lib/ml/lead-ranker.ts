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
