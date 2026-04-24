"use client";

import { use } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
  Callout,
  IconButton,
  Tooltip,
} from "@radix-ui/themes";
import { ArrowLeftIcon, TrashIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  useGetGameQuery,
  useLogGameCompletionMutation,
  useDeleteGameMutation,
  GameType,
  GameSource,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";
import { CBTReframeRunner } from "@/app/components/games/CBTReframeRunner";
import { MindfulnessRunner } from "@/app/components/games/MindfulnessRunner";
import { JournalPromptRunner } from "@/app/components/games/JournalPromptRunner";

const TYPE_LABEL: Record<GameType, string> = {
  CBT_REFRAME: "CBT Reframe",
  MINDFULNESS: "Mindfulness",
  JOURNAL_PROMPT: "Journal",
};

function GameDetailContent({ id }: { id: number }) {
  const router = useRouter();
  const { data, loading, error, refetch } = useGetGameQuery({
    variables: { id },
    fetchPolicy: "cache-and-network",
  });

  const [logCompletion, { loading: logging }] = useLogGameCompletionMutation({
    refetchQueries: ["GetGame"],
  });
  const [deleteGame, { loading: deleting }] = useDeleteGameMutation({
    refetchQueries: ["GetGames"],
  });

  if (loading && !data) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 240 }}>
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

  const game = data?.game;
  if (!game) {
    return (
      <Card>
        <Flex direction="column" gap="2" p="4">
          <Text color="gray">Game not found.</Text>
          <Button asChild variant="soft">
            <NextLink href="/games">Back to games</NextLink>
          </Button>
        </Flex>
      </Card>
    );
  }

  async function handleFinish(responses: unknown, durationSeconds: number) {
    if (!game) return;
    const responsesStr = typeof responses === "string" ? responses : JSON.stringify(responses);
    try {
      await logCompletion({
        variables: {
          input: {
            gameId: game.id,
            durationSeconds,
            responses: responsesStr,
          },
        },
      });
    } catch {
      // surfaced via Apollo error; UI already marked "done" — user can retry run
    }
  }

  async function handleDelete() {
    if (!game) return;
    if (!confirm("Delete this game? This can't be undone.")) return;
    try {
      await deleteGame({ variables: { id: game.id } });
      router.push("/games");
    } catch {
      /* noop */
    }
  }

  const isSeed = game.source === GameSource.Seed;

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between" gap="2">
        <Button asChild variant="ghost" size="2" color="gray">
          <NextLink href="/games">
            <ArrowLeftIcon /> Games
          </NextLink>
        </Button>
        {!isSeed && (
          <Tooltip content="Delete game">
            <IconButton color="red" variant="ghost" onClick={handleDelete} disabled={deleting}>
              <TrashIcon />
            </IconButton>
          </Tooltip>
        )}
      </Flex>

      <Flex direction="column" gap="2">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size={{ initial: "6", md: "7" }}>{game.title}</Heading>
          <Badge color="indigo" variant="soft">
            {TYPE_LABEL[game.type]}
          </Badge>
          {isSeed && (
            <Badge color="gray" variant="outline" size="1">
              Starter
            </Badge>
          )}
          {game.source === GameSource.Ai && (
            <Badge color="purple" variant="outline" size="1">
              AI
            </Badge>
          )}
        </Flex>
        {game.description && (
          <Text size="3" color="gray">
            {game.description}
          </Text>
        )}
        <Flex gap="3">
          {game.estimatedMinutes != null && (
            <Text size="1" color="gray">
              ~{game.estimatedMinutes} min
            </Text>
          )}
          <Text size="1" color="gray">
            {game.completions.length} completion{game.completions.length === 1 ? "" : "s"}
          </Text>
        </Flex>
      </Flex>

      {game.type === GameType.CbtReframe && (
        <CBTReframeRunner content={game.content} onFinish={handleFinish} submitting={logging} />
      )}
      {game.type === GameType.Mindfulness && (
        <MindfulnessRunner content={game.content} onFinish={handleFinish} submitting={logging} />
      )}
      {game.type === GameType.JournalPrompt && (
        <JournalPromptRunner content={game.content} onFinish={handleFinish} submitting={logging} />
      )}

      {game.completions.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4">
            <Heading size="4">Previous runs</Heading>
            {game.completions.slice(0, 5).map((c) => (
              <Flex key={c.id} justify="between" align="center">
                <Text size="2" color="gray">
                  {new Date(c.completedAt).toLocaleString()}
                </Text>
                <Flex gap="3">
                  {c.durationSeconds != null && (
                    <Text size="1" color="gray">
                      {Math.round(c.durationSeconds / 60)}m
                    </Text>
                  )}
                  {c.linkedNoteId != null && (
                    <NextLink
                      href={`/notes/${c.linkedNoteId}`}
                      style={{ color: "var(--accent-11)", fontSize: "0.8rem" }}
                    >
                      View note →
                    </NextLink>
                  )}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}
    </Flex>
  );
}

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const numId = Number.parseInt(id, 10);
  return (
    <AuthGate pageName="Game" description="Sign in to run games.">
      {Number.isFinite(numId) ? (
        <GameDetailContent id={numId} />
      ) : (
        <Callout.Root color="red">
          <Callout.Text>Invalid game id.</Callout.Text>
        </Callout.Root>
      )}
    </AuthGate>
  );
}
