export type Chronotype = "early_bird" | "intermediate" | "night_owl";

interface HourRange {
  start: number; // 0-23
  end: number;
}

const optimalHours: Record<Chronotype, { high: HourRange; medium: HourRange; low: HourRange }> = {
  early_bird: {
    high: { start: 6, end: 10 },
    medium: { start: 10, end: 14 },
    low: { start: 14, end: 18 },
  },
  intermediate: {
    high: { start: 9, end: 12 },
    medium: { start: 13, end: 16 },
    low: { start: 16, end: 19 },
  },
  night_owl: {
    high: { start: 14, end: 18 },
    medium: { start: 18, end: 22 },
    low: { start: 10, end: 14 },
  },
};

export function getOptimalHours(chronotype: Chronotype) {
  return optimalHours[chronotype] ?? optimalHours.intermediate;
}

/**
 * Scores 0-1 how compatible a time slot is for a given energy preference.
 */
export function compatibilityScore(
  hour: number,
  energyPreference: "high" | "medium" | "low",
  chronotype: Chronotype = "intermediate"
): number {
  const hours = getOptimalHours(chronotype);
  const range = hours[energyPreference];

  if (hour >= range.start && hour < range.end) return 1.0;

  // Adjacent hours get partial credit
  const distFromStart = Math.abs(hour - range.start);
  const distFromEnd = Math.abs(hour - range.end);
  const minDist = Math.min(distFromStart, distFromEnd);

  if (minDist <= 1) return 0.7;
  if (minDist <= 2) return 0.4;
  return 0.1;
}

/**
 * Given a task's energy preference, suggest the best available time slot.
 */
export function suggestTimeSlot(
  energyPreference: "high" | "medium" | "low",
  chronotype: Chronotype,
  occupiedHours: Set<number>
): number | null {
  const hours = getOptimalHours(chronotype);
  const range = hours[energyPreference];

  // Try optimal range first
  for (let h = range.start; h < range.end; h++) {
    if (!occupiedHours.has(h)) return h;
  }

  // Expand search: +-2 hours from range
  for (let offset = 1; offset <= 2; offset++) {
    if (!occupiedHours.has(range.start - offset)) return range.start - offset;
    if (!occupiedHours.has(range.end + offset - 1)) return range.end + offset - 1;
  }

  return null;
}
