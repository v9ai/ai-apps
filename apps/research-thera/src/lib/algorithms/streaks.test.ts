import { describe, it, expect } from "vitest";
import { evaluateStreak, getStreakTier, type StreakState } from "./streaks";
import { addDays, subDays } from "date-fns";

const today = new Date(2026, 2, 13, 12, 0, 0); // March 13, 2026 noon

describe("evaluateStreak", () => {
  it("starts streak at 1 on first completion", () => {
    const state: StreakState = {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("increment");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it("maintains streak on same-day completion", () => {
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: today,
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("maintain");
    expect(result.currentStreak).toBe(5);
  });

  it("increments streak on next-day completion", () => {
    const state: StreakState = {
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: subDays(today, 1),
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("increment");
    expect(result.currentStreak).toBe(6);
  });

  it("updates longest streak when current exceeds it", () => {
    const state: StreakState = {
      currentStreak: 10,
      longestStreak: 10,
      lastCompletedDate: subDays(today, 1),
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.longestStreak).toBe(11);
  });

  it("uses freeze on 2-day gap", () => {
    const state: StreakState = {
      currentStreak: 7,
      longestStreak: 15,
      lastCompletedDate: subDays(today, 2),
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("freeze");
    expect(result.currentStreak).toBe(7); // preserved
    expect(result.freezeAvailable).toBe(0);
  });

  it("uses freeze on 3-day gap", () => {
    const state: StreakState = {
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: subDays(today, 3),
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("freeze");
    expect(result.currentStreak).toBe(3);
  });

  it("recovers with half credit when no freeze available (2-3 day gap)", () => {
    const state: StreakState = {
      currentStreak: 8,
      longestStreak: 15,
      lastCompletedDate: subDays(today, 2),
      freezeAvailable: 0,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("recovery");
    expect(result.currentStreak).toBe(4); // floor(8/2)
  });

  it("recovery gives at least 1", () => {
    const state: StreakState = {
      currentStreak: 1,
      longestStreak: 5,
      lastCompletedDate: subDays(today, 3),
      freezeAvailable: 0,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("recovery");
    expect(result.currentStreak).toBe(1);
  });

  it("resets on >3 day gap", () => {
    const state: StreakState = {
      currentStreak: 20,
      longestStreak: 20,
      lastCompletedDate: subDays(today, 5),
      freezeAvailable: 1,
    };
    const result = evaluateStreak(state, today);
    expect(result.action).toBe("reset");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(20); // preserved
  });
});

describe("getStreakTier", () => {
  it("returns gray for <3", () => {
    expect(getStreakTier(0)).toBe("gray");
    expect(getStreakTier(2)).toBe("gray");
  });

  it("returns blue for 3-13", () => {
    expect(getStreakTier(3)).toBe("blue");
    expect(getStreakTier(13)).toBe("blue");
  });

  it("returns green for 14-29", () => {
    expect(getStreakTier(14)).toBe("green");
    expect(getStreakTier(29)).toBe("green");
  });

  it("returns gold for 30+", () => {
    expect(getStreakTier(30)).toBe("gold");
    expect(getStreakTier(100)).toBe("gold");
  });
});
