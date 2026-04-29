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
  MinusIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useAnalyzeProductPricingAsyncMutation,
} from "@/__generated__/hooks";
import { useIntelRunLive } from "@/lib/use-intel-run-live";
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

function extractRecommendedTierName(
  recommendation: string | undefined | null,
  tierNames: string[],
): string | null {
  if (!recommendation) return null;
  const hints = [
    "as the main growth driver",
    "primary growth",
    "main upsell",
    "flagship tier",
    "recommended tier",
    "focus on",
  ];
  for (const name of tierNames) {
    if (!name) continue;
    const rx = new RegExp(
      `${name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b[^.]{0,80}?(${hints.join("|")})`,
      "i",
    );
    if (rx.test(recommendation)) return name;
  }
  for (const name of tierNames) {
    if (!name) continue;
    const rx = new RegExp(
      `upsell to ${name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
      "i",
    );
    if (rx.test(recommendation)) return name;
  }
  return null;
}

function priceRangeSummary(
  tiers: Array<{ price_monthly_usd: number | null | undefined }>,
): string | null {
  if (!tiers.length) return null;
  const parts = tiers.map((t) => formatPrice(t.price_monthly_usd));
  return parts.join(" / ");
}

const eyebrow = css({
  textTransform: "uppercase",
  letterSpacing: "0.08em",
});

export function PricingAnalysisView({ data }: { data: PricingAnalysis }) {
  const tiers = data.model?.tiers ?? [];
  const addons = data.model?.addons ?? [];
  const risks = data.rationale?.risks ?? [];

  const recommendedTierName = React.useMemo(
    () =>
      extractRecommendedTierName(
        data.rationale?.recommendation,
        tiers.map((t) => t.name).filter(Boolean) as string[],
      ),
    [data.rationale?.recommendation, tiers],
  );
  const priceRange = priceRangeSummary(tiers);

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
        {priceRange && (
          <Text
            size="2"
            color="gray"
            className={css({
              ml: "auto",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {priceRange}
          </Text>
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
                borderLeft: "3px solid",
                borderLeftColor: "indigo.8",
                borderRadius: "md",
                p: "4",
              })}
            >
              <Flex gap="2" align="center" mb="2">
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  as="div"
                  className={eyebrow}
                >
                  Why this value metric
                </Text>
                {data.model.value_metric && (
                  <Badge color="indigo" size="1" variant="soft">
                    {data.model.value_metric}
                  </Badge>
                )}
              </Flex>
              <Text
                size="2"
                as="p"
                className={css({ color: "gray.12", lineHeight: "1.6" })}
              >
                {data.model.value_metric_reasoning}
              </Text>
            </Box>
          )}
          {data.model?.model_type_reasoning && (
            <Box
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderLeft: "3px solid",
                borderLeftColor: "gray.8",
                borderRadius: "md",
                p: "4",
              })}
            >
              <Flex gap="2" align="center" mb="2">
                <Text
                  size="1"
                  weight="bold"
                  color="gray"
                  as="div"
                  className={eyebrow}
                >
                  Why this model
                </Text>
                {data.model.model_type && (
                  <Badge color="gray" size="1" variant="soft">
                    {data.model.model_type}
                  </Badge>
                )}
              </Flex>
              <Text
                size="2"
                as="p"
                className={css({ color: "gray.12", lineHeight: "1.6" })}
              >
                {data.model.model_type_reasoning}
              </Text>
            </Box>
          )}
        </div>
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
              xl:
                tiers.length >= 4
                  ? "repeat(4, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
            },
            gap: "4",
          })}
        >
          {tiers.map((t, i) => {
            const isRecommended =
              !!recommendedTierName &&
              !!t.name &&
              t.name.toLowerCase() === recommendedTierName.toLowerCase();
            return (
            <Box
              key={i}
              className={css({
                position: "relative",
                border: "1px solid",
                borderColor: isRecommended ? "accent.9" : "ui.border",
                boxShadow: isRecommended ? "0 0 0 1px token(colors.accent.9)" : "none",
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
              {isRecommended && (
                <Badge
                  color="indigo"
                  variant="solid"
                  size="1"
                  className={css({
                    position: "absolute",
                    top: "-10px",
                    left: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "1",
                  })}
                >
                  <StarFilledIcon aria-hidden width="10" height="10" />
                  Recommended
                </Badge>
              )}
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

              {t.price_monthly_usd === null || t.price_monthly_usd === undefined ? (
                <Text size="2" color="gray">
                  Talk to sales
                </Text>
              ) : null}

              {t.target_persona && (
                <Text size="2" color="gray">
                  <span
                    className={`${eyebrow} ${css({
                      color: "gray.11",
                      fontSize: "xs",
                      fontWeight: "bold",
                      mr: "1",
                    })}`}
                  >
                    Best for
                  </span>
                  {t.target_persona}
                </Text>
              )}

              {t.included?.length > 0 && (
                <Flex direction="column" gap="2" mt="1" asChild>
                  <ul className={css({ listStyle: "none", p: 0, m: 0 })}>
                    {t.included.map((inc, j) => (
                      <Flex key={j} gap="2" align="start" asChild>
                        <li>
                          <CheckIcon
                            aria-hidden
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
                        </li>
                      </Flex>
                    ))}
                  </ul>
                </Flex>
              )}

              {t.limits?.length > 0 && (
                <Flex gap="1" wrap="wrap">
                  {t.limits.map((l, j) => (
                    <Badge
                      key={j}
                      color="amber"
                      variant="soft"
                      size="1"
                      className={css({
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "1",
                      })}
                    >
                      <MinusIcon aria-hidden width="10" height="10" />
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
                    borderTop: "1px solid",
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

              {(t.value_math ||
                t.price_justification ||
                (t.anchor_competitors && t.anchor_competitors.length > 0)) && (
                <Box
                  className={css({
                    pt: "3",
                    borderTop: "1px solid",
                    borderColor: "ui.border",
                    opacity: 0.9,
                  })}
                >
                  <Text
                    size="1"
                    color="gray"
                    as="div"
                    weight="bold"
                    mb="2"
                    className={eyebrow}
                  >
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
                        borderRadius: "sm",
                        px: "2",
                        py: "1",
                        mb: "2",
                        lineHeight: "1.4",
                        color: "gray.12",
                      })}
                    >
                      {t.value_math}
                    </Text>
                  )}
                  {t.price_justification && (
                    <Text
                      size="2"
                      as="p"
                      className={css({
                        lineHeight: "1.5",
                        color: "gray.12",
                      })}
                      mb={
                        t.anchor_competitors && t.anchor_competitors.length > 0
                          ? "2"
                          : "0"
                      }
                    >
                      {t.price_justification}
                    </Text>
                  )}
                  {t.anchor_competitors && t.anchor_competitors.length > 0 && (
                    <Flex gap="1" wrap="wrap" align="center">
                      <Text size="1" color="gray" className={eyebrow}>
                        vs
                      </Text>
                      {t.anchor_competitors.map((a, k) => (
                        <Badge key={k} color="gray" size="1" variant="soft">
                          {a}
                        </Badge>
                      ))}
                    </Flex>
                  )}
                </Box>
              )}
            </Box>
            );
          })}
        </div>
      </Box>

      {addons.length > 0 && (
        <Box>
          <Heading size="4" mb="3">
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
            <Heading size="5" mb="3">
              Rationale
            </Heading>
            <Flex direction="column" gap="3">
              {data.rationale?.price_anchors &&
                data.rationale.price_anchors.length > 0 && (
                  <Box
                    className={css({
                      border: "1px solid",
                      borderColor: "ui.border",
                      borderRadius: "md",
                      p: "4",
                    })}
                  >
                    <Text
                      weight="bold"
                      size="1"
                      color="gray"
                      as="div"
                      mb="3"
                      className={eyebrow}
                    >
                      Price anchors
                    </Text>
                    <div
                      className={css({
                        overflowX: "auto",
                      })}
                    >
                      <table
                        className={css({
                          width: "100%",
                          borderCollapse: "collapse",
                          fontVariantNumeric: "tabular-nums",
                          "& th": {
                            textAlign: "left",
                            fontSize: "xs",
                            fontWeight: "bold",
                            color: "gray.11",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            py: "2",
                            pr: "3",
                            borderBottom: "1px solid",
                            borderColor: "ui.border",
                            whiteSpace: "nowrap",
                          },
                          "& td": {
                            fontSize: "sm",
                            color: "gray.12",
                            py: "2",
                            pr: "3",
                            borderBottom: "1px solid",
                            borderColor: "ui.border",
                            verticalAlign: "top",
                          },
                          "& tbody tr:last-child td": {
                            borderBottom: "none",
                          },
                        })}
                      >
                        <thead>
                          <tr>
                            <th scope="col">Competitor</th>
                            <th scope="col">Tier</th>
                            <th scope="col">Price/mo</th>
                            <th scope="col">Relation</th>
                            <th scope="col">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.rationale.price_anchors.map((anchor, i) => (
                            <tr key={i}>
                              <td className={css({ fontWeight: "medium" })}>
                                {anchor.competitor}
                              </td>
                              <td className={css({ color: "gray.11" })}>
                                {anchor.tier}
                              </td>
                              <td className={css({ fontWeight: "bold" })}>
                                {formatPrice(anchor.monthly_price_usd)}
                              </td>
                              <td>
                                <Badge
                                  color={relationColor(anchor.relation)}
                                  size="1"
                                  variant="soft"
                                >
                                  {anchor.relation}
                                </Badge>
                              </td>
                              <td
                                className={css({
                                  color: "gray.11",
                                  lineHeight: "1.5",
                                })}
                              >
                                {anchor.note}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Box>
                )}
              {data.rationale?.value_basis && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
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
            <Heading size="4" mb="3">
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
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const [analyzePricing, analyzeState] = useAnalyzeProductPricingAsyncMutation();

  const productId = data?.productBySlug?.id ?? 0;

  const { data: runsData } = useIntelRunLive(productId, "pricing");

  const latestRun = runsData?.productIntelRuns?.[0];
  const terminal = latestRun ? TERMINAL_STATUSES.has(latestRun.status) : true;

  if (loading && !data) {
    return (
      <Container size="3" p="6">
        <Text color="gray" role="status" aria-live="polite">
          Loading…
        </Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p="6">
        <Text color="red" role="alert">
          {error.message}
        </Text>
      </Container>
    );
  }

  const product = data?.productBySlug;

  if (!product) {
    return (
      <Container size="3" p="6">
        <Flex direction="column" gap="3">
          <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
            <ArrowLeftIcon aria-hidden /> Products
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
    <Container size="3" p="6" asChild>
      <main>
        <nav
          aria-label="Breadcrumb"
          className={css({ mb: "5" })}
        >
          <Flex
            gap="2"
            align="center"
            asChild
          >
            <ol className={css({ listStyle: "none", p: 0, m: 0 })}>
              <li>
                <Link
                  href={`/products/${product.slug}`}
                  className={button({ variant: "ghost", size: "sm" })}
                >
                  <ArrowLeftIcon aria-hidden /> {product.name}
                </Link>
              </li>
              <li aria-hidden="true">
                <Text color="gray" size="2">
                  /
                </Text>
              </li>
              <li>
                <Text size="3" weight="medium" aria-current="page">
                  Pricing
                </Text>
              </li>
            </ol>
          </Flex>
        </nav>

      <Flex direction="column" gap="4">
        <Flex align="center" gap="3" wrap="wrap">
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
              borderRadius: "sm",
              _hover: { textDecoration: "underline" },
              _focusVisible: {
                outline: "2px solid",
                outlineColor: "accent.9",
                outlineOffset: "2px",
              },
            })}
          >
            {product.domain ?? product.url}
            <ExternalLinkIcon aria-hidden />
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
              <MagicWandIcon aria-hidden />
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
          <Text color="red" as="p" role="alert">
            {analyzeState.error.message}
          </Text>
        )}
        {latestRun?.error && (
          <Text color="red" as="p" role="alert">
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
            <Text color="gray" role="status" aria-live="polite">
              Running pricing analysis…
            </Text>
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
                aria-hidden="true"
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
      </main>
    </Container>
  );
}
