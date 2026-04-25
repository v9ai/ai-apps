"use client";

import { useState, useRef } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  IconButton,
  AlertDialog,
} from "@radix-ui/themes";
import { TrashIcon, PlayIcon, PauseIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useApolloClient } from "@apollo/client";
import { GlassButton } from "@/app/components/GlassButton";
import { UserSettingsLanguageSelector } from "@/app/components/UserSettingsLanguageSelector";
import {
  useGenerateLongFormTextMutation,
  useDeleteStoryMutation,
  useGetGenerationJobQuery,
  useGetUserSettingsQuery,
  type GetGoalQuery,
} from "@/app/__generated__/hooks";

type Goal = NonNullable<GetGoalQuery["goal"]>;

const STORY_STEP_LABELS: Record<number, string> = {
  10: "Loading goal context\u2026",
  30: "Fetching research\u2026",
  60: "Generating story\u2026",
  90: "Saving story\u2026",
};

export default function StoriesSection({ goal }: { goal: Goal }) {
  const apolloClient = useApolloClient();

  const [storyMessage, setStoryMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [storyJobId, setStoryJobId] = useState<string | null>(null);
  const [playingStoryId, setPlayingStoryId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: userSettingsData } = useGetUserSettingsQuery();
  const storyLanguage = userSettingsData?.userSettings?.storyLanguage ?? "English";
  const storyMinutes = userSettingsData?.userSettings?.storyMinutes ?? 10;

  const { data: storyJobData, stopPolling: stopStoryPolling } = useGetGenerationJobQuery({
    variables: { id: storyJobId! },
    skip: !storyJobId,
    pollInterval: 5000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      const status = d.generationJob?.status;
      if (status === "SUCCEEDED" || status === "FAILED") {
        stopStoryPolling();
        setStoryJobId(null);
        if (status === "SUCCEEDED") {
          apolloClient.refetchQueries({ include: ["GetGoal"] });
        } else {
          setStoryMessage({ text: d.generationJob?.error?.message ?? "Story generation failed.", type: "error" });
        }
      }
    },
  });

  const storyJobProgress = storyJobData?.generationJob?.progress ?? 0;
  const storyJobStatus = storyJobData?.generationJob?.status;
  const isStoryJobRunning = !!storyJobId && storyJobStatus !== "SUCCEEDED" && storyJobStatus !== "FAILED";

  const [deleteStory] = useDeleteStoryMutation({ refetchQueries: ["GetGoal"] });

  const [generateStory, { loading: generatingStory }] = useGenerateLongFormTextMutation({
    onCompleted: (data) => {
      if (data.generateLongFormText.success) {
        setStoryMessage(null);
        if (data.generateLongFormText.storyId) {
          apolloClient.refetchQueries({ include: ["GetGoal"] });
        } else if (data.generateLongFormText.jobId) {
          setStoryJobId(data.generateLongFormText.jobId);
        }
      } else {
        setStoryMessage({ text: data.generateLongFormText.message || "Failed to generate story.", type: "error" });
      }
    },
    onError: (err) => {
      setStoryMessage({ text: err.message || "An error occurred while generating the story.", type: "error" });
    },
  });

  const toggleAudio = (storyId: number, audioUrl: string) => {
    if (playingStoryId === storyId && audioRef.current) {
      audioRef.current.pause();
      setPlayingStoryId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audio.onended = () => setPlayingStoryId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingStoryId(storyId);
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Heading size="4">
            Stories {goal.stories ? `(${goal.stories.length})` : ""}
          </Heading>
          <Flex align="center" gap="3" wrap="wrap">
            <Button asChild variant="soft">
              <NextLink href={`/stories/new?goalId=${goal.id}`}>Add Story</NextLink>
            </Button>
            <UserSettingsLanguageSelector />
            <GlassButton
              variant="primary"
              size="medium"
              loading={generatingStory}
              disabled={isStoryJobRunning}
              onClick={() => generateStory({ variables: { goalId: goal.id, language: storyLanguage, minutes: storyMinutes } })}
            >
              Generate Story
            </GlassButton>
          </Flex>
        </Flex>

        {storyMessage && (
          <Text size="2" color={storyMessage.type === "success" ? "green" : "red"}>
            {storyMessage.text}
          </Text>
        )}

        {isStoryJobRunning && (
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">
                {STORY_STEP_LABELS[storyJobProgress] ?? "Generating story\u2026"}
              </Text>
              {storyJobProgress > 0 && <Text size="2" color="gray">{storyJobProgress}%</Text>}
            </Flex>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              {storyJobProgress > 0 ? (
                <Box style={{ height: "100%", width: `${storyJobProgress}%`, background: "var(--violet-9)", transition: "width 0.4s ease", borderRadius: 3 }} />
              ) : (
                <Box style={{ height: "100%", width: "40%", background: "var(--violet-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
              )}
            </Box>
          </Flex>
        )}

        {goal.stories && goal.stories.length > 0 ? (
          <Flex direction="column" gap="3">
            {goal.stories.map((story) => (
              <Card key={story.id} style={{ backgroundColor: "var(--gray-2)" }}>
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="center">
                    <Flex align="center" gap="2">
                      {story.language && <Badge color="violet" size="1">{story.language}</Badge>}
                      {story.minutes && <Badge variant="soft" size="1">{story.minutes} min</Badge>}
                      {story.createdBy && <Text size="1" color="gray">by {story.createdBy}</Text>}
                    </Flex>
                    <Flex align="center" gap="2">
                      {/* Inline audio */}
                      {story.audioUrl && (
                        <IconButton
                          size="1"
                          variant="soft"
                          color="violet"
                          onClick={() => toggleAudio(story.id, story.audioUrl!)}
                          title={playingStoryId === story.id ? "Pause" : "Play"}
                        >
                          {playingStoryId === story.id ? <PauseIcon /> : <PlayIcon />}
                        </IconButton>
                      )}
                      <Text size="1" color="gray">
                        {new Date(story.createdAt).toLocaleDateString()}
                      </Text>
                      <AlertDialog.Root>
                        <AlertDialog.Trigger>
                          <IconButton size="1" variant="ghost" color="red"><TrashIcon /></IconButton>
                        </AlertDialog.Trigger>
                        <AlertDialog.Content style={{ maxWidth: 400 }}>
                          <AlertDialog.Title>Delete Story</AlertDialog.Title>
                          <AlertDialog.Description size="2">
                            Are you sure you want to delete this story? This cannot be undone.
                          </AlertDialog.Description>
                          <Flex gap="3" mt="4" justify="end">
                            <AlertDialog.Cancel>
                              <Button variant="soft" color="gray">Cancel</Button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action>
                              <Button variant="solid" color="red" onClick={() => deleteStory({ variables: { id: story.id } })}>
                                Delete
                              </Button>
                            </AlertDialog.Action>
                          </Flex>
                        </AlertDialog.Content>
                      </AlertDialog.Root>
                    </Flex>
                  </Flex>
                  <NextLink href={`/stories/${story.id}`} style={{ textDecoration: "none" }}>
                    <Text
                      size="2"
                      style={{
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: "vertical",
                        cursor: "pointer",
                      }}
                    >
                      {story.content}
                    </Text>
                  </NextLink>
                </Flex>
              </Card>
            ))}
          </Flex>
        ) : (
          !isStoryJobRunning && (
            <Text size="2" color="gray">
              No generated stories yet. Click &ldquo;Generate Story&rdquo; to create a research-backed therapeutic story.
            </Text>
          )
        )}
      </Flex>
    </Card>
  );
}
