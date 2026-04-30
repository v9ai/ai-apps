"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  CheckIcon,
  Cross2Icon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Separator,
  Table,
  Text,
} from "@radix-ui/themes";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductCompetitorsBySlugQuery,
  useCreateCompetitorAnalysisMutation,
} from "@/__generated__/hooks";
import type { ProductCompetitorsBySlugQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { DEEPSEEK_MODELS } from "@/lib/deepseek/constants";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  SectionCard,
  SectionHeading,
  SubpageBreadcrumb,
  SubpageHero,
} from "./view-chrome";

type Product = NonNullable<ProductCompetitorsBySlugQuery["productBySlug"]>;
type Analysis = NonNullable<Product["latestCompetitorAnalysis"]>;
type Competitor = Analysis["competitors"][number];

const eyebrowStyle = css({
  color: "accent.11",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: "medium",
  fontSize: "xs",
});

const teamCardStyle = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  p: "4",
  display: "flex",
  flexDirection: "column",
  gap: "2",
  flex: 1,
  minWidth: 0,
  transition: "border-color 150ms ease",
  _hover: { borderColor: "gray.7" },
});

// The three LangGraph pipelines that populate this page, in the order they
// run against a product. Rendered in the "How this was produced" explainer
// panel so end users understand the provenance behind every number.
const TEAMS = [
  {
    name: "Discovery",
    graph: "competitors_team",
    file: "backend/leadgen_agent/competitors_team_graph.py",
    inputs: "Product description, highlights, ICP",
    outputs: "competitors rows (name, URL, positioning headline, threat score)",
    method:
      "discovery_scout → competitor_loader → (differentiator ‖ threat_assessor) → synthesizer. Multi-agent LangGraph fan-out that returns 5–7 direct rivals with grounded positioning.",
    trigger: "createCompetitorAnalysis(productId) mutation (admin-only)",
  },
  {
    name: "Deep scrape",
    graph: "deep_competitor",
    file: "backend/leadgen_agent/deep_competitor_graph.py",
    inputs: "one competitors.id per Send",
    outputs:
      "competitor_pricing_tiers, competitor_features, competitor_integrations",
    method:
      `Six specialists fan out via Send API: pricing_deep · features_deep · integrations_deep · changelog · positioning_shift · funding_headcount. ${DEEPSEEK_MODELS.pro.label} extracts hard signals from each competitor's pages.`,
    trigger:
      "approveCompetitors(analysisId, competitors) → /api/competitors/scrape",
  },
  {
    name: "Pricing synthesis",
    graph: "pricing",
    file: "backend/leadgen_agent/pricing_graph.py",
    inputs:
      "product + icp_analysis + competitor_pricing_tiers rows from teams 1–2",
    outputs: "products.pricing_analysis jsonb",
    method:
      "load_inputs → (benchmark_competitors ‖ choose_value_metric) → design_model → write_rationale. Produces a recommended pricing model with tiers and a rationale that references at least 3 competitors.",
    trigger: "analyzeProductPricingAsync(id) mutation",
  },
] as const;

function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "Free";
  return `$${n.toFixed(n >= 100 ? 0 : 2)}`;
}

function provenance(analysis: Analysis | null | undefined): string {
  if (!analysis) return "not yet analyzed";
  const when = new Date(analysis.updatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${analysis.status} · ${when}`;
}

function statusColor(status: string): "green" | "amber" | "blue" | "gray" {
  if (status === "complete" || status === "approved") return "green";
  if (status === "pending_approval" || status === "in_progress") return "amber";
  if (status === "running") return "blue";
  return "gray";
}

// ─── Sub-components ────────────────────────────────────────────────

function ExplainerPanel({ analysis }: { analysis: Analysis | null | undefined }) {
  return (
    <Box
      className={css({
        bg: "ui.surface",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        p: "5",
      })}
    >
      <Flex direction="column" gap="1" mb="4">
        <Text className={eyebrowStyle}>Provenance</Text>
        <Heading size="4" className={css({ color: "gray.12" })}>
          How this analysis was produced
        </Heading>
        <Text size="2" color="gray" as="p" className={css({ maxWidth: "70ch" })}>
          Three LangGraph pipelines run in sequence. Each writes to its own DB
          tables; the next reads what the previous produced. There&apos;s an
          admin approval gate between teams 1 and 2.
        </Text>
      </Flex>
      <Box
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
          gap: "3",
        })}
      >
        {TEAMS.map((team, idx) => (
          <Box key={team.graph} className={teamCardStyle}>
            <Flex align="center" gap="2" justify="between">
              <Flex align="center" gap="2">
                <Text
                  size="1"
                  className={css({
                    color: "accent.11",
                    bg: "accent.3",
                    border: "1px solid",
                    borderColor: "accent.6",
                    px: "2",
                    py: "1",
                    borderRadius: "sm",
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: "28px",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "xs",
                  })}
                >
                  {idx + 1}
                </Text>
                <Text weight="bold" size="2" className={css({ color: "gray.12" })}>
                  {team.name}
                </Text>
              </Flex>
            </Flex>
            <Text
              size="1"
              className={css({
                color: "gray.10",
                fontFamily: "mono",
                wordBreak: "break-word",
              })}
            >
              {team.graph}
            </Text>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              <Box>
                <Text
                  size="1"
                  className={css({
                    color: "gray.10",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: "medium",
                  })}
                >
                  Inputs
                </Text>
                <Text size="2" as="p" className={css({ color: "gray.12", mt: "0.5" })}>
                  {team.inputs}
                </Text>
              </Box>
              <Box>
                <Text
                  size="1"
                  className={css({
                    color: "gray.10",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: "medium",
                  })}
                >
                  Outputs
                </Text>
                <Text size="2" as="p" className={css({ color: "gray.12", mt: "0.5" })}>
                  {team.outputs}
                </Text>
              </Box>
              <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.55" })}>
                {team.method}
              </Text>
              <Text size="1" color="gray" as="p" className={css({ mt: "1" })}>
                <strong>Trigger:</strong> {team.trigger}
              </Text>
            </Flex>
          </Box>
        ))}
      </Box>
      <Separator size="4" my="4" />
      <Flex align="center" gap="2" wrap="wrap">
        <Text size="2" color="gray">
          Current run:
        </Text>
        {analysis ? (
          <Badge color={statusColor(analysis.status)} size="2" variant="soft">
            {provenance(analysis)}
          </Badge>
        ) : (
          <Badge color="gray" size="2" variant="surface">
            not yet analyzed
          </Badge>
        )}
      </Flex>
    </Box>
  );
}

function KickoffPanel({
  productId,
  hasAnalysis,
  onDone,
}: {
  productId: number;
  hasAnalysis: boolean;
  onDone: () => void;
}) {
  const [run, { loading, error }] = useCreateCompetitorAnalysisMutation();
  const [kickedAnalysisId, setKickedAnalysisId] = useState<number | null>(null);

  async function onClick() {
    const res = await run({ variables: { productId } });
    const id = res.data?.createCompetitorAnalysis?.id ?? null;
    if (id !== null) {
      setKickedAnalysisId(id);
      onDone();
    }
  }

  return (
    <Box
      className={css({
        bg: "accent.2",
        border: "1px solid",
        borderColor: "accent.6",
        borderRadius: "lg",
        p: "5",
      })}
    >
      <Flex direction="column" gap="1" mb="3">
        <Text className={eyebrowStyle}>Admin action</Text>
        <Heading size="3" className={css({ color: "gray.12" })}>
          {hasAnalysis ? "Re-run team 1 (Discovery)" : "Run team 1 (Discovery)"}
        </Heading>
      </Flex>
      <Text size="2" color="gray" mb="3" as="p" className={css({ lineHeight: "1.55", maxWidth: "70ch" })}>
        Kicks off the <code>competitors_team</code> LangGraph pipeline. It
        returns 5–7 suggested competitors in <code>pending_approval</code>{" "}
        status. An admin then runs <code>approveCompetitors</code> (from the
        existing competitors admin tools) to advance to team 2 (deep scrape).
        Team 3 (pricing) is a separate kickoff from the products list.
      </Text>
      <Flex align="center" gap="3" wrap="wrap">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className={button({ variant: "solid", size: "sm" })}
        >
          <MagicWandIcon aria-hidden />
          <span className={css({ ml: "1" })}>
            {loading
              ? "Starting…"
              : hasAnalysis
                ? "Re-run discovery"
                : "Run discovery"}
          </span>
        </button>
        {kickedAnalysisId !== null && !loading && !error && (
          <Text size="2" color="gray" role="status" aria-live="polite">
            Started analysis #{kickedAnalysisId}. Refresh in a minute.
          </Text>
        )}
        {error && (
          <Text size="2" color="red" role="alert">
            {error.message}
          </Text>
        )}
      </Flex>
    </Box>
  );
}

function CompetitorCard({ c, ordinal }: { c: Competitor; ordinal: number }) {
  return (
    <SectionCard>
      <Flex direction="column" gap="2" className={css({ height: "100%" })}>
        <Flex align="center" gap="2" justify="between">
          <Flex align="center" gap="2" className={css({ minWidth: 0 })}>
            <Text
              size="1"
              className={css({
                color: "gray.11",
                bg: "gray.3",
                border: "1px solid",
                borderColor: "gray.6",
                px: "2",
                py: "1",
                borderRadius: "sm",
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
                minWidth: "28px",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: "xs",
              })}
            >
              {ordinal}
            </Text>
            {c.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logoUrl}
                alt={`${c.name} logo`}
                width={24}
                height={24}
                className={css({
                  borderRadius: "sm",
                  flexShrink: 0,
                  border: "1px solid",
                  borderColor: "ui.border",
                })}
              />
            )}
            <Text
              weight="bold"
              size="3"
              className={css({
                color: "gray.12",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              })}
            >
              {c.name}
            </Text>
          </Flex>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${c.name} website in new tab`}
            className={css({
              color: "accent.11",
              fontSize: "xs",
              display: "inline-flex",
              alignItems: "center",
              gap: "1",
              borderRadius: "sm",
              flexShrink: 0,
              _hover: { textDecoration: "underline" },
              _focusVisible: {
                outline: "2px solid",
                outlineColor: "accent.9",
                outlineOffset: "2px",
              },
            })}
          >
            {c.domain ?? "visit"} <ExternalLinkIcon aria-hidden />
          </a>
        </Flex>
        {c.positioningHeadline && (
          <Text
            size="2"
            weight="medium"
            as="p"
            className={css({ color: "gray.12", lineHeight: "1.5" })}
          >
            {c.positioningHeadline}
          </Text>
        )}
        {c.positioningTagline && (
          <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5" })}>
            {c.positioningTagline}
          </Text>
        )}
        {c.targetAudience && (
          <Text size="1" color="gray" as="p" className={css({ lineHeight: "1.5" })}>
            <Text
              size="1"
              className={css({
                color: "accent.11",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: "medium",
                mr: "2",
              })}
            >
              For
            </Text>
            {c.targetAudience}
          </Text>
        )}
        <Flex
          gap="1"
          wrap="wrap"
          mt="auto"
          pt="2"
          className={css({ borderTop: "1px solid", borderColor: "ui.border" })}
        >
          <Badge color={statusColor(c.status)} size="1" variant="soft">
            {c.status}
          </Badge>
          {c.pricingTiers.length > 0 && (
            <Badge color="green" size="1" variant="soft">
              {c.pricingTiers.length} tier
              {c.pricingTiers.length === 1 ? "" : "s"}
            </Badge>
          )}
          {c.features.length > 0 && (
            <Badge color="blue" size="1" variant="soft">
              {c.features.length} feature
              {c.features.length === 1 ? "" : "s"}
            </Badge>
          )}
        </Flex>
      </Flex>
    </SectionCard>
  );
}

function PricingMatrix({ competitors }: { competitors: Competitor[] }) {
  const withTiers = competitors.filter((c) => c.pricingTiers.length > 0);
  if (withTiers.length === 0) {
    return (
      <Box
        className={css({
          bg: "ui.surface",
          border: "1px dashed",
          borderColor: "ui.border",
          borderRadius: "md",
          p: "4",
        })}
      >
        <Text size="2" color="gray" as="p">
          No pricing tiers extracted yet. Run the Pricing Analyst (team 2) to
          populate.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      className={css({
        overflowX: "auto",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
        bg: "ui.surface",
      })}
    >
      <Table.Root size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Competitor</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Tier</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Monthly</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Annual</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Per seat</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {withTiers.flatMap((c) =>
            [...c.pricingTiers]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((t, tIdx) => (
                <Table.Row key={`${c.id}-${t.id}`}>
                  <Table.Cell>
                    {tIdx === 0 ? (
                      <Text weight="medium" size="2" className={css({ color: "gray.12" })}>
                        {c.name}
                      </Text>
                    ) : (
                      ""
                    )}
                  </Table.Cell>
                  <Table.Cell>{t.tierName}</Table.Cell>
                  <Table.Cell className={css({ fontVariantNumeric: "tabular-nums" })}>
                    {t.isCustomQuote ? "Custom" : formatMoney(t.monthlyPriceUsd)}
                  </Table.Cell>
                  <Table.Cell className={css({ fontVariantNumeric: "tabular-nums" })}>
                    {formatMoney(t.annualPriceUsd)}
                  </Table.Cell>
                  <Table.Cell className={css({ fontVariantNumeric: "tabular-nums" })}>
                    {formatMoney(t.seatPriceUsd)}
                  </Table.Cell>
                  <Table.Cell>
                    {t.isCustomQuote ? (
                      <Badge color="gray" size="1" variant="surface">
                        Contact Sales
                      </Badge>
                    ) : (
                      ""
                    )}
                  </Table.Cell>
                </Table.Row>
              )),
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

function FeatureMatrix({ competitors }: { competitors: Competitor[] }) {
  const withFeatures = competitors.filter((c) => c.features.length > 0);
  if (withFeatures.length === 0) {
    return (
      <Box
        className={css({
          bg: "ui.surface",
          border: "1px dashed",
          borderColor: "ui.border",
          borderRadius: "md",
          p: "4",
        })}
      >
        <Text size="2" color="gray" as="p">
          No feature parity data yet.
        </Text>
      </Box>
    );
  }
  const allFeatures = Array.from(
    new Set(withFeatures.flatMap((c) => c.features.map((f) => f.featureText))),
  ).sort();

  return (
    <Box
      className={css({
        overflowX: "auto",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
        bg: "ui.surface",
      })}
    >
      <Table.Root size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Feature</Table.ColumnHeaderCell>
            {withFeatures.map((c) => (
              <Table.ColumnHeaderCell key={c.id}>
                {c.name}
              </Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {allFeatures.map((feature) => (
            <Table.Row key={feature}>
              <Table.Cell>
                <Text size="2" className={css({ color: "gray.12" })}>
                  {feature}
                </Text>
              </Table.Cell>
              {withFeatures.map((c) => {
                const has = c.features.some((f) => f.featureText === feature);
                return (
                  <Table.Cell key={c.id}>
                    {has ? (
                      <CheckIcon
                        aria-label={`${c.name} has ${feature}`}
                        className={css({ color: "green.10" })}
                      />
                    ) : (
                      <Cross2Icon
                        aria-label={`${c.name} does not have ${feature}`}
                        className={css({ color: "gray.8" })}
                      />
                    )}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function ProductCompetitorsPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductCompetitorsBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  if (loading && !data) return <LoadingShell />;
  if (error) return <ErrorShell message={error.message} />;

  const product = data?.productBySlug;

  if (!product) return <ProductNotFound slug={slug} />;

  const analysis = product.latestCompetitorAnalysis;
  const competitors = analysis?.competitors ?? [];

  // Sort competitors so the highest-signal cards (most pricing tiers + features) lead.
  const sortedCompetitors = [...competitors].sort(
    (a, b) =>
      b.pricingTiers.length + b.features.length -
      (a.pricingTiers.length + a.features.length),
  );

  return (
    <Container size="4" p="6" asChild>
      <main>
        <SubpageBreadcrumb
          productSlug={product.slug}
          productName={product.name}
          currentLabel="Competitors & pricing"
        />

        <Flex direction="column" gap="6">
          <SubpageHero
            productName={product.name}
            currentLabel="Competitors & pricing"
            trailing={
              competitors.length > 0 ? (
                <Badge color="indigo" size="2" variant="soft" radius="full">
                  {competitors.length} competitor
                  {competitors.length === 1 ? "" : "s"}
                </Badge>
              ) : null
            }
          />

          <ExplainerPanel analysis={analysis} />

          {competitors.length === 0 ? (
            <Box
              className={css({
                bg: "ui.surface",
                border: "1px dashed",
                borderColor: "ui.border",
                borderRadius: "md",
                p: "6",
                textAlign: "center",
              })}
            >
              <Heading size="3" mb="2">
                No analysis yet
              </Heading>
              <Text size="2" color="gray" as="p">
                No <code>competitor_analyses</code> row exists for this product
                yet.{" "}
                {isAdmin
                  ? "Use the panel below to start team 1."
                  : "Ask an admin to kick off the discovery team."}
              </Text>
            </Box>
          ) : (
            <>
              <Box>
                <SectionHeading
                  eyebrow="Direct rivals"
                  title="Competitors"
                  count={sortedCompetitors.length}
                  description="Ranked by depth of evidence (pricing tiers + features extracted)."
                />
                <Box
                  className={css({
                    display: "grid",
                    gridTemplateColumns: {
                      base: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(3, 1fr)",
                    },
                    gap: "3",
                  })}
                >
                  {sortedCompetitors.map((c, i) => (
                    <CompetitorCard key={c.id} c={c} ordinal={i + 1} />
                  ))}
                </Box>
              </Box>

              <Box>
                <SectionHeading
                  eyebrow="What they charge"
                  title="Pricing tiers"
                />
                <PricingMatrix competitors={sortedCompetitors} />
              </Box>

              <Box>
                <SectionHeading
                  eyebrow="What they ship"
                  title="Feature parity"
                />
                <FeatureMatrix competitors={sortedCompetitors} />
              </Box>
            </>
          )}

          {isAdmin && (
            <KickoffPanel
              productId={product.id}
              hasAnalysis={Boolean(analysis)}
              onDone={() => {
                void refetch();
              }}
            />
          )}
        </Flex>
      </main>
    </Container>
  );
}
