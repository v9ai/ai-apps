"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Separator,
  AlertDialog,
  Button,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  TrashIcon,
  LockClosedIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetJournalEntryQuery,
  useDeleteJournalEntryMutation,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import ConvertJournalToIssueButton from "@/app/components/ConvertJournalToIssueButton";

const moodColor = (mood: string) =>
  (
    ({
      happy: "green",
      sad: "blue",
      anxious: "orange",
      calm: "teal",
      frustrated: "red",
      hopeful: "indigo",
      neutral: "gray",
    }) as Record<string, string>
  )[mood] ?? "gray";

function JournalEntryContent() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { data, loading, error } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const entry = data?.journalEntry;

  const [deleteJournalEntry, { loading: deleting }] =
    useDeleteJournalEntryMutation({
      onCompleted: () => {
        router.push("/journal");
      },
      refetchQueries: ["GetJournalEntries"],
    });

  const handleDelete = async () => {
    await deleteJournalEntry({ variables: { id } });
  };

  if (loading) {
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
          { label: entryTitle },
        ]}
      />

      {/* Main Entry Card */}
      <Card style={{ backgroundColor: "var(--indigo-3)" }}>
        <Flex direction="column" gap="4" p="1">
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Flex direction="column" gap="1">
              <Heading size={{ initial: "5", md: "7" }}>{entryTitle}</Heading>
              <Flex align="center" gap="2" wrap="wrap">
                <Badge color="gray" variant="soft" size="2">
                  {new Date(entry.entryDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Badge>
                {entry.mood && (
                  <Badge
                    color={moodColor(entry.mood) as any}
                    variant="soft"
                    size="2"
                  >
                    {entry.mood}
                    {entry.moodScore !== null &&
                      entry.moodScore !== undefined &&
                      ` (${entry.moodScore}/10)`}
                  </Badge>
                )}
                {entry.isPrivate && (
                  <Badge color="gray" variant="soft" size="2">
                    <LockClosedIcon width="12" height="12" />
                    Private
                  </Badge>
                )}
              </Flex>
            </Flex>
            <Flex align="center" gap="4">
              {!entry.issue && (
                <ConvertJournalToIssueButton
                  journalEntryId={entry.id}
                  defaultTitle={entry.title ?? undefined}
                  defaultDescription={entry.content}
                  defaultFamilyMemberId={entry.familyMemberId}
                />
              )}
              <Button
                variant="ghost"
                size="3"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/journal/${entry.id}/edit`)}
              >
                <Pencil1Icon width="20" height="20" />
              </Button>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button
                    variant="ghost"
                    color="red"
                    size="2"
                    disabled={deleting}
                    style={{ cursor: "pointer" }}
                  >
                    <TrashIcon width="16" height="16" />
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Delete Journal Entry</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete this journal entry? This
                    action cannot be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button
                        variant="solid"
                        color="red"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          </Flex>

          {/* Content */}
          {entry.content && (
            <Text size="3" style={{ whiteSpace: "pre-wrap" }}>
              {entry.content}
            </Text>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <Flex gap="2" wrap="wrap">
              {entry.tags.map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="soft"
                  size="1"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/tag/${encodeURIComponent(tag)}`)}
                >
                  {tag}
                </Badge>
              ))}
            </Flex>
          )}

          {/* Family Member */}
          {entry.familyMember && (
            <Flex align="center" gap="2">
              <Text size="1" color="gray" weight="medium">
                Family Member:
              </Text>
              <Badge color="cyan" size="2" style={{ width: "fit-content" }}>
                {entry.familyMember.firstName ?? entry.familyMember.name}
              </Badge>
            </Flex>
          )}

          {/* Linked Goal */}
          {entry.goal && (
            <Flex align="center" gap="2">
              <Text size="1" color="gray" weight="medium">
                Linked Goal:
              </Text>
              <Badge
                color="indigo"
                size="2"
                style={{ width: "fit-content", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/goals/${entry.goal!.id}`);
                }}
              >
                {entry.goal.title}
              </Badge>
            </Flex>
          )}

          {/* Linked Issue */}
          {entry.issue && (
            <Flex align="center" gap="2">
              <Text size="1" color="gray" weight="medium">
                Linked Issue:
              </Text>
              <Badge
                color="orange"
                size="2"
                style={{ width: "fit-content", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/family/${entry.issue!.familyMember?.id}/issues/${entry.issue!.id}`,
                  );
                }}
              >
                {entry.issue.title}
              </Badge>
              <Badge
                color={
                  entry.issue.severity === "high"
                    ? "red"
                    : entry.issue.severity === "medium"
                      ? "orange"
                      : "green"
                }
                variant="soft"
                size="1"
              >
                {entry.issue.severity}
              </Badge>
            </Flex>
          )}

          <Flex gap="4" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Created
              </Text>
              <Text size="2">
                {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
            {entry.updatedAt !== entry.createdAt && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Last Updated
                </Text>
                <Text size="2">
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </Text>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}

const DynamicJournalEntryContent = dynamic(
  () => Promise.resolve(JournalEntryContent),
  { ssr: false },
);

export default function JournalEntryPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const { data } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const entry = data?.journalEntry;
  const pageTitle =
    entry?.title ||
    (entry?.entryDate
      ? new Date(entry.entryDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Loading entry...");

  return (
    <Flex direction="column" gap="5">
      {/* Sticky Header */}
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
            <NextLink href="/journal">
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>Journal</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}><Separator orientation="vertical" style={{ height: 20 }} /></Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              {pageTitle}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicJournalEntryContent />
      </Box>
    </Flex>
  );
}
