"use client";

import { Container, Heading, Text, Table, Badge, Flex, Spinner, Select } from "@radix-ui/themes";
import { useState } from "react";
import { useGetEmailsNeedingFollowUpQuery } from "@/__generated__/hooks";

const statusColors: Record<string, "green" | "yellow" | "blue" | "orange" | "gray"> = {
  sent: "blue",
  delivered: "green",
  opened: "orange",
};

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function FollowUpsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, loading } = useGetEmailsNeedingFollowUpQuery({
    variables: { limit: 100 },
  });

  const allEmails = data?.emailsNeedingFollowUp?.emails ?? [];
  const totalCount = data?.emailsNeedingFollowUp?.totalCount ?? 0;

  const emails = statusFilter === "all"
    ? allEmails
    : allEmails.filter((e) => e.status === statusFilter);

  return (
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="4">
        <div>
          <Heading size="5">Follow-ups Needed</Heading>
          <Text size="2" color="gray">
            {totalCount} email(s) without replies
          </Text>
        </div>
        <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
          <Select.Trigger placeholder="Filter by status" />
          <Select.Content>
            <Select.Item value="all">All statuses</Select.Item>
            <Select.Item value="sent">Sent</Select.Item>
            <Select.Item value="delivered">Delivered</Select.Item>
            <Select.Item value="opened">Opened</Select.Item>
          </Select.Content>
        </Select.Root>
      </Flex>

      {loading ? (
        <Flex justify="center" py="8">
          <Spinner size="3" />
        </Flex>
      ) : emails.length === 0 ? (
        <Text color="gray">No emails needing follow-up.</Text>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Recipient</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Subject</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Sequence</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Days Ago</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Sent</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {emails.map((email) => {
              const days = daysSince(email.sentAt);
              return (
                <Table.Row key={email.id}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {email.recipientName ?? email.toEmails[0] ?? "-"}
                    </Text>
                    {email.recipientName && (
                      <Text size="1" color="gray"> {email.toEmails[0]}</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" truncate style={{ maxWidth: "300px", display: "block" }}>
                      {email.subject}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColors[email.status] ?? "gray"}>
                      {email.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">
                      {email.sequenceType === "initial" ? "Initial" : `#${email.sequenceNumber ?? "?"}`}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    {days !== null && (
                      <Badge color={days > 7 ? "red" : days > 3 ? "orange" : "gray"}>
                        {days}d
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">
                      {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : "-"}
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
