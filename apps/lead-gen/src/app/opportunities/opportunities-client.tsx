"use client";

import { useMemo } from "react";
import { Container, Heading, Text, Table, Badge, Flex } from "@radix-ui/themes";
import Link from "next/link";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { EvalStatsPanel } from "./eval-stats-panel";
import type { D1OpportunityRow } from "@/lib/d1-opportunities";

type OpportunityRow = {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  status: string;
  reward_text: string | null;
  reward_usd: number | null;
  score: number | null;
  tags: string | null;
  applied: boolean;
  applied_at: string | null;
  application_status: string | null;
  first_seen: string | null;
  created_at: string;
  company_name: string | null;
  company_key: string | null;
  contact_first: string | null;
  contact_last: string | null;
  contact_slug: string | null;
  contact_position: string | null;
};

const statusColors: Record<string, "green" | "blue" | "orange" | "red" | "gray" | "yellow"> = {
  open: "blue",
  applied: "orange",
  interviewing: "yellow",
  offer: "green",
  rejected: "red",
  closed: "gray",
};

export function OpportunitiesClient({
  opportunities,
  d1Pending,
}: {
  opportunities: OpportunityRow[];
  d1Pending: D1OpportunityRow[];
}) {
  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      const parsed: string[] = opp.tags ? JSON.parse(opp.tags) : [];
      return !parsed.includes("excluded");
    });
  }, [opportunities]);

  return (
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="4">
        <Heading size="5">Opportunities</Heading>
        <Text size="2" color="gray">
          {filtered.length === opportunities.length
            ? `${opportunities.length} total`
            : `${filtered.length} / ${opportunities.length}`}
        </Text>
      </Flex>

      <EvalStatsPanel />

      {filtered.length === 0 ? (
        <Text color="gray">No opportunities match the current filters.</Text>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Contact</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Comp</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtered.map((opp) => {
              return (
                <Table.Row key={opp.id}>
                  <Table.Cell>
                    <Flex direction="column" gap="1">
                      <Flex align="center" gap="1">
                        <Link href={`/opportunities/${opp.id}`} style={{ textDecoration: "none" }}>
                          <Text size="2" weight="medium" color="blue">{opp.title}</Text>
                        </Link>
                        {opp.url && (
                          <a href={opp.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLinkIcon width={12} height={12} style={{ color: "var(--gray-9)" }} />
                          </a>
                        )}
                      </Flex>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    {opp.company_name ? (
                      <Link href={`/companies/${opp.company_key}`} style={{ textDecoration: "none" }}>
                        <Text size="2" color="blue">{opp.company_name}</Text>
                      </Link>
                    ) : (
                      <Text size="2" color="gray">-</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {opp.contact_first ? (
                      <Flex direction="column">
                        <Link href={`/contacts/${opp.contact_slug}`} style={{ textDecoration: "none" }}>
                          <Text size="2" color="blue">{opp.contact_first} {opp.contact_last}</Text>
                        </Link>
                        {opp.contact_position && (
                          <Text size="1" color="gray" truncate style={{ maxWidth: 180, display: "block" }}>
                            {opp.contact_position}
                          </Text>
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">-</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{opp.reward_text ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    {opp.score != null ? (
                      <Badge color={opp.score >= 80 ? "green" : opp.score >= 50 ? "yellow" : "gray"}>
                        {opp.score}
                      </Badge>
                    ) : (
                      <Text size="2" color="gray">-</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColors[opp.status] ?? "gray"}>{opp.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">
                      {new Date(opp.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      {d1Pending.length > 0 && (
        <>
          <Flex justify="between" align="center" mt="6" mb="3">
            <Heading size="4">Pending (D1)</Heading>
            <Badge color="orange" size="2">{d1Pending.length}</Badge>
          </Flex>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Salary</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {d1Pending.map((opp) => (
                <Table.Row key={opp.id}>
                  <Table.Cell>
                    <Flex align="center" gap="1">
                      {opp.url ? (
                        <a href={opp.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                          <Text size="2" weight="medium" color="blue">{opp.title}</Text>
                        </a>
                      ) : (
                        <Text size="2" weight="medium">{opp.title}</Text>
                      )}
                      {opp.url && (
                        <ExternalLinkIcon width={12} height={12} style={{ color: "var(--gray-9)" }} />
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color={opp.company_name ? undefined : "gray"}>
                      {opp.company_name ?? "-"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color={opp.location ? undefined : "gray"}>
                      {opp.location ?? "-"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color={opp.salary ? undefined : "gray"}>
                      {opp.salary ?? "-"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColors[opp.status] ?? "gray"}>{opp.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">
                      {new Date(opp.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </>
      )}
    </Container>
  );
}
