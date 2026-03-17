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
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import {
  useConvertJournalEntryToIssueMutation,
  useGetFamilyMembersQuery,
} from "@/app/__generated__/hooks";
import { useRouter } from "next/navigation";

interface ConvertJournalToIssueButtonProps {
  journalEntryId: number;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultFamilyMemberId?: number | null;
}

const CATEGORIES = [
  "academic",
  "behavioral",
  "social",
  "emotional",
  "developmental",
  "health",
  "communication",
  "other",
];
const SEVERITIES = ["low", "medium", "high"];

export default function ConvertJournalToIssueButton({
  journalEntryId,
  defaultTitle,
  defaultDescription,
  defaultFamilyMemberId,
}: ConvertJournalToIssueButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: defaultTitle ?? "",
    description: defaultDescription ?? "",
    familyMemberId: defaultFamilyMemberId?.toString() ?? "",
    category: "behavioral",
    severity: "medium",
    recommendations: "",
  });

  const { data: fmData } = useGetFamilyMembersQuery({ skip: !open });
  const familyMembers = fmData?.familyMembers ?? [];

  const [convertMutation, { loading }] =
    useConvertJournalEntryToIssueMutation({
      onCompleted: (data) => {
        setOpen(false);
        const issue = data.convertJournalEntryToIssue;
        router.push(
          `/family/${issue.familyMemberId}/issues/${issue.id}`,
        );
      },
      onError: (err) => setError(err.message),
      refetchQueries: ["GetJournalEntry"],
    });

  const resetForm = () => {
    setForm({
      title: defaultTitle ?? "",
      description: defaultDescription ?? "",
      familyMemberId: defaultFamilyMemberId?.toString() ?? "",
      category: "behavioral",
      severity: "medium",
      recommendations: "",
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.familyMemberId) {
      setError("Family member is required");
      return;
    }
    const recommendations = form.recommendations
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    try {
      await convertMutation({
        variables: {
          id: journalEntryId,
          input: {
            familyMemberId: parseInt(form.familyMemberId),
            title: form.title.trim() || undefined,
            description: form.description.trim() || undefined,
            category: form.category,
            severity: form.severity,
            recommendations: recommendations.length
              ? recommendations
              : undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to convert journal entry to issue:", err);
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
        <Button variant="soft" color="orange" size="2" style={{ cursor: "pointer" }}>
          <ExclamationTriangleIcon width="16" height="16" />
          Convert to Issue
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Convert to Issue</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create an issue from this journal entry. The journal entry will be
          kept and linked to the new issue.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Family Member *
              </Text>
              <Select.Root
                value={form.familyMemberId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, familyMemberId: v }))
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select family member..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  {familyMembers.map((fm) => (
                    <Select.Item key={fm.id} value={fm.id.toString()}>
                      {fm.firstName}
                      {fm.name ? ` (${fm.name})` : ""}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title
              </Text>
              <TextField.Root
                placeholder="Issue title (defaults to journal title)"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Description
              </Text>
              <TextArea
                placeholder="Issue description (defaults to journal content)"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
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
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v }))
                  }
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
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, severity: v }))
                  }
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, recommendations: e.target.value }))
                }
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
              <Button type="submit" color="orange" disabled={loading}>
                {loading ? "Converting..." : "Convert to Issue"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
