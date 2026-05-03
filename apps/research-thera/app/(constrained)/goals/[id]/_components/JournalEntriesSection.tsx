"use client";

import { Flex, Heading, Text, Card, Badge } from "@radix-ui/themes";
import { useGetJournalEntriesQuery } from "@/app/__generated__/hooks";

export default function JournalEntriesSection({ goalId }: { goalId: number }) {
  const { data, loading } = useGetJournalEntriesQuery({
    variables: { goalId },
  });

  const entries = data?.journalEntries ?? [];

  if (loading || entries.length === 0) return null;

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Heading size="4">Journal Entries ({entries.length})</Heading>
        <Flex direction="column" gap="2">
          {entries.map((entry) => (
            <Card key={entry.id} style={{ backgroundColor: "var(--gray-2)" }}>
              <Flex direction="column" gap="1" p="3">
                <Flex justify="between" align="center" gap="2">
                  <Flex align="center" gap="2">
                    {entry.title && <Text size="2" weight="medium">{entry.title}</Text>}
                    {entry.mood && (
                      <Badge
                        size="1"
                        variant="soft"
                        color={
                          entry.moodScore != null
                            ? entry.moodScore >= 7 ? "green" : entry.moodScore >= 4 ? "orange" : "red"
                            : "gray"
                        }
                      >
                        {entry.mood}
                        {entry.moodScore != null && ` (${entry.moodScore}/10)`}
                      </Badge>
                    )}
                  </Flex>
                  <Text size="1" color="gray">
                    {new Date(entry.entryDate).toLocaleDateString()}
                  </Text>
                </Flex>
                <Text
                  size="2"
                  color="gray"
                  style={{
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {entry.content}
                </Text>
                {entry.tags && entry.tags.length > 0 && (
                  <Flex gap="1" wrap="wrap" mt="1">
                    {entry.tags.map((tag, i) => (
                      <Badge key={i} variant="soft" size="1">{tag}</Badge>
                    ))}
                  </Flex>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
