"use client";

import { Container, Heading, Text, Table, Badge, Flex } from "@radix-ui/themes";
import Link from "next/link";
import { ExternalLinkIcon } from "@radix-ui/react-icons";

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

export function OpportunitiesClient({ opportunities }: { opportunities: OpportunityRow[] }) {
  return (
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="4">
        <Heading size="5">Opportunities</Heading>
        <Text size="2" color="gray">{opportunities.length} total</Text>
      </Flex>

      {opportunities.length === 0 ? (
        <Text color="gray">No opportunities tracked yet.</Text>
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
            {opportunities.map((opp) => {
              const tags: string[] = opp.tags ? JSON.parse(opp.tags) : [];
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
                      {tags.length > 0 && (
                        <Flex gap="1" wrap="wrap">
                          {tags.slice(0, 5).map((tag) => (
                            <Badge key={tag} size="1" variant="surface" color="gray">{tag}</Badge>
                          ))}
                          {tags.length > 5 && <Text size="1" color="gray">+{tags.length - 5}</Text>}
                        </Flex>
                      )}
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
    </Container>
  );
}
