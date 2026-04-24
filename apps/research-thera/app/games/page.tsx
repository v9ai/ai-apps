"use client";

import { useMemo, useState } from "react";
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
import NextLink from "next/link";
import { useGetGamesQuery, GameType, GameSource } from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

const TYPE_LABEL: Record<GameType, string> = {
  CBT_REFRAME: "CBT Reframe",
  MINDFULNESS: "Mindfulness",
  JOURNAL_PROMPT: "Journal",
};

const TYPE_COLOR: Record<GameType, "indigo" | "cyan" | "jade"> = {
  CBT_REFRAME: "indigo",
  MINDFULNESS: "cyan",
  JOURNAL_PROMPT: "jade",
};

function GamesListContent() {
  const [typeFilter, setTypeFilter] = useState<GameType | "ALL">("ALL");

  const { data, loading, error, refetch } = useGetGamesQuery({
    variables: {
      type: typeFilter === "ALL" ? null : typeFilter,
    },
    fetchPolicy: "cache-and-network",
  });

  const games = useMemo(() => data?.games ?? [], [data]);

  if (loading && !data) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 200 }}>
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

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Heading size="5">All games ({games.length})</Heading>
        <Flex gap="3" align="center">
          <Select.Root
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as GameType | "ALL")}
          >
            <Select.Trigger placeholder="Filter by type" />
            <Select.Content>
              <Select.Item value="ALL">All types</Select.Item>
              <Select.Item value="CBT_REFRAME">CBT Reframe</Select.Item>
              <Select.Item value="MINDFULNESS">Mindfulness</Select.Item>
              <Select.Item value="JOURNAL_PROMPT">Journal</Select.Item>
            </Select.Content>
          </Select.Root>
          <Button asChild>
            <NextLink href="/games/new">New game</NextLink>
          </Button>
        </Flex>
      </Flex>

      {games.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="6" align="center">
            <Text color="gray">No games match this filter.</Text>
            <Button asChild variant="soft">
              <NextLink href="/games/new">Create your first game</NextLink>
            </Button>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {games.map((g) => (
            <NextLink
              key={g.id}
              href={`/games/${g.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card style={{ cursor: "pointer" }}>
                <Flex direction="column" gap="2" p="4">
                  <Flex align="center" gap="2" wrap="wrap">
                    <Heading size="4">{g.title}</Heading>
                    <Badge color={TYPE_COLOR[g.type]} variant="soft">
                      {TYPE_LABEL[g.type]}
                    </Badge>
                    {g.source === GameSource.Seed && (
                      <Badge color="gray" variant="outline" size="1">
                        Starter
                      </Badge>
                    )}
                    {g.source === GameSource.Ai && (
                      <Badge color="purple" variant="outline" size="1">
                        AI
                      </Badge>
                    )}
                  </Flex>
                  {g.description && (
                    <Text size="2" color="gray">
                      {g.description}
                    </Text>
                  )}
                  <Flex gap="3">
                    {g.estimatedMinutes != null && (
                      <Text size="1" color="gray">
                        ~{g.estimatedMinutes} min
                      </Text>
                    )}
                    <Text size="1" color="gray">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            </NextLink>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

export default function GamesPage() {
  return (
    <AuthGate
      pageName="Games"
      description="Your games and completions are private. Sign in to track your practice."
    >
      <Flex direction="column" gap="4">
        <Heading size={{ initial: "6", md: "8" }}>Games</Heading>
        <GamesListContent />
      </Flex>
    </AuthGate>
  );
}
