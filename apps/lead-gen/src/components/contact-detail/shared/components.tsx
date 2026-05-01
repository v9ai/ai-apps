"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Avatar, Badge, Box, Card, Flex, Text } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui";
import { css } from "styled-system/css";
import { initialsOf } from "./utils";

export function ContactAvatar({
  firstName,
  lastName,
  src,
  size = "5",
}: {
  firstName?: string | null;
  lastName?: string | null;
  src?: string | null;
  size?: React.ComponentProps<typeof Avatar>["size"];
}) {
  return (
    <Avatar
      size={size}
      src={src ?? undefined}
      fallback={initialsOf(firstName, lastName)}
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
  color = "gray",
}: {
  items: string[];
  visibleCount?: number;
  color?: React.ComponentProps<typeof Badge>["color"];
}) {
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(
    () => items.map((x) => x.trim()).filter(Boolean),
    [items],
  );

  const canCollapse = normalized.length > visibleCount;
  const shown = expanded ? normalized : normalized.slice(0, visibleCount);

  if (normalized.length === 0) return null;

  return (
    <Box>
      <Flex gap="2" wrap="wrap">
        {shown.map((item) => (
          <Chip key={item} title={item} color={color}>
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

export function StatTile({
  label,
  value,
  hint,
  tone = "gray",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "gray" | "green" | "amber" | "red" | "indigo";
}) {
  return (
    <Card>
      <Box p="4">
        <Text
          size="1"
          color="gray"
          weight="medium"
          className={css({ letterSpacing: "0.1em" })}
        >
          {label.toUpperCase()}
        </Text>
        <Box mt="2">
          <Text
            size="7"
            weight="bold"
            color={tone === "gray" ? undefined : tone}
            className={css({ display: "block", lineHeight: 1.1 })}
          >
            {value}
          </Text>
        </Box>
        {hint && (
          <Box mt="2">
            <Text size="1" color="gray">
              {hint}
            </Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}
