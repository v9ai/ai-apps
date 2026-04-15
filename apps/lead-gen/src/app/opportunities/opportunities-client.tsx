"use client";

import { useMemo, useState } from "react";
import { Container, Heading, Text, Table, Badge, Flex, Button } from "@radix-ui/themes";
import Link from "next/link";
import { Cross2Icon, ExternalLinkIcon } from "@radix-ui/react-icons";

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

const specialTagColors: Record<string, "red" | "orange" | "green" | "blue" | "purple"> = {
  excluded: "red",
  priority: "green",
  applied: "orange",
  referral: "purple",
  remote: "blue",
};

function tagColor(tag: string): "red" | "orange" | "green" | "blue" | "purple" | "gray" {
  return specialTagColors[tag] ?? "gray";
}

export function OpportunitiesClient({ opportunities }: { opportunities: OpportunityRow[] }) {
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>(["excluded"]);

  // Collect all unique tags across opportunities
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const opp of opportunities) {
      const parsed: string[] = opp.tags ? JSON.parse(opp.tags) : [];
      for (const t of parsed) set.add(t);
    }
    return Array.from(set).sort();
  }, [opportunities]);

  // Filter opportunities based on tag selection
  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      const parsed: string[] = opp.tags ? JSON.parse(opp.tags) : [];
      if (excludeTags.length > 0 && excludeTags.some((t) => parsed.includes(t))) return false;
      if (includeTags.length > 0 && !includeTags.some((t) => parsed.includes(t))) return false;
      return true;
    });
  }, [opportunities, includeTags, excludeTags]);

  function toggleInclude(tag: string) {
    setExcludeTags((prev) => prev.filter((t) => t !== tag));
    setIncludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function toggleExclude(tag: string) {
    setIncludeTags((prev) => prev.filter((t) => t !== tag));
    setExcludeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

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

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <Flex gap="2" wrap="wrap" mb="3" align="center">
          <Text size="2" color="gray" mr="1">Tags:</Text>
          {allTags.map((tag) => {
            const isIncluded = includeTags.includes(tag);
            const isExcluded = excludeTags.includes(tag);
            return (
              <Badge
                key={tag}
                size="2"
                variant={isIncluded ? "solid" : isExcluded ? "outline" : "surface"}
                color={isExcluded ? "red" : isIncluded ? "blue" : tagColor(tag)}
                style={{
                  cursor: "pointer",
                  opacity: isExcluded ? 0.5 : 1,
                  textDecoration: isExcluded ? "line-through" : "none",
                }}
                onClick={() => toggleInclude(tag)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleExclude(tag);
                }}
              >
                {tag}
              </Badge>
            );
          })}
          {(includeTags.length > 0 || excludeTags.length > 0) && (
            <Button
              size="1"
              variant="ghost"
              color="gray"
              onClick={() => { setIncludeTags([]); setExcludeTags([]); }}
            >
              <Cross2Icon width={10} height={10} /> clear
            </Button>
          )}
          <Text size="1" color="gray" ml="2">click = include · right-click = exclude</Text>
        </Flex>
      )}

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
                            <Badge key={tag} size="2" variant="surface" color={tagColor(tag)}>{tag}</Badge>
                          ))}
                          {tags.length > 5 && <Text size="2" color="gray">+{tags.length - 5}</Text>}
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
