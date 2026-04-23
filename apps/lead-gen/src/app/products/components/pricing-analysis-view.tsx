"use client";

import React from "react";
import Link from "next/link";
import { Badge, Box, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
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

function statusColor(s: string): "green" | "red" | "amber" | "blue" | "gray" {
  if (s === "success") return "green";
  if (s === "error") return "red";
  if (s === "timeout") return "amber";
  if (s === "running" || s === "pending") return "blue";
  return "gray";
}

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "Custom";
  if (p === 0) return "Free";
  return `$${p.toLocaleString()}`;
}

const eyebrow = css({
  textTransform: "uppercase",
  letterSpacing: "0.08em",
});

export function PricingAnalysisView({ data }: { data: PricingAnalysis }) {
  const tiers = data.model?.tiers ?? [];
  const addons = data.model?.addons ?? [];
  const risks = data.rationale?.risks ?? [];

  return (
    <Flex direction="column" gap="6">
      <Flex align="center" gap="3" wrap="wrap">
        <Heading size="5">Pricing model</Heading>
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
            borderColor: "accent.7",
            borderLeft: "3px solid",
            borderLeftColor: "accent.9",
            borderRadius: "md",
            p: "5",
          })}
        >
          <Text
            size="1"
            weight="bold"
            color="gray"
            as="div"
            mb="2"
            className={eyebrow}
          >
            Recommendation
          </Text>
          <Text
            size="3"
            as="p"
            className={css({ lineHeight: "1.6", color: "gray.12" })}
          >
            {data.rationale.recommendation}
          </Text>
        </Box>
      )}

      <Box>
        <Heading size="5" mb="3">
          Tiers{tiers.length > 3 ? ` (${tiers.length})` : ""}
        </Heading>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: {
              base: "1fr",
              md: "repeat(2, 1fr)",
              xl: "repeat(3, 1fr)",
            },
            gap: "4",
          })}
        >
          {tiers.map((t, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "lg",
                p: "5",
                display: "flex",
                flexDirection: "column",
                gap: "3",
                transition:
                  "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                _hover: {
                  borderColor: "accent.8",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
                  transform: "translateY(-2px)",
                },
              })}
            >
              <Flex direction="column" gap="1">
                <Text weight="bold" size="4">
                  {t.name}
                </Text>
                {t.billing_unit && (
                  <Text size="1" color="gray" className={eyebrow}>
                    per {t.billing_unit}
                  </Text>
                )}
              </Flex>

              <Flex align="baseline" gap="1">
                <Text
                  size="8"
                  weight="bold"
                  className={css({
                    color: "accent.11",
                    letterSpacing: "-0.02em",
                  })}
                >
                  {formatPrice(t.price_monthly_usd)}
                </Text>
                {t.price_monthly_usd ? (
                  <Text size="2" color="gray" weight="medium">
                    /mo
                  </Text>
                ) : null}
              </Flex>

              {t.target_persona && (
                <Text size="2" color="gray">
                  {t.target_persona}
                </Text>
              )}

              {t.included?.length > 0 && (
                <Flex direction="column" gap="2" mt="1">
                  {t.included.map((inc, j) => (
                    <Flex key={j} gap="2" align="start">
                      <CheckIcon
                        className={css({
                          color: "accent.10",
                          mt: "1",
                          flexShrink: 0,
                        })}
                      />
                      <Text
                        size="2"
                        className={css({
                          color: "gray.12",
                          lineHeight: "1.5",
                        })}
                      >
                        {inc}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              )}

              {t.limits?.length > 0 && (
                <Flex gap="1" wrap="wrap">
                  {t.limits.map((l, j) => (
                    <Badge key={j} color="gray" variant="soft" size="1">
                      {l}
                    </Badge>
                  ))}
                </Flex>
              )}

              {t.upgrade_trigger && (
                <Box
                  className={css({
                    mt: "auto",
                    pt: "3",
                    borderTop: "1px dashed",
                    borderColor: "ui.border",
                  })}
                >
                  <Text
                    size="1"
                    color="gray"
                    as="div"
                    weight="bold"
                    mb="1"
                    className={eyebrow}
                  >
                    Upgrade when
                  </Text>
                  <Text
                    size="2"
                    as="p"
                    className={css({
                      lineHeight: "1.5",
                      color: "gray.12",
                    })}
                  >
                    {t.upgrade_trigger}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </div>
      </Box>

      {addons.length > 0 && (
        <Box>
          <Heading size="5" mb="3">
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
        data.rationale?.wtp_estimate) && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="5" mb="3">
              Rationale
            </Heading>
            <Flex direction="column" gap="3">
              {data.rationale?.value_basis && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderLeft: "3px solid",
                    borderLeftColor: "indigo.8",
                    borderRadius: "md",
                    p: "4",
                  })}
                >
                  <Text
                    weight="bold"
                    size="1"
                    color="gray"
                    as="div"
                    mb="2"
                    className={eyebrow}
                  >
                    Value basis
                  </Text>
                  <Text
                    size="2"
                    as="p"
                    className={css({ color: "gray.12", lineHeight: "1.6" })}
                  >
                    {data.rationale.value_basis}
                  </Text>
                </Box>
              )}
              {data.rationale?.competitor_benchmark && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderLeft: "3px solid",
                    borderLeftColor: "cyan.8",
                    borderRadius: "md",
                    p: "4",
                  })}
                >
                  <Text
                    weight="bold"
                    size="1"
                    color="gray"
                    as="div"
                    mb="2"
                    className={eyebrow}
                  >
                    Competitor benchmark
                  </Text>
                  <Text
                    size="2"
                    as="p"
                    className={css({ color: "gray.12", lineHeight: "1.6" })}
                  >
                    {data.rationale.competitor_benchmark}
                  </Text>
                </Box>
              )}
              {data.rationale?.wtp_estimate && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderLeft: "3px solid",
                    borderLeftColor: "jade.8",
                    borderRadius: "md",
                    p: "4",
                  })}
                >
                  <Text
                    weight="bold"
                    size="1"
                    color="gray"
                    as="div"
                    mb="2"
                    className={eyebrow}
                  >
                    Willingness to pay
                  </Text>
                  <Text
                    size="2"
                    as="p"
                    className={css({ color: "gray.12", lineHeight: "1.6" })}
                  >
                    {data.rationale.wtp_estimate}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>
        </>
      )}

      {risks.length > 0 && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="5" mb="3">
              Risks
            </Heading>
            <Flex direction="column" gap="3">
              {risks.map((r, i) => (
                <Box
                  key={i}
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderLeft: "3px solid",
                    borderLeftColor: "orange.9",
                    bg: "orange.2",
                    borderRadius: "md",
                    p: "4",
                  })}
                >
                  <Flex gap="3" align="start">
                    <Badge color="orange" size="1" variant="solid">
                      risk
                    </Badge>
                    <Text
                      size="2"
                      as="p"
                      className={css({
                        lineHeight: "1.6",
                        color: "gray.12",
                      })}
                    >
                      {r}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Box>
        </>
      )}

      {data.model?.discounting_strategy && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="5" mb="3">
              Discounting
            </Heading>
            <Box
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "md",
                p: "4",
              })}
            >
              <Text
                size="2"
                as="p"
                className={css({ color: "gray.12", lineHeight: "1.6" })}
              >
                {data.model.discounting_strategy}
              </Text>
            </Box>
          </Box>
        </>
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
      <Container size="3" p="6">
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
      <Container size="3" p="6">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p="6">
        <Text color="red">{error.message}</Text>
      </Container>
    );
  }

  const product = data?.productBySlug;

  if (!product) {
    return (
      <Container size="3" p="6">
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
    <Container size="3" p="6">
      <Flex mb="5" gap="2" align="center">
        <Link
          href={`/products/${product.slug}`}
          className={button({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeftIcon /> {product.name}
        </Link>
        <Text color="gray" size="2">
          /
        </Text>
        <Text size="3" weight="medium">
          Pricing
        </Text>
      </Flex>

      <Flex direction="column" gap="4">
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
              boxShadow: "inset 0 0 0 1px token(colors.accent.6)",
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
            aria-label={`Open ${product.name} website in new tab`}
            className={css({
              color: "accent.11",
              fontSize: "sm",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "1",
              wordBreak: "break-all",
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
            mt: "5",
            pt: "6",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          {pricing ? (
            <PricingAnalysisView data={pricing} />
          ) : latestRun && !terminal ? (
            <Text color="gray">Running pricing analysis…</Text>
          ) : (
            <Box
              className={css({
                border: "1px dashed",
                borderColor: "ui.border",
                borderRadius: "lg",
                p: "8",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3",
              })}
            >
              <span
                className={css({
                  color: "accent.11",
                  display: "inline-flex",
                  bg: "accent.3",
                  borderRadius: "full",
                  p: "3",
                })}
              >
                <MagicWandIcon width="20" height="20" />
              </span>
              <Heading size="4">No pricing analysis yet</Heading>
              <Text color="gray" size="2">
                {isAdmin
                  ? 'Click "Analyze pricing" to run the LangGraph pipeline.'
                  : "An admin needs to run the analysis first."}
              </Text>
            </Box>
          )}
        </div>
      </Flex>
    </Container>
  );
}
