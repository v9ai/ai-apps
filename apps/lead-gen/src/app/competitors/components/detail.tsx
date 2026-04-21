"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CompetitorAnalysisQuery } from "@/__generated__/hooks";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useCompetitorAnalysisQuery,
  useRescrapeCompetitorMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

const STATUS_COLORS: Record<string, "gray" | "blue" | "green" | "red" | "orange"> = {
  pending_approval: "orange",
  suggested: "gray",
  approved: "blue",
  scraping: "blue",
  done: "green",
  failed: "red",
};

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "$0";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type Tier = {
  id: number;
  tierName: string;
  monthlyPriceUsd: number | null;
  annualPriceUsd: number | null;
  seatPriceUsd: number | null;
  currency: string;
  includedLimits: Record<string, unknown> | null;
  isCustomQuote: boolean;
};

type Competitor = {
  id: number;
  name: string;
  url: string;
  status: string;
  logoUrl: string | null;
  positioningHeadline: string | null;
  positioningTagline: string | null;
  scrapeError: string | null;
  pricingTiers: Tier[];
  features: Array<{ id: number; tierName: string | null; featureText: string; category: string | null }>;
  integrations: Array<{ id: number; integrationName: string; integrationUrl: string | null; category: string | null }>;
};

export function CompetitorAnalysisDetail({ analysisId }: { analysisId: number }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error } = useCompetitorAnalysisQuery({
    variables: { id: analysisId },
    skip: Number.isNaN(analysisId),
    fetchPolicy: "cache-and-network",
    pollInterval: 5000,
  });

  const [rescrape] = useRescrapeCompetitorMutation();

  const analysis = data?.competitorAnalysis;
  const competitors = useMemo<Competitor[]>(
    () => (analysis?.competitors ?? []) as unknown as Competitor[],
    [analysis?.competitors],
  );

  const tierMatrix = useMemo(() => buildTierMatrix(competitors), [competitors]);
  const featureMatrix = useMemo(() => buildFeatureMatrix(competitors), [competitors]);

  if (!isAdmin) {
    return (
      <Container size="4" p="8">
        <Text color="red">Admin access required.</Text>
      </Container>
    );
  }

  if (loading && !analysis) {
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

  if (!analysis) {
    return (
      <Container size="4" p="6">
        <Text color="gray">Analysis not found.</Text>
      </Container>
    );
  }

  return (
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="4">
        <Flex direction="column" gap="1">
          <Link href="/competitors" className={css({ color: "ui.tertiary", fontSize: "sm" })}>
            ← All analyses
          </Link>
          <Flex align="center" gap="2">
            <Heading size="6">{analysis.seedProductName}</Heading>
            <Badge color={STATUS_COLORS[analysis.status] ?? "gray"}>{analysis.status}</Badge>
          </Flex>
          <Text color="gray" size="2">
            {analysis.seedProductUrl}
          </Text>
        </Flex>
      </Flex>

      {analysis.error && (
        <Text color="red" as="p" mb="3">
          {analysis.error}
        </Text>
      )}

      {competitors.length === 0 ? (
        <Text color="gray">No competitors yet.</Text>
      ) : (
        <>
          <Heading size="4" mt="5" mb="3">
            Competitors
          </Heading>
          <div className={css({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "3" })}>
            {competitors.map((c) => (
              <div
                key={c.id}
                className={css({
                  bg: "ui.surface",
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  p: "3",
                })}
              >
                <Flex justify="between" align="start" gap="2">
                  <Flex direction="column" gap="1" className={css({ minWidth: 0, flex: 1 })}>
                    <Flex align="center" gap="2">
                      <Text weight="bold" truncate>
                        {c.name}
                      </Text>
                      <Badge color={STATUS_COLORS[c.status] ?? "gray"} size="1">
                        {c.status}
                      </Badge>
                    </Flex>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={css({ fontSize: "xs", color: "ui.tertiary", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                    >
                      {c.url}
                    </a>
                    {c.positioningHeadline && (
                      <Text size="2" mt="1">
                        {c.positioningHeadline}
                      </Text>
                    )}
                    {c.positioningTagline && (
                      <Text size="1" color="gray">
                        {c.positioningTagline}
                      </Text>
                    )}
                    {c.scrapeError && (
                      <Text size="1" color="red">
                        {c.scrapeError}
                      </Text>
                    )}
                  </Flex>
                  {(c.status === "failed" || c.status === "done") && (
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={async () => {
                        await rescrape({ variables: { competitorId: c.id } });
                      }}
                    >
                      Rescrape
                    </button>
                  )}
                </Flex>
              </div>
            ))}
          </div>

          <Heading size="4" mt="6" mb="3">
            Pricing matrix
          </Heading>
          <PricingMatrix competitors={competitors} matrix={tierMatrix} />

          <Heading size="4" mt="6" mb="3">
            Feature matrix
          </Heading>
          <FeatureMatrix competitors={competitors} matrix={featureMatrix} />

          <Heading size="4" mt="6" mb="3">
            Integrations
          </Heading>
          <IntegrationsRow competitors={competitors} />
        </>
      )}
    </Container>
  );
}

type TierRow = { tierName: string; cells: Map<number, Tier | undefined> };

function buildTierMatrix(competitors: Competitor[]): TierRow[] {
  const allTierNames = new Set<string>();
  for (const c of competitors) for (const t of c.pricingTiers) allTierNames.add(t.tierName);

  return Array.from(allTierNames).map((tierName) => {
    const cells = new Map<number, Tier | undefined>();
    for (const c of competitors) {
      cells.set(c.id, c.pricingTiers.find((t) => t.tierName === tierName));
    }
    return { tierName, cells };
  });
}

function PricingMatrix({ competitors, matrix }: { competitors: Competitor[]; matrix: TierRow[] }) {
  if (matrix.length === 0) return <Text color="gray">No pricing data yet.</Text>;

  return (
    <div className={css({ overflow: "auto", border: "1px solid", borderColor: "ui.border", borderRadius: "md" })}>
      <table className={css({ width: "full", borderCollapse: "collapse", fontSize: "sm" })}>
        <thead>
          <tr className={css({ bg: "ui.surface" })}>
            <th className={css({ p: "2", textAlign: "left", fontWeight: "bold", borderBottom: "1px solid", borderColor: "ui.border" })}>
              Tier
            </th>
            {competitors.map((c) => (
              <th
                key={c.id}
                className={css({ p: "2", textAlign: "left", fontWeight: "bold", borderBottom: "1px solid", borderColor: "ui.border" })}
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.tierName}>
              <td className={css({ p: "2", borderBottom: "1px solid", borderColor: "ui.border", fontWeight: "semibold" })}>
                {row.tierName}
              </td>
              {competitors.map((c) => {
                const cell = row.cells.get(c.id);
                return (
                  <td
                    key={c.id}
                    className={css({ p: "2", borderBottom: "1px solid", borderColor: "ui.border", verticalAlign: "top" })}
                  >
                    {cell ? <TierCell tier={cell} /> : <Text color="gray">—</Text>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TierCell({ tier }: { tier: Tier }) {
  return (
    <Flex direction="column" gap="1">
      {tier.isCustomQuote ? (
        <Text weight="bold">Custom</Text>
      ) : (
        <>
          <Text weight="bold">{formatPrice(tier.monthlyPriceUsd)}/mo</Text>
          {tier.annualPriceUsd != null && (
            <Text size="1" color="gray">
              {formatPrice(tier.annualPriceUsd)}/yr
            </Text>
          )}
          {tier.seatPriceUsd != null && (
            <Text size="1" color="gray">
              {formatPrice(tier.seatPriceUsd)}/seat
            </Text>
          )}
        </>
      )}
      {tier.includedLimits && Object.keys(tier.includedLimits).length > 0 && (
        <Text size="1" color="gray">
          {Object.entries(tier.includedLimits)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(" · ")}
        </Text>
      )}
    </Flex>
  );
}

function buildFeatureMatrix(competitors: Competitor[]) {
  const byCategory = new Map<string, Map<number, Set<string>>>();
  for (const c of competitors) {
    for (const f of c.features) {
      const cat = f.category ?? "General";
      if (!byCategory.has(cat)) byCategory.set(cat, new Map());
      const row = byCategory.get(cat)!;
      if (!row.has(c.id)) row.set(c.id, new Set());
      row.get(c.id)!.add(f.featureText);
    }
  }
  return Array.from(byCategory.entries()).map(([category, row]) => ({
    category,
    cells: row,
  }));
}

function FeatureMatrix({
  competitors,
  matrix,
}: {
  competitors: Competitor[];
  matrix: ReturnType<typeof buildFeatureMatrix>;
}) {
  if (matrix.length === 0) return <Text color="gray">No feature data yet.</Text>;

  return (
    <div className={css({ overflow: "auto", border: "1px solid", borderColor: "ui.border", borderRadius: "md" })}>
      <table className={css({ width: "full", borderCollapse: "collapse", fontSize: "sm" })}>
        <thead>
          <tr className={css({ bg: "ui.surface" })}>
            <th className={css({ p: "2", textAlign: "left", fontWeight: "bold", borderBottom: "1px solid", borderColor: "ui.border", minWidth: "120px" })}>
              Category
            </th>
            {competitors.map((c) => (
              <th
                key={c.id}
                className={css({ p: "2", textAlign: "left", fontWeight: "bold", borderBottom: "1px solid", borderColor: "ui.border" })}
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.category}>
              <td className={css({ p: "2", borderBottom: "1px solid", borderColor: "ui.border", fontWeight: "semibold", verticalAlign: "top" })}>
                {row.category}
              </td>
              {competitors.map((c) => {
                const features = row.cells.get(c.id);
                return (
                  <td
                    key={c.id}
                    className={css({ p: "2", borderBottom: "1px solid", borderColor: "ui.border", verticalAlign: "top" })}
                  >
                    {features && features.size > 0 ? (
                      <ul className={css({ listStyle: "disc", pl: "4", m: 0 })}>
                        {Array.from(features).map((f, i) => (
                          <li key={i}>
                            <Text size="1">{f}</Text>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Text color="gray">—</Text>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegrationsRow({ competitors }: { competitors: Competitor[] }) {
  return (
    <div className={css({ display: "grid", gridTemplateColumns: `repeat(${Math.min(competitors.length, 5)}, minmax(0, 1fr))`, gap: "3" })}>
      {competitors.map((c) => (
        <div
          key={c.id}
          className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", borderRadius: "md", p: "3" })}
        >
          <Text weight="bold" size="2" mb="2">
            {c.name}
          </Text>
          {c.integrations.length === 0 ? (
            <Text color="gray" size="1">
              None found
            </Text>
          ) : (
            <Flex wrap="wrap" gap="1">
              {c.integrations.map((i) => (
                <Badge key={i.id} variant="soft" size="1">
                  {i.integrationName}
                </Badge>
              ))}
            </Flex>
          )}
        </div>
      ))}
    </div>
  );
}
