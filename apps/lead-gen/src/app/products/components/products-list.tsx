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
  RocketIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductsQuery,
  useDeleteProductMutation,
  useAnalyzeProductIcpMutation,
  useEnhanceProductIcpMutation,
  useCreateCompetitorAnalysisMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { IcpAnalysis } from "./icp-analysis-view";

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
  const [enhanceIcp] = useEnhanceProductIcpMutation();
  const [createCompetitorAnalysis] = useCreateCompetitorAnalysisMutation();
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [competitorsBusyId, setCompetitorsBusyId] = useState<number | null>(null);

  if (authLoading) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Please sign in to view products.</Text>
      </Container>
    );
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

  async function onEnhance(id: number, slug: string) {
    setEnhancingId(id);
    try {
      await enhanceIcp({ variables: { id } });
      await refetch();
      router.push(`/products/${slug}/icp`);
    } finally {
      setEnhancingId(null);
    }
  }

  async function onFindCompetitors(id: number) {
    setCompetitorsBusyId(id);
    try {
      const res = await createCompetitorAnalysis({ variables: { productId: id } });
      const analysisId = res.data?.createCompetitorAnalysis?.id;
      if (analysisId) {
        router.push(`/competitors/${analysisId}`);
      }
    } finally {
      setCompetitorsBusyId(null);
    }
  }

  return (
    <Container size="4" p="6">
      <Flex align="center" gap="3" mb="5">
        <span
          className={css({
            color: "accent.11",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bg: "accent.3",
            borderRadius: "md",
            p: "2",
          })}
        >
          <CubeIcon width="20" height="20" />
        </span>
        <Heading size="6">Products</Heading>
      </Flex>

      {error && (
        <Text color="red" as="p" mb="3">
          {error.message}
        </Text>
      )}

      {loading && rows.length === 0 && <Text color="gray">Loading…</Text>}

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
                    <span className={css({ color: "accent.11" })}>
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
                    <span className={css({ color: "gray.10", ml: "1" })}>
                      <ArrowRightIcon />
                    </span>
                  </Link>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({
                      color: "gray.11",
                      fontSize: "sm",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "1",
                      _hover: {
                        textDecoration: "underline",
                        color: "accent.11",
                      },
                    })}
                  >
                    <ExternalLinkIcon />
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
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAnalyze(p.id, p.slug)}
                        disabled={analyzing}
                        className={button({ variant: "solid", size: "sm" })}
                        aria-label="Analyze ICP"
                      >
                        <MagicWandIcon />
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
                        onClick={async () => {
                          if (!window.confirm(`Delete product "${p.name}"?`))
                            return;
                          await deleteProduct({ variables: { id: p.id } });
                          await refetch();
                        }}
                        className={button({ variant: "ghost", size: "sm" })}
                        aria-label="Delete product"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </Flex>
              </Flex>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
