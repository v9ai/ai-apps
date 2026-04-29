import { differenceInCalendarDays } from "date-fns";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: Date | null;
  freezeAvailable: number;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: Date;
  freezeAvailable: number;
  action: "increment" | "maintain" | "freeze" | "recovery" | "reset";
}

/**
 * Evaluate streak after a task completion.
 * - Same day: maintain
 * - Next day: increment
 * - 2-3 days gap: use freeze if available, else reset (3-day grace)
 * - >3 days: reset
 */
export function evaluateStreak(
  state: StreakState,
  completionDate: Date = new Date()
): StreakResult {
  const { currentStreak, longestStreak, lastCompletedDate, freezeAvailable } =
    state;

  // First ever completion
  if (!lastCompletedDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastCompletedDate: completionDate,
      freezeAvailable,
      action: "increment",
    };
  }

  const daysSinceLast = differenceInCalendarDays(
    completionDate,
    lastCompletedDate
  );

  // Same day — maintain
  if (daysSinceLast === 0) {
    return {
      currentStreak,
      longestStreak,
      lastCompletedDate: completionDate,
      freezeAvailable,
      action: "maintain",
    };
  }

  // Next day — increment
  if (daysSinceLast === 1) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(longestStreak, newStreak),
      lastCompletedDate: completionDate,
      freezeAvailable,
      action: "increment",
    };
  }

  // 2-3 day gap — freeze if available (grace period)
  if (daysSinceLast <= 3 && freezeAvailable > 0) {
    return {
      currentStreak, // preserve streak
      longestStreak,
      lastCompletedDate: completionDate,
      freezeAvailable: freezeAvailable - 1,
      action: "freeze",
    };
  }

  // 2-3 day gap, no freeze — recovery (partial credit)
  if (daysSinceLast <= 3) {
    const recovered = Math.max(1, Math.floor(currentStreak / 2));
    return {
      currentStreak: recovered,
      longestStreak,
      lastCompletedDate: completionDate,
      freezeAvailable: 0,
      action: "recovery",
    };
  }

  // >3 days — full reset
  return {
    currentStreak: 1,
    longestStreak,
    lastCompletedDate: completionDate,
    freezeAvailable: 0,
    action: "reset",
  };
}

export function getStreakTier(
  streak: number
): "gray" | "blue" | "green" | "gold" {
  if (streak >= 30) return "gold";
  if (streak >= 14) return "green";
  if (streak >= 3) return "blue";
  return "gray";
}
