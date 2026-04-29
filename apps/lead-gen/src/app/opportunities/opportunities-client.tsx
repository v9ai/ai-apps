"use client";

import { useMemo, useState, useTransition } from "react";
import { Container, Heading, Text, Table, Badge, Flex, Button, IconButton } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon, EyeNoneIcon, Cross2Icon, CheckIcon } from "@radix-ui/react-icons";
import { EvalStatsPanel } from "./eval-stats-panel";
import {
  blockOpportunityCompany,
  blockD1OpportunityCompany,
  blockLocation,
  hideOpportunity,
  hideD1Opportunity,
  markD1Applied,
} from "./actions";
import type { OpportunitiesPageQuery } from "@/__generated__/hooks";

type OpportunitiesPagePayload = OpportunitiesPageQuery["opportunitiesPage"];
type OpportunityRow = OpportunitiesPagePayload["opportunities"][number];
type D1Row = OpportunitiesPagePayload["d1Pending"][number];
type EvalReport = OpportunitiesPagePayload["evalReport"];

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
  evalReport,
}: {
  opportunities: OpportunityRow[];
  d1Pending: D1Row[];
  evalReport: EvalReport;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      if (hidden.has(opp.id)) return false;
      return !opp.tags.includes("excluded");
    });
  }, [opportunities, hidden]);

  const visibleD1 = useMemo(
    () => d1Pending.filter((d) => !hidden.has(d.id)),
    [d1Pending, hidden],
  );

  function hideCompanyRows(clickedId: string, companyKey: string | null) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(clickedId);
      if (companyKey) {
        for (const o of opportunities) {
          if (o.companyKey === companyKey) next.add(o.id);
        }
        for (const d of d1Pending) {
          if (d.companyKey === companyKey) next.add(d.id);
        }
      }
      return next;
    });
  }

  function handleBlockPg(id: string) {
    setHidden((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await blockOpportunityCompany(id);
      if ("error" in res) {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        console.error("[block company]", res.error);
        return;
      }
      hideCompanyRows(id, res.companyKey);
      router.refresh();
    });
  }

  function handleHide(id: string, source: "pg" | "d1") {
    setHidden((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = source === "pg" ? await hideOpportunity(id) : await hideD1Opportunity(id);
      if ("error" in res) {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        console.error("[hide]", res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleBlockLocation(label: string | null) {
    if (!label) return;
    const pattern = label.trim().toLowerCase();
    if (!pattern) return;
    setHidden((prev) => {
      const next = new Set(prev);
      for (const d of d1Pending) {
        if (d.location && d.location.toLowerCase().includes(pattern)) next.add(d.id);
      }
      return next;
    });
    startTransition(async () => {
      const res = await blockLocation(label);
      if ("error" in res) {
        console.error("[block location]", res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleApplyD1(id: string) {
    setHidden((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await markD1Applied(id);
      if ("error" in res) {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        console.error("[apply d1]", res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleArchiveD1(id: string, companyKey: string | null, companyName: string | null) {
    setHidden((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await blockD1OpportunityCompany(id, companyKey, companyName);
      if ("error" in res) {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        console.error("[block d1 company]", res.error);
        return;
      }
      hideCompanyRows(id, res.companyKey);
      router.refresh();
    });
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

      <EvalStatsPanel report={evalReport} />

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
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
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
                    {opp.companyName ? (
                      <Link href={`/companies/${opp.companyKey}`} style={{ textDecoration: "none" }}>
                        <Text size="2" color="blue">{opp.companyName}</Text>
                      </Link>
                    ) : (
                      <Text size="2" color="gray">-</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {opp.contactFirstName ? (
                      <Flex direction="column">
                        <Link href={`/contacts/${opp.contactSlug}`} style={{ textDecoration: "none" }}>
                          <Text size="2" color="blue">{opp.contactFirstName} {opp.contactLastName}</Text>
                        </Link>
                        {opp.contactPosition && (
                          <Text size="1" color="gray" truncate style={{ maxWidth: 180, display: "block" }}>
                            {opp.contactPosition}
                          </Text>
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">-</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{opp.rewardText ?? "-"}</Text>
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
                      {new Date(opp.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="2" align="center">
                      <Button
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={() => handleBlockPg(opp.id)}
                        title="Block company (hide all jobs from this company)"
                      >
                        <EyeNoneIcon width={12} height={12} /> Block
                      </Button>
                      <Button
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={() => handleHide(opp.id, "pg")}
                        title="Remove this entry from the list"
                        aria-label="Remove"
                      >
                        <Cross2Icon width={12} height={12} />
                      </Button>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      {visibleD1.length > 0 && (
        <>
          <Flex justify="between" align="center" mt="6" mb="3">
            <Heading size="4">Pending (D1)</Heading>
            <Badge color="orange" size="2">{visibleD1.length}</Badge>
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
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {visibleD1.map((opp) => (
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
                    <Text size="2" color={opp.companyName ? undefined : "gray"}>
                      {opp.companyName ?? "-"}
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
                      {new Date(opp.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="3" align="center">
                      <Button
                        size="2"
                        variant="ghost"
                        color="green"
                        onClick={() => handleApplyD1(opp.id)}
                        title="Mark as applied"
                      >
                        <CheckIcon width={14} height={14} /> Apply
                      </Button>
                      <Button
                        size="2"
                        variant="ghost"
                        color="gray"
                        onClick={() => handleArchiveD1(opp.id, opp.companyKey, opp.companyName)}
                        title="Block company (hide all jobs from this company)"
                      >
                        <EyeNoneIcon width={14} height={14} /> Block
                      </Button>
                      {opp.location && (
                        <Button
                          size="2"
                          variant="ghost"
                          color="gray"
                          onClick={() => handleBlockLocation(opp.location)}
                          title={`Block location "${opp.location}" (substring match, hides any row containing this)`}
                        >
                          <EyeNoneIcon width={14} height={14} /> Loc
                        </Button>
                      )}
                      <IconButton
                        size="2"
                        variant="ghost"
                        color="gray"
                        onClick={() => handleHide(opp.id, "d1")}
                        title="Remove this entry from the list"
                        aria-label="Remove"
                      >
                        <Cross2Icon width={14} height={14} />
                      </IconButton>
                    </Flex>
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
