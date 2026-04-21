"use client";

import Link from "next/link";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useCompetitorAnalysesQuery,
  useDeleteCompetitorAnalysisMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

const STATUS_COLORS: Record<string, "gray" | "blue" | "green" | "red" | "orange"> = {
  pending_approval: "orange",
  scraping: "blue",
  done: "green",
  failed: "red",
};

export function CompetitorAnalysesList() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useCompetitorAnalysesQuery({
    fetchPolicy: "cache-and-network",
    pollInterval: 8000,
    skip: !isAdmin,
  });

  const [deleteAnalysis] = useDeleteCompetitorAnalysisMutation();

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Text color="red">Admin access required.</Text>
      </Container>
    );
  }

  const rows = data?.competitorAnalyses ?? [];

  return (
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="5">
        <Heading size="6">Competitor Analysis</Heading>
        <Link href="/competitors/new" className={button({ variant: "solid" })}>
          New analysis
        </Link>
      </Flex>

      {error && (
        <Text color="red" as="p" mb="3">
          {error.message}
        </Text>
      )}

      {loading && rows.length === 0 && <Text color="gray">Loading…</Text>}

      {!loading && rows.length === 0 && (
        <Text color="gray">No analyses yet — start one by clicking &ldquo;New analysis&rdquo;.</Text>
      )}

      <Flex direction="column" gap="3">
        {rows.map((a) => {
          const counts = (a.competitors ?? []).reduce(
            (acc, c) => {
              acc[c.status] = (acc[c.status] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          return (
            <div
              key={a.id}
              className={css({
                bg: "ui.surface",
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "md",
                p: "4",
              })}
            >
              <Flex justify="between" align="center" gap="3">
                <Link
                  href={`/competitors/${a.id}`}
                  className={css({ color: "inherit", textDecoration: "none", flex: 1 })}
                >
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Text weight="bold" size="4">
                        {a.seedProductName}
                      </Text>
                      <Badge color={STATUS_COLORS[a.status] ?? "gray"}>{a.status}</Badge>
                    </Flex>
                    <Text color="gray" size="2">
                      {a.seedProductUrl}
                    </Text>
                    <Text color="gray" size="1">
                      {a.competitors?.length ?? 0} competitors
                      {Object.entries(counts)
                        .map(([k, v]) => ` · ${v} ${k}`)
                        .join("")}
                    </Text>
                  </Flex>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Delete analysis "${a.seedProductName}"?`)) return;
                    await deleteAnalysis({ variables: { id: a.id } });
                    await refetch();
                  }}
                  className={button({ variant: "ghost" })}
                >
                  Delete
                </button>
              </Flex>
            </div>
          );
        })}
      </Flex>
    </Container>
  );
}
