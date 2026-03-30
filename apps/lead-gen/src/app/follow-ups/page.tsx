"use client";

import { Container, Heading, Text, Table, Badge, Flex, Spinner, Select, Tabs } from "@radix-ui/themes";
import { useState } from "react";
import {
  useGetEmailsNeedingFollowUpQuery,
  useDueRemindersQuery,
  useDismissReminderMutation,
  useSnoozeReminderMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { button } from "@/recipes/button";

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

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function FollowUpsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab, setTab] = useState<string>("emails");

  const { data: emailData, loading: emailLoading } = useGetEmailsNeedingFollowUpQuery({
    variables: { limit: 100 },
  });
  const { data: remindersData, loading: remindersLoading, refetch: refetchReminders } = useDueRemindersQuery({
    fetchPolicy: "cache-and-network",
  });
  const [dismissReminder] = useDismissReminderMutation();
  const [snoozeReminder] = useSnoozeReminderMutation();

  const allEmails = emailData?.emailsNeedingFollowUp?.emails ?? [];
  const totalCount = emailData?.emailsNeedingFollowUp?.totalCount ?? 0;
  const emails = statusFilter === "all" ? allEmails : allEmails.filter((e) => e.status === statusFilter);
  const dueReminders = remindersData?.dueReminders ?? [];

  return (
    <Container size="4" p="6">
      <Heading size="5" mb="4">Follow-ups &amp; Reminders</Heading>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="emails">
            Emails needing follow-up
            {totalCount > 0 && (
              <Badge color="orange" ml="2" size="1">{totalCount}</Badge>
            )}
          </Tabs.Trigger>
          <Tabs.Trigger value="reminders">
            Due reminders
            {dueReminders.length > 0 && (
              <Badge color="red" ml="2" size="1">{dueReminders.length}</Badge>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Email follow-ups tab ─────────────────────────────────────── */}
        <Tabs.Content value="emails">
          <Flex justify="between" align="center" mb="4">
            <Text size="2" color="gray">{totalCount} email(s) without replies</Text>
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

          {emailLoading ? (
            <Flex justify="center" py="8"><Spinner size="3" /></Flex>
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
                        <Badge color={statusColors[email.status] ?? "gray"}>{email.status}</Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2">
                          {email.sequenceType === "initial" ? "Initial" : `#${email.sequenceNumber ?? "?"}`}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {days !== null && (
                          <Badge color={days > 7 ? "red" : days > 3 ? "orange" : "gray"}>{days}d</Badge>
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
        </Tabs.Content>

        {/* ── Due reminders tab ─────────────────────────────────────────── */}
        <Tabs.Content value="reminders">
          <Text size="2" color="gray" mb="4" as="p">
            {dueReminders.length === 0
              ? "No reminders due."
              : `${dueReminders.length} reminder(s) due or overdue.`}
          </Text>

          {remindersLoading ? (
            <Flex justify="center" py="8"><Spinner size="3" /></Flex>
          ) : dueReminders.length === 0 ? null : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Contact</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Note</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Due</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Recurrence</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {dueReminders.map(({ reminder, contact }) => {
                  const overdueDays = daysSince(reminder.remindAt);
                  const daysLeft = daysUntil(reminder.remindAt);
                  return (
                    <Table.Row key={reminder.id}>
                      <Table.Cell>
                        <Link href={`/contacts/${contact.id}`} style={{ textDecoration: "none" }}>
                          <Text size="2" weight="medium" color="blue">
                            {contact.firstName} {contact.lastName}
                          </Text>
                        </Link>
                        {contact.position && (
                          <Text size="1" color="gray" as="p">{contact.position}</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">{reminder.note ?? "—"}</Text>
                      </Table.Cell>
                      <Table.Cell>
                        {overdueDays !== null && overdueDays > 0 ? (
                          <Badge color="red">{overdueDays}d overdue</Badge>
                        ) : daysLeft !== null && daysLeft <= 0 ? (
                          <Badge color="red">today</Badge>
                        ) : (
                          <Text size="1" color="gray">
                            {new Date(reminder.remindAt).toLocaleDateString()}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={reminder.recurrence === "none" ? "gray" : "blue"} variant="soft" size="1">
                          {reminder.recurrence === "none" ? "one-time" : reminder.recurrence}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="2">
                          <button
                            className={button({ variant: "ghost", size: "sm" })}
                            onClick={async () => {
                              await dismissReminder({ variables: { id: reminder.id } });
                              refetchReminders();
                            }}
                          >
                            Done
                          </button>
                          <button
                            className={button({ variant: "ghost", size: "sm" })}
                            onClick={async () => {
                              await snoozeReminder({ variables: { id: reminder.id, days: 7 } });
                              refetchReminders();
                            }}
                          >
                            Snooze 7d
                          </button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
}
