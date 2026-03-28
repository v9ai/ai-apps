/**
 * Pipeline Results — Check & Improve
 *
 * Unified module that evaluates pipeline quality across all stages
 * and generates prioritized improvement actions.
 *
 * Usage:
 *   import { runPipelineCheck, applyImprovements } from "@/evals/pipeline-results";
 *
 *   const report = await runPipelineCheck();
 *   console.log(report.compositeScore, report.severity);
 *
 *   // Apply safe improvements (RE_ENRICH, FLAG_STALE, PAUSE_DOMAIN)
 *   const results = await applyImprovements(report.improvements);
 *
 * @module pipeline-results
 */

export * from "./schema";
export * from "./checkers";
export { diagnose, hydrate, applyImprovement } from "./improver";

import {
  checkDiscovery,
  checkEnrichment,
  checkContacts,
  checkOutreach,
} from "./checkers";
import { diagnose, hydrate, applyImprovement } from "./improver";
import type {
  PipelineCheckResult,
  Severity,
  Thresholds,
  ApplyResult,
  Improvement,
} from "./schema";
import { DEFAULT_THRESHOLDS } from "./schema";

// Stage weights for composite score
const STAGE_WEIGHTS = {
  discovery: 0.2,
  enrichment: 0.3,
  contacts: 0.3,
  outreach: 0.2,
} as const;

function overallSeverity(score: number): Severity {
  if (score >= 0.8) return "OK";
  if (score >= 0.5) return "WARNING";
  return "CRITICAL";
}

/**
 * Run a full pipeline quality check.
 *
 * Queries the database, scores each stage, diagnoses issues,
 * and returns a prioritized list of improvements with target IDs.
 */
export async function runPipelineCheck(
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Promise<PipelineCheckResult> {
  // Run all stage checks in parallel
  const [discovery, enrichment, contactsResult, outreach] = await Promise.all([
    checkDiscovery(thresholds.discovery),
    checkEnrichment(thresholds.enrichment),
    checkContacts(thresholds.contacts),
    checkOutreach(thresholds.outreach),
  ]);

  const stages = [discovery, enrichment, contactsResult, outreach];

  // Weighted composite score
  const compositeScore =
    discovery.score * STAGE_WEIGHTS.discovery +
    enrichment.score * STAGE_WEIGHTS.enrichment +
    contactsResult.score * STAGE_WEIGHTS.contacts +
    outreach.score * STAGE_WEIGHTS.outreach;

  // Diagnose and hydrate improvements
  const rawImprovements = diagnose(stages);
  const improvements = await hydrate(rawImprovements);

  return {
    timestamp: new Date().toISOString(),
    compositeScore,
    severity: overallSeverity(compositeScore),
    stages,
    improvements,
  };
}

/**
 * Apply all safe improvements from a pipeline check.
 *
 * "Safe" = can be applied without external services:
 * RE_ENRICH, FLAG_STALE, PAUSE_DOMAIN.
 *
 * Returns results for each applied improvement.
 * External-dependent actions (RE_VERIFY, EXPAND_CONTACTS, etc.)
 * are skipped with a message indicating they need agent execution.
 */
export async function applyImprovements(
  improvements: Improvement[],
): Promise<ApplyResult[]> {
  const results: ApplyResult[] = [];
  for (const imp of improvements) {
    results.push(await applyImprovement(imp));
  }
  return results;
}
