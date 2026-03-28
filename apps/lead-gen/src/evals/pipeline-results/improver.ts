/**
 * ML-driven improvement engine.
 *
 * Analyzes scored entities to identify which features drag scores down,
 * ranks improvements by expected lift from feature attribution,
 * and applies weight updates via online gradient descent.
 */

import type {
  ScoredEntity,
  DriftSignal,
  Improvement,
  ImprovementAction,
  Stage,
  StageModelState,
  FeatureVector,
} from "./schema";
import { FEATURE_NAMES } from "./schema";
import {
  batchUpdateStats,
  updateEMA,
  updateWeights,
  addConformalResidual,
  fitIsotonicCalibration,
  detectDrift,
} from "./scorer";

// ---------------------------------------------------------------------------
// Feature attribution analysis
// ---------------------------------------------------------------------------

/** Identify features with highest negative contribution (drag score down). */
function worstFeatures(
  scored: ScoredEntity[],
  stage: Stage,
  topN = 3,
): { feature: string; avgContribution: number }[] {
  const names = FEATURE_NAMES[stage];
  const dim = names.length;
  const sums = new Float64Array(dim);

  for (const entity of scored) {
    for (let j = 0; j < dim; j++) {
      sums[j] += entity.contributions[j];
    }
  }

  const n = scored.length || 1;
  return Array.from({ length: dim }, (_, j) => ({
    feature: names[j],
    avgContribution: sums[j] / n,
  }))
    .sort((a, b) => a.avgContribution - b.avgContribution)
    .slice(0, topN);
}

/** Identify entities with outlier z-scores on critical features. */
function outlierEntities(
  scored: ScoredEntity[],
  stage: Stage,
  zThreshold = 2.5,
): { id: number; feature: string; zScore: number }[] {
  const names = FEATURE_NAMES[stage];
  const outliers: { id: number; feature: string; zScore: number }[] = [];

  for (const entity of scored) {
    for (let j = 0; j < entity.zScores.length; j++) {
      if (Math.abs(entity.zScores[j]) > zThreshold) {
        outliers.push({
          id: entity.id,
          feature: names[j],
          zScore: entity.zScores[j],
        });
      }
    }
  }

  return outliers;
}

// ---------------------------------------------------------------------------
// Diagnose → Improvements
// ---------------------------------------------------------------------------

export function diagnose(
  scored: ScoredEntity[],
  driftSignals: DriftSignal[],
  stage: Stage,
  state: StageModelState,
): Improvement[] {
  const improvements: Improvement[] = [];
  const names = FEATURE_NAMES[stage];

  // 1. Feature attribution — find worst contributors
  const worst = worstFeatures(scored, stage);
  for (const w of worst) {
    if (w.avgContribution < -0.02) {
      improvements.push({
        action: "FILL_FEATURE",
        stage,
        priority: Math.min(1, Math.abs(w.avgContribution) * 10),
        description: `Feature "${w.feature}" avg contribution ${w.avgContribution.toFixed(3)} — fill missing values`,
        features: [w.feature],
        expectedLift: Math.abs(w.avgContribution) * 0.6,
        targetIds: scored
          .filter((e) => {
            const idx = names.indexOf(w.feature);
            return idx >= 0 && e.contributions[idx] < -0.01;
          })
          .map((e) => e.id)
          .slice(0, 100),
      });
    }
  }

  // 2. Outlier review
  const outliers = outlierEntities(scored, stage);
  if (outliers.length > 0) {
    const uniqueIds = [...new Set(outliers.map((o) => o.id))];
    improvements.push({
      action: "OUTLIER_REVIEW",
      stage,
      priority: Math.min(1, outliers.length / scored.length),
      description: `${outliers.length} outlier signals across ${uniqueIds.length} entities`,
      features: [...new Set(outliers.map((o) => o.feature))],
      expectedLift: 0.05,
      targetIds: uniqueIds.slice(0, 50),
    });
  }

  // 3. Drift alerts
  const drifted = driftSignals.filter((d) => d.drifted && d.stage === stage);
  if (drifted.length > 0) {
    improvements.push({
      action: "DRIFT_ALERT",
      stage,
      priority: Math.min(1, drifted.length / names.length),
      description: `${drifted.length} features drifted: ${drifted.map((d) => d.feature).join(", ")}`,
      features: drifted.map((d) => d.feature),
      expectedLift: 0.1,
      targetIds: [],
    });

    // If >50% features drifted, suggest retraining
    if (drifted.length > names.length / 2) {
      improvements.push({
        action: "RETRAIN_WEIGHTS",
        stage,
        priority: 0.9,
        description: `${drifted.length}/${names.length} features drifted — retrain weights`,
        features: drifted.map((d) => d.feature),
        expectedLift: 0.15,
        targetIds: [],
      });
    }
  }

  // 4. Conformal width — if avg interval > 0.4, need more data
  const avgWidth =
    scored.reduce((s, e) => s + (e.conformalInterval[1] - e.conformalInterval[0]), 0) /
    (scored.length || 1);
  if (avgWidth > 0.4 && state.conformalResiduals.length < 200) {
    improvements.push({
      action: "EXPAND_TRAINING",
      stage,
      priority: 0.6,
      description: `Conformal interval width ${avgWidth.toFixed(2)} — need more calibration data`,
      features: [],
      expectedLift: 0.08,
      targetIds: [],
    });
  }

  // 5. AI classifier confidence check (enrichment only)
  if (stage === "enrichment") {
    const lowConfidence = scored.filter((e) => {
      const confIdx = names.indexOf("ai_confidence");
      return confIdx >= 0 && e.contributions[confIdx] < -0.03;
    });
    if (lowConfidence.length > scored.length * 0.3) {
      improvements.push({
        action: "RECLASSIFY",
        stage,
        priority: 0.7,
        description: `${lowConfidence.length} entities with low AI classifier confidence`,
        features: ["ai_confidence"],
        expectedLift: 0.1,
        targetIds: lowConfidence.map((e) => e.id).slice(0, 100),
      });
    }
  }

  // Sort by priority descending
  return improvements.sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------------------
// Online model update (call after ground truth is available)
// ---------------------------------------------------------------------------

/**
 * Update model state with observed outcomes.
 * Call this when you get feedback (e.g., email replied = 1, bounced = 0).
 */
export function onlineUpdate(
  state: StageModelState,
  vectors: FeatureVector[],
  outcomes: { id: number; target: number }[],
): { updatedCount: number; avgError: number } {
  const outcomeMap = new Map(outcomes.map((o) => [o.id, o.target]));
  let totalError = 0;
  let count = 0;

  for (const vec of vectors) {
    const target = outcomeMap.get(vec.id);
    if (target === undefined) continue;

    // Compute current prediction
    let predicted = 0;
    for (let i = 0; i < vec.values.length; i++) {
      predicted += vec.values[i] * state.weights[i];
    }
    predicted = Math.max(0, Math.min(1, predicted));

    // Update weights via SGD
    updateWeights(state.weights, vec.values, predicted, target);

    // Update stats
    batchUpdateStats(state.featureStats, [vec]);

    // Update EMA
    updateEMA(state.ema, predicted);

    // Add conformal residual
    addConformalResidual(state.conformalResiduals, predicted, target);

    totalError += Math.abs(predicted - target);
    count++;
  }

  // Re-fit calibration table from residuals
  if (count > 20) {
    const pairs = state.conformalResiduals.map((r, i) => ({
      raw: i / state.conformalResiduals.length,
      actual: Math.max(0, 1 - r),
    }));
    state.calibrationTable = fitIsotonicCalibration(pairs);
  }

  // Update reference means for drift detection
  if (count > 0) {
    const dim = state.weights.length;
    for (let j = 0; j < dim; j++) {
      state.referenceMeans[j] = state.featureStats[j].mean;
    }
  }

  return {
    updatedCount: count,
    avgError: count > 0 ? totalError / count : 0,
  };
}
