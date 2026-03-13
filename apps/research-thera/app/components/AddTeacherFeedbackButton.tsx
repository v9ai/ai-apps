"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useCreateTeacherFeedbackMutation,
  FeedbackSource,
} from "@/app/__generated__/hooks";

interface AddTeacherFeedbackButtonProps {
  familyMemberId: number;
  refetchQueries?: string[];
  size?: "1" | "2" | "3";
}

const today = () => new Date().toISOString().split("T")[0];

const defaultForm = () => ({
  teacherName: "",
  subject: "",
  feedbackDate: today(),
  content: "",
  tags: "",
  source: "" as FeedbackSource | "",
});

const SOURCE_LABELS: Record<FeedbackSource, string> = {
  [FeedbackSource.Email]: "Email",
  [FeedbackSource.Meeting]: "Meeting",
  [FeedbackSource.Report]: "Report",
  [FeedbackSource.Phone]: "Phone",
  [FeedbackSource.Note]: "Note",
  [FeedbackSource.Other]: "Other",
};

export default function AddTeacherFeedbackButton({
  familyMemberId,
  refetchQueries: extraRefetchQueries,
  size = "2",
}: AddTeacherFeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const [createFeedback, { loading }] = useCreateTeacherFeedbackMutation({
    onCompleted: () => {
      setOpen(false);
      setForm(defaultForm);
      setError(null);
    },
    onError: (err) => setError(err.message),
    refetchQueries: [
      "GetTeacherFeedbacks",
      ...(extraRefetchQueries ?? []),
    ],
  });

  const resetForm = () => {
    setForm(defaultForm);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.teacherName.trim()) {
      setError("Teacher name is required");
      return;
    }
    if (!form.feedbackDate) {
      setError("Feedback date is required");
      return;
    }
    if (!form.content.trim()) {
      setError("Feedback content is required");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await createFeedback({
        variables: {
          input: {
            familyMemberId,
            teacherName: form.teacherName.trim(),
            subject: form.subject.trim() || undefined,
            feedbackDate: form.feedbackDate,
            content: form.content.trim(),
            tags: tags.length > 0 ? tags : undefined,
            source: form.source || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create teacher feedback:", err);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <Dialog.Trigger>
        <Button size={size}>
          <PlusIcon width="16" height="16" />
          Add Feedback
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 540 }}>
        <Dialog.Title>Add Teacher Feedback</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Record feedback from a teacher for this family member.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Teacher Name *
              </Text>
              <TextField.Root
                placeholder="e.g. Mrs. Smith"
                value={form.teacherName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teacherName: e.target.value }))
                }
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Subject
              </Text>
              <TextField.Root
                placeholder="e.g. Mathematics, General, Behavior"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Date *
              </Text>
              <TextField.Root
                type="date"
                value={form.feedbackDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, feedbackDate: e.target.value }))
                }
                required
                disabled={loading}
              />
            </label>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Source
              </Text>
              <Select.Root
                value={form.source || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    source: value === "none" ? "" : (value as FeedbackSource),
                  }))
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="How was this received?"
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">Not specified</Select.Item>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Feedback *
              </Text>
              <TextArea
                placeholder="Enter the teacher's feedback..."
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={5}
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Tags
              </Text>
              <TextField.Root
                placeholder="Comma-separated, e.g. behavior, academic, social"
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                disabled={loading}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Add Feedback"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
