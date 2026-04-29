"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  Badge,
  Button as RadixButton,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";
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
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { stagger } from "@/recipes/motion";
import {
  useProductRunsLive,
  intelKindLabel,
  intelKindHint,
  isInflight,
  type IntelKind,
} from "@/lib/use-product-runs-live";
import { StatusBadge } from "./view-chrome";

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

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  return rtf.format(-day, "day");
}

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

  const stripeColor =
    state === "running"
      ? "var(--accent-9)"
      : state === "full"
        ? "var(--green-9)"
        : state === "partial"
          ? "var(--accent-6)"
          : "var(--gray-6)";

  const faviconUrl = p.domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(p.domain)}&sz=64`
    : null;

  const [favLoaded, setFavLoaded] = useState(false);
  const [favError, setFavError] = useState(false);

  const description = p.description?.trim() ?? "";

  const showIcp = !!p.icpAnalyzedAt || !!runs.icp;
  const showPricing = !!p.pricingAnalyzedAt || !!runs.pricing;
  const showGtm = !!p.gtmAnalyzedAt || !!runs.gtm;
  const showIntel = !!p.intelReportAt || !!runs.product_intel;

  const cardCls = useMemo(
    () =>
      css({
        position: "relative",
        bg: "ui.surface",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        p: "5",
        pl: "6",
        transition: "border-color 150ms ease, transform 150ms ease, box-shadow 200ms ease",
        _hover: {
          borderColor: "accent.8",
          transform: "translateY(-1px)",
          boxShadow: "0 8px 24px -12px rgba(0,0,0,0.4)",
        },
      }),
    [],
  );

  const stripeCls = useMemo(
    () =>
      css({
        position: "absolute",
        top: "0",
        bottom: "0",
        left: "0",
        width: "4px",
        borderTopLeftRadius: "lg",
        borderBottomLeftRadius: "lg",
      }),
    [],
  );

  const cardClasses = `${cardCls} ${stagger({ index: (index % 10) as 0|1|2|3|4|5|6|7|8|9, animation: "slideUp" })}`;

  return (
    <div className={cardClasses} data-product-id={p.id}>
      <span
        aria-hidden="true"
        className={stripeCls}
        style={{
          background: stripeColor,
          opacity: state === "running" ? 1 : 0.85,
          animation: state === "running" ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : undefined,
        }}
      />

      {/* Header */}
      <Flex align="start" justify="between" gap="3">
        <Flex align="center" gap="3" className={css({ flex: 1, minWidth: 0 })}>
          <span
            aria-hidden="true"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              w: "8",
              h: "8",
              borderRadius: "md",
              bg: "ui.surfaceRaised",
              border: "1px solid",
              borderColor: "ui.border",
              color: "accent.11",
              flexShrink: 0,
              overflow: "hidden",
            })}
          >
            {faviconUrl && !favError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faviconUrl}
                alt=""
                width={20}
                height={20}
                onLoad={() => setFavLoaded(true)}
                onError={() => setFavError(true)}
                style={{
                  width: 20,
                  height: 20,
                  objectFit: "contain",
                  opacity: favLoaded ? 1 : 0,
                  transition: "opacity 150ms ease",
                }}
              />
            ) : (
              <CubeIcon width="18" height="18" />
            )}
          </span>
          <div className={css({ minWidth: 0, flex: 1 })}>
            <Link
              href={`/products/${p.slug}`}
              className={css({
                color: "inherit",
                textDecoration: "none",
                display: "inline-block",
                _hover: { textDecoration: "underline" },
              })}
            >
              <Text
                as="span"
                weight="bold"
                size="4"
                className={css({
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                })}
              >
                {p.name}
              </Text>
            </Link>
            <Flex
              align="center"
              gap="2"
              wrap="wrap"
              className={css({ mt: "1", color: "gray.11", fontSize: "xs" })}
            >
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${p.name} website in new tab`}
                onClick={(e) => e.stopPropagation()}
                className={css({
                  color: "inherit",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1",
                  _hover: { textDecoration: "underline", color: "accent.11" },
                })}
              >
                <ExternalLinkIcon aria-hidden width="12" height="12" />
                <span
                  className={css({
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "16ch",
                  })}
                >
                  {p.domain ?? p.url}
                </span>
              </a>
              {p.intelReportAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>full intel {relativeTime(p.intelReportAt)}</span>
                </>
              )}
              {!p.intelReportAt && p.icpAnalyzedAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>ICP {relativeTime(p.icpAnalyzedAt)}</span>
                </>
              )}
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

      {/* Description (always rendered, 2-line clamp, fixed min-h kills CLS) */}
      <Text
        size="2"
        color="gray"
        className={css({
          mt: "3",
          minHeight: "2.625rem",
          lineHeight: "1.5",
          overflow: "hidden",
          color: description ? "ui.secondary" : "gray.10",
        })}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
        }}
      >
        {description || "No description yet — run ICP to enrich."}
      </Text>

      {/* Status row */}
      <Flex gap="2" wrap="wrap" mt="4" align="center">
        <KindStatus
          kind="icp"
          run={runs.icp}
          present={showIcp}
          analyzedAt={p.icpAnalyzedAt}
          onRetry={() => onAnalyzeIcp(p.id, p.slug)}
          isAdmin={isAdmin}
        />
        <KindStatus
          kind="pricing"
          run={runs.pricing}
          present={showPricing}
          analyzedAt={p.pricingAnalyzedAt}
          onRetry={() => onAnalyzePricing(p.id)}
          isAdmin={isAdmin}
        />
        <KindStatus
          kind="gtm"
          run={runs.gtm}
          present={showGtm}
          analyzedAt={p.gtmAnalyzedAt}
          onRetry={() => onAnalyzeGtm(p.id)}
          isAdmin={isAdmin}
        />
        <KindStatus
          kind="product_intel"
          run={runs.product_intel}
          present={showIntel}
          analyzedAt={p.intelReportAt}
          onRetry={() => onRunFullIntel(p.id)}
          isAdmin={isAdmin}
        />
      </Flex>

      {/* Non-admin / mobile inline actions */}
      {!isAdmin && (
        <Flex gap="2" mt="4" wrap="wrap">
          {!!p.icpAnalysis && (
            <Link
              href={`/products/${p.slug}/icp`}
              className={button({ variant: "outline", size: "sm" })}
            >
              View ICP
            </Link>
          )}
          <Link
            href={`/products/${p.slug}/competitors`}
            className={button({ variant: "outline", size: "sm" })}
          >
            Competitors &amp; pricing
          </Link>
        </Flex>
      )}
    </div>
  );
}

function KindStatus({
  kind,
  run,
  present,
  analyzedAt,
  onRetry,
  isAdmin,
}: {
  kind: IntelKind;
  run: ReturnType<typeof useProductRunsLive>["runs"][IntelKind];
  present: boolean;
  analyzedAt: string | null;
  onRetry: () => void;
  isAdmin: boolean;
}) {
  const label = intelKindLabel(kind);
  const status = run?.status;
  const inflight = isInflight(run);

  // No record at all → show muted "—"
  if (!present && !run) {
    return (
      <Badge color="gray" size="2" variant="surface">
        {label} —
      </Badge>
    );
  }

  // Inflight → blue with elapsed seconds
  if (inflight) {
    const elapsed = elapsedSeconds(run?.startedAt ?? null);
    return (
      <StatusBadge
        status={status ?? "running"}
        label={`${label} ${elapsed}s`}
      />
    );
  }

  // Error / timeout → red/amber + retry
  if (status === "error" || status === "timeout") {
    return (
      <Flex gap="1" align="center">
        <span title={run?.error?.slice(0, 200) ?? ""}>
          <StatusBadge status={status} label={`${label} ${status}`} />
        </span>
        {isAdmin && (
          <button
            type="button"
            aria-label={`Retry ${label}`}
            onClick={() => onRetry()}
            className={button({ variant: "ghost", size: "sm" })}
            style={{ height: 22, padding: "0 6px" }}
          >
            <RefreshCw size={12} />
          </button>
        )}
      </Flex>
    );
  }

  // Success or stale-success: green + relative timestamp
  const ts = analyzedAt ? relativeTime(analyzedAt) : null;
  return (
    <StatusBadge
      status="success"
      label={ts ? `${label} ${ts}` : `${label} success`}
    />
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
            <RadixButton variant="soft" color="gray" onClick={onCancel}>
              Cancel
            </RadixButton>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <RadixButton variant="solid" color="red" onClick={onConfirm}>
              Delete
            </RadixButton>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
