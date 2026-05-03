"use client";

import { Box, Flex, Text } from "@radix-ui/themes";

export function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  // Endowed progress effect: start at 10%
  const baseProgress = 10;
  const actualProgress =
    total === 0
      ? baseProgress
      : baseProgress + (completed / total) * (100 - baseProgress);

  return (
    <Flex direction="column" gap="1">
      <Flex justify="between" align="center">
        <Text size="1" color="gray">
          Daily progress
        </Text>
        <Text size="1" color="gray">
          {completed}/{total}
        </Text>
      </Flex>
      <Box
        style={{
          height: 6,
          borderRadius: 3,
          background: "var(--gray-a4)",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            height: "100%",
            width: `${Math.min(100, actualProgress)}%`,
            borderRadius: 3,
            background:
              actualProgress >= 100
                ? "var(--gold-9)"
                : "var(--accent-9)",
            transition: "width 500ms ease-out",
          }}
        />
      </Box>
    </Flex>
  );
}
