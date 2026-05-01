"use client";

import Link from "next/link";
import {
  Badge,
  Box,
  Callout,
  Flex,
  Heading,
  Spinner,
  Table,
  Text,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  useCompanyOpportunitiesPageQuery,
  useGetCompanyQuery,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

const statusColors: Record<string, "green" | "blue" | "orange" | "red" | "gray" | "yellow"> = {
  open: "blue",
  applied: "orange",
  interviewing: "yellow",
  offer: "green",
  rejected: "red",
  closed: "gray",
};

export function CompanyOpportunitiesClient({ companyKey }: { companyKey: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const { data, loading, error } = useCompanyOpportunitiesPageQuery({
    variables: { companyId: company?.id ?? 0 },
    skip: !isAdmin || !company?.id,
    fetchPolicy: "cache-and-network",
  });

  if (!isAdmin) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Access denied. Admin only.</Callout.Text>
      </Callout.Root>
    );
  }

  if (companyLoading || (loading && !data)) {
    return (
      <Flex justify="center" align="center" minHeight="200px">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!company) {
    return (
      <Callout.Root color="gray">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Company not found.</Callout.Text>
      </Callout.Root>
    );
  }

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Failed to load opportunities: {error.message}</Callout.Text>
      </Callout.Root>
    );
  }

  const opportunities = (data?.opportunitiesPage.opportunities ?? []).filter(
    (opp) => !opp.tags.includes("excluded"),
  );
  const d1Pending = data?.opportunitiesPage.d1Pending ?? [];

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="center">
        <Heading size="4">Opportunities</Heading>
        <Text size="2" color="gray">
          {opportunities.length + d1Pending.length} total
        </Text>
      </Flex>

      {opportunities.length === 0 && d1Pending.length === 0 ? (
        <Callout.Root color="gray" variant="soft">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>No opportunities found for this company.</Callout.Text>
        </Callout.Root>
      ) : null}

      {opportunities.length > 0 && (
        <Box>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Contact</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Comp</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {opportunities.map((opp) => (
                <Table.Row key={opp.id}>
                  <Table.Cell>
                    <Flex align="center" gap="1">
                      <Link href={`/opportunities/${opp.id}`} style={{ textDecoration: "none" }}>
                        <Text size="2" weight="medium" color="blue">
                          {opp.title}
                        </Text>
                      </Link>
                      {opp.url && (
                        <a href={opp.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLinkIcon
                            width={12}
                            height={12}
                            style={{ color: "var(--gray-9)" }}
                          />
                        </a>
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    {opp.contactFirstName ? (
                      <Flex direction="column">
                        <Link
                          href={`/contacts/${opp.contactSlug}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Text size="2" color="blue">
                            {opp.contactFirstName} {opp.contactLastName}
                          </Text>
                        </Link>
                        {opp.contactPosition && (
                          <Text
                            size="1"
                            color="gray"
                            truncate
                            style={{ maxWidth: 180, display: "block" }}
                          >
                            {opp.contactPosition}
                          </Text>
                        )}
                      </Flex>
                    ) : (
                      <Text size="2" color="gray">
                        -
                      </Text>
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
                      <Text size="2" color="gray">
                        -
                      </Text>
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
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}

      {d1Pending.length > 0 && (
        <Box>
          <Flex justify="between" align="center" mb="3">
            <Heading size="3">Pending (D1)</Heading>
            <Badge color="orange" size="2">
              {d1Pending.length}
            </Badge>
          </Flex>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
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
                        <a
                          href={opp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none" }}
                        >
                          <Text size="2" weight="medium" color="blue">
                            {opp.title}
                          </Text>
                        </a>
                      ) : (
                        <Text size="2" weight="medium">
                          {opp.title}
                        </Text>
                      )}
                      {opp.url && (
                        <ExternalLinkIcon
                          width={12}
                          height={12}
                          style={{ color: "var(--gray-9)" }}
                        />
                      )}
                    </Flex>
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
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Flex>
  );
}
