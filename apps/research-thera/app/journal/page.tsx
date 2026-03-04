"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Spinner,
  Select,
} from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  useGetJournalEntriesQuery,
  useGetFamilyMembersQuery,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import AddJournalEntryButton from "@/app/components/AddJournalEntryButton";
import { AuthGate } from "@/app/components/AuthGate";

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

function JournalListContent() {
  const router = useRouter();
  const { user } = useUser();
  const [moodFilter, setMoodFilter] = useState<string | undefined>(undefined);
  const [familyMemberFilter, setFamilyMemberFilter] = useState<
    string | undefined
  >(undefined);

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const { data, loading, error, refetch } = useGetJournalEntriesQuery({
    variables: {
      mood: moodFilter,
      familyMemberId: familyMemberFilter
        ? parseInt(familyMemberFilter, 10)
        : undefined,
    },
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error.message}</Text>
          <Button onClick={() => refetch()}>Retry</Button>
        </Flex>
      </Card>
    );
  }

  const entries = data?.journalEntries || [];

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Heading size="5">My Journal ({entries.length})</Heading>
        <Flex gap="3" align="center">
          <Select.Root
            value={moodFilter || "all"}
            onValueChange={(value) =>
              setMoodFilter(value === "all" ? undefined : value)
            }
          >
            <Select.Trigger placeholder="Filter by mood" />
            <Select.Content>
              <Select.Item value="all">All Moods</Select.Item>
              <Select.Item value="happy">Happy</Select.Item>
              <Select.Item value="sad">Sad</Select.Item>
              <Select.Item value="anxious">Anxious</Select.Item>
              <Select.Item value="calm">Calm</Select.Item>
              <Select.Item value="frustrated">Frustrated</Select.Item>
              <Select.Item value="hopeful">Hopeful</Select.Item>
              <Select.Item value="neutral">Neutral</Select.Item>
            </Select.Content>
          </Select.Root>
          {familyMembers.length > 0 && (
            <Select.Root
              value={familyMemberFilter || "all"}
              onValueChange={(value) =>
                setFamilyMemberFilter(value === "all" ? undefined : value)
              }
            >
              <Select.Trigger placeholder="Filter by family member" />
              <Select.Content>
                <Select.Item value="all">All Members</Select.Item>
                {familyMembers.map((fm) => (
                  <Select.Item key={fm.id} value={String(fm.id)}>
                    {fm.firstName ?? fm.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
          <AddJournalEntryButton />
        </Flex>
      </Flex>

      {entries.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">No entries yet.</Text>
            <Text size="2" color="gray">
              {moodFilter || familyMemberFilter
                ? "No entries match the current filters."
                : "Start writing to begin your journal."}
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              style={{ cursor: "pointer" }}
              onClick={() => router.push(`/journal/${entry.id}`)}
            >
              <Flex direction="column" gap="3" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="2" style={{ flex: 1 }}>
                    <Heading size="4">
                      {entry.title ||
                        (entry.content
                          ? entry.content.slice(0, 60) +
                            (entry.content.length > 60 ? "..." : "")
                          : "Untitled Entry")}
                    </Heading>
                    {entry.familyMember && (
                      <Badge
                        color="cyan"
                        size="1"
                        style={{ width: "fit-content" }}
                      >
                        {entry.familyMember.firstName ?? entry.familyMember.name}
                      </Badge>
                    )}
                    {entry.content && (
                      <Text
                        size="2"
                        color="gray"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {entry.content}
                      </Text>
                    )}
                  </Flex>
                  <Flex direction="column" align="end" gap="2">
                    <Badge color="gray" variant="soft" size="1">
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </Badge>
                    {entry.mood && (
                      <Badge
                        color={moodColor(entry.mood) as any}
                        variant="soft"
                        size="1"
                      >
                        {entry.mood}
                      </Badge>
                    )}
                  </Flex>
                </Flex>

                <Flex gap="4" align="center" wrap="wrap">
                  {entry.tags &&
                    entry.tags.length > 0 &&
                    entry.tags.map((tag, idx) => (
                      <Badge key={idx} variant="soft" size="1">
                        {tag}
                      </Badge>
                    ))}
                  {entry.goal && (
                    <Badge color="indigo" variant="outline" size="1">
                      {entry.goal.title}
                    </Badge>
                  )}
                  {entry.isPrivate && (
                    <Flex align="center" gap="1">
                      <LockClosedIcon width="12" height="12" />
                      <Text size="1" color="gray">
                        Private
                      </Text>
                    </Flex>
                  )}
                  <Text size="1" color="gray">
                    Created {new Date(entry.createdAt).toLocaleDateString()}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

const DynamicJournalListContent = dynamic(
  () => Promise.resolve(JournalListContent),
  { ssr: false },
);

export default function JournalPage() {
  return (
    <AuthGate
      pageName="Journal"
      description="Your journal entries are private. Sign in to write and read your reflections."
    >
      <Flex direction="column" gap="4">
        <Heading size="8">Journal</Heading>
        <DynamicJournalListContent />
      </Flex>
    </AuthGate>
  );
}
