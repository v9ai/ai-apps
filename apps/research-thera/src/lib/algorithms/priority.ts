import { differenceInHours } from "date-fns";

export interface PriorityFactors {
  dueDate: Date | null;
  userValue: number; // 1–5, manual or AI-assigned
  dependencyCount: number; // how many tasks this blocks
  hasBlockers: boolean; // is this task blocked?
}

export interface PriorityWeights {
  deadlineUrgency: number;
  userValue: number;
  dependencyImpact: number;
  projectWeight: number;
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  deadlineUrgency: 0.4,
  userValue: 0.3,
  dependencyImpact: 0.2,
  projectWeight: 0.1,
};

/**
 * Calculates a 0–5 priority score based on weighted factors.
 */
export function calculatePriorityScore(
  factors: PriorityFactors,
  weights: PriorityWeights = DEFAULT_WEIGHTS
): number {
  const urgency = calculateDeadlineUrgency(factors.dueDate);
  const value = normalizeValue(factors.userValue);
  const depImpact = calculateDependencyImpact(
    factors.dependencyCount,
    factors.hasBlockers
  );
  // projectWeight is a placeholder for future project-level priority
  const project = 0.5;

  const raw =
    urgency * weights.deadlineUrgency +
    value * weights.userValue +
    depImpact * weights.dependencyImpact +
    project * weights.projectWeight;

  // Scale to 0–5
  return Math.round(raw * 5 * 100) / 100;
}

/**
 * Deadline urgency: 0 (no deadline or far out) → 1 (overdue or <4h)
 */
function calculateDeadlineUrgency(dueDate: Date | null): number {
  if (!dueDate) return 0.1; // small baseline for undated tasks

  const hoursUntilDue = differenceInHours(dueDate, new Date());

  if (hoursUntilDue <= 0) return 1.0; // overdue
  if (hoursUntilDue <= 4) return 0.95;
  if (hoursUntilDue <= 24) return 0.8;
  if (hoursUntilDue <= 72) return 0.6;
  if (hoursUntilDue <= 168) return 0.4; // 1 week
  return 0.2;
}

/**
 * Normalize user value 1–5 to 0–1
 */
function normalizeValue(value: number): number {
  return Math.max(0, Math.min(1, (value - 1) / 4));
}

/**
 * Dependency impact: more blocked tasks = higher urgency.
 * Blocked tasks themselves get deprioritized.
 */
function calculateDependencyImpact(
  dependencyCount: number,
  hasBlockers: boolean
): number {
  if (hasBlockers) return 0.1; // deprioritize blocked tasks
  if (dependencyCount === 0) return 0.5;
  if (dependencyCount === 1) return 0.7;
  if (dependencyCount <= 3) return 0.85;
  return 1.0;
}
