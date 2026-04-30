"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Avatar, Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui";
import { css } from "styled-system/css";

export function CompanyAvatar({
  name,
  logoUrl,
  size = "5",
}: {
  name: string;
  logoUrl?: string | null;
  size?: React.ComponentProps<typeof Avatar>["size"];
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <Avatar
      size={size}
      src={logoUrl ?? undefined}
      fallback={initials}
      radius="full"
      color="indigo"
      style={{ flexShrink: 0 }}
    />
  );
}

export function Chip({
  children,
  title,
  color = "gray",
  variant = "surface",
}: {
  children: React.ReactNode;
  title?: string;
  color?: React.ComponentProps<typeof Badge>["color"];
  variant?: React.ComponentProps<typeof Badge>["variant"];
}) {
  return (
    <Badge color={color} variant={variant} size="1" title={title}>
      <Text truncate>{children}</Text>
    </Badge>
  );
}

export function CollapsibleChips({
  items,
  visibleCount = 8,
}: {
  items: string[];
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => items.map((x) => x.trim()).filter(Boolean),
    [items],
  );

  const canCollapse = normalized.length > visibleCount;
  const shown = expanded ? normalized : normalized.slice(0, visibleCount);

  return (
    <Box>
      <Flex gap="2" wrap="wrap">
        {shown.map((item) => (
          <Chip key={item} title={item}>
            {item}
          </Chip>
        ))}
      </Flex>

      {canCollapse && (
        <Box mt="3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {expanded ? "Show less" : `Show more (${normalized.length - visibleCount})`}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card>
      <Box p="4">
        <Flex align="center" justify="between" gap="3">
          <Text
            size="2"
            color="gray"
            weight="medium"
            className={css({ letterSpacing: "0.1em" })}
          >
            {title.toUpperCase()}
          </Text>
          {right}
        </Flex>
        <Box mt="3">{children}</Box>
      </Box>
    </Card>
  );
}
