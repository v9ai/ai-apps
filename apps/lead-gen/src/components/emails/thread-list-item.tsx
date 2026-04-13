"use client";

import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";

const CLASSIFICATION_COLORS: Record<string, "green" | "red" | "orange" | "blue" | "gray" | "purple"> = {
  interested: "green",
  not_interested: "red",
  auto_reply: "gray",
  bounced: "orange",
  info_request: "blue",
  unsubscribe: "purple",
};

export interface ThreadSummary {
  contactId: number;
  contactName: string;
  contactEmail?: string | null;
  contactPosition?: string | null;
  companyName?: string | null;
  companyKey?: string | null;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  lastMessageDirection: string;
  classification?: string | null;
  classificationConfidence?: number | null;
  totalMessages: number;
  hasReply: boolean;
  latestStatus?: string | null;
  priorityScore?: number | null;
  hasPendingDraft?: boolean | null;
  draftId?: number | null;
  conversationStage?: string | null;
}

interface ThreadListItemProps {
  thread: ThreadSummary;
  selected: boolean;
  onClick: () => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ThreadListItem({ thread, selected, onClick }: ThreadListItemProps) {
  return (
    <Box
      onClick={onClick}
      className={css({
        cursor: "pointer",
        padding: "10px 12px",
        borderLeft: selected ? "3px solid var(--accent-9)" : "3px solid transparent",
        background: selected ? "var(--accent-3)" : "transparent",
        _hover: { background: selected ? "var(--accent-3)" : "var(--gray-3)" },
        transition: "background 0.15s ease",
        borderBottom: "1px solid var(--gray-4)",
      })}
    >
      <Flex justify="between" align="start" gap="2">
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Flex gap="2" align="center" mb="1">
            <Text
              size="2"
              weight={thread.hasReply ? "bold" : "medium"}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {thread.contactName}
            </Text>
            {thread.totalMessages > 1 && (
              <Badge color="gray" size="1" variant="surface">
                {thread.totalMessages}
              </Badge>
            )}
          </Flex>

          {thread.companyName && (
            <Text size="1" color="gray" style={{ display: "block", marginBottom: 2 }}>
              {thread.companyName}
            </Text>
          )}

          {thread.lastMessagePreview && (
            <Text
              size="1"
              color="gray"
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {thread.lastMessagePreview}
            </Text>
          )}
        </Box>

        <Flex direction="column" align="end" gap="1" flexShrink="0">
          <Text size="1" color="gray">
            {relativeTime(thread.lastMessageAt)}
          </Text>

          {thread.hasPendingDraft && (
            <Badge color="green" size="1" variant="solid">
              Draft ready
            </Badge>
          )}

          {thread.classification && (
            <Badge
              color={CLASSIFICATION_COLORS[thread.classification] ?? "gray"}
              size="1"
              variant="soft"
            >
              {thread.classification.replace("_", " ")}
              {thread.classificationConfidence != null &&
                ` ${Math.round(thread.classificationConfidence * 100)}%`}
            </Badge>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
