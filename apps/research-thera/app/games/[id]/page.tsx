"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  IconButton,
  Select,
  Spinner,
  Switch,
  Text,
  Tooltip,
  Callout,
} from "@radix-ui/themes";
import { ArrowLeftIcon, Cross2Icon, TrashIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  useGetGameQuery,
  useLogGameCompletionMutation,
  useDeleteGameMutation,
  useGetFamilyMembersQuery,
  GameType,
  GameSource,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";
import { CBTReframeRunner } from "@/app/components/games/CBTReframeRunner";
import { MindfulnessRunner } from "@/app/components/games/MindfulnessRunner";
import { JournalPromptRunner } from "@/app/components/games/JournalPromptRunner";
import {
  ParentCoachPane,
  type ParentGuide,
} from "@/app/components/games/ParentCoachPane";

const TYPE_LABEL_EN: Record<GameType, string> = {
  CBT_REFRAME: "CBT Reframe",
  MINDFULNESS: "Mindfulness",
  JOURNAL_PROMPT: "Journal",
};

const TYPE_LABEL_RO: Record<GameType, string> = {
  CBT_REFRAME: "Reformulare CBT",
  MINDFULNESS: "Mindfulness",
  JOURNAL_PROMPT: "Jurnal",
};

type ParsedContent = {
  steps?: unknown[];
  prompts?: string[];
  parentGuide?: ParentGuide;
};

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function GameDetailContent({ id }: { id: number }) {
  const router = useRouter();
  const { data, loading, error, refetch } = useGetGameQuery({
    variables: { id },
    fetchPolicy: "cache-and-network",
  });
  const { data: familyData } = useGetFamilyMembersQuery();

  const [logCompletion, { loading: logging }] = useLogGameCompletionMutation({
    refetchQueries: ["GetGame"],
  });
  const [deleteGame, { loading: deleting }] = useDeleteGameMutation({
    refetchQueries: ["GetGames"],
  });

  const [coachMode, setCoachMode] = useState(false);
  const [partnerFamilyMemberId, setPartnerFamilyMemberId] = useState<number | null>(null);
  const [runnerStepIndex, setRunnerStepIndex] = useState(0);
  const [runnerCompleted, setRunnerCompleted] = useState(false);

  const game = data?.game;
  const isRo = (game?.language ?? "en") === "ro";
  const typeLabel = isRo ? TYPE_LABEL_RO : TYPE_LABEL_EN;

  const parsed = useMemo<ParsedContent>(() => {
    try {
      return game?.content ? (JSON.parse(game.content) as ParsedContent) : {};
    } catch {
      return {};
    }
  }, [game?.content]);

  const parentGuide = parsed.parentGuide;
  const totalSteps = (parsed.steps?.length ?? parsed.prompts?.length ?? 0) as number;
  const hasParentGuide = Boolean(parentGuide?.stepsGuide && parentGuide.stepsGuide.length > 0);

  // Children under 18 (for the partner picker).
  const children = useMemo(() => {
    const list = familyData?.familyMembers ?? [];
    return list.filter((fm) => {
      const age = fm.ageYears ?? ageFromDob(fm.dateOfBirth);
      return age != null && age < 18;
    });
  }, [familyData]);

  // Auto-pick sole child when coach mode turns on.
  useEffect(() => {
    if (coachMode && partnerFamilyMemberId == null && children.length === 1) {
      setPartnerFamilyMemberId(children[0].id);
    }
  }, [coachMode, partnerFamilyMemberId, children]);

  // Try to enter browser fullscreen when coach mode activates (best-effort).
  useEffect(() => {
    if (!coachMode) return;
    const el = document.documentElement;
    const req = el.requestFullscreen;
    if (typeof req === "function") {
      el.requestFullscreen().catch(() => {
        /* iOS Safari rejects if not from user gesture; tolerate */
      });
    }
    // Lock page scroll while overlay is up
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [coachMode]);

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
          <Button onClick={() => refetch()}>
            {isRo ? "Reîncearcă" : "Retry"}
          </Button>
        </Flex>
      </Card>
    );
  }

  if (!game) {
    return (
      <Card>
        <Flex direction="column" gap="2" p="4">
          <Text color="gray">{isRo ? "Joc inexistent." : "Game not found."}</Text>
          <Button asChild variant="soft">
            <NextLink href="/games">
              {isRo ? "Înapoi la jocuri" : "Back to games"}
            </NextLink>
          </Button>
        </Flex>
      </Card>
    );
  }

  const chrome = isRo
    ? {
        backToGames: "Înapoi la jocuri",
        deleteTip: "Șterge jocul",
        deleteConfirm: "Ștergi acest joc? Nu poate fi anulat.",
        starter: "Început",
        previousRuns: "Sesiuni anterioare",
        completionLabel: (n: number) => `${n} sesiune${n === 1 ? "" : n < 20 ? "i" : "i"}`,
        viewNote: "Vezi notița →",
        minSuffix: "min",
        coachModeLabel: "Fă-l împreună cu copilul",
        coachModeDisabledTip: "Acest joc nu are ghid pentru părinte",
        partnerLabel: "Cu",
        closeCoach: "Ieși",
      }
    : {
        backToGames: "Games",
        deleteTip: "Delete game",
        deleteConfirm: "Delete this game? This can't be undone.",
        starter: "Starter",
        previousRuns: "Previous runs",
        completionLabel: (n: number) => `${n} completion${n === 1 ? "" : "s"}`,
        viewNote: "View note →",
        minSuffix: "min",
        coachModeLabel: "Do it with your child",
        coachModeDisabledTip: "This game has no parent guide",
        partnerLabel: "With",
        closeCoach: "Close",
      };

  async function handleFinish(responses: unknown, durationSeconds: number) {
    if (!game) return;
    setRunnerCompleted(true);
    const responsesStr = typeof responses === "string" ? responses : JSON.stringify(responses);
    try {
      await logCompletion({
        variables: {
          input: { gameId: game.id, durationSeconds, responses: responsesStr },
        },
      });
    } catch {
      /* surfaced via Apollo error */
    }
  }

  function handleStepChange(idx: number, d: boolean) {
    setRunnerStepIndex(idx);
    if (d !== runnerCompleted) setRunnerCompleted(d);
  }

  async function handleDelete() {
    if (!game) return;
    if (!confirm(chrome.deleteConfirm)) return;
    try {
      await deleteGame({ variables: { id: game.id } });
      router.push("/games");
    } catch {
      /* noop */
    }
  }

  const isSeed = game.source === GameSource.Seed;
  const lang = game.language ?? "en";

  const runner = (large: boolean) => {
    if (game.type === GameType.CbtReframe) {
      return (
        <CBTReframeRunner
          content={game.content}
          onFinish={handleFinish}
          submitting={logging}
          onStepChange={handleStepChange}
          language={lang}
          large={large}
        />
      );
    }
    if (game.type === GameType.Mindfulness) {
      return (
        <MindfulnessRunner
          content={game.content}
          onFinish={handleFinish}
          submitting={logging}
          onStepChange={handleStepChange}
          language={lang}
          large={large}
        />
      );
    }
    return (
      <JournalPromptRunner
        content={game.content}
        onFinish={handleFinish}
        submitting={logging}
        onStepChange={handleStepChange}
        language={lang}
        large={large}
      />
    );
  };

  // ── Immersive coach-mode overlay ─────────────────────────────────
  if (coachMode && hasParentGuide) {
    return (
      <Box
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "var(--color-background)",
          overflow: "hidden",
        }}
      >
        <Flex direction="column" style={{ height: "100dvh" }}>
          {/* Slim header bar */}
          <Flex
            justify="between"
            align="center"
            px={{ initial: "3", md: "5" }}
            py="2"
            style={{ borderBottom: "1px solid var(--gray-a4)", flex: "0 0 auto" }}
          >
            <Flex align="center" gap="3">
              <Heading size={{ initial: "3", md: "4" }} style={{ letterSpacing: "-0.01em" }}>
                {game.title}
              </Heading>
              {partnerFamilyMemberId != null && (
                <Badge color="amber" variant="soft" size="2">
                  {chrome.partnerLabel}:{" "}
                  {children.find((c) => c.id === partnerFamilyMemberId)?.firstName ??
                    children.find((c) => c.id === partnerFamilyMemberId)?.name}
                </Badge>
              )}
            </Flex>
            <Flex align="center" gap="3">
              {children.length > 1 && (
                <Select.Root
                  value={String(partnerFamilyMemberId ?? "")}
                  onValueChange={(v) => setPartnerFamilyMemberId(Number(v))}
                >
                  <Select.Trigger />
                  <Select.Content>
                    {children.map((c) => (
                      <Select.Item key={c.id} value={String(c.id)}>
                        {c.firstName ?? c.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
              <Button
                variant="soft"
                color="gray"
                size="2"
                onClick={() => {
                  setCoachMode(false);
                  setRunnerStepIndex(0);
                  setRunnerCompleted(false);
                }}
              >
                <Cross2Icon /> {chrome.closeCoach}
              </Button>
            </Flex>
          </Flex>

          {/* Split grid — stacks on portrait phones/tablets (initial), splits from sm breakpoint */}
          <Grid
            columns={{ initial: "1", sm: "1fr 1.15fr" }}
            gap="0"
            style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
          >
            <Box
              p={{ initial: "3", md: "4" }}
              style={{
                borderRight: "1px solid var(--gray-a4)",
                overflow: "auto",
                minHeight: 0,
              }}
            >
              {parentGuide && (
                <ParentCoachPane
                  parentGuide={parentGuide}
                  stepIndex={Math.min(runnerStepIndex, totalSteps - 1)}
                  totalSteps={totalSteps}
                  completed={runnerCompleted}
                  language={lang}
                />
              )}
            </Box>
            <Box
              p={{ initial: "3", md: "4" }}
              style={{
                overflow: "auto",
                minHeight: 0,
                background: "var(--gray-a2)",
              }}
            >
              {runner(true)}
            </Box>
          </Grid>
        </Flex>
      </Box>
    );
  }

  // ── Normal solo layout ───────────────────────────────────────────
  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between" gap="2">
        <Button asChild variant="ghost" size="2" color="gray">
          <NextLink href="/games">
            <ArrowLeftIcon /> {chrome.backToGames}
          </NextLink>
        </Button>
        {!isSeed && (
          <Tooltip content={chrome.deleteTip}>
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
            {typeLabel[game.type]}
          </Badge>
          {isSeed && (
            <Badge color="gray" variant="outline" size="1">
              {chrome.starter}
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
              ~{game.estimatedMinutes} {chrome.minSuffix}
            </Text>
          )}
          <Text size="1" color="gray">
            {chrome.completionLabel(game.completions.length)}
          </Text>
        </Flex>
      </Flex>

      {/* Coach-mode toggle */}
      {hasParentGuide && children.length > 0 && (
        <Card>
          <Flex align="center" justify="between" gap="3" p="3" wrap="wrap">
            <Flex align="center" gap="3">
              <Switch
                checked={coachMode}
                onCheckedChange={(v) => {
                  setCoachMode(v);
                  if (v) {
                    setRunnerStepIndex(0);
                    setRunnerCompleted(false);
                  }
                }}
                size="2"
              />
              <Text size="3" weight="medium">
                {chrome.coachModeLabel}
              </Text>
            </Flex>
            {coachMode && children.length > 1 && (
              <Select.Root
                value={String(partnerFamilyMemberId ?? "")}
                onValueChange={(v) => setPartnerFamilyMemberId(Number(v))}
              >
                <Select.Trigger placeholder={chrome.partnerLabel} />
                <Select.Content>
                  {children.map((c) => (
                    <Select.Item key={c.id} value={String(c.id)}>
                      {c.firstName ?? c.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
          </Flex>
        </Card>
      )}

      {!hasParentGuide && (
        <Callout.Root color="gray" size="1">
          <Callout.Text>{chrome.coachModeDisabledTip}</Callout.Text>
        </Callout.Root>
      )}

      {runner(false)}

      {game.completions.length > 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4">
            <Heading size="4">{chrome.previousRuns}</Heading>
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
                      {chrome.viewNote}
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
