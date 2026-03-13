"use client";

import { Flex, Text, Tooltip } from "@radix-ui/themes";
import { getStreakTier } from "@/lib/algorithms/streaks";

const tierColors = {
  gray: "var(--streak-gray)",
  blue: "var(--streak-blue)",
  green: "var(--streak-green)",
  gold: "var(--streak-gold)",
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
  const color = tierColors[tier];

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
          {currentStreak > 0 ? "\uD83D\uDD25" : "\u26AA"}
        </Text>
        <Text size="2" weight="bold" style={{ color }}>
          {currentStreak}
        </Text>
        {freezeAvailable > 0 && (
          <Text style={{ fontSize: 12 }}>{"\u2744\uFE0F"}</Text>
        )}
      </Flex>
    </Tooltip>
  );
}
