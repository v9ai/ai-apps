"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";
import { Button } from "@/components/ui";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import {
  CubeIcon,
  DotsVerticalIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import {
  Crosshair,
  DollarSign,
  Rocket,
  Sparkles,
  Trash2,
  Eye,
} from "lucide-react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { stagger } from "@/recipes/motion";
import {
  useProductRunsLive,
  isInflight,
  type IntelKind,
} from "@/lib/use-product-runs-live";

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  url: string;
  domain: string | null;
  description: string | null;
  icpAnalysis: unknown | null;
  pricingAnalysis: unknown | null;
  gtmAnalysis: unknown | null;
  intelReport: unknown | null;
  icpAnalyzedAt: string | null;
  pricingAnalyzedAt: string | null;
  gtmAnalyzedAt: string | null;
  intelReportAt: string | null;
};

export type ProductCardProps = {
  product: ProductRow;
  index: number;
  isAdmin: boolean;
  onAnalyzeIcp: (id: number, slug: string) => void | Promise<void>;
  onAnalyzePricing: (id: number) => void | Promise<void>;
  onAnalyzeGtm: (id: number) => void | Promise<void>;
  onRunFullIntel: (id: number) => void | Promise<void>;
  onDelete: (id: number, name: string) => void;
};

function elapsedSeconds(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
}

export function ProductCard({
  product: p,
  index,
  isAdmin,
  onAnalyzeIcp,
  onAnalyzePricing,
  onAnalyzeGtm,
  onRunFullIntel,
  onDelete,
}: ProductCardProps) {
  const router = useRouter();
  const { runs } = useProductRunsLive(p.id, p.name);

  const [, forceTick] = useState(0);
  const anyRunning = useMemo(
    () =>
      isInflight(runs.icp) ||
      isInflight(runs.pricing) ||
      isInflight(runs.gtm) ||
      isInflight(runs.product_intel),
    [runs.icp, runs.pricing, runs.gtm, runs.product_intel],
  );

  // Tick once a second while a run is in flight so elapsed counters update.
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [anyRunning]);

  const intelRunning = isInflight(runs.product_intel);
  const icpRunning = isInflight(runs.icp);
  const pricingRunning = isInflight(runs.pricing);
  const gtmRunning = isInflight(runs.gtm);

  const state: "running" | "full" | "partial" | "cold" = intelRunning
    ? "running"
    : p.intelReport
      ? "full"
      : p.icpAnalysis || p.pricingAnalysis || p.gtmAnalysis
        ? "partial"
        : "cold";

  // Per-kind state for the unified progress bar.
  type KindState = "complete" | "running" | "errored" | "none";
  const KIND_ORDER: readonly IntelKind[] = ["icp", "pricing", "gtm", "product_intel"] as const;
  const kindTimestamp: Record<IntelKind, string | null> = {
    icp: p.icpAnalyzedAt,
    pricing: p.pricingAnalyzedAt,
    gtm: p.gtmAnalyzedAt,
    product_intel: p.intelReportAt,
  };
  function kindState(kind: IntelKind): KindState {
    const run = runs[kind];
    if (isInflight(run)) return "running";
    if (run?.status === "error" || run?.status === "timeout") return "errored";
    if (kindTimestamp[kind] || run?.status === "success") return "complete";
    return "none";
  }
  const kindStates: Record<IntelKind, KindState> = {
    icp: kindState("icp"),
    pricing: kindState("pricing"),
    gtm: kindState("gtm"),
    product_intel: kindState("product_intel"),
  };
  const erroredKinds = KIND_ORDER.filter((k) => kindStates[k] === "errored");

  // Tagline: first sentence of description, or first ~90 chars, no clamp.
  function buildTagline(text: string): string {
    if (!text) return "";
    const firstSentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
    if (firstSentence.length <= 110) return firstSentence;
    return text.slice(0, 90).trimEnd() + "…";
  }
  const tagline = buildTagline(p.description?.trim() ?? "");

  // Freshness: most-recent of the four AnalyzedAt timestamps.
  const mostRecentAnalyzedAt = (() => {
    const candidates = [
      p.icpAnalyzedAt,
      p.pricingAnalyzedAt,
      p.gtmAnalyzedAt,
      p.intelReportAt,
    ].filter((v): v is string => !!v);
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, ts) => (Date.parse(ts) > Date.parse(latest) ? ts : latest));
  })();
  const freshnessLabel = mostRecentAnalyzedAt
    ? `Last analyzed ${formatDistanceToNow(new Date(mostRecentAnalyzedAt), { addSuffix: true })}`
    : "Not yet analyzed";
  const freshnessDotColor = mostRecentAnalyzedAt
    ? (() => {
        const ageDays = differenceInDays(new Date(), new Date(mostRecentAnalyzedAt));
        if (ageDays < 7) return "var(--green-9)";
        if (ageDays < 30) return "var(--amber-9)";
        return "var(--gray-8)";
      })()
    : "var(--gray-7)";

  // State-aware primary CTA.
  type CTA =
    | { kind: "link"; label: string; href: string; variant: "outline" | "gradient" | "solid" | "ghost" }
    | { kind: "action"; label: string; onClick: () => void; variant: "outline" | "gradient" | "solid" | "ghost" };
  const primaryCTA: CTA = (() => {
    if (!isAdmin) {
      return { kind: "link", label: "Open report →", href: `/products/${p.slug}`, variant: "outline" };
    }
    if (erroredKinds.length > 0) {
      const firstErrored = erroredKinds[0];
      const handler =
        firstErrored === "icp"
          ? () => onAnalyzeIcp(p.id, p.slug)
          : firstErrored === "pricing"
            ? () => onAnalyzePricing(p.id)
            : firstErrored === "gtm"
              ? () => onAnalyzeGtm(p.id)
              : () => onRunFullIntel(p.id);
      return { kind: "action", label: "Resume run", onClick: handler, variant: "solid" };
    }
    if (state === "running") {
      return { kind: "link", label: "View live run", href: `/products/${p.slug}`, variant: "outline" };
    }
    if (state === "full") {
      return { kind: "link", label: "Open report", href: `/products/${p.slug}`, variant: "outline" };
    }
    if (state === "partial") {
      return {
        kind: "action",
        label: "Continue → Run full intel",
        onClick: () => onRunFullIntel(p.id),
        variant: "gradient",
      };
    }
    return {
      kind: "action",
      label: "Run ICP",
      onClick: () => onAnalyzeIcp(p.id, p.slug),
      variant: "gradient",
    };
  })();

  // State-tinted accents for the top border + hover glow.
  const accentColor =
    state === "running"
      ? "var(--accent-9)"
      : state === "full"
        ? "var(--green-9)"
        : state === "partial"
          ? "var(--orange-9)"
          : "var(--gray-7)";

  const cardCls = useMemo(
    () =>
      css({
        position: "relative",
        bg: "ui.surface",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        p: "5",
        overflow: "hidden",
        transition:
          "border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease",
        _hover: {
          borderColor: "ui.borderHover",
          transform: "translateY(-2px)",
        },
      }),
    [],
  );

  const topRuleCls = useMemo(
    () =>
      css({
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        height: "2px",
      }),
    [],
  );

  const overlayLinkCls = useMemo(
    () =>
      css({
        position: "absolute",
        inset: 0,
        zIndex: 0,
        borderRadius: "lg",
        _focusVisible: {
          outline: "2px solid",
          outlineColor: "accent.8",
          outlineOffset: "2px",
        },
      }),
    [],
  );

  const cardClasses = `${cardCls} ${stagger({ index: (index % 5) as 0|1|2|3|4, animation: "fadeIn" })}`;

  // Hover glow: state-tinted box-shadow applied via inline style on enter/leave.
  const hoverShadow = `0 12px 32px -12px ${accentColor}55, 0 0 0 1px ${accentColor}30`;

  return (
    <div
      className={cardClasses}
      data-product-id={p.id}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <Link
        href={`/products/${p.slug}`}
        aria-label={p.name}
        className={overlayLinkCls}
      />
      <span
        aria-hidden="true"
        className={topRuleCls}
        style={{
          background: accentColor,
          opacity: state === "running" ? 1 : 0.9,
          animation: state === "running" ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : undefined,
        }}
      />

      {/* Header */}
      <Flex align="start" justify="between" gap="3">
        <Flex align="start" gap="3" className={css({ flex: 1, minWidth: 0 })}>
          <span
            aria-hidden="true"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              w: "10",
              h: "10",
              borderRadius: "md",
              bg: "ui.surfaceRaised",
              border: "1px solid",
              borderColor: "ui.border",
              color: "accent.11",
              flexShrink: 0,
              overflow: "hidden",
            })}
          >
            <CubeIcon width="22" height="22" />
          </span>
          <div className={css({ minWidth: 0, flex: 1 })}>
            <Text
              as="span"
              weight="bold"
              size="6"
              className={css({
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: "1.15",
                letterSpacing: "-0.015em",
              })}
            >
              {p.name}
            </Text>
            {/* Domain + freshness row, sits directly under the title. */}
            <Flex
              align="center"
              gap="3"
              wrap="wrap"
              className={css({ mt: "1", color: "ui.tertiary", fontSize: "xs" })}
            >
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${p.name} website in new tab`}
                onClick={(e) => e.stopPropagation()}
                className={css({
                  position: "relative",
                  zIndex: 1,
                  color: "ui.tertiary",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1",
                  minWidth: 0,
                  _hover: { color: "accent.11", textDecoration: "underline" },
                })}
              >
                <ExternalLinkIcon aria-hidden width="12" height="12" />
                <span
                  className={css({
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "22ch",
                  })}
                >
                  {p.domain ?? p.url}
                </span>
              </a>
              <Flex align="center" gap="2" className={css({ minWidth: 0 })}>
                <span
                  aria-hidden="true"
                  className={css({
                    width: "6px",
                    height: "6px",
                    borderRadius: "full",
                    flexShrink: 0,
                  })}
                  style={{ background: freshnessDotColor }}
                />
                <span
                  className={css({
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  })}
                >
                  {freshnessLabel}
                </span>
              </Flex>
            </Flex>
          </div>
        </Flex>

        {isAdmin && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton
                size="2"
                variant="ghost"
                color="gray"
                aria-label="Product actions"
                className={css({ position: "relative", zIndex: 1 })}
              >
                <DotsVerticalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content variant="soft" align="end">
              <DropdownMenu.Label>Analyze</DropdownMenu.Label>
              <DropdownMenu.Item
                disabled={icpRunning || intelRunning}
                onSelect={() => {
                  onAnalyzeIcp(p.id, p.slug);
                }}
              >
                <Crosshair size={14} />
                {p.icpAnalysis ? "Re-analyze ICP" : "Analyze ICP"}
                {icpRunning && (
                  <Text size="1" color="gray" ml="2">
                    {elapsedSeconds(runs.icp?.startedAt ?? null)}s
                  </Text>
                )}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={pricingRunning || intelRunning}
                onSelect={() => {
                  onAnalyzePricing(p.id);
                }}
              >
                <DollarSign size={14} />
                Analyze pricing
                {pricingRunning && (
                  <Text size="1" color="gray" ml="2">
                    {elapsedSeconds(runs.pricing?.startedAt ?? null)}s
                  </Text>
                )}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={gtmRunning || intelRunning}
                onSelect={() => {
                  onAnalyzeGtm(p.id);
                }}
              >
                <Rocket size={14} />
                Analyze GTM
                {gtmRunning && (
                  <Text size="1" color="gray" ml="2">
                    {elapsedSeconds(runs.gtm?.startedAt ?? null)}s
                  </Text>
                )}
              </DropdownMenu.Item>

              <DropdownMenu.Separator />
              <DropdownMenu.Item
                disabled={intelRunning}
                onSelect={() => {
                  onRunFullIntel(p.id);
                }}
              >
                <Sparkles size={14} />
                <Text weight="bold">Run full intel</Text>
                {intelRunning && (
                  <Text size="1" color="gray" ml="2">
                    {elapsedSeconds(runs.product_intel?.startedAt ?? null)}s
                  </Text>
                )}
              </DropdownMenu.Item>

              <DropdownMenu.Separator />
              <DropdownMenu.Label>Open</DropdownMenu.Label>
              <DropdownMenu.Item
                disabled={!p.icpAnalysis}
                onSelect={() => router.push(`/products/${p.slug}/icp`)}
              >
                <Eye size={14} /> View ICP
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => router.push(`/products/${p.slug}/competitors`)}
              >
                <Eye size={14} /> Competitors &amp; pricing
              </DropdownMenu.Item>

              <DropdownMenu.Separator />
              <DropdownMenu.Item
                color="red"
                onSelect={(e) => {
                  e.preventDefault();
                  onDelete(p.id, p.name);
                }}
              >
                <Trash2 size={14} /> Delete product…
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      </Flex>

      {/* Tagline */}
      {tagline && (
        <Text
          size="2"
          as="p"
          className={css({
            position: "relative",
            zIndex: 1,
            mt: "2",
            color: "ui.primary",
            lineHeight: "1.45",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          })}
        >
          {tagline}
        </Text>
      )}


      {/* Footer: primary CTA, right-aligned. Domain + freshness now live in
          the header row directly under the product name. */}
      <Flex
        align="center"
        justify="end"
        gap="3"
        wrap="wrap"
        mt="4"
        pt="4"
        className={css({
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid",
          borderColor: "ui.border",
        })}
      >
        {primaryCTA.kind === "link" ? (
          <Link
            href={primaryCTA.href}
            className={button({ variant: primaryCTA.variant, size: "md" })}
          >
            {primaryCTA.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={primaryCTA.onClick}
            className={button({ variant: primaryCTA.variant, size: "md" })}
          >
            {primaryCTA.label}
          </button>
        )}
      </Flex>
    </div>
  );
}

export function DeleteProductDialog({
  open,
  productName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  productName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>Delete product?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          This will remove &ldquo;{productName}&rdquo; and its analyses. You&rsquo;ll have 5 seconds to undo.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solidRed" size="sm" onClick={onConfirm}>
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
