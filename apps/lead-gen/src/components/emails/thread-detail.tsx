"use client";

import { useState, useCallback, useEffect } from "react";
import { Badge, Box, Flex, Heading, Separator, Spinner, Text } from "@radix-ui/themes";
import { PaperPlaneIcon, ArchiveIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { button } from "@/recipes/button";
import Link from "next/link";
import { useGetEmailThreadQuery } from "@/__generated__/hooks";
import { EmailComposer } from "@/components/admin/EmailComposer";
import { ThreadMessage } from "./thread-message";

const CLASSIFICATION_COLORS: Record<string, "green" | "red" | "orange" | "blue" | "gray" | "purple"> = {
  interested: "green",
  not_interested: "red",
  auto_reply: "gray",
  bounced: "orange",
  info_request: "blue",
  unsubscribe: "purple",
};

interface ThreadDetailProps {
  contactId: number;
}

export function ThreadDetail({ contactId }: ThreadDetailProps) {
  const { data, loading, error, refetch } = useGetEmailThreadQuery({
    variables: { contactId },
    fetchPolicy: "cache-and-network",
  });
  const [replyOpen, setReplyOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSendSuccess = useCallback((toEmail: string) => {
    setToast(`Reply sent to ${toEmail}`);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (loading && !data) {
    return (
      <Flex justify="center" align="center" style={{ height: "100%" }} p="8">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !data?.emailThread) {
    return (
      <Flex justify="center" align="center" style={{ height: "100%" }} p="8">
        <Text color="gray" size="2">
          {error?.message || "Thread not found"}
        </Text>
      </Flex>
    );
  }

  const thread = data.emailThread;
  const messages = thread.messages;

  // Find the latest inbound email for reply context
  const latestInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const latestOutbound = [...messages].reverse().find((m) => m.direction === "outbound");

  return (
    <Flex direction="column" style={{ height: "100%" }}>
      {/* Header */}
      <Box p="4" style={{ borderBottom: "1px solid var(--gray-5)", flexShrink: 0 }}>
        <Flex justify="between" align="start">
          <Flex direction="column" gap="1">
            <Flex gap="2" align="center">
              <Heading size="4">{thread.contactName}</Heading>
              {thread.classification && (
                <Badge
                  color={CLASSIFICATION_COLORS[thread.classification] ?? "gray"}
                  variant="soft"
                >
                  {thread.classification.replace("_", " ")}
                  {thread.classificationConfidence != null &&
                    ` (${Math.round(thread.classificationConfidence * 100)}%)`}
                </Badge>
              )}
            </Flex>
            <Flex gap="2" align="center">
              {thread.contactPosition && (
                <Text size="2" color="gray">{thread.contactPosition}</Text>
              )}
              {thread.contactPosition && thread.companyName && (
                <Text size="2" color="gray">at</Text>
              )}
              {thread.companyName && thread.companyKey && (
                <Link href={`/companies/${thread.companyKey}`} style={{ textDecoration: "none" }}>
                  <Text size="2" color="blue">{thread.companyName}</Text>
                </Link>
              )}
              {thread.companyName && !thread.companyKey && (
                <Text size="2" color="gray">{thread.companyName}</Text>
              )}
            </Flex>
            {thread.contactEmail && (
              <Text size="1" color="gray">{thread.contactEmail}</Text>
            )}
          </Flex>

          {/* Actions */}
          <Flex gap="2">
            <button
              className={button({ variant: "solid", size: "sm" })}
              onClick={() => setReplyOpen(true)}
            >
              <PaperPlaneIcon /> Reply
            </button>
          </Flex>
        </Flex>
      </Box>

      {/* Messages */}
      <Box
        p="4"
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <Flex direction="column" gap="3">
          <Text size="1" color="gray" style={{ textAlign: "center" }}>
            {messages.length} message{messages.length !== 1 ? "s" : ""} in this conversation
          </Text>

          {messages.map((msg, idx) => (
            <ThreadMessage
              key={`${msg.direction}-${msg.id}`}
              message={msg}
              contactName={thread.contactName}
              defaultExpanded={idx === messages.length - 1}
            />
          ))}
        </Flex>
      </Box>

      {/* Reply dialog */}
      <EmailComposer
        open={replyOpen}
        onOpenChange={setReplyOpen}
        contactId={contactId}
        to={thread.contactEmail || latestInbound?.fromEmail || ""}
        name={thread.contactName}
        companyName={thread.companyName || undefined}
        subject={
          latestInbound?.subject?.startsWith("Re:")
            ? latestInbound.subject
            : `Re: ${latestInbound?.subject || latestOutbound?.subject || ""}`
        }
        replyContext={
          latestInbound
            ? `Replying to email from ${latestInbound.fromEmail} with subject "${latestInbound.subject}". Original message:\n\n${latestInbound.textContent || "(no text content)"}`
            : undefined
        }
        onSuccess={handleSendSuccess}
      />

      {/* Success toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            backgroundColor: "#30A46C",
            color: "white",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
        >
          <Flex align="center" gap="2">
            <CheckCircledIcon />
            <Text size="2" weight="medium">{toast}</Text>
          </Flex>
        </div>
      )}
    </Flex>
  );
}
