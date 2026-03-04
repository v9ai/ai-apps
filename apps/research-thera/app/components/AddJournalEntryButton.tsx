"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
  Checkbox,
} from "@radix-ui/themes";
import { PlusIcon, Pencil1Icon } from "@radix-ui/react-icons";
import {
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useGetFamilyMembersQuery,
  useGetGoalsQuery,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";

interface EditEntry {
  id: number;
  title?: string | null;
  content: string;
  mood?: string | null;
  moodScore?: number | null;
  entryDate: string;
  familyMemberId?: number | null;
  goalId?: number | null;
  isPrivate: boolean;
  tags?: string[] | null;
}

interface AddJournalEntryButtonProps {
  editEntry?: EditEntry;
}

const today = () => new Date().toISOString().split("T")[0];

const defaultForm = () => ({
  title: "",
  content: "",
  mood: "",
  entryDate: today(),
  familyMemberId: "",
  goalId: "",
  isPrivate: true,
});

export default function AddJournalEntryButton({
  editEntry,
}: AddJournalEntryButtonProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const isEdit = !!editEntry;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const { data: goalsData } = useGetGoalsQuery();
  const goals = goalsData?.goals ?? [];


  const resetForm = () => {
    setForm(defaultForm);
    setError(null);
  };

  const [createJournalEntry, { loading: creating }] =
    useCreateJournalEntryMutation({
      onCompleted: (data) => {
        setOpen(false);
        resetForm();
        const newEntry = data.createJournalEntry;
        router.push(`/journal/${newEntry.id}`);
      },
      onError: (err) => {
        setError(err.message);
      },
      refetchQueries: ["GetJournalEntries"],
    });

  const [updateJournalEntry, { loading: updating }] =
    useUpdateJournalEntryMutation({
      onCompleted: () => {
        setOpen(false);
        resetForm();
      },
      onError: (err) => {
        setError(err.message);
      },
      refetchQueries: ["GetJournalEntries", "GetJournalEntry"],
    });

  const loading = creating || updating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSignedIn) {
      setError("You must be logged in to create a journal entry");
      return;
    }

    if (!form.content.trim()) {
      setError("Please enter some content for your journal entry");
      return;
    }

    if (!form.entryDate) {
      setError("Please select an entry date");
      return;
    }

    try {
      if (isEdit && editEntry) {
        await updateJournalEntry({
          variables: {
            id: editEntry.id,
            input: {
              title: form.title.trim() || undefined,
              content: form.content.trim(),
              mood: form.mood || undefined,
              entryDate: form.entryDate,
              familyMemberId: form.familyMemberId ? parseInt(form.familyMemberId, 10) : undefined,
              goalId: form.goalId ? parseInt(form.goalId, 10) : undefined,
              isPrivate: form.isPrivate,
            },
          },
        });
      } else {
        await createJournalEntry({
          variables: {
            input: {
              title: form.title.trim() || undefined,
              content: form.content.trim(),
              mood: form.mood || undefined,
              entryDate: form.entryDate,
              familyMemberId: form.familyMemberId ? parseInt(form.familyMemberId, 10) : undefined,
              goalId: form.goalId ? parseInt(form.goalId, 10) : undefined,
              isPrivate: form.isPrivate,
            },
          },
        });
      }
    } catch (err) {
      console.error("Failed to save journal entry:", err);
    }
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen && editEntry) {
          setForm({
            title: editEntry.title || "",
            content: editEntry.content || "",
            mood: editEntry.mood || "",
            entryDate: editEntry.entryDate || today(),
            familyMemberId: editEntry.familyMemberId ? String(editEntry.familyMemberId) : "",
            goalId: editEntry.goalId ? String(editEntry.goalId) : "",
            isPrivate: editEntry.isPrivate,
          });
        }
        if (!isOpen) {
          resetForm();
        }
      }}
    >
      <Dialog.Trigger>
        {isEdit ? (
          <Button variant="ghost" size="2" style={{ cursor: "pointer" }}>
            <Pencil1Icon width="16" height="16" />
          </Button>
        ) : (
          <Button size="3">
            <PlusIcon width="16" height="16" />
            New Entry
          </Button>
        )}
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>
          {isEdit ? "Edit Journal Entry" : "New Journal Entry"}
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {isEdit
            ? "Update your journal entry."
            : "Write a new journal entry to capture your thoughts."}
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Date *
              </Text>
              <TextField.Root
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title
              </Text>
              <TextField.Root
                placeholder="Entry title (optional)"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Content *
              </Text>
              <TextArea
                placeholder="Write your thoughts, reflections, or observations..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                required
                disabled={loading}
              />
            </label>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Mood
              </Text>
              <Select.Root
                value={form.mood || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, mood: value === "none" ? "" : value }))
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select mood..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">No mood</Select.Item>
                  <Select.Item value="happy">Happy</Select.Item>
                  <Select.Item value="sad">Sad</Select.Item>
                  <Select.Item value="anxious">Anxious</Select.Item>
                  <Select.Item value="calm">Calm</Select.Item>
                  <Select.Item value="frustrated">Frustrated</Select.Item>
                  <Select.Item value="hopeful">Hopeful</Select.Item>
                  <Select.Item value="neutral">Neutral</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Family Member
              </Text>
              <Select.Root
                value={form.familyMemberId || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, familyMemberId: value === "none" ? "" : value }))
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select family member..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">None (personal)</Select.Item>
                  {familyMembers.map((fm) => (
                    <Select.Item key={fm.id} value={String(fm.id)}>
                      {fm.firstName ?? fm.name}
                      {fm.relationship ? ` (${fm.relationship})` : ""}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Linked Goal
              </Text>
              <Select.Root
                value={form.goalId || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, goalId: value === "none" ? "" : value }))
                }
                disabled={loading}
              >
                <Select.Trigger
                  placeholder="Select goal..."
                  style={{ width: "100%" }}
                />
                <Select.Content>
                  <Select.Item value="none">No linked goal</Select.Item>
                  {goals.map((goal) => (
                    <Select.Item key={goal.id} value={String(goal.id)}>
                      {goal.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={form.isPrivate}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, isPrivate: checked === true }))
                  }
                  disabled={loading}
                />
                <Text weight="medium">Private entry</Text>
              </Flex>
            </Text>

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
                {loading
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Entry"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
