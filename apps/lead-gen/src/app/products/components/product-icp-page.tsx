"use client";

import Link from "next/link";
import { Container, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CubeIcon,
  MagicWandIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useAnalyzeProductIcpMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { IcpAnalysisView, type IcpAnalysis } from "./icp-analysis-view";

export function ProductIcpPage({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const [analyzeIcp, analyzeState] = useAnalyzeProductIcpMutation();

  if (authLoading) {
    return (
      <Container size="4" p="6">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Please sign in to view this product.</Text>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <Container size="4" p="6">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p="6">
        <Text color="red">{error.message}</Text>
      </Container>
    );
  }

  const product = data?.productBySlug;

  if (!product) {
    return (
      <Container size="4" p="6">
        <Flex direction="column" gap="3">
          <Link
            href="/products"
            className={button({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeftIcon /> Products
          </Link>
          <Text color="gray">Product &ldquo;{slug}&rdquo; not found.</Text>
        </Flex>
      </Container>
    );
  }

  const icp = (product.icpAnalysis ?? null) as IcpAnalysis | null;
  const analyzedAt = product.icpAnalyzedAt
    ? new Date(product.icpAnalyzedAt)
    : null;

  async function onAnalyze() {
    await analyzeIcp({ variables: { id: product!.id } });
    await refetch();
  }

  return (
    <Container size="4" p="6">
      <Flex mb="4" gap="2" align="center">
        <Link
          href={`/products/${product.slug}`}
          className={button({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon /> {product.name}
        </Link>
        <Text color="gray" size="2">
          /
        </Text>
        <Text size="2">ICP</Text>
      </Flex>

      <Flex direction="column" gap="3">
        <Flex align="center" gap="3" wrap="wrap">
          <span
            className={css({
              color: "accent.11",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              bg: "accent.3",
              borderRadius: "md",
              p: "3",
            })}
          >
            <CubeIcon width="24" height="24" />
          </span>
          <Heading size="7">
            {product.name} · <Text color="gray">ICP</Text>
          </Heading>
          {icp && (
            <Badge color="indigo" size="2">
              {(icp.weighted_total * 100).toFixed(0)}% fit
            </Badge>
          )}
        </Flex>

        <Flex gap="3" wrap="wrap" align="center">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              color: "accent.11",
              fontSize: "sm",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "1",
              _hover: { textDecoration: "underline" },
            })}
          >
            {product.domain ?? product.url}
            <ExternalLinkIcon />
          </a>
          {analyzedAt && (
            <Text size="2" color="gray">
              Analyzed {analyzedAt.toLocaleString()}
            </Text>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={analyzeState.loading}
              className={button({ variant: "solid", size: "sm" })}
            >
              <MagicWandIcon />
              <span className={css({ ml: "1" })}>
                {analyzeState.loading
                  ? "Analyzing…"
                  : icp
                    ? "Re-analyze"
                    : "Analyze ICP"}
              </span>
            </button>
          )}
        </Flex>

        {analyzeState.error && (
          <Text color="red" as="p">
            {analyzeState.error.message}
          </Text>
        )}

        <div
          className={css({
            mt: "3",
            pt: "4",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          {icp ? (
            <IcpAnalysisView data={icp} />
          ) : analyzeState.loading ? (
            <Text color="gray">Running deep ICP analysis…</Text>
          ) : (
            <Text color="gray">
              No analysis yet.
              {isAdmin
                ? ' Click "Analyze ICP" to run the LangGraph pipeline.'
                : " An admin needs to run the analysis first."}
            </Text>
          )}
        </div>
      </Flex>
    </Container>
  );
}
