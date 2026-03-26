import type {
  RemoteEUClassification,
  RemoteEUScoreInput,
  RemoteEUScoreResult,
  ConfidenceCalibrationResult,
} from "./schema";

/**
 * Detailed scorer for Remote EU classification evaluation.
 *
 * Scoring logic:
 * - Correct classification + matching confidence = 1.0
 * - Correct classification + mismatched confidence = 0.5
 * - Incorrect classification = 0.0
 */
export function scoreRemoteEUClassification(
  input: RemoteEUScoreInput,
): RemoteEUScoreResult {
  const { expectedClassification, actualClassification, jobPosting } = input;

  const isCorrect =
    expectedClassification.isRemoteEU === actualClassification.isRemoteEU;

  let confidenceScore = 1;
  if (expectedClassification.confidence !== actualClassification.confidence) {
    confidenceScore = 0.5;
  }

  const score = isCorrect ? confidenceScore : 0;

  return {
    score,
    metadata: {
      expected: expectedClassification,
      actual: actualClassification,
      isCorrect,
      confidenceMatch:
        expectedClassification.confidence === actualClassification.confidence,
      details: {
        jobTitle: jobPosting.title,
        location: jobPosting.location,
        expectedReason: expectedClassification.reason,
        actualReason: actualClassification.reason,
      },
    },
  };
}

/**
 * Confidence-based scorer for Remote EU classification.
 *
 * - High confidence: 1.0
 * - Medium confidence: 0.7
 * - Low confidence: 0.4
 */
export function scoreRemoteEUConfidence(
  classification: RemoteEUClassification,
): { score: number; reason: string } {
  const confidenceScore =
    classification.confidence === "high"
      ? 1.0
      : classification.confidence === "medium"
        ? 0.7
        : 0.4;

  return {
    score: confidenceScore,
    reason: `Classification: ${classification.isRemoteEU ? "EU Remote" : "Non-EU"} (${classification.confidence} confidence) - ${classification.reason}`,
  };
}

/**
 * Confidence calibration scorer.
 *
 * Groups classification results by confidence tier and computes:
 * - Per-tier accuracy (% correct within each confidence level)
 * - Expected Calibration Error (ECE) = sum(|accuracy_tier - confidence_tier| * n_tier / n_total)
 *   where confidence_tier maps: high=0.9, medium=0.6, low=0.3
 */
const CONFIDENCE_MAP: Record<RemoteEUClassification["confidence"], number> = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

export function scoreConfidenceCalibration(
  results: Array<{
    expected: RemoteEUClassification;
    actual: RemoteEUClassification;
  }>,
): ConfidenceCalibrationResult {
  const tiers: Record<
    RemoteEUClassification["confidence"],
    { correct: number; total: number }
  > = {
    high: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    low: { correct: 0, total: 0 },
  };

  for (const { expected, actual } of results) {
    const tier = actual.confidence;
    tiers[tier].total += 1;
    if (expected.isRemoteEU === actual.isRemoteEU) {
      tiers[tier].correct += 1;
    }
  }

  const n = results.length;

  const tierResult = (tier: RemoteEUClassification["confidence"]) => ({
    accuracy: tiers[tier].total > 0 ? tiers[tier].correct / tiers[tier].total : 0,
    count: tiers[tier].total,
  });

  // ECE = sum(|accuracy_tier - confidence_tier| * n_tier / n_total)
  let ece = 0;
  for (const tier of ["high", "medium", "low"] as const) {
    if (tiers[tier].total === 0) continue;
    const accuracy = tiers[tier].correct / tiers[tier].total;
    ece += Math.abs(accuracy - CONFIDENCE_MAP[tier]) * (tiers[tier].total / n);
  }

  return {
    ece,
    tiers: {
      high: tierResult("high"),
      medium: tierResult("medium"),
      low: tierResult("low"),
    },
  };
}
