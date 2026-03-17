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
import { useCreateIssueMutation } from "@/app/__generated__/hooks";

interface AddIssueButtonProps {
  familyMemberId: number;
  refetchQueries?: string[];
  size?: "1" | "2" | "3";
}

const CATEGORIES = ["academic", "behavioral", "social", "emotional", "developmental", "health", "communication", "other"];
const SEVERITIES = ["low", "medium", "high"];

const defaultForm = () => ({
  title: "",
  description: "",
  category: "behavioral",
  severity: "medium",
  recommendations: "",
});

export default function AddIssueButton({
  familyMemberId,
  refetchQueries: extraRefetchQueries,
  size = "2",
}: AddIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const [createIssue, { loading }] = useCreateIssueMutation({
    onCompleted: () => {
      setOpen(false);
      setForm(defaultForm);
      setError(null);
    },
    onError: (err) => setError(err.message),
    refetchQueries: ["GetFamilyMember", ...(extraRefetchQueries ?? [])],
  });

  const resetForm = () => {
    setForm(defaultForm);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    const recommendations = form.recommendations
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    try {
      await createIssue({
        variables: {
          input: {
            familyMemberId,
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            severity: form.severity,
            recommendations: recommendations.length ? recommendations : undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create issue:", err);
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
          Add Issue
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Add Issue</Dialog.Title>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title *
              </Text>
              <TextField.Root
                placeholder="Brief issue title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Description
              </Text>
              <TextArea
                placeholder="Describe the issue..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                disabled={loading}
              />
            </label>

            <Flex gap="3">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text as="div" size="2" weight="medium">
                  Category
                </Text>
                <Select.Root
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  disabled={loading}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {CATEGORIES.map((c) => (
                      <Select.Item key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text as="div" size="2" weight="medium">
                  Severity
                </Text>
                <Select.Root
                  value={form.severity}
                  onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
                  disabled={loading}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {SEVERITIES.map((s) => (
                      <Select.Item key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Recommendations
              </Text>
              <TextArea
                placeholder="One per line..."
                value={form.recommendations}
                onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
                rows={3}
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
                {loading ? "Saving..." : "Add Issue"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
