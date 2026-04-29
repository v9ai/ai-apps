"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CubeIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";

type ContainerSize = "1" | "2" | "3" | "4";

export function LoadingShell({ size = "4" }: { size?: ContainerSize }) {
  return (
    <Container size={size} p="6">
      <Text color="gray" role="status" aria-live="polite">
        Loading…
      </Text>
    </Container>
  );
}

export function ErrorShell({
  message,
  size = "4",
}: {
  message: string;
  size?: ContainerSize;
}) {
  return (
    <Container size={size} p="6">
      <Text color="red" role="alert">
        {message}
      </Text>
    </Container>
  );
}

export function SignInGate({
  message = "Please sign in to view this product.",
  size = "3",
}: {
  message?: string;
  size?: ContainerSize;
}) {
  return (
    <Container size={size} p="8">
      <Text color="gray">{message}</Text>
    </Container>
  );
}

export function ProductNotFound({
  slug,
  size = "4",
}: {
  slug: string;
  size?: ContainerSize;
}) {
  return (
    <Container size={size} p="6">
      <Flex direction="column" gap="3">
        <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon aria-hidden /> Products
        </Link>
        <Text color="gray">Product &ldquo;{slug}&rdquo; not found.</Text>
      </Flex>
    </Container>
  );
}

export function SubpageBreadcrumb({
  productSlug,
  productName,
  currentLabel,
}: {
  productSlug: string;
  productName: string;
  currentLabel: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={css({ mb: "5" })}>
      <Flex gap="2" align="center" asChild>
        <ol className={css({ listStyle: "none", p: 0, m: 0 })}>
          <li>
            <Link
              href={`/products/${productSlug}`}
              className={button({ variant: "ghost", size: "sm" })}
            >
              <ArrowLeftIcon aria-hidden /> {productName}
            </Link>
          </li>
          <li aria-hidden="true">
            <Text color="gray" size="2">
              /
            </Text>
          </li>
          <li>
            <Text size="3" weight="medium" aria-current="page">
              {currentLabel}
            </Text>
          </li>
        </ol>
      </Flex>
    </nav>
  );
}

export function SubpageHeroIcon() {
  return (
    <span
      aria-hidden="true"
      className={css({
        color: "accent.11",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        bg: "accent.3",
        borderRadius: "md",
        p: "3",
        boxShadow: "inset 0 0 0 1px token(colors.accent.6)",
      })}
    >
      <CubeIcon width="24" height="24" />
    </span>
  );
}

export function SubpageHero({
  productName,
  currentLabel,
  trailing,
}: {
  productName: string;
  currentLabel: string;
  trailing?: ReactNode;
}) {
  return (
    <Flex align="center" gap="3" wrap="wrap">
      <SubpageHeroIcon />
      <Heading size="7">
        {productName} · <Text color="gray">{currentLabel}</Text>
      </Heading>
      {trailing}
    </Flex>
  );
}

export function ProductExternalLink({
  url,
  domain,
  productName,
}: {
  url: string;
  domain?: string | null;
  productName: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${productName} website in new tab`}
      className={css({
        color: "accent.11",
        fontSize: "sm",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: "1",
        wordBreak: "break-all",
        borderRadius: "sm",
        _hover: { textDecoration: "underline" },
        _focusVisible: {
          outline: "2px solid",
          outlineColor: "accent.9",
          outlineOffset: "2px",
        },
      })}
    >
      {domain ?? url}
      <ExternalLinkIcon aria-hidden />
    </a>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const color: "green" | "red" | "orange" | "amber" | "blue" | "gray" =
    status === "success"
      ? "green"
      : status === "error"
        ? "red"
        : status === "timeout"
          ? "amber"
          : status === "running" || status === "pending"
            ? "blue"
            : "gray";
  const isInflight = status === "running" || status === "pending";
  const text = label ?? status;
  return (
    <Badge color={color} size="2">
      {text}
      {isInflight ? "…" : ""}
    </Badge>
  );
}
