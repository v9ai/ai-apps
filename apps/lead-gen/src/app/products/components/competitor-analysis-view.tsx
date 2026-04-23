"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CubeIcon,
  ExternalLinkIcon,
  CheckIcon,
  Cross2Icon,
  CopyIcon,
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
import { useProductCompetitorsBySlugQuery } from "@/__generated__/hooks";
import type { ProductCompetitorsBySlugQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";

type Product = NonNullable<ProductCompetitorsBySlugQuery["productBySlug"]>;
type Analysis = NonNullable<Product["latestCompetitorAnalysis"]>;
type Competitor = Analysis["competitors"][number];

const cardStyle = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  p: "4",
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
});

// The three Claude agent teams, in dependency-graph order. Rendered in the
// "How this was produced" explainer panel so end users understand the
// provenance and methodology behind every number on the page.
const TEAMS = [
  {
    name: "Competitor Analyst",
    skill: "product-competitors",
    inputs: "Product description, highlights, ICP",
    outputs: "competitors rows + positioning headlines + threat scores",
    method:
      "WebSearch + WebFetch to find 5–7 direct rivals. Python-focused discovery biases toward PyPI / GitHub projects. Grounds every positioning claim in phrases from the competitor's site.",
  },
  {
    name: "Pricing Analyst",
    skill: "product-pricing",
    inputs: "competitors rows from team 1",
    outputs: "competitor_pricing_tiers + pricing recommendation",
    method:
      "Scrapes /pricing, /plans, /enterprise pages per competitor. Normalizes to tiers (name, monthly/annual/seat USD, included limits). Synthesizes a pricing recommendation for the seed product grounded in market medians.",
  },
  {
    name: "Positioning Analyst",
    skill: "product-positioning",
    inputs: "competitors + pricing from teams 1 and 2",
    outputs: "products.positioning_analysis",
    method:
      "Identifies trade-off axes, picks the underserved gap, writes the seed's defensible positioning statement + anti-audience + moat hypotheses. Rejects parity positioning in favor of differentiation.",
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

// ─── Sub-components ────────────────────────────────────────────────

function ExplainerPanel({ slug, analysis }: { slug: string; analysis: Analysis | null | undefined }) {
  return (
    <Box className={cardStyle}>
      <Heading size="4" mb="2">
        How this analysis was produced
      </Heading>
      <Text size="2" color="gray" mb="4">
        Three Claude agents run as a team. Each does one thing, then they debate
        and reconcile before publishing. Run{" "}
        <code>/agents product {slug} --python-focus</code> in Claude Code to
        refresh.
      </Text>
      <Flex
        direction={{ initial: "column", md: "row" }}
        gap="3"
        align="stretch"
      >
        {TEAMS.map((team, idx) => (
          <Box key={team.skill} className={teamCardStyle} style={{ flex: 1 }}>
            <Flex align="center" gap="2">
              <Badge color="indigo" size="2">
                Team {idx + 1}
              </Badge>
              <Text weight="bold">{team.name}</Text>
            </Flex>
            <Text size="1" color="gray">
              <code>{team.skill}</code>
            </Text>
            <Separator size="4" />
            <Text size="2">
              <strong>Inputs:</strong> {team.inputs}
            </Text>
            <Text size="2">
              <strong>Outputs:</strong> {team.outputs}
            </Text>
            <Text size="2" color="gray">
              {team.method}
            </Text>
          </Box>
        ))}
      </Flex>
      <Separator size="4" my="4" />
      <Text size="2" color="gray">
        Current run: <strong>{provenance(analysis)}</strong>
      </Text>
    </Box>
  );
}

function RunCommandPanel({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `/agents product ${slug} --python-focus`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can still select+copy the text */
    }
  }

  return (
    <Box className={cardStyle}>
      <Heading size="3" mb="2">
        Run the 3-team deep dive
      </Heading>
      <Text size="2" color="gray" mb="3">
        The web UI can&apos;t spawn Claude agents directly. Copy this command and
        paste it into a Claude Code session in this repo:
      </Text>
      <Flex
        align="center"
        gap="2"
        className={css({
          bg: "gray.3",
          border: "1px solid",
          borderColor: "ui.border",
          borderRadius: "sm",
          p: "2",
          fontFamily: "mono",
        })}
      >
        <Text size="2" style={{ flex: 1, fontFamily: "monospace" }}>
          {cmd}
        </Text>
        <button
          onClick={copy}
          className={button({ variant: "soft", size: "sm" })}
          type="button"
        >
          <CopyIcon /> {copied ? "Copied" : "Copy"}
        </button>
      </Flex>
      <Text size="1" color="gray" mt="2">
        Approximate cost per run: $1–2 of Claude spend. Writes to{" "}
        <code>competitor_analyses</code>, <code>competitors</code>,{" "}
        <code>competitor_pricing_tiers</code>, and{" "}
        <code>products.positioning_analysis</code>.
      </Text>
    </Box>
  );
}

function CompetitorCard({ c }: { c: Competitor }) {
  return (
    <Box
      className={cardStyle}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <Flex align="center" gap="2" justify="between">
        <Flex align="center" gap="2">
          {c.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.logoUrl}
              alt=""
              width={24}
              height={24}
              style={{ borderRadius: 4 }}
            />
          )}
          <Text weight="bold">{c.name}</Text>
        </Flex>
        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            color: "accent.11",
            fontSize: "xs",
            display: "inline-flex",
            alignItems: "center",
            gap: "1",
          })}
        >
          {c.domain ?? "visit"} <ExternalLinkIcon />
        </a>
      </Flex>
      {c.positioningHeadline && (
        <Text size="2" weight="medium">
          {c.positioningHeadline}
        </Text>
      )}
      {c.positioningTagline && (
        <Text size="2" color="gray">
          {c.positioningTagline}
        </Text>
      )}
      {c.targetAudience && (
        <Text size="1" color="gray">
          <strong>For:</strong> {c.targetAudience}
        </Text>
      )}
      <Flex gap="1" wrap="wrap" mt="1">
        <Badge color="gray" size="1">
          {c.status}
        </Badge>
        {c.pricingTiers.length > 0 && (
          <Badge color="green" size="1">
            {c.pricingTiers.length} tier{c.pricingTiers.length === 1 ? "" : "s"}
          </Badge>
        )}
        {c.features.length > 0 && (
          <Badge color="blue" size="1">
            {c.features.length} feature{c.features.length === 1 ? "" : "s"}
          </Badge>
        )}
      </Flex>
    </Box>
  );
}

function PricingMatrix({ competitors }: { competitors: Competitor[] }) {
  const withTiers = competitors.filter((c) => c.pricingTiers.length > 0);
  if (withTiers.length === 0) {
    return (
      <Text size="2" color="gray">
        No pricing tiers extracted yet. Run the Pricing Analyst (team 2) to
        populate.
      </Text>
    );
  }

  return (
    <Box
      style={{ overflowX: "auto" }}
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
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
                  <Table.Cell>{tIdx === 0 ? c.name : ""}</Table.Cell>
                  <Table.Cell>{t.tierName}</Table.Cell>
                  <Table.Cell>
                    {t.isCustomQuote ? "Custom" : formatMoney(t.monthlyPriceUsd)}
                  </Table.Cell>
                  <Table.Cell>{formatMoney(t.annualPriceUsd)}</Table.Cell>
                  <Table.Cell>{formatMoney(t.seatPriceUsd)}</Table.Cell>
                  <Table.Cell>
                    {t.isCustomQuote ? (
                      <Badge color="gray" size="1">
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
      <Text size="2" color="gray">
        No feature parity data yet.
      </Text>
    );
  }
  const allFeatures = Array.from(
    new Set(withFeatures.flatMap((c) => c.features.map((f) => f.featureText))),
  ).sort();

  return (
    <Box
      style={{ overflowX: "auto" }}
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
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
              <Table.Cell>{feature}</Table.Cell>
              {withFeatures.map((c) => {
                const has = c.features.some((f) => f.featureText === feature);
                return (
                  <Table.Cell key={c.id}>
                    {has ? (
                      <CheckIcon className={css({ color: "green.10" })} />
                    ) : (
                      <Cross2Icon className={css({ color: "gray.8" })} />
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
  const { user, loading: authLoading } = useAuth();

  const { data, loading, error } = useProductCompetitorsBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

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

  const analysis = product.latestCompetitorAnalysis;
  const competitors = analysis?.competitors ?? [];

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
        <Text size="2">Competitors &amp; pricing</Text>
      </Flex>

      <Flex direction="column" gap="5">
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
            {product.name} · <Text color="gray">Competitors &amp; pricing</Text>
          </Heading>
        </Flex>

        <ExplainerPanel slug={slug} analysis={analysis} />

        {competitors.length === 0 ? (
          <Box className={cardStyle}>
            <Heading size="3" mb="2">
              No analysis yet
            </Heading>
            <Text size="2" color="gray">
              The 3-agent Claude team hasn&apos;t been run for this product. Use the
              command below to kick it off.
            </Text>
          </Box>
        ) : (
          <>
            <Box>
              <Heading size="4" mb="3">
                Competitors ({competitors.length})
              </Heading>
              <Flex
                gap="3"
                wrap="wrap"
                className={css({
                  "& > *": {
                    flex: "1 1 280px",
                    minWidth: "280px",
                    maxWidth: "100%",
                  },
                })}
              >
                {competitors.map((c) => (
                  <CompetitorCard key={c.id} c={c} />
                ))}
              </Flex>
            </Box>

            <Box>
              <Heading size="4" mb="3">
                Pricing tiers
              </Heading>
              <PricingMatrix competitors={competitors} />
            </Box>

            <Box>
              <Heading size="4" mb="3">
                Feature parity
              </Heading>
              <FeatureMatrix competitors={competitors} />
            </Box>
          </>
        )}

        <RunCommandPanel slug={slug} />
      </Flex>
    </Container>
  );
}
