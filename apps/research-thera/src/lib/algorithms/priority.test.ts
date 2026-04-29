import { describe, it, expect } from "vitest";
import {
  calculatePriorityScore,
  DEFAULT_WEIGHTS,
  type PriorityFactors,
} from "./priority";
import { addHours, subHours } from "date-fns";

describe("calculatePriorityScore", () => {
  const baseFactor: PriorityFactors = {
    dueDate: null,
    userValue: 3,
    dependencyCount: 0,
    hasBlockers: false,
  };

  it("returns 0-5 range", () => {
    const score = calculatePriorityScore(baseFactor);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(5);
  });

  it("overdue tasks score highest urgency", () => {
    const overdue = calculatePriorityScore({
      ...baseFactor,
      dueDate: subHours(new Date(), 2),
      userValue: 5,
    });
    const distant = calculatePriorityScore({
      ...baseFactor,
      dueDate: addHours(new Date(), 200),
      userValue: 5,
    });
    expect(overdue).toBeGreaterThan(distant);
  });

  it("higher user value increases score", () => {
    const high = calculatePriorityScore({ ...baseFactor, userValue: 5 });
    const low = calculatePriorityScore({ ...baseFactor, userValue: 1 });
    expect(high).toBeGreaterThan(low);
  });

  it("tasks blocking others score higher", () => {
    const blocker = calculatePriorityScore({
      ...baseFactor,
      dependencyCount: 3,
    });
    const standalone = calculatePriorityScore({
      ...baseFactor,
      dependencyCount: 0,
    });
    expect(blocker).toBeGreaterThan(standalone);
  });

  it("blocked tasks score lower", () => {
    const blocked = calculatePriorityScore({
      ...baseFactor,
      hasBlockers: true,
    });
    const unblocked = calculatePriorityScore({
      ...baseFactor,
      hasBlockers: false,
    });
    expect(blocked).toBeLessThan(unblocked);
  });

  it("respects custom weights", () => {
    const urgentWeights = {
      ...DEFAULT_WEIGHTS,
      deadlineUrgency: 0.8,
      userValue: 0.1,
      dependencyImpact: 0.05,
      projectWeight: 0.05,
    };
    const scoreOverdue = calculatePriorityScore(
      { ...baseFactor, dueDate: subHours(new Date(), 1), userValue: 1 },
      urgentWeights
    );
    const scoreHighValue = calculatePriorityScore(
      { ...baseFactor, dueDate: addHours(new Date(), 500), userValue: 5 },
      urgentWeights
    );
    expect(scoreOverdue).toBeGreaterThan(scoreHighValue);
  });

  it("no due date gives small baseline urgency", () => {
    const noDue = calculatePriorityScore({ ...baseFactor, dueDate: null });
    expect(noDue).toBeGreaterThan(0);
  });

  it("due in 24h is higher than due in 1 week", () => {
    const due24h = calculatePriorityScore({
      ...baseFactor,
      dueDate: addHours(new Date(), 20),
    });
    const dueWeek = calculatePriorityScore({
      ...baseFactor,
      dueDate: addHours(new Date(), 160),
    });
    expect(due24h).toBeGreaterThan(dueWeek);
  });
});
