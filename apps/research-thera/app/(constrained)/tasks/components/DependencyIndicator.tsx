"use client";

import { Badge, Tooltip } from "@radix-ui/themes";

export function DependencyIndicator({
  blockers,
}: {
  blockers: { id: string; title: string; status: string }[];
}) {
  if (blockers.length === 0) return null;

  const allResolved = blockers.every((b) => b.status === "completed");

  return (
    <Tooltip
      content={blockers
        .map((b) => `${b.status === "completed" ? "✓" : "○"} ${b.title}`)
        .join("\n")}
    >
      <Badge
        variant="soft"
        color={allResolved ? "green" : "orange"}
        size="1"
        style={{ cursor: "help" }}
      >
        {allResolved ? "🔓" : "🔒"} {blockers.length} dep
        {blockers.length !== 1 ? "s" : ""}
      </Badge>
    </Tooltip>
  );
}
