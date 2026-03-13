"use client";

import { Badge } from "@radix-ui/themes";

export function PriorityBadge({
  score,
  manual,
}: {
  score?: number | null;
  manual?: number | null;
}) {
  const value = manual ?? score ?? 0;

  if (value >= 4) {
    return (
      <Badge color="red" variant="soft" size="1">
        High
      </Badge>
    );
  }

  if (value >= 2) {
    return (
      <Badge color="yellow" variant="soft" size="1">
        Medium
      </Badge>
    );
  }

  if (value > 0) {
    return (
      <Badge color="gray" variant="soft" size="1">
        Low
      </Badge>
    );
  }

  return null;
}
