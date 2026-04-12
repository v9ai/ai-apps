"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  Card,
  Dialog,
  Flex,
  Heading,
  Separator,
  Spinner,
  Table,
  Text,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  PaperPlaneIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { button } from "@/recipes/button";
import type { CpnFollowupStatus } from "@/lib/email/cpn-followup";

interface CpnThread {
  contactId: number;
  firstName: string;
  lastName: string | null;
  email: string;
  company: string | null;
  status: CpnFollowupStatus;
  replyCount: number;
  latestReplyPreview: string;
}

interface CpnData {
  threads: CpnThread[];
  counts: Record<CpnFollowupStatus, number>;
}

interface SendResult {
  sent: number;
  failed: number;
  results: { email: string; status: "sent" | "failed"; error?: string }[];
}

const STATUS_BADGE: Record<CpnFollowupStatus, { color: "green" | "red" | "orange" | "gray"; label: string }> = {
  ready: { color: "green", label: "Ready" },
  declined: { color: "red", label: "Declined" },
  has_questions: { color: "orange", label: "Has Questions" },
  already_replied_to_followup: { color: "gray", label: "Already Followed Up" },
};

export function CpnFollowupPanel() {
  const [data, setData] = useState<CpnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/cpn-followup");
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const json = (await res.json()) as CpnData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSendAll = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/cpn-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendAll: true }),
      });
      const json = (await res.json()) as SendResult;
      setSendResult(json);
      void fetchData();
    } catch (err) {
      setSendResult({
        sent: 0,
        failed: 0,
        results: [{ email: "—", status: "failed", error: err instanceof Error ? err.message : "Unknown error" }],
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Flex align="center" gap="2" p="6">
        <Spinner size="2" />
        <Text color="gray">Loading CPN followup data...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex align="center" gap="2">
          <ExclamationTriangleIcon />
          <Text color="red" size="2">{error}</Text>
        </Flex>
      </Card>
    );
  }

  if (!data || data.threads.length === 0) {
    return (
      <Card>
        <Flex direction="column" gap="3" align="center" p="6">
          <Text color="gray" size="3">No contacts need CPN followup right now.</Text>
          <button className={button({ variant: "ghost", size: "sm" })} onClick={() => void fetchData()}>
            <ReloadIcon /> Refresh
          </button>
        </Flex>
      </Card>
    );
  }

  const { threads, counts } = data;

  return (
    <Flex direction="column" gap="4">
      {/* Summary */}
      <Card>
        <Flex justify="between" align="center">
          <Flex direction="column" gap="1">
            <Heading size="3">CPN Followup Queue</Heading>
            <Flex gap="3">
              <Text size="2">
                <Badge color="green" variant="soft">{counts.ready}</Badge> ready
              </Text>
              <Text size="2">
                <Badge color="orange" variant="soft">{counts.has_questions}</Badge> have questions
              </Text>
              <Text size="2">
                <Badge color="gray" variant="soft">{counts.already_replied_to_followup}</Badge> already followed up
              </Text>
              <Text size="2">
                <Badge color="red" variant="soft">{counts.declined}</Badge> declined
              </Text>
            </Flex>
          </Flex>
          <Flex gap="2">
            <button className={button({ variant: "ghost", size: "sm" })} onClick={() => void fetchData()}>
              <ReloadIcon /> Refresh
            </button>
            {counts.ready > 0 && (
              <button
                className={button({ variant: "solid", size: "sm" })}
                onClick={() => setConfirmOpen(true)}
                disabled={sending}
              >
                {sending ? (
                  <><Spinner size="1" /> Sending...</>
                ) : (
                  <><PaperPlaneIcon /> Send All Ready ({counts.ready})</>
                )}
              </button>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Send results */}
      {sendResult && (
        <Card>
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <CheckCircledIcon />
              <Text size="2" weight="bold">
                Sent: {sendResult.sent} | Failed: {sendResult.failed}
              </Text>
            </Flex>
            {sendResult.results.filter((r) => r.status === "failed").map((r, i) => (
              <Text key={i} size="1" color="red">
                Failed: {r.email} — {r.error}
              </Text>
            ))}
          </Flex>
        </Card>
      )}

      {/* Threads table */}
      <Card>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Replies</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Latest Reply</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {threads.map((t) => {
              const badge = STATUS_BADGE[t.status];
              return (
                <Table.Row key={t.contactId}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {t.firstName} {t.lastName ?? ""}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">{t.email}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{t.company ?? "—"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={badge.color} variant="soft" size="1">{badge.label}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{t.replyCount}</Text>
                  </Table.Cell>
                  <Table.Cell style={{ maxWidth: 300 }}>
                    <Text size="1" color="gray" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.latestReplyPreview || "—"}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card>

      {/* Confirmation dialog */}
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>
            <Heading size="4">Send CPN Followups</Heading>
          </Dialog.Title>
          <Separator size="4" my="3" />
          <Text size="2">
            Send the CPN followup template to <strong>{counts.ready}</strong> ready contact{counts.ready !== 1 ? "s" : ""}?
          </Text>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })}>Cancel</button>
            </Dialog.Close>
            <button className={button({ variant: "solid" })} onClick={() => void handleSendAll()}>
              <PaperPlaneIcon /> Send {counts.ready}
            </button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
