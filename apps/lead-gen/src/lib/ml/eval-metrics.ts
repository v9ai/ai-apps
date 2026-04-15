/**
 * Binary classification evaluation metrics.
 *
 * TypeScript port of the Rust eval harness in
 * `crates/metal/src/kernel/ml_eval.rs` (lines 156-333).
 *
 * Pure math — zero external dependencies.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScoringEval {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  aucRoc: number;
  ndcgAt10: number;
  sampleCount: number;
  positiveCount: number;
  threshold: number;
}

// ── AUC-ROC (trapezoid rule) ─────────────────────────────────────────────────

/**
 * Compute area under the ROC curve via the trapezoid rule.
 *
 * `predictions` is an array of `[predicted_score, ground_truth_label]` pairs.
 * Sorts by score descending, walks the curve one sample at a time, accumulates
 * trapezoid areas.
 *
 * Returns `0.5` for degenerate inputs (empty, or all one class).
 */
export function computeAucRoc(predictions: [number, number][]): number {
  if (predictions.length === 0) return 0.5;

  const totalPos = predictions.reduce((sum, [, l]) => sum + l, 0);
  const totalNeg = predictions.length - totalPos;

  if (totalPos === 0 || totalNeg === 0) return 0.5;

  // Sort by predicted score descending.
  const sorted = [...predictions].sort((a, b) => b[0] - a[0]);

  let auc = 0;
  let tprPrev = 0;
  let fprPrev = 0;
  let tp = 0;
  let fp = 0;

  for (const [, label] of sorted) {
    if (label >= 0.5) {
      tp += 1;
    } else {
      fp += 1;
    }

    const tpr = tp / totalPos;
    const fpr = fp / totalNeg;

    // Trapezoid area: base = delta FPR, height = average of adjacent TPRs.
    auc += (fpr - fprPrev) * (tpr + tprPrev) / 2;

    tprPrev = tpr;
    fprPrev = fpr;
  }

  return auc;
}

// ── NDCG@k ───────────────────────────────────────────────────────────────────

/**
 * Compute NDCG@k (Normalized Discounted Cumulative Gain).
 *
 * Predictions ranked by score descending; ideal ranking orders by label
 * descending. DCG = sum label_i / log2(i+2) for i in 0..k.
 *
 * Returns `1.0` when k == 0, empty, or iDCG is zero.
 */
export function computeNdcg(predictions: [number, number][], k: number): number {
  if (k === 0 || predictions.length === 0) return 1.0;

  const byScore = [...predictions].sort((a, b) => b[0] - a[0]);
  const byLabel = [...predictions].sort((a, b) => b[1] - a[1]);

  let dcg = 0;
  for (let i = 0; i < Math.min(k, byScore.length); i++) {
    dcg += byScore[i][1] / Math.log2(i + 2);
  }

  let idcg = 0;
  for (let i = 0; i < Math.min(k, byLabel.length); i++) {
    idcg += byLabel[i][1] / Math.log2(i + 2);
  }

  if (idcg === 0) return 1.0;
  return dcg / idcg;
}

// ── Full evaluation ──────────────────────────────────────────────────────────

/**
 * Evaluate a set of predicted scores against ground-truth labels.
 *
 * Uses `threshold` to binarize predictions, then computes confusion-matrix
 * metrics plus AUC-ROC and NDCG@10.
 *
 * `scores` are raw predicted values (e.g., opportunity score / 100).
 * `labels` are ground-truth booleans (true = positive / golden).
 */
export function evaluateScoring(
  scores: number[],
  labels: boolean[],
  threshold: number,
): ScoringEval {
  const n = scores.length;
  if (n === 0) {
    return {
      accuracy: 0, precision: 0, recall: 0, f1: 0,
      aucRoc: 0.5, ndcgAt10: 1.0,
      sampleCount: 0, positiveCount: 0, threshold,
    };
  }

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let positiveCount = 0;
  const predictions: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const predictedPos = scores[i] >= threshold;
    const actualPos = labels[i];

    predictions.push([scores[i], actualPos ? 1.0 : 0.0]);

    if (actualPos) positiveCount++;

    if (predictedPos && actualPos) tp++;
    else if (predictedPos && !actualPos) fp++;
    else if (!predictedPos && actualPos) fn++;
    else tn++;
  }

  const accuracy = (tp + tn) / n;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall);

  const aucRoc = computeAucRoc(predictions);
  const ndcgAt10 = computeNdcg(predictions, 10);

  return {
    accuracy, precision, recall, f1,
    aucRoc, ndcgAt10,
    sampleCount: n, positiveCount, threshold,
  };
}
