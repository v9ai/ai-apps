"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Dialog,
  Button,
  Flex,
  Switch,
  Text,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PlusIcon, Pencil1Icon, LockClosedIcon } from "@radix-ui/react-icons";
import {
  useCreateJournalEntryMutation,
  useUpdateJournalEntryMutation,
  useGetFamilyMembersQuery,
  useGetGoalsQuery,
  useGetAllTagsQuery,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import { useVaultSession } from "@/app/hooks/useVaultSession";
import { splitEntryText, joinTitleAndContent } from "@/app/lib/journal-text";

interface EditEntry {
  id: number;
  title?: string | null;
  content: string;
  mood?: string | null;
  moodScore?: number | null;
  entryDate: string;
  familyMemberId?: number | null;
  goalId?: number | null;
  tags?: string[] | null;
  isVault?: boolean | null;
}

interface AddJournalEntryButtonProps {
  editEntry?: EditEntry;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
}

const today = () => new Date().toISOString().split("T")[0];

const defaultForm = () => ({
  entry: "",
  mood: "",
  entryDate: today(),
  familyMemberId: "",
  goalId: "",
  tags: "",
  isVault: false,
});

export default function AddJournalEntryButton({
  editEntry,
  controlledOpen,
  onControlledOpenChange,
}: AddJournalEntryButtonProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { unlocked: vaultUnlocked } = useVaultSession();
  const isSignedIn = !!session?.user;
  const isEdit = !!editEntry;
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onControlledOpenChange! : setInternalOpen;
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const { data: goalsData } = useGetGoalsQuery();
  const goals = goalsData?.goals ?? [];

  const { data: allTagsData } = useGetAllTagsQuery();
  const allTags = allTagsData?.allTags ?? [];


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

    if (!form.entryDate) {
      setError("Please select an entry date");
      return;
    }

    const parsedTags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { title, content } = splitEntryText(form.entry);

    try {
      if (isEdit && editEntry) {
        await updateJournalEntry({
          variables: {
            id: editEntry.id,
            input: {
              title: title ?? undefined,
              content,
              mood: form.mood || undefined,
              entryDate: form.entryDate,
              familyMemberId: form.familyMemberId ? parseInt(form.familyMemberId, 10) : undefined,
              goalId: form.goalId ? parseInt(form.goalId, 10) : undefined,
              isPrivate: true,
              isVault: vaultUnlocked ? form.isVault : undefined,
              tags: parsedTags.length > 0 ? parsedTags : undefined,
            },
          },
        });
      } else {
        await createJournalEntry({
          variables: {
            input: {
              title: title ?? undefined,
              content,
              mood: form.mood || undefined,
              entryDate: form.entryDate,
              familyMemberId: form.familyMemberId ? parseInt(form.familyMemberId, 10) : undefined,
              goalId: form.goalId ? parseInt(form.goalId, 10) : undefined,
              isPrivate: true,
              isVault: vaultUnlocked && form.isVault ? true : undefined,
              tags: parsedTags.length > 0 ? parsedTags : undefined,
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
            entry: joinTitleAndContent(editEntry.title, editEntry.content),
            mood: editEntry.mood || "",
            entryDate: editEntry.entryDate || today(),
            familyMemberId: editEntry.familyMemberId ? String(editEntry.familyMemberId) : "",
            goalId: editEntry.goalId ? String(editEntry.goalId) : "",
            tags: (editEntry.tags || []).join(", "),
            isVault: editEntry.isVault === true,
          });
        }
        if (!isOpen) {
          resetForm();
        }
      }}
    >
      {!isControlled && (
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
      )}

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
                Entry
              </Text>
              <TextArea
                placeholder="First line becomes the title. Then write your thoughts, reflections, or observations..."
                value={form.entry}
                onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
                rows={8}
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

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Tags
              </Text>
              <TextField.Root
                placeholder="Comma-separated, e.g. therapy, milestone, concern"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                disabled={loading}
              />
              {(() => {
                const currentTags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
                const suggestions = allTags.filter((t) => !currentTags.includes(t));
                return suggestions.length > 0 ? (
                  <Flex gap="1" wrap="wrap" mt="1">
                    {suggestions.map((tag) => (
                      <Badge key={tag} variant="outline" size="1" style={{ cursor: "pointer" }}
                        onClick={() => setForm((f) => ({ ...f, tags: f.tags.trim() ? `${f.tags}, ${tag}` : tag }))}>
                        + {tag}
                      </Badge>
                    ))}
                  </Flex>
                ) : null;
              })()}
            </label>

            {vaultUnlocked && (
              <Flex align="center" gap="2" asChild>
                <label>
                  <Switch
                    checked={form.isVault}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, isVault: checked }))}
                    disabled={loading}
                  />
                  <Flex align="center" gap="1">
                    <LockClosedIcon width="12" height="12" />
                    <Text size="2" weight="medium">Vault</Text>
                  </Flex>
                </label>
              </Flex>
            )}

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
