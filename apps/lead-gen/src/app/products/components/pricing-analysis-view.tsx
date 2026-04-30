"use client";

import React from "react";
import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import {
  CheckIcon,
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
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  SectionCard,
  SectionHeading,
  SubpageBreadcrumb,
  SubpageHero,
  ProductExternalLink,
  StatusBadge,
} from "./view-chrome";

export type PricingAnalysis = PricingStrategyResult;

type Tier = NonNullable<PricingAnalysis["model"]>["tiers"][number];
type PriceAnchor = NonNullable<NonNullable<PricingAnalysis["rationale"]>["price_anchors"]>[number];

const TERMINAL_STATUSES = new Set(["success", "error", "timeout"]);

// ---------- presentation tokens ----------

const eyebrow = css({
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: "bold",
  fontSize: "xs",
  color: "gray.10",
});

const tabularNum = css({ fontVariantNumeric: "tabular-nums" });

const monoText = css({
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
});

// ---------- helpers ----------

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

// ---------- sub-components ----------

function PricingHeader({
  data,
  priceRange,
}: {
  data: PricingAnalysis;
  priceRange: string | null;
}) {
  const m = data.model;
  return (
    <Flex
      align="center"
      gap="3"
      wrap="wrap"
      className={css({
        bg: "ui.surface",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
        p: "4",
      })}
    >
      <Flex direction="column" gap="1">
        <Text className={eyebrow}>Pricing model</Text>
        <Flex gap="2" align="center" wrap="wrap">
          {m?.value_metric && (
            <Badge color="indigo" size="2" variant="soft">
              {m.value_metric}
            </Badge>
          )}
          {m?.model_type && (
            <Badge color="gray" size="2" variant="soft">
              {m.model_type}
            </Badge>
          )}
          {m?.free_offer && (
            <Badge color="green" size="1" variant="soft">
              {m.free_offer}
            </Badge>
          )}
        </Flex>
      </Flex>
      {priceRange && (
        <Flex
          direction="column"
          gap="1"
          align="end"
          className={css({ ml: "auto" })}
        >
          <Text className={eyebrow}>Range</Text>
          <Text
            size="3"
            weight="bold"
            className={`${monoText} ${css({ color: "gray.12" })}`}
          >
            {priceRange}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}

function RecommendationCallout({ text }: { text: string }) {
  return (
    <Box
      role="region"
      aria-label="Pricing recommendation"
      className={css({
        position: "relative",
        bg: "accent.2",
        border: "1px solid",
        borderColor: "accent.6",
        borderLeft: "3px solid",
        borderLeftColor: "accent.9",
        borderRadius: "md",
        p: { base: "4", md: "5" },
      })}
    >
      <Text as="div" mb="2" className={eyebrow}>
        Recommendation
      </Text>
      <Text
        as="p"
        size={{ initial: "3", md: "4" }}
        className={css({
          lineHeight: "1.55",
          color: "gray.12",
          fontWeight: "medium",
        })}
      >
        {text}
      </Text>
    </Box>
  );
}

function ReasoningGrid({
  valueMetricReasoning,
  valueMetric,
  modelTypeReasoning,
  modelType,
}: {
  valueMetricReasoning?: string | null;
  valueMetric?: string | null;
  modelTypeReasoning?: string | null;
  modelType?: string | null;
}) {
  if (!valueMetricReasoning && !modelTypeReasoning) return null;
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
        gap: "3",
      })}
    >
      {valueMetricReasoning && (
        <Box
          className={css({
            border: "1px solid",
            borderColor: "ui.border",
            borderLeft: "3px solid",
            borderLeftColor: "indigo.8",
            borderRadius: "md",
            bg: "ui.surface",
            p: "4",
          })}
        >
          <Flex gap="2" align="center" mb="2">
            <Text as="div" className={eyebrow}>
              Why this value metric
            </Text>
            {valueMetric && (
              <Badge color="indigo" size="1" variant="soft">
                {valueMetric}
              </Badge>
            )}
          </Flex>
          <Text
            size="2"
            as="p"
            className={css({ color: "gray.12", lineHeight: "1.6" })}
          >
            {valueMetricReasoning}
          </Text>
        </Box>
      )}
      {modelTypeReasoning && (
        <Box
          className={css({
            border: "1px solid",
            borderColor: "ui.border",
            borderLeft: "3px solid",
            borderLeftColor: "gray.8",
            borderRadius: "md",
            bg: "ui.surface",
            p: "4",
          })}
        >
          <Flex gap="2" align="center" mb="2">
            <Text as="div" className={eyebrow}>
              Why this model
            </Text>
            {modelType && (
              <Badge color="gray" size="1" variant="soft">
                {modelType}
              </Badge>
            )}
          </Flex>
          <Text
            size="2"
            as="p"
            className={css({ color: "gray.12", lineHeight: "1.6" })}
          >
            {modelTypeReasoning}
          </Text>
        </Box>
      )}
    </div>
  );
}

function TierPrice({ price }: { price: number | null | undefined }) {
  const isCustom = price === null || price === undefined;
  return (
    <Flex direction="column" gap="0">
      <Flex align="baseline" gap="1">
        <Text
          weight="bold"
          className={`${monoText} ${css({
            color: "accent.11",
            letterSpacing: "-0.03em",
            fontSize: { base: "5xl", md: "6xl" },
            lineHeight: "1",
          })}`}
        >
          {formatPrice(price)}
        </Text>
        {!isCustom && price !== 0 && (
          <Text
            size="2"
            color="gray"
            weight="medium"
            className={css({ pb: "2" })}
          >
            /mo
          </Text>
        )}
      </Flex>
      {isCustom && (
        <Text size="2" color="gray">
          Talk to sales
        </Text>
      )}
    </Flex>
  );
}

const COLLAPSE_LIMIT_THRESHOLD = 4;

function TierCard({ tier, isRecommended }: { tier: Tier; isRecommended: boolean }) {
  const t = tier;
  const limitsCount = t.limits?.length ?? 0;
  const showLimitsCollapsed = limitsCount > COLLAPSE_LIMIT_THRESHOLD;

  return (
    <Box
      className={css({
        position: "relative",
        bg: isRecommended ? "accent.2" : "ui.surface",
        border: "1px solid",
        borderColor: isRecommended ? "accent.9" : "ui.border",
        boxShadow: isRecommended
          ? "0 0 0 1px token(colors.accent.9), 0 12px 32px -12px rgba(0,0,0,0.18)"
          : "none",
        borderRadius: "lg",
        p: "5",
        display: "flex",
        flexDirection: "column",
        gap: "4",
        transition:
          "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
        _hover: {
          borderColor: isRecommended ? "accent.10" : "accent.7",
          boxShadow: "0 8px 28px -8px rgba(0,0,0,0.10)",
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
        <Text className={eyebrow}>
          {t.billing_unit ? `per ${t.billing_unit}` : "Tier"}
        </Text>
        <Text
          weight="bold"
          size="4"
          className={css({ color: "gray.12", lineHeight: "1.2" })}
        >
          {t.name}
        </Text>
      </Flex>

      <TierPrice price={t.price_monthly_usd} />

      {t.target_persona && (
        <Box
          className={css({
            borderTop: "1px solid",
            borderColor: "ui.border",
            pt: "3",
          })}
        >
          <Text as="div" mb="1" className={eyebrow}>
            Best for
          </Text>
          <Text size="2" className={css({ color: "gray.12", lineHeight: "1.5" })}>
            {t.target_persona}
          </Text>
        </Box>
      )}

      {t.included?.length > 0 && (
        <Flex direction="column" gap="2" asChild>
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

      {limitsCount > 0 &&
        (showLimitsCollapsed ? (
          <details
            className={css({
              "& > summary": {
                cursor: "pointer",
                listStyle: "none",
                fontSize: "xs",
                color: "amber.11",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                "&::-webkit-details-marker": { display: "none" },
                _hover: { color: "amber.12" },
              },
            })}
          >
            <summary>
              {limitsCount} limits
              <span aria-hidden> ▾</span>
            </summary>
            <Flex gap="1" wrap="wrap" mt="2">
              {t.limits!.map((l, j) => (
                <LimitBadge key={j} text={l} />
              ))}
            </Flex>
          </details>
        ) : (
          <Flex gap="1" wrap="wrap">
            {t.limits!.map((l, j) => (
              <LimitBadge key={j} text={l} />
            ))}
          </Flex>
        ))}

      {t.upgrade_trigger && (
        <Box
          className={css({
            mt: "auto",
            pt: "3",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          <Text as="div" mb="1" className={eyebrow}>
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
        <details
          className={css({
            pt: "3",
            borderTop: "1px solid",
            borderColor: "ui.border",
            "& > summary": {
              cursor: "pointer",
              listStyle: "none",
              "&::-webkit-details-marker": { display: "none" },
              _hover: { color: "gray.12" },
            },
          })}
        >
          <summary>
            <Text as="span" className={eyebrow}>
              Why this price
            </Text>
            <Text as="span" aria-hidden ml="1" size="1" color="gray">
              ▾
            </Text>
          </summary>
          <Box mt="2">
            {t.value_math && (
              <Text
                size="1"
                as="div"
                className={`${monoText} ${css({
                  bg: "gray.2",
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  px: "2",
                  py: "1",
                  mb: "2",
                  lineHeight: "1.4",
                  color: "gray.12",
                })}`}
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
                <Text className={eyebrow}>vs</Text>
                {t.anchor_competitors.map((a, k) => (
                  <Badge key={k} color="gray" size="1" variant="soft">
                    {a}
                  </Badge>
                ))}
              </Flex>
            )}
          </Box>
        </details>
      )}
    </Box>
  );
}

function LimitBadge({ text }: { text: string }) {
  return (
    <Badge
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
      {text}
    </Badge>
  );
}

function PriceAnchorsTable({ anchors }: { anchors: readonly PriceAnchor[] }) {
  return (
    <Box
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
        bg: "ui.surface",
        overflow: "hidden",
      })}
    >
      <Box className={css({ p: "4", pb: "3" })}>
        <Text as="div" className={eyebrow}>
          Price anchors
        </Text>
      </Box>
      <div className={css({ overflowX: "auto" })}>
        <table
          className={`${tabularNum} ${css({
            width: "100%",
            borderCollapse: "collapse",
            "& th": {
              textAlign: "left",
              fontSize: "xs",
              fontWeight: "bold",
              color: "gray.10",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              py: "2",
              px: "4",
              borderTop: "1px solid",
              borderBottom: "1px solid",
              borderColor: "ui.border",
              bg: "gray.2",
              whiteSpace: "nowrap",
            },
            "& td": {
              fontSize: "sm",
              color: "gray.12",
              py: "3",
              px: "4",
              borderBottom: "1px solid",
              borderColor: "ui.border",
              verticalAlign: "top",
            },
            "& tbody tr:last-child td": {
              borderBottom: "none",
            },
            "& tbody tr:hover td": {
              bg: "gray.2",
            },
          })}`}
        >
          <thead>
            <tr>
              <th scope="col">Competitor</th>
              <th scope="col">Tier</th>
              <th scope="col" className={css({ textAlign: "right!" })}>
                Price/mo
              </th>
              <th scope="col">Relation</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {anchors.map((anchor, i) => (
              <tr key={i}>
                <td className={css({ fontWeight: "bold" })}>
                  {anchor.competitor}
                </td>
                <td className={css({ color: "gray.11" })}>{anchor.tier}</td>
                <td
                  className={`${monoText} ${css({
                    fontWeight: "bold",
                    textAlign: "right",
                    color: "gray.12",
                  })}`}
                >
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
                    minWidth: "240px",
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
  );
}

function RationaleBlock({ label, text }: { label: string; text: string }) {
  return (
    <SectionCard>
      <Text as="div" mb="2" className={eyebrow}>
        {label}
      </Text>
      <Text
        size="2"
        as="p"
        className={css({ color: "gray.12", lineHeight: "1.6" })}
      >
        {text}
      </Text>
    </SectionCard>
  );
}

function RisksSection({ risks }: { risks: readonly string[] }) {
  return (
    <section aria-labelledby="risks-heading">
      <SectionHeading
        eyebrow="Watch list"
        title="Pricing risks"
        count={risks.length}
      />
      <Flex direction="column" gap="2">
        {risks.map((r, i) => (
          <Box
            key={i}
            className={css({
              bg: "ui.surface",
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
    </section>
  );
}

function EmptyPricing({ isAdmin }: { isAdmin: boolean }) {
  return (
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
        aria-hidden
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
  );
}

// ---------- main view ----------

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

  const tierGridCols =
    tiers.length >= 4
      ? "repeat(4, minmax(0, 1fr))"
      : "repeat(3, minmax(0, 1fr))";

  return (
    <Flex direction="column" gap="7">
      <PricingHeader data={data} priceRange={priceRange} />

      {data.rationale?.recommendation && (
        <RecommendationCallout text={data.rationale.recommendation} />
      )}

      <ReasoningGrid
        valueMetricReasoning={data.model?.value_metric_reasoning}
        valueMetric={data.model?.value_metric}
        modelTypeReasoning={data.model?.model_type_reasoning}
        modelType={data.model?.model_type}
      />

      <section aria-labelledby="tiers-heading">
        <SectionHeading
          eyebrow="Packaging"
          title="Tiers"
          count={tiers.length}
          description="Recommended tier highlighted; expand any card for unit-economics detail."
        />
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: {
              base: "1fr",
              md: "repeat(2, 1fr)",
              xl: tierGridCols,
            },
            gap: "4",
            pt: "2",
          })}
        >
          {tiers.map((t, i) => {
            const isRecommended =
              !!recommendedTierName &&
              !!t.name &&
              t.name.toLowerCase() === recommendedTierName.toLowerCase();
            return <TierCard key={i} tier={t} isRecommended={isRecommended} />;
          })}
        </div>
      </section>

      {addons.length > 0 && (
        <section aria-labelledby="addons-heading">
          <SectionHeading eyebrow="Expansion" title="Add-ons" count={addons.length} />
          <Flex gap="2" wrap="wrap">
            {addons.map((a, i) => (
              <Badge key={i} color="gray" size="2" variant="soft">
                {a}
              </Badge>
            ))}
          </Flex>
        </section>
      )}

      {(data.rationale?.value_basis ||
        data.rationale?.competitor_benchmark ||
        data.rationale?.wtp_estimate ||
        (data.rationale?.price_anchors && data.rationale.price_anchors.length > 0)) && (
        <section aria-labelledby="rationale-heading">
          <SectionHeading
            eyebrow="Evidence"
            title="Rationale"
            description="The data and competitive context behind the recommendation."
          />
          <Flex direction="column" gap="3">
            {data.rationale?.price_anchors &&
              data.rationale.price_anchors.length > 0 && (
                <PriceAnchorsTable anchors={data.rationale.price_anchors} />
              )}
            {data.rationale?.value_basis && (
              <RationaleBlock
                label="Value basis"
                text={data.rationale.value_basis}
              />
            )}
            {data.rationale?.competitor_benchmark && (
              <RationaleBlock
                label="Competitor benchmark"
                text={data.rationale.competitor_benchmark}
              />
            )}
            {data.rationale?.wtp_estimate && (
              <RationaleBlock
                label="Willingness to pay"
                text={data.rationale.wtp_estimate}
              />
            )}
          </Flex>
        </section>
      )}

      {risks.length > 0 && <RisksSection risks={risks} />}

      {data.model?.discounting_strategy && (
        <section aria-labelledby="discounting-heading">
          <SectionHeading eyebrow="Negotiation" title="Discounting strategy" />
          <SectionCard>
            <Text
              size="2"
              as="p"
              className={css({ color: "gray.12", lineHeight: "1.6" })}
            >
              {data.model.discounting_strategy}
            </Text>
          </SectionCard>
        </section>
      )}
    </Flex>
  );
}

// ---------- page wrapper ----------

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

  if (loading && !data) return <LoadingShell size="3" />;
  if (error) return <ErrorShell message={error.message} size="3" />;

  const product = data?.productBySlug;

  if (!product) return <ProductNotFound slug={slug} size="3" />;

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
    <Container size="4" p="6" asChild>
      <main>
        <SubpageBreadcrumb
          productSlug={product.slug}
          productName={product.name}
          currentLabel="Pricing"
        />

        <Flex direction="column" gap="4">
          <SubpageHero
            productName={product.name}
            currentLabel="Pricing"
            trailing={
              latestRun && !terminal ? (
                <StatusBadge status={latestRun.status} />
              ) : null
            }
          />

          <Flex gap="3" wrap="wrap" align="center">
            <ProductExternalLink
              url={product.url}
              domain={product.domain}
              productName={product.name}
            />
            {analyzedAt && (
              <Text
                size="2"
                color="gray"
                className={tabularNum}
              >
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
              <Flex
                align="center"
                gap="3"
                className={css({
                  border: "1px dashed",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  p: "5",
                  bg: "ui.surface",
                })}
              >
                <span
                  aria-hidden
                  className={css({ display: "inline-flex", color: "accent.11" })}
                >
                  <MagicWandIcon width="18" height="18" />
                </span>
                <Text color="gray" role="status" aria-live="polite">
                  Running pricing analysis…
                </Text>
              </Flex>
            ) : (
              <EmptyPricing isAdmin={isAdmin} />
            )}
          </div>
        </Flex>
      </main>
    </Container>
  );
}
