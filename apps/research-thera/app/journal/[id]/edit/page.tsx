"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  TextField,
  TextArea,
  Select,
  Checkbox,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetJournalEntryQuery,
  useUpdateJournalEntryMutation,
  useGetFamilyMembersQuery,
  useGetGoalsQuery,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

const today = () => new Date().toISOString().split("T")[0];

function JournalEditContent() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const { data: session } = authClient.useSession();
  const isSignedIn = !!session?.user;

  const { data, loading: entryLoading, error } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const entry = data?.journalEntry;

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const { data: goalsData } = useGetGoalsQuery();
  const goals = goalsData?.goals ?? [];

  const [form, setForm] = useState({
    title: "",
    content: "",
    mood: "",
    entryDate: today(),
    familyMemberId: "",
    goalId: "",
    isPrivate: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (entry && !initialized) {
      setForm({
        title: entry.title || "",
        content: entry.content || "",
        mood: entry.mood || "",
        entryDate: entry.entryDate || today(),
        familyMemberId: entry.familyMemberId ? String(entry.familyMemberId) : "",
        goalId: entry.goalId ? String(entry.goalId) : "",
        isPrivate: entry.isPrivate,
      });
      setInitialized(true);
    }
  }, [entry, initialized]);

  const [updateJournalEntry, { loading: saving }] =
    useUpdateJournalEntryMutation({
      onCompleted: () => {
        router.push(`/journal/${id}`);
      },
      onError: (err) => {
        setFormError(err.message);
      },
      refetchQueries: ["GetJournalEntries", "GetJournalEntry"],
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isSignedIn) {
      setFormError("You must be logged in to edit a journal entry");
      return;
    }

    if (!form.content.trim()) {
      setFormError("Please enter some content for your journal entry");
      return;
    }

    if (!form.entryDate) {
      setFormError("Please select an entry date");
      return;
    }

    try {
      await updateJournalEntry({
        variables: {
          id,
          input: {
            title: form.title.trim() || undefined,
            content: form.content.trim(),
            mood: form.mood || undefined,
            entryDate: form.entryDate,
            familyMemberId: form.familyMemberId
              ? parseInt(form.familyMemberId, 10)
              : undefined,
            goalId: form.goalId ? parseInt(form.goalId, 10) : undefined,
            isPrivate: form.isPrivate,
          },
        },
      });
    } catch (err) {
      console.error("Failed to update journal entry:", err);
    }
  };

  if (entryLoading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !entry) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Journal entry not found"}
        </Text>
      </Card>
    );
  }

  const entryTitle =
    entry.title ||
    new Date(entry.entryDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={[
          { label: "Journal", href: "/journal" },
          { label: entryTitle, href: `/journal/${id}` },
          { label: "Edit" },
        ]}
      />

      <Card style={{ backgroundColor: "var(--indigo-3)" }}>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4" p="1">
            <Heading size="5">Edit Journal Entry</Heading>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Date *
              </Text>
              <TextField.Root
                type="date"
                value={form.entryDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, entryDate: e.target.value }))
                }
                required
                disabled={saving}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title
              </Text>
              <TextField.Root
                placeholder="Entry title (optional)"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                disabled={saving}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Content *
              </Text>
              <TextArea
                placeholder="Write your thoughts, reflections, or observations..."
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={10}
                required
                disabled={saving}
              />
            </label>

            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Mood
              </Text>
              <Select.Root
                value={form.mood || "none"}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    mood: value === "none" ? "" : value,
                  }))
                }
                disabled={saving}
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
                  setForm((f) => ({
                    ...f,
                    familyMemberId: value === "none" ? "" : value,
                  }))
                }
                disabled={saving}
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
                  setForm((f) => ({
                    ...f,
                    goalId: value === "none" ? "" : value,
                  }))
                }
                disabled={saving}
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
                  disabled={saving}
                />
                <Text weight="medium">Private entry</Text>
              </Flex>
            </Text>

            {formError && (
              <Text color="red" size="2">
                {formError}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="2">
              <Button
                variant="soft"
                color="gray"
                disabled={saving}
                type="button"
                onClick={() => router.push(`/journal/${id}`)}
                style={{ cursor: "pointer" }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} style={{ cursor: "pointer" }}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Card>
    </Flex>
  );
}

const DynamicJournalEditContent = dynamic(
  () => Promise.resolve(JournalEditContent),
  { ssr: false },
);

export default function JournalEditPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const { data } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const entry = data?.journalEntry;
  const pageTitle = entry
    ? `Edit: ${entry.title || new Date(entry.entryDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
    : "Edit Entry";

  return (
    <Flex direction="column" gap="5">
      <Box
        position="sticky"
        top="0"
        style={{
          zIndex: 20,
          background: "var(--color-panel)",
          borderBottom: "1px solid var(--gray-a6)",
          backdropFilter: "blur(10px)",
          marginLeft: "calc(-1 * var(--space-3))",
          marginRight: "calc(-1 * var(--space-3))",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
        }}
      >
        <Flex
          py="3"
          align="center"
          gap={{ initial: "2", md: "4" }}
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href={`/journal/${id}`}>
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>Back</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}>
            <Separator orientation="vertical" style={{ height: 20 }} />
          </Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              {pageTitle}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicJournalEditContent />
      </Box>
    </Flex>
  );
}
