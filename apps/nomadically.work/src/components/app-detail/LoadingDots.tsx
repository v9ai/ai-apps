"use client";

import { Flex, Box } from "@radix-ui/themes";

interface LoadingDotsProps {
  color?: string;
}

export function LoadingDots({ color = "var(--accent-9)" }: LoadingDotsProps) {
  return (
    <Flex gap="2">
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: color,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </Flex>
  );
}
