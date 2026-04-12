"use client";

import { useState } from "react";
import { Badge, Box, Card, Flex, Separator, Text } from "@radix-ui/themes";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PaperPlaneIcon,
  EnvelopeOpenIcon,
} from "@radix-ui/react-icons";
import { button } from "@/recipes/button";

const CLASSIFICATION_COLORS: Record<string, "green" | "red" | "orange" | "blue" | "gray" | "purple"> = {
  interested: "green",
  not_interested: "red",
  auto_reply: "gray",
  bounced: "orange",
  info_request: "blue",
  unsubscribe: "purple",
};

const STATUS_COLORS: Record<string, "green" | "blue" | "red" | "orange" | "gray"> = {
  delivered: "green",
  sent: "blue",
  bounced: "red",
  complained: "red",
  delivery_delayed: "orange",
  opened: "green",
  scheduled: "gray",
};

export interface ThreadMessageData {
  id: number;
  direction: string;
  fromEmail: string;
  toEmails: string[];
  subject: string;
  textContent?: string | null;
  htmlContent?: string | null;
  sentAt?: string | null;
  status?: string | null;
  sequenceType?: string | null;
  sequenceNumber?: string | null;
  classification?: string | null;
  classificationConfidence?: number | null;
}

interface ThreadMessageProps {
  message: ThreadMessageData;
  contactName: string;
  defaultExpanded?: boolean;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sequenceLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  if (type === "initial") return "Initial";
  if (type.startsWith("followup_")) return `Follow-up #${type.replace("followup_", "")}`;
  return type;
}

export function ThreadMessage({ message, contactName, defaultExpanded = false }: ThreadMessageProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isOutbound = message.direction === "outbound";
  const seq = sequenceLabel(message.sequenceType);

  return (
    <Card
      style={{
        borderLeft: isOutbound ? "3px solid var(--accent-9)" : "3px solid var(--gray-7)",
      }}
    >
      <Flex direction="column" gap="2">
        {/* Header */}
        <Flex justify="between" align="center" style={{ cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          <Flex gap="2" align="center" wrap="wrap">
            {isOutbound ? (
              <PaperPlaneIcon width={14} height={14} style={{ color: "var(--accent-11)" }} />
            ) : (
              <EnvelopeOpenIcon width={14} height={14} style={{ color: "var(--gray-11)" }} />
            )}
            <Text size="2" weight="bold">
              {isOutbound ? "You" : contactName}
            </Text>

            {/* Status badge (outbound) */}
            {isOutbound && message.status && (
              <Badge color={STATUS_COLORS[message.status] ?? "gray"} size="1" variant="soft">
                {message.status}
              </Badge>
            )}

            {/* Sequence badge (outbound) */}
            {isOutbound && seq && (
              <Badge color="gray" size="1" variant="surface">
                {seq}
              </Badge>
            )}

            {/* Classification badge (inbound) */}
            {!isOutbound && message.classification && (
              <Badge
                color={CLASSIFICATION_COLORS[message.classification] ?? "gray"}
                size="1"
                variant="soft"
              >
                {message.classification}
                {message.classificationConfidence != null &&
                  ` (${Math.round(message.classificationConfidence * 100)}%)`}
              </Badge>
            )}
          </Flex>

          <Flex gap="2" align="center">
            <Text size="1" color="gray">
              {formatDate(message.sentAt)}
            </Text>
            {expanded ? (
              <ChevronUpIcon width={14} height={14} color="var(--gray-9)" />
            ) : (
              <ChevronDownIcon width={14} height={14} color="var(--gray-9)" />
            )}
          </Flex>
        </Flex>

        {/* Subject line (always visible) */}
        <Text size="2" color="gray">{message.subject}</Text>

        {/* Expanded content */}
        {expanded && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="1" mb="1">
              <Text size="1" color="gray">
                From: {message.fromEmail}
              </Text>
              <Text size="1" color="gray">
                To: {message.toEmails?.join(", ")}
              </Text>
            </Flex>
            {message.htmlContent ? (
              <Box
                style={{
                  maxHeight: "400px",
                  overflow: "auto",
                  fontSize: "var(--font-size-2)",
                  lineHeight: "var(--line-height-2)",
                }}
                dangerouslySetInnerHTML={{ __html: message.htmlContent }}
              />
            ) : message.textContent ? (
              <Box
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--default-font-family)",
                  fontSize: "var(--font-size-2)",
                  lineHeight: "var(--line-height-2)",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                {message.textContent}
              </Box>
            ) : (
              <Text size="2" color="gray">(no content)</Text>
            )}
          </>
        )}
      </Flex>
    </Card>
  );
}
