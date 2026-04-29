"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useIntelRunLive } from "@/lib/use-intel-run-live";

export type IntelKind = "icp" | "pricing" | "gtm" | "product_intel";

export type IntelRunSnapshot = {
  id: string;
  kind: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
} | null;

export type ProductRuns = Record<IntelKind, IntelRunSnapshot>;

const KIND_LABEL: Record<IntelKind, string> = {
  icp: "ICP",
  pricing: "Pricing",
  gtm: "GTM",
  product_intel: "Full intel",
};

const KIND_HINT: Record<IntelKind, string> = {
  icp: "~10s",
  pricing: "~30s",
  gtm: "~30s",
  product_intel: "~2m",
};

function pickLatest(rows: ReadonlyArray<NonNullable<IntelRunSnapshot>>) {
  if (rows.length === 0) return null;
  return [...rows].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  )[0];
}

/**
 * Live status for all four IntelRun kinds for a single product.
 *
 * Each kind opens its own subscription via `useIntelRunLive`. The list view
 * only mounts a few cards at a time, so the connection count stays bounded.
 *
 * Surfaces toasts on terminal transitions (running/pending → success/error/timeout).
 */
export function useProductRunsLive(
  productId: number,
  productName: string,
  opts: { skip?: boolean } = {},
) {
  const skip = opts.skip || !productId;

  const icp = useIntelRunLive(productId, "icp", { skip });
  const pricing = useIntelRunLive(productId, "pricing", { skip });
  const gtm = useIntelRunLive(productId, "gtm", { skip });
  const intel = useIntelRunLive(productId, "product_intel", { skip });

  const runs: ProductRuns = {
    icp: pickLatest(icp.data?.productIntelRuns ?? []),
    pricing: pickLatest(pricing.data?.productIntelRuns ?? []),
    gtm: pickLatest(gtm.data?.productIntelRuns ?? []),
    product_intel: pickLatest(intel.data?.productIntelRuns ?? []),
  };

  // Detect terminal transitions per (kind, runId) and emit toasts once.
  const seenTerminal = useRef<Set<string>>(new Set());
  const prevStatus = useRef<Record<string, string>>({});

  useEffect(() => {
    if (skip) return;
    (Object.keys(runs) as IntelKind[]).forEach((kind) => {
      const run = runs[kind];
      if (!run) return;
      const key = `${run.id}`;
      const prev = prevStatus.current[key];
      const next = run.status;
      prevStatus.current[key] = next;

      const isTerminal =
        next === "success" || next === "error" || next === "timeout";
      const wasInflight = prev === "running" || prev === "pending";

      if (isTerminal && wasInflight && !seenTerminal.current.has(key)) {
        seenTerminal.current.add(key);
        const label = KIND_LABEL[kind];
        if (next === "success") {
          toast.success(`${label} analysis complete`, {
            description: productName,
          });
        } else if (next === "timeout") {
          toast.warning(`${label} analysis timed out`, {
            description: run.error?.slice(0, 120) ?? "Backend exceeded the run window.",
          });
        } else {
          toast.error(`${label} analysis failed`, {
            description: run.error?.slice(0, 120) ?? "Unknown error",
          });
        }
      }
    });
  }, [runs.icp?.id, runs.icp?.status, runs.pricing?.id, runs.pricing?.status, runs.gtm?.id, runs.gtm?.status, runs.product_intel?.id, runs.product_intel?.status, productName, skip]);

  const loading = icp.loading || pricing.loading || gtm.loading || intel.loading;

  return { runs, loading };
}

export function intelKindLabel(kind: IntelKind) {
  return KIND_LABEL[kind];
}

export function intelKindHint(kind: IntelKind) {
  return KIND_HINT[kind];
}

export function isInflight(run: IntelRunSnapshot) {
  return run?.status === "running" || run?.status === "pending";
}
