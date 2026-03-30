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
  Button,
} from "@radix-ui/themes";
import { ArrowLeftIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetJournalEntriesQuery,
  useGetGoalsQuery,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
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

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active": return "green" as const;
    case "completed": return "blue" as const;
    case "paused": return "orange" as const;
    case "archived": return "gray" as const;
    default: return "gray" as const;
  }
}

function TagPageContent() {
  const router = useRouter();
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  const {
    data: journalData,
    loading: journalLoading,
    error: journalError,
  } = useGetJournalEntriesQuery({ variables: { tag } });

  const {
    data: goalsData,
    loading: goalsLoading,
    error: goalsError,
  } = useGetGoalsQuery({ variables: { tag } });

  const loading = journalLoading || goalsLoading;
  const error = journalError || goalsError;

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
        </Flex>
      </Card>
    );
  }

  const entries = journalData?.journalEntries || [];
  const goals = goalsData?.goals || [];
  const totalCount = entries.length + goals.length;

  return (
    <Flex direction="column" gap="5">
      <Heading size="5">
        {totalCount} {totalCount === 1 ? "item" : "items"} tagged{" "}
        <Badge variant="soft" size="2">
          {tag}
        </Badge>
      </Heading>

      {/* Goals section */}
      {goals.length > 0 && (
        <Flex direction="column" gap="3">
          <Heading size="4" color="gray">
            Goals ({goals.length})
          </Heading>
          {goals.map((goal) => (
            <Card
              key={goal.id}
              style={{ cursor: "pointer" }}
              onClick={() => router.push(`/goals/${goal.id}`)}
            >
              <Flex direction="column" gap="2" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Heading size="4">{goal.title}</Heading>
                    {goal.description && (
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
                        {goal.description}
                      </Text>
                    )}
                  </Flex>
                  <Badge
                    color={getStatusColor(goal.status)}
                    variant="soft"
                    size="1"
                  >
                    {goal.status}
                  </Badge>
                </Flex>
                <Flex gap="2" wrap="wrap" align="center">
                  {goal.tags &&
                    goal.tags.map((t, idx) => (
                      <Badge
                        key={idx}
                        variant={t === tag ? "solid" : "soft"}
                        size="1"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tag/${encodeURIComponent(t)}`);
                        }}
                      >
                        {t}
                      </Badge>
                    ))}
                  {goal.familyMember && (
                    <Badge color="cyan" size="1">
                      {goal.familyMember.firstName ?? goal.familyMember.name}
                    </Badge>
                  )}
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {/* Journal entries section */}
      {entries.length > 0 && (
        <Flex direction="column" gap="3">
          <Heading size="4" color="gray">
            Journal Entries ({entries.length})
          </Heading>
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
                        {entry.familyMember.firstName ??
                          entry.familyMember.name}
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
                    entry.tags.map((t, idx) => (
                      <Badge
                        key={idx}
                        variant={t === tag ? "solid" : "soft"}
                        size="1"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tag/${encodeURIComponent(t)}`);
                        }}
                      >
                        {t}
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

      {totalCount === 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">Nothing found with this tag.</Text>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}

const DynamicTagPageContent = dynamic(
  () => Promise.resolve(TagPageContent),
  { ssr: false },
);

export default function TagPage() {
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  return (
    <AuthGate
      pageName="Tag"
      description="Sign in to view tagged items."
    >
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
              <NextLink href="/">
                <ArrowLeftIcon />
                <Box display={{ initial: "none", sm: "inline" }} asChild>
                  <span>Home</span>
                </Box>
              </NextLink>
            </Button>

            <Box display={{ initial: "none", sm: "block" }}>
              <Separator orientation="vertical" style={{ height: 20 }} />
            </Box>

            <Box minWidth="0" style={{ flex: 1 }}>
              <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
                Tag: {tag}
              </Heading>
            </Box>
          </Flex>
        </Box>

        <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          <DynamicTagPageContent />
        </Box>
      </Flex>
    </AuthGate>
  );
}
