"use client";

import { Suspense, useEffect } from "react";
import { create } from "zustand";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Separator,
  TextArea,
  Card,
  Spinner,
  Select,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import {
  useGenerateLongFormTextMutation,
  useGetGoalQuery,
  useGetFamilyMembersQuery,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";

interface StoryFormState {
  familyMemberId: string | undefined;
  userContext: string;
  language: string;
  minutes: string;
  setFamilyMemberId: (v: string | undefined) => void;
  setUserContext: (v: string) => void;
  setLanguage: (v: string) => void;
  setMinutes: (v: string) => void;
}

const useStoryFormStore = create<StoryFormState>((set) => ({
  familyMemberId: undefined,
  userContext: "",
  language: "English",
  minutes: "10",
  setFamilyMemberId: (v) => set({ familyMemberId: v }),
  setUserContext: (v) => set({ userContext: v }),
  setLanguage: (v) => set({ language: v }),
  setMinutes: (v) => set({ minutes: v }),
}));

function NewStoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goalId");
  const familyMemberIdParam = searchParams.get("familyMemberId");
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { familyMemberId: selectedFamilyMemberId, userContext, language, minutes,
    setFamilyMemberId: setSelectedFamilyMemberId, setUserContext, setLanguage, setMinutes,
  } = useStoryFormStore();

  useEffect(() => {
    if (familyMemberIdParam) setSelectedFamilyMemberId(familyMemberIdParam);
  }, [familyMemberIdParam]);

  const { data: familyMembersData } = useGetFamilyMembersQuery({ skip: !user });

  const { data: goalData } = useGetGoalQuery({
    variables: { id: goalId ? parseInt(goalId) : undefined },
    skip: !goalId,
  });

  const [generateStory, { loading: generating, error: generateError }] = useGenerateLongFormTextMutation({
    onCompleted: (data) => {
      const jobId = data.generateLongFormText?.jobId;
      if (jobId) router.push(`/stories/generating?jobId=${jobId}`);
    },
  });

  const canGenerate = !!(selectedFamilyMemberId || goalId || userContext.trim());

  const handleGenerate = async () => {
    if (!canGenerate) return;
    await generateStory({
      variables: {
        goalId: goalId ? parseInt(goalId) : undefined,
        familyMemberId: selectedFamilyMemberId ? parseInt(selectedFamilyMemberId) : undefined,
        userContext: userContext.trim() || undefined,
        language,
        minutes: parseInt(minutes),
      },
    });
  };

  const goal = goalData?.goal;

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
            <NextLink
              href={
                goal?.slug
                  ? `/goals/${goal.slug}`
                  : goalId
                    ? `/goals/${goalId}`
                    : "/stories"
              }
            >
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>{goal ? "Back to Goal" : "Back to Stories"}</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}><Separator orientation="vertical" style={{ height: 20 }} /></Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold">
              Create Story
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ width: "100%" }}>
        <Card>
          <Flex direction="column" gap="4" p="4">
            {goal && (
              <Flex direction="column" gap="2">
                <Text size="1" color="gray" weight="medium">
                  Related Goal
                </Text>
                <Heading size="4">{goal.title}</Heading>
              </Flex>
            )}

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Family Member
              </Text>
              <Select.Root
                value={selectedFamilyMemberId}
                onValueChange={setSelectedFamilyMemberId}
              >
                <Select.Trigger placeholder="Select a family member (optional)" style={{ width: "100%" }} />
                <Select.Content>
                  {(familyMembersData?.familyMembers ?? []).map((member) => (
                    <Select.Item key={member.id} value={String(member.id)}>
                      {member.firstName || member.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Context
              </Text>
              <Text size="2" color="gray">
                Describe the situation, what you want the story to address, or any details that should shape the session.
              </Text>
              <TextArea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="e.g. He's been struggling with bedtime anxiety lately and refuses to sleep alone..."
                size="3"
                style={{ minHeight: "160px" }}
              />
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Language
              </Text>
              <Select.Root value={language} onValueChange={setLanguage}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="English">English</Select.Item>
                  <Select.Item value="Romanian">Romanian</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Duration
              </Text>
              <Select.Root value={minutes} onValueChange={setMinutes}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="5">5 minutes</Select.Item>
                  <Select.Item value="10">10 minutes</Select.Item>
                  <Select.Item value="15">15 minutes</Select.Item>
                  <Select.Item value="20">20 minutes</Select.Item>
                  <Select.Item value="30">30 minutes</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            {generateError && (
              <Text size="2" color="red">{generateError.message}</Text>
            )}

            <Flex gap="2" justify="end">
              <Button
                variant="soft"
                color="gray"
                onClick={() => router.push(goal?.slug ? `/goals/${goal.slug}` : goalId ? `/goals/${goalId}` : "/stories")}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                loading={generating}
              >
                Generate Story
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
}

export default function NewStoryPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
          <Spinner size="3" />
        </Flex>
      }
    >
      <NewStoryContent />
    </Suspense>
  );
}
