"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
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
      className={`${button({ variant: "link", size: "sm" })} ${css({ wordBreak: "break-all" })}`}
    >
      {domain ?? url}
      <ExternalLinkIcon aria-hidden />
    </a>
  );
}

/**
 * SectionHeading — shared section header used across product subpages so that
 * Positioning / ICP / Competitors / Pricing / GTM all read with the same rhythm:
 * a small uppercase eyebrow on the left, the title on the next line, and an
 * optional count badge / trailing element on the right.
 *
 * Additive: existing files using <Heading size="4"> directly continue to work.
 */
export function SectionHeading({
  eyebrow,
  title,
  count,
  description,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <Flex
      direction="column"
      gap="1"
      mb="3"
      className={css({ borderBottom: "1px solid", borderColor: "ui.border", pb: "2" })}
    >
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Flex direction="column" gap="1">
          {eyebrow && (
            <Text
              size="1"
              className={css({
                color: "gray.10",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: "medium",
              })}
            >
              {eyebrow}
            </Text>
          )}
          <Flex align="baseline" gap="2">
            <Heading size="4" className={css({ color: "gray.12" })}>
              {title}
            </Heading>
            {typeof count === "number" && (
              <Text size="2" className={css({ color: "gray.10", fontVariantNumeric: "tabular-nums" })}>
                {count}
              </Text>
            )}
          </Flex>
        </Flex>
        {trailing}
      </Flex>
      {description && (
        <Text size="2" color="gray" as="p" className={css({ maxWidth: "60ch" })}>
          {description}
        </Text>
      )}
    </Flex>
  );
}

/**
 * SectionCard — shared card surface for evidence rows across the cluster.
 * Use this instead of one-off `cardStyle` so padding / border / hover stay
 * consistent across Positioning, ICP, and Competitors.
 */
export function SectionCard({
  children,
  emphasized = false,
  className,
}: {
  children: ReactNode;
  emphasized?: boolean;
  className?: string;
}) {
  const base = css({
    bg: "ui.surface",
    border: "1px solid",
    borderColor: emphasized ? "accent.6" : "ui.border",
    borderRadius: "md",
    p: { base: "4", md: "5" },
    transition: "border-color 150ms ease, background 150ms ease",
    _hover: {
      borderColor: emphasized ? "accent.7" : "gray.7",
    },
  });
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}

/**
 * SectionOpener — numbered editorial section heading. Renders:
 *   01 — POSITIONING                            ─────────
 * The number uses the display serif (Instrument Serif), the label uses Inter
 * uppercase with editorial letter-spacing, and a flexible 1px hairline trails
 * to the right edge.
 *
 * Numbers are sequential by RENDERED order (sections that don't render due to
 * missing data don't take up a number).
 */
export function SectionOpener({
  number,
  label,
  id,
}: {
  number: string;
  label: string;
  id?: string;
}) {
  return (
    <Flex align="baseline" gap="3" mb="5" id={id}>
      <span
        style={{ fontFamily: "var(--font-instrument), Georgia, 'Times New Roman', serif" }}
        className={css({
          fontSize: "2xl",
          fontWeight: 400,
          color: "ui.heading",
          fontVariantNumeric: "tabular-nums",
          lineHeight: "1",
        })}
      >
        {number}
      </span>
      <span
        aria-hidden="true"
        style={{ fontFamily: "var(--font-instrument), Georgia, 'Times New Roman', serif" }}
        className={css({ color: "ui.tertiary", fontSize: "lg" })}
      >
        —
      </span>
      <Text
        as="span"
        size="1"
        className={css({
          letterSpacing: "editorial",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "ui.secondary",
        })}
      >
        {label}
      </Text>
      <span
        aria-hidden="true"
        className={css({ flex: 1, height: "1px", bg: "ui.border", alignSelf: "center" })}
      />
    </Flex>
  );
}

type DossierTone = "neutral" | "indigo" | "green" | "amber" | "orange" | "accent";

const dossierToneColor: Record<DossierTone, string> = {
  neutral: "gray.7",
  indigo: "indigo.9",
  green: "green.9",
  amber: "amber.9",
  orange: "#F76808",
  accent: "accent.9",
};

/**
 * DossierCard — replaces the per-category cardCls/positioningCardCls/etc.
 * Bonded-paper surface: 2-stop background gradient (surfaceRaised → surface),
 * 1px ui.border, top edge brightened with whiteAlpha.6 for an etched feel,
 * and a 24×2px file-tab marker at the top-left in the tone color.
 *
 * Hover: 1px translateY lift + borderHover (no shadow change — keeps the
 * cut-and-pasted-from-document feel).
 */
export function DossierCard({
  tone = "neutral",
  className,
  children,
  ...rest
}: {
  tone?: DossierTone;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const accent = dossierToneColor[tone];
  const base = css({
    position: "relative",
    background: "linear-gradient(180deg, token(colors.ui.surfaceRaised) 0%, token(colors.ui.surface) 100%)",
    border: "1px solid token(colors.ui.border)",
    borderTopColor: "whiteAlpha.6",
    borderRadius: "md",
    p: "5",
    transition:
      "transform 150ms cubic-bezier(0.16, 1, 0.30, 1), border-color 150ms ease",
    willChange: "transform",
    _hover: {
      borderColor: "ui.borderHover",
      borderTopColor: "whiteAlpha.8",
      transform: "translateY(-1px)",
    },
    _before: {
      content: '""',
      position: "absolute",
      top: 0,
      left: "20px",
      width: "24px",
      height: "2px",
      background: accent,
    },
  });
  return (
    <article className={className ? `${base} ${className}` : base} {...rest}>
      {children}
    </article>
  );
}

/**
 * HeroStatTrio — three vertically-stacked stat rows in a glass card.
 * Used in the product detail hero to replace the auto-fit highlights.stats strip.
 * Each row staggers in via the panda `slideUp` animation token.
 */
export function HeroStatTrio({
  stats,
}: {
  stats: { label: string; value: string; tone?: "default" | "hot" | "icp" | "muted" }[];
}) {
  const toneColor = (tone?: string) =>
    tone === "hot" ? "red.11" : tone === "icp" ? "green.11" : "gray.12";
  const rowEntranceCls = css({
    animation: "slideUp",
    animationFillMode: "both",
  });
  return (
    <div
      className={css({
        background: "whiteAlpha.5",
        border: "1px solid token(colors.whiteAlpha.10)",
        borderRadius: "lg",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      })}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`${rowEntranceCls} ${css({
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "3",
            px: "5",
            py: { base: "4", md: "5" },
            borderBottom: i < stats.length - 1 ? "1px solid token(colors.ui.border)" : "none",
          })}`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <Text
            size="1"
            className={css({
              letterSpacing: "editorial",
              textTransform: "uppercase",
              color: "ui.tertiary",
              fontWeight: 500,
            })}
          >
            {s.label}
          </Text>
          <span
            className={css({
              fontSize: "3xl",
              fontWeight: 600,
              color: toneColor(s.tone),
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "tight",
              lineHeight: "1",
            })}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * OutreachCTA — glass anchor card placed near the bottom of the product
 * detail page. Two buttons: gradient primary → leads, ghost secondary → intel.
 */
export function OutreachCTA({
  slug,
  hotCount,
  hasIntel,
}: {
  slug: string;
  hotCount: number;
  hasIntel: boolean;
}) {
  return (
    <section
      id="outreach"
      className={css({
        scrollMarginTop: "96px",
        background: "whiteAlpha.5",
        border: "1px solid token(colors.whiteAlpha.10)",
        backdropFilter: "blur(12px)",
        borderRadius: "lg",
        p: "8",
        textAlign: "center",
      })}
    >
      <Heading size="6" className={css({ color: "ui.heading", mb: "2" })}>
        Ready to run this product through outbound?
      </Heading>
      <Text
        as="p"
        size="3"
        color="gray"
        className={css({ mb: "5", maxWidth: "52ch", marginInline: "auto" })}
      >
        {hotCount > 0
          ? `${hotCount} hot lead${hotCount === 1 ? "" : "s"} queued · drafts auto-generated with product-aware mode`
          : "Drafts auto-generated with product-aware mode"}
      </Text>
      <Flex gap="3" justify="center" wrap="wrap">
        <Link
          href={`/products/${slug}/leads`}
          className={button({ variant: "gradient", size: "lg" })}
        >
          Open lead board <ArrowRightIcon aria-hidden />
        </Link>
        {hasIntel && (
          <Link
            href={`/products/${slug}/intel`}
            className={button({ variant: "ghost", size: "lg" })}
          >
            View intel report
          </Link>
        )}
      </Flex>
    </section>
  );
}

/**
 * Colophon — replaces the meta footer (icons + text rows). Renders a single
 * editorial line: FILED · SOURCE · BY · REF/SLUG.
 */
export function Colophon({
  filedAt,
  source,
  by,
  refSlug,
}: {
  filedAt: string;
  source?: string | null;
  by?: string | null;
  refSlug: string;
}) {
  const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(filedAt)
  );
  const parts: string[] = [`FILED ${dateLabel}`];
  if (source) parts.push(`SOURCE ${source}`);
  if (by) parts.push(`BY ${by}`);
  parts.push(`REF/${refSlug.toUpperCase()}`);
  return (
    <div
      className={css({
        mt: "2",
        pt: "5",
        borderTop: "1px solid token(colors.ui.border)",
      })}
    >
      <Text
        as="p"
        className={css({
          fontSize: "11px",
          letterSpacing: "editorial",
          textTransform: "uppercase",
          color: "ui.tertiary",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
        })}
      >
        {parts.join(" · ")}
      </Text>
    </div>
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
