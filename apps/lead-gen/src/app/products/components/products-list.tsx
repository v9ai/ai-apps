"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Container,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import {
  TrashIcon,
  CubeIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductsQuery,
  useDeleteProductMutation,
  useAnalyzeProductIcpMutation,
  useAnalyzeProductPricingAsyncMutation,
  useAnalyzeProductGtmAsyncMutation,
  useRunFullProductIntelAsyncMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { IcpAnalysis } from "./icp-analysis-view";
import { LoadingShell, SignInGate } from "./view-chrome";

export function ProductsList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductsQuery({
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const [deleteProduct] = useDeleteProductMutation();
  const [analyzeIcp] = useAnalyzeProductIcpMutation();
  const [analyzePricing] = useAnalyzeProductPricingAsyncMutation();
  const [analyzeGtm] = useAnalyzeProductGtmAsyncMutation();
  const [runFullIntel] = useRunFullProductIntelAsyncMutation();
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  if (authLoading) {
    return <LoadingShell size="3" />;
  }

  if (!user) {
    return <SignInGate message="Please sign in to view products." />;
  }

  const rows = data?.products ?? [];

  async function onAnalyze(id: number, slug: string) {
    setAnalyzingId(id);
    try {
      await analyzeIcp({ variables: { id } });
      await refetch();
      router.push(`/products/${slug}/icp`);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function onAnalyzePricing(id: number) {
    setPendingId(id);
    try {
      const res = await analyzePricing({ variables: { id } });
      const runId = res.data?.analyzeProductPricingAsync?.runId;
      if (runId) console.log("[pricing] started runId=", runId);
    } finally {
      setPendingId(null);
    }
  }

  async function onAnalyzeGtm(id: number) {
    setPendingId(id);
    try {
      const res = await analyzeGtm({ variables: { id } });
      const runId = res.data?.analyzeProductGTMAsync?.runId;
      if (runId) console.log("[gtm] started runId=", runId);
    } finally {
      setPendingId(null);
    }
  }

  async function onRunFullIntel(id: number) {
    setPendingId(id);
    try {
      const res = await runFullIntel({ variables: { id } });
      const runId = res.data?.runFullProductIntelAsync?.runId;
      if (runId) console.log("[intel] started runId=", runId);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Container size="4" p="6" asChild>
      <main>
      <Flex align="center" gap="3" mb="5">
        <span
          aria-hidden="true"
          className={css({
            color: "accent.11",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bg: "accent.3",
            borderRadius: "md",
            p: "2",
            boxShadow: "inset 0 0 0 1px token(colors.accent.6)",
          })}
        >
          <CubeIcon width="20" height="20" />
        </span>
        <Heading size="6">Products</Heading>
      </Flex>

      {error && (
        <Text color="red" as="p" mb="3" role="alert">
          {error.message}
        </Text>
      )}

      {loading && rows.length === 0 && (
        <Text color="gray" role="status" aria-live="polite">
          Loading…
        </Text>
      )}

      {!loading && rows.length === 0 && (
        <Text color="gray">No products yet.</Text>
      )}

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
          gap: "3",
        })}
      >
        {rows.map((p) => {
          const icp = p.icpAnalysis as IcpAnalysis | null;
          const analyzing = analyzingId === p.id;
          return (
            <div
              key={p.id}
              className={css({
                bg: "ui.surface",
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "md",
                p: "4",
                transition: "border-color 150ms, transform 150ms",
                _hover: {
                  borderColor: "accent.8",
                  transform: "translateY(-1px)",
                },
              })}
            >
              <Flex justify="between" align="start" gap="3">
                <Flex
                  direction="column"
                  gap="2"
                  className={css({ flex: 1, minWidth: 0 })}
                >
                  <Link
                    href={`/products/${p.slug}`}
                    className={css({
                      color: "inherit",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2",
                    })}
                  >
                    <span aria-hidden="true" className={css({ color: "accent.11" })}>
                      <CubeIcon />
                    </span>
                    <Text
                      weight="bold"
                      size="4"
                      className={css({
                        _hover: { textDecoration: "underline" },
                      })}
                    >
                      {p.name}
                    </Text>
                    <span aria-hidden="true" className={css({ color: "gray.10", ml: "1" })}>
                      <ArrowRightIcon />
                    </span>
                  </Link>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${p.name} website in new tab`}
                    className={css({
                      color: "gray.11",
                      fontSize: "sm",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "1",
                      borderRadius: "sm",
                      _hover: {
                        textDecoration: "underline",
                        color: "accent.11",
                      },
                      _focusVisible: {
                        outline: "2px solid",
                        outlineColor: "accent.9",
                        outlineOffset: "2px",
                      },
                    })}
                  >
                    <ExternalLinkIcon aria-hidden />
                    <span
                      className={css({
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      })}
                    >
                      {p.domain ?? p.url}
                    </span>
                  </a>
                  {p.description && (
                    <Text
                      color="gray"
                      size="2"
                      className={css({ lineHeight: "1.5" })}
                    >
                      {p.description}
                    </Text>
                  )}
                  {icp && (
                    <Flex gap="2" wrap="wrap" mt="1">
                      <Badge color="indigo" size="1">
                        ICP {(icp.weighted_total * 100).toFixed(0)}%
                      </Badge>
                      <Badge color="gray" size="1">
                        {icp.segments?.length ?? 0} segments
                      </Badge>
                      <Badge color="gray" size="1">
                        {icp.personas?.length ?? 0} personas
                      </Badge>
                    </Flex>
                  )}
                </Flex>
                <Flex direction="column" gap="2" align="end">
                  {icp && (
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
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAnalyze(p.id, p.slug)}
                        disabled={analyzing}
                        className={button({ variant: "solid", size: "sm" })}
                        aria-label="Analyze ICP"
                      >
                        <MagicWandIcon aria-hidden />
                        <span className={css({ ml: "1" })}>
                          {analyzing
                            ? "Analyzing…"
                            : icp
                              ? "Re-analyze"
                              : "Analyze ICP"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAnalyzePricing(p.id)}
                        disabled={pendingId === p.id}
                        className={button({ variant: "outline", size: "sm" })}
                        aria-label="Analyze pricing"
                      >
                        <MagicWandIcon aria-hidden />
                        <span className={css({ ml: "1" })}>
                          {pendingId === p.id ? "Starting…" : "Analyze Pricing"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAnalyzeGtm(p.id)}
                        disabled={pendingId === p.id}
                        className={button({ variant: "outline", size: "sm" })}
                        aria-label="Analyze GTM"
                      >
                        <MagicWandIcon aria-hidden />
                        <span className={css({ ml: "1" })}>
                          {pendingId === p.id ? "Starting…" : "Analyze GTM"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRunFullIntel(p.id)}
                        disabled={pendingId === p.id}
                        className={button({ variant: "gradient", size: "sm" })}
                        aria-label="Run full intel"
                      >
                        <MagicWandIcon aria-hidden />
                        <span className={css({ ml: "1" })}>
                          {pendingId === p.id ? "Starting…" : "Run Full Intel"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete product "${p.name}"?`))
                            return;
                          await deleteProduct({ variables: { id: p.id } });
                          await refetch();
                        }}
                        className={button({ variant: "ghost", size: "sm" })}
                        aria-label="Delete product"
                      >
                        <TrashIcon aria-hidden />
                      </button>
                    </>
                  )}
                </Flex>
              </Flex>
            </div>
          );
        })}
      </div>
      </main>
    </Container>
  );
}
