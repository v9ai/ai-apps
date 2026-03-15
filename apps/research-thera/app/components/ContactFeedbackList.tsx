"use client";

import {
  Flex,
  Card,
  Badge,
  Button,
  Text,
  AlertDialog,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { FeedbackSource } from "@/app/__generated__/hooks";

export interface ExtractedIssueItem {
  title: string;
  description: string;
  category: string;
  severity: string;
  recommendations?: string[] | null;
}

export interface ContactFeedbackItem {
  id: number;
  subject?: string | null;
  feedbackDate: string;
  content: string;
  tags?: string[] | null;
  source?: FeedbackSource | null;
  extracted: boolean;
  extractedIssues?: ExtractedIssueItem[] | null;
  createdAt: string;
}

interface ContactFeedbackListProps {
  feedbacks: ContactFeedbackItem[];
  onDelete: (id: number) => void;
  deleting?: boolean;
  onClickItem?: (id: number) => void;
}

const SOURCE_LABELS: Record<FeedbackSource, string> = {
  [FeedbackSource.Email]: "Email",
  [FeedbackSource.Meeting]: "Meeting",
  [FeedbackSource.Report]: "Report",
  [FeedbackSource.Phone]: "Phone",
  [FeedbackSource.Note]: "Note",
  [FeedbackSource.Other]: "Other",
};

const SOURCE_COLORS: Record<FeedbackSource, string> = {
  [FeedbackSource.Email]: "blue",
  [FeedbackSource.Meeting]: "green",
  [FeedbackSource.Report]: "purple",
  [FeedbackSource.Phone]: "orange",
  [FeedbackSource.Note]: "cyan",
  [FeedbackSource.Other]: "gray",
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ContactFeedbackList({
  feedbacks,
  onDelete,
  deleting = false,
  onClickItem,
}: ContactFeedbackListProps) {
  if (feedbacks.length === 0) {
    return (
      <Text size="2" color="gray">
        No feedback recorded yet
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {feedbacks.map((fb) => (
        <Card
          key={fb.id}
          style={{ cursor: onClickItem ? "pointer" : undefined }}
          onClick={() => onClickItem?.(fb.id)}
        >
          <Flex justify="between" align="start" p="3" gap="3">
            {/* Left: date + subject */}
            <Flex direction="column" gap="1" style={{ minWidth: 120 }}>
              <Text size="2" weight="bold">
                {formatDate(fb.feedbackDate)}
              </Text>
              {fb.subject && (
                <Badge color="indigo" variant="soft" size="1">
                  {fb.subject}
                </Badge>
              )}
            </Flex>

            {/* Middle: content + tags + source */}
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                {fb.content}
              </Text>
              <Flex gap="2" align="center" wrap="wrap" mt="1">
                {fb.source && (
                  <Badge
                    color={SOURCE_COLORS[fb.source] as any}
                    variant="outline"
                    size="1"
                  >
                    {SOURCE_LABELS[fb.source]}
                  </Badge>
                )}
                {fb.extracted && (
                  <Badge color="green" variant="soft" size="1">
                    Extracted
                  </Badge>
                )}
                {fb.tags?.map((tag) => (
                  <Badge key={tag} color="gray" variant="soft" size="1">
                    {tag}
                  </Badge>
                ))}
              </Flex>
              {fb.extractedIssues && fb.extractedIssues.length > 0 && (
                <Flex direction="column" gap="1" mt="2">
                  <Text size="1" weight="medium" color="gray">
                    Extracted Issues ({fb.extractedIssues.length}):
                  </Text>
                  <Flex gap="1" wrap="wrap">
                    {fb.extractedIssues.map((issue, idx) => (
                      <Badge
                        key={idx}
                        color={
                          issue.severity === "high"
                            ? "red"
                            : issue.severity === "medium"
                              ? "orange"
                              : "green"
                        }
                        variant="soft"
                        size="1"
                      >
                        {issue.title}
                      </Badge>
                    ))}
                  </Flex>
                </Flex>
              )}
            </Flex>

            {/* Right: delete button */}
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  variant="ghost"
                  color="red"
                  size="1"
                  disabled={deleting}
                  style={{ flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <TrashIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Delete Feedback</AlertDialog.Title>
                <AlertDialog.Description>
                  Are you sure you want to delete this feedback? This action
                  cannot be undone.
                </AlertDialog.Description>
                <Flex gap="3" justify="end" mt="4">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button
                      color="red"
                      disabled={deleting}
                      onClick={() => onDelete(fb.id)}
                    >
                      Delete
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
