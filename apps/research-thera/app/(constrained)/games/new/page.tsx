"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  Text,
  TextArea,
  TextField,
  Callout,
  Tabs,
} from "@radix-ui/themes";
import { ArrowLeftIcon, MagicWandIcon, PlusIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import {
  useGenerateGameMutation,
  useCreateGameMutation,
  useGetGoalsQuery,
  useGetFamilyMembersQuery,
  GameType,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

const TYPE_LABEL: Record<GameType, string> = {
  CBT_REFRAME: "CBT Reframe",
  MINDFULNESS: "Mindfulness",
  JOURNAL_PROMPT: "Journal",
};

const TYPE_HINT: Record<GameType, string> = {
  CBT_REFRAME: "Step through situation → thought → distortion → balanced reframe.",
  MINDFULNESS: "Timed steps for grounding or breathwork.",
  JOURNAL_PROMPT: "Guided reflection prompts that save to your notes.",
};

function NewGameForm() {
  const router = useRouter();
  const { data: goalsData } = useGetGoalsQuery();
  const { data: familyData } = useGetFamilyMembersQuery();
  const goals = goalsData?.goals ?? [];
  const familyMembers = familyData?.familyMembers ?? [];

  const [type, setType] = useState<GameType>(GameType.CbtReframe);
  const [goalId, setGoalId] = useState<string>("");
  const [familyMemberId, setFamilyMemberId] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [err, setErr] = useState<string | null>(null);

  // Manual-create fields
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualContent, setManualContent] = useState("");

  const [generateGame, { loading: generating }] = useGenerateGameMutation({
    refetchQueries: ["GetGames"],
  });
  const [createGame, { loading: creating }] = useCreateGameMutation({
    refetchQueries: ["GetGames"],
  });

  async function handleGenerate() {
    setErr(null);
    try {
      const res = await generateGame({
        variables: {
          input: {
            type,
            goalId: goalId ? parseInt(goalId, 10) : null,
            familyMemberId: familyMemberId ? parseInt(familyMemberId, 10) : null,
            language,
          },
        },
      });
      const id = res.data?.generateGame.id;
      if (id) router.push(`/games/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    }
  }

  async function handleCreate() {
    setErr(null);
    if (!manualTitle || !manualContent) {
      setErr("Title and content JSON are required.");
      return;
    }
    try {
      JSON.parse(manualContent);
    } catch {
      setErr("Content must be valid JSON matching the type's shape.");
      return;
    }
    try {
      const res = await createGame({
        variables: {
          input: {
            type,
            title: manualTitle,
            description: manualDescription || null,
            content: manualContent,
            goalId: goalId ? parseInt(goalId, 10) : null,
            familyMemberId: familyMemberId ? parseInt(familyMemberId, 10) : null,
            language,
          },
        },
      });
      const id = res.data?.createGame.id;
      if (id) router.push(`/games/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    }
  }

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Button asChild variant="ghost" size="2" color="gray">
          <NextLink href="/games">
            <ArrowLeftIcon /> Games
          </NextLink>
        </Button>
      </Flex>

      <Heading size={{ initial: "6", md: "7" }}>New game</Heading>

      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Type
            </Text>
            <Select.Root value={type} onValueChange={(v) => setType(v as GameType)}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="CBT_REFRAME">CBT Reframe</Select.Item>
                <Select.Item value="MINDFULNESS">Mindfulness</Select.Item>
                <Select.Item value="JOURNAL_PROMPT">Journal</Select.Item>
              </Select.Content>
            </Select.Root>
            <Text size="1" color="gray">
              {TYPE_HINT[type]}
            </Text>
          </Flex>

          <Flex gap="3" wrap="wrap">
            <Flex direction="column" gap="2" style={{ minWidth: 240, flex: 1 }}>
              <Text size="2" weight="medium">
                Linked goal (optional)
              </Text>
              <Select.Root value={goalId || "none"} onValueChange={(v) => setGoalId(v === "none" ? "" : v)}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {goals.map((g) => (
                    <Select.Item key={g.id} value={String(g.id)}>
                      {g.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2" style={{ minWidth: 240, flex: 1 }}>
              <Text size="2" weight="medium">
                Family member (optional)
              </Text>
              <Select.Root
                value={familyMemberId || "none"}
                onValueChange={(v) => setFamilyMemberId(v === "none" ? "" : v)}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="none">None</Select.Item>
                  {familyMembers.map((fm) => (
                    <Select.Item key={fm.id} value={String(fm.id)}>
                      {fm.firstName ?? fm.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2" style={{ minWidth: 180 }}>
              <Text size="2" weight="medium">
                Language
              </Text>
              <Select.Root value={language} onValueChange={setLanguage}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="en">English</Select.Item>
                  <Select.Item value="ro">Romanian</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Flex>

          <Tabs.Root defaultValue="ai">
            <Tabs.List>
              <Tabs.Trigger value="ai">Generate with AI</Tabs.Trigger>
              <Tabs.Trigger value="manual">Create manually</Tabs.Trigger>
            </Tabs.List>

            <Box mt="4">
              <Tabs.Content value="ai">
                <Flex direction="column" gap="3">
                  <Callout.Root color="indigo" size="1">
                    <Callout.Icon>
                      <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      DeepSeek generates a {TYPE_LABEL[type]} grounded in any goal/member you select. Takes ~30–60s.
                    </Callout.Text>
                  </Callout.Root>
                  <Flex justify="end">
                    <Button onClick={handleGenerate} loading={generating} disabled={generating}>
                      <MagicWandIcon /> Generate
                    </Button>
                  </Flex>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="manual">
                <Flex direction="column" gap="3">
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="medium">
                      Title
                    </Text>
                    <TextField.Root
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Short evocative title"
                    />
                  </Flex>
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="medium">
                      Description (optional)
                    </Text>
                    <TextField.Root
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      placeholder="One-sentence summary"
                    />
                  </Flex>
                  <Flex direction="column" gap="1">
                    <Text size="2" weight="medium">
                      Content (JSON)
                    </Text>
                    <TextArea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder={
                        type === GameType.CbtReframe
                          ? '{"steps":[{"kind":"situation","prompt":"…"}, …]}'
                          : type === GameType.Mindfulness
                          ? '{"steps":[{"durationSeconds":30,"instruction":"…","cue":"…"}, …]}'
                          : '{"prompts":["…","…"],"writeToNote":true}'
                      }
                      rows={8}
                      style={{ fontFamily: "var(--code-font-family, monospace)" }}
                    />
                  </Flex>
                  <Flex justify="end">
                    <Button onClick={handleCreate} loading={creating} disabled={creating}>
                      <PlusIcon /> Create
                    </Button>
                  </Flex>
                </Flex>
              </Tabs.Content>
            </Box>
          </Tabs.Root>

          {err && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{err}</Callout.Text>
            </Callout.Root>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

export default function NewGamePage() {
  return (
    <AuthGate pageName="New game" description="Sign in to create or generate games.">
      <NewGameForm />
    </AuthGate>
  );
}
