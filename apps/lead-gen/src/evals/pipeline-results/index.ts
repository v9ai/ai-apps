/**
 * Pipeline Results — ML Scoring & Improvement Engine
 *
 * Pure numerical pipeline: feature extraction, weighted scoring,
 * isotonic calibration, conformal prediction, drift detection,
 * and online gradient-based weight learning.
 *
 * Usage:
 *   import { extractAllFeatures, scoreBatch, initStageModel } from "@/evals/pipeline-results";
 *   import { diagnose, onlineUpdate } from "@/evals/pipeline-results";
 *
 * @module pipeline-results
 */

export * from "./schema";
export * from "./features";
export * from "./scorer";
export { diagnose, onlineUpdate } from "./improver";
