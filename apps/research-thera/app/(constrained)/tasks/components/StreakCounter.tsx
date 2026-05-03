"use client";

import { Flex, Text, Tooltip } from "@radix-ui/themes";
import { getStreakTier } from "@/src/lib/algorithms/streaks";

const tierColors: Record<string, string> = {
  gray: "var(--gray-9)",
  blue: "var(--blue-9)",
  green: "var(--green-9)",
  gold: "var(--amber-9)",
};

export function StreakCounter({
  currentStreak,
  longestStreak,
  freezeAvailable,
  optedIn,
}: {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: number;
  optedIn: boolean;
}) {
  if (!optedIn) return null;

  const tier = getStreakTier(currentStreak);
  const color = tierColors[tier] ?? tierColors.gray;

  return (
    <Tooltip
      content={`Current: ${currentStreak} days | Best: ${longestStreak} days${
        freezeAvailable > 0 ? ` | ${freezeAvailable} freeze available` : ""
      }`}
    >
      <Flex
        align="center"
        gap="1"
        style={{
          padding: "4px 10px",
          borderRadius: 8,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          cursor: "default",
        }}
      >
        <Text style={{ color, fontSize: 16 }}>
          {currentStreak > 0 ? "🔥" : "⚪"}
        </Text>
        <Text size="2" weight="bold" style={{ color }}>
          {currentStreak}
        </Text>
        {freezeAvailable > 0 && <Text style={{ fontSize: 12 }}>❄️</Text>}
      </Flex>
    </Tooltip>
  );
}
