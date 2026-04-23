"use client";

import React from "react";
import Link from "next/link";
import { Badge, Box, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CubeIcon,
  ExternalLinkIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useAnalyzeProductPricingAsyncMutation,
  usePublicIntelRunsQuery,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { PricingStrategyResult } from "@/lib/langgraph-client";

export type PricingAnalysis = PricingStrategyResult;

const TERMINAL_STATUSES = new Set(["success", "error", "timeout"]);

function statusColor(s: string): "green" | "red" | "orange" | "blue" | "gray" {
  if (s === "success") return "green";
  if (s === "error") return "red";
  if (s === "timeout") return "orange";
  if (s === "running" || s === "pending") return "blue";
  return "gray";
}

function relationColor(
  r: string | undefined,
): "green" | "blue" | "orange" | "gray" {
  if (r === "below" || r === "undercut") return "green";
  if (r === "at_parity") return "blue";
  if (r === "premium") return "orange";
  return "gray";
}

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "Custom";
  if (p === 0) return "Free";
  return `$${p.toLocaleString()}`;
}

export function PricingAnalysisView({ data }: { data: PricingAnalysis }) {
  const tiers = data.model?.tiers ?? [];
  const addons = data.model?.addons ?? [];
  const risks = data.rationale?.risks ?? [];

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="3" wrap="wrap">
        <Heading size="3">Pricing model</Heading>
        {data.model?.value_metric && (
          <Badge color="indigo" size="2">
            {data.model.value_metric}
          </Badge>
        )}
        {data.model?.model_type && (
          <Badge color="gray" size="2">
            {data.model.model_type}
          </Badge>
        )}
        {data.model?.free_offer && (
          <Badge color="green" size="1">
            {data.model.free_offer}
          </Badge>
        )}
      </Flex>

      {data.rationale?.recommendation && (
        <Box
          className={css({
            bg: "accent.3",
            border: "1px solid",
            borderColor: "accent.8",
            borderRadius: "md",
            p: "4",
          })}
        >
          <Text weight="bold" size="2" as="div" mb="1">
            Recommendation
          </Text>
          <Text size="2" as="p" className={css({ lineHeight: "1.6" })}>
            {data.rationale.recommendation}
          </Text>
        </Box>
      )}

      {(data.model?.value_metric_reasoning || data.model?.model_type_reasoning) && (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "3",
          })}
        >
          {data.model?.value_metric_reasoning && (
            <Box
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex gap="2" align="center" mb="1">
                <Text weight="bold" size="2" as="div">
                  Why this value metric
                </Text>
                {data.model.value_metric && (
                  <Badge color="indigo" size="1">
                    {data.model.value_metric}
                  </Badge>
                )}
              </Flex>
              <Text color="gray" size="2" as="p" className={css({ lineHeight: "1.5" })}>
                {data.model.value_metric_reasoning}
              </Text>
            </Box>
          )}
          {data.model?.model_type_reasoning && (
            <Box
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex gap="2" align="center" mb="1">
                <Text weight="bold" size="2" as="div">
                  Why this model
                </Text>
                {data.model.model_type && (
                  <Badge color="gray" size="1">
                    {data.model.model_type}
                  </Badge>
                )}
              </Flex>
              <Text color="gray" size="2" as="p" className={css({ lineHeight: "1.5" })}>
                {data.model.model_type_reasoning}
              </Text>
            </Box>
          )}
        </div>
      )}

      <Box>
        <Heading size="3" mb="2">
          Tiers ({tiers.length})
        </Heading>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: "3",
          })}
        >
          {tiers.map((t, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "4",
                display: "flex",
                flexDirection: "column",
                gap: "2",
              })}
            >
              <Flex justify="between" align="center" gap="2">
                <Text weight="bold" size="3">
                  {t.name}
                </Text>
                <Badge color="indigo" size="1">
                  {t.billing_unit}
                </Badge>
              </Flex>
              <Text size="5" weight="bold" className={css({ color: "accent.11" })}>
                {formatPrice(t.price_monthly_usd)}
                {t.price_monthly_usd ? (
                  <Text size="2" color="gray" weight="regular">
                    {" "}
                    /mo
                  </Text>
                ) : null}
              </Text>
              {t.target_persona && (
                <Text size="2" color="gray">
                  {t.target_persona}
                </Text>
              )}
              {t.included?.length > 0 && (
                <ul
                  className={css({
                    pl: "4",
                    color: "gray.12",
                    fontSize: "xs",
                    listStyle: "disc",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1",
                  })}
                >
                  {t.included.map((inc, j) => (
                    <li key={j}>{inc}</li>
                  ))}
                </ul>
              )}
              {t.limits?.length > 0 && (
                <Text size="1" color="gray" as="div">
                  Limits: {t.limits.join(", ")}
                </Text>
              )}
              {t.upgrade_trigger && (
                <Box
                  className={css({
                    mt: "2",
                    pt: "2",
                    borderTop: "1px solid",
                    borderColor: "ui.border",
                  })}
                >
                  <Text size="1" color="gray" as="div" weight="bold">
                    Upgrade trigger
                  </Text>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {t.upgrade_trigger}
                  </Text>
                </Box>
              )}
              {(t.value_math ||
                t.price_justification ||
                (t.anchor_competitors && t.anchor_competitors.length > 0)) && (
                <Box
                  className={css({
                    mt: "2",
                    pt: "2",
                    borderTop: "1px solid",
                    borderColor: "ui.border",
                  })}
                >
                  <Text size="1" color="gray" as="div" weight="bold" mb="1">
                    Why this price
                  </Text>
                  {t.value_math && (
                    <Text
                      size="1"
                      as="div"
                      className={css({
                        fontFamily: "mono",
                        bg: "gray.2",
                        border: "1px solid",
                        borderColor: "ui.border",
                        borderRadius: "xs",
                        px: "2",
                        py: "1",
                        mb: "2",
                        lineHeight: "1.4",
                      })}
                    >
                      {t.value_math}
                    </Text>
                  )}
                  {t.price_justification && (
                    <Text
                      size="2"
                      as="p"
                      className={css({ lineHeight: "1.5" })}
                      mb={t.anchor_competitors && t.anchor_competitors.length > 0 ? "2" : "0"}
                    >
                      {t.price_justification}
                    </Text>
                  )}
                  {t.anchor_competitors && t.anchor_competitors.length > 0 && (
                    <Flex gap="1" wrap="wrap" align="center">
                      <Text size="1" color="gray">
                        vs
                      </Text>
                      {t.anchor_competitors.map((a, k) => (
                        <Badge key={k} color="gray" size="1">
                          {a}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </div>
      </Box>

      {addons.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Add-ons
          </Heading>
          <Flex gap="2" wrap="wrap">
            {addons.map((a, i) => (
              <Badge key={i} color="gray" size="2">
                {a}
              </Badge>
            ))}
          </Flex>
        </Box>
      )}

      {(data.rationale?.value_basis ||
        data.rationale?.competitor_benchmark ||
        data.rationale?.wtp_estimate ||
        (data.rationale?.price_anchors && data.rationale.price_anchors.length > 0)) && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="3" mb="2">
              Rationale
            </Heading>
            <Flex direction="column" gap="2">
              {data.rationale?.price_anchors &&
                data.rationale.price_anchors.length > 0 && (
                  <Box
                    className={css({
                      border: "1px solid",
                      borderColor: "ui.border",
                      borderRadius: "sm",
                      p: "3",
                    })}
                  >
                    <Text weight="bold" size="2" as="div" mb="2">
                      Price anchors
                    </Text>
                    <div
                      className={css({
                        display: "grid",
                        gridTemplateColumns: {
                          base: "1fr",
                          md: "1.4fr 1fr auto auto 2fr",
                        },
                        columnGap: "3",
                        rowGap: "2",
                        alignItems: "center",
                        fontSize: "sm",
                      })}
                    >
                      <Text size="1" color="gray" weight="bold">
                        Competitor
                      </Text>
                      <Text size="1" color="gray" weight="bold">
                        Tier
                      </Text>
                      <Text size="1" color="gray" weight="bold">
                        Price/mo
                      </Text>
                      <Text size="1" color="gray" weight="bold">
                        Relation
                      </Text>
                      <Text size="1" color="gray" weight="bold">
                        Note
                      </Text>
                      {data.rationale.price_anchors.map((anchor, i) => (
                        <React.Fragment key={i}>
                          <Text size="2">{anchor.competitor}</Text>
                          <Text size="2" color="gray">
                            {anchor.tier}
                          </Text>
                          <Text size="2" weight="bold">
                            {formatPrice(anchor.monthly_price_usd)}
                          </Text>
                          <Badge color={relationColor(anchor.relation)} size="1">
                            {anchor.relation}
                          </Badge>
                          <Text size="2" color="gray" className={css({ lineHeight: "1.4" })}>
                            {anchor.note}
                          </Text>
                        </React.Fragment>
                      ))}
                    </div>
                  </Box>
                )}
              {data.rationale?.value_basis && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div">
                    Value basis
                  </Text>
                  <Text color="gray" size="2" as="p" mt="1">
                    {data.rationale.value_basis}
                  </Text>
                </Box>
              )}
              {data.rationale?.competitor_benchmark && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div">
                    Competitor benchmark
                  </Text>
                  <Text color="gray" size="2" as="p" mt="1">
                    {data.rationale.competitor_benchmark}
                  </Text>
                </Box>
              )}
              {data.rationale?.wtp_estimate && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div">
                    Willingness to pay
                  </Text>
                  <Text color="gray" size="2" as="p" mt="1">
                    {data.rationale.wtp_estimate}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>
        </>
      )}

      {risks.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Risks
          </Heading>
          <Flex direction="column" gap="2">
            {risks.map((r, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex gap="2" align="start">
                  <Badge color="orange" size="1">
                    risk
                  </Badge>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {r}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {data.model?.discounting_strategy && (
        <Box>
          <Heading size="3" mb="2">
            Discounting
          </Heading>
          <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5" })}>
            {data.model.discounting_strategy}
          </Text>
        </Box>
      )}
    </Flex>
  );
}

export function ProductPricingPage({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const [analyzePricing, analyzeState] = useAnalyzeProductPricingAsyncMutation();

  const productId = data?.productBySlug?.id ?? 0;

  const { data: runsData, stopPolling } = usePublicIntelRunsQuery({
    variables: { productId, kind: "pricing" },
    pollInterval: 2000,
    skip: !productId,
    fetchPolicy: "cache-and-network",
  });

  const latestRun = runsData?.productIntelRuns?.[0];
  const terminal = latestRun ? TERMINAL_STATUSES.has(latestRun.status) : true;

  if (latestRun && terminal) {
    stopPolling();
  }

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
          <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
            <ArrowLeftIcon /> Products
          </Link>
          <Text color="gray">Product &ldquo;{slug}&rdquo; not found.</Text>
        </Flex>
      </Container>
    );
  }

  const pricing = (product.pricingAnalysis ?? null) as PricingAnalysis | null;
  const analyzedAt = product.pricingAnalyzedAt
    ? new Date(product.pricingAnalyzedAt)
    : null;

  async function onAnalyze() {
    const res = await analyzePricing({ variables: { id: product!.id } });
    const runId = res.data?.analyzeProductPricingAsync?.runId;
    if (runId) console.log("[pricing] rerun started runId=", runId);
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
        <Text size="2">Pricing</Text>
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
            {product.name} · <Text color="gray">Pricing</Text>
          </Heading>
          {latestRun && !terminal && (
            <Badge color={statusColor(latestRun.status)} size="2">
              {latestRun.status}…
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
              disabled={analyzeState.loading || (latestRun && !terminal)}
              className={button({ variant: "solid", size: "sm" })}
            >
              <MagicWandIcon />
              <span className={css({ ml: "1" })}>
                {analyzeState.loading
                  ? "Starting…"
                  : pricing
                    ? "Re-analyze"
                    : "Analyze pricing"}
              </span>
            </button>
          )}
        </Flex>

        {analyzeState.error && (
          <Text color="red" as="p">
            {analyzeState.error.message}
          </Text>
        )}
        {latestRun?.error && (
          <Text color="red" as="p">
            {latestRun.error}
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
          {pricing ? (
            <PricingAnalysisView data={pricing} />
          ) : latestRun && !terminal ? (
            <Text color="gray">Running pricing analysis…</Text>
          ) : (
            <Text color="gray">
              No analysis yet.
              {isAdmin
                ? ' Click "Analyze pricing" to run the LangGraph pipeline.'
                : " An admin needs to run the analysis first."}
            </Text>
          )}
        </div>
      </Flex>
    </Container>
  );
}
