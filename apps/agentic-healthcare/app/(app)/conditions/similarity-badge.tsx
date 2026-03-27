"use client";

import { Badge, Tooltip } from "@radix-ui/themes";

function getColor(pct: number): "green" | "indigo" | "gray" {
  if (pct >= 70) return "green";
  if (pct >= 50) return "indigo";
  return "gray";
}

export function SimilarityBadge({ similarity }: { similarity: number }) {
  const pct = Math.round(similarity * 100);
  return (
    <Tooltip content={`Similarity: ${(similarity * 100).toFixed(1)}%`}>
      <Badge color={getColor(pct)} variant="soft" size="1" style={{ cursor: "default" }}>
        {pct}% match
      </Badge>
    </Tooltip>
  );
}
