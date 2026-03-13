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

export interface TeacherFeedbackItem {
  id: number;
  teacherName: string;
  subject?: string | null;
  feedbackDate: string;
  content: string;
  tags?: string[] | null;
  source?: FeedbackSource | null;
  extracted: boolean;
  createdAt: string;
}

interface TeacherFeedbackListProps {
  feedbacks: TeacherFeedbackItem[];
  onDelete: (id: number) => void;
  deleting?: boolean;
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

export default function TeacherFeedbackList({
  feedbacks,
  onDelete,
  deleting = false,
}: TeacherFeedbackListProps) {
  if (feedbacks.length === 0) {
    return (
      <Text size="2" color="gray">
        No teacher feedback recorded yet
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {feedbacks.map((fb) => (
        <Card key={fb.id}>
          <Flex justify="between" align="start" p="3" gap="3">
            {/* Left: teacher name + date */}
            <Flex direction="column" gap="1" style={{ minWidth: 140 }}>
              <Text size="2" weight="bold">
                {fb.teacherName}
              </Text>
              <Text size="1" color="gray">
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
                >
                  <TrashIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Delete Feedback</AlertDialog.Title>
                <AlertDialog.Description>
                  Are you sure you want to delete this teacher feedback? This
                  action cannot be undone.
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
