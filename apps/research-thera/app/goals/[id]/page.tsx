"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Link,
  Separator,
  AlertDialog,
  Button,
  Select,
  IconButton,
} from "@radix-ui/themes";
import { GlassButton } from "@/app/components/GlassButton";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import {
  ArrowLeftIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
  CheckIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import { useApolloClient } from "@apollo/client";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetGoalQuery,
  useDeleteGoalMutation,
  useGenerateResearchMutation,
  useGenerateLongFormTextMutation,
  useDeleteResearchMutation,
  useUpdateGoalMutation,
  useGetFamilyMembersQuery,
  useGetGenerationJobQuery,
  useGetUserSettingsQuery,
} from "@/app/__generated__/hooks";
import { UserSettingsLanguageSelector } from "@/app/components/UserSettingsLanguageSelector";
import { useUser } from "@clerk/nextjs";
import AddSubGoalButton from "@/app/components/AddSubGoalButton";
import "./accordion.css";

const STEP_LABELS: Record<number, string> = {
  5: "Loading goal context…",
  10: "Preparing search prompts…",
  20: "Planning search queries…",
  40: "Searching Crossref, PubMed, Semantic Scholar…",
  60: "Enriching paper abstracts…",
  65: "Preparing extraction…",
  85: "Extracting relevant findings…",
  95: "Saving papers to database…",
};

const STORY_STEP_LABELS: Record<number, string> = {
  10: "Loading goal context…",
  30: "Fetching research…",
  60: "Generating story…",
  90: "Saving story…",
};

function GoalPageContent() {
  const router = useRouter();
  const params = useParams();
  const paramValue = params.id as string;
  const { user } = useUser();
  const apolloClient = useApolloClient();

  // Determine if paramValue is a number (ID) or string (slug)
  const isNumericId = /^\d+$/.test(paramValue);
  const goalId = isNumericId ? parseInt(paramValue) : undefined;
  const goalSlug = !isNumericId ? paramValue : undefined;

  const { data, loading, error } = useGetGoalQuery({
    variables: {
      id: goalId,
      slug: goalSlug,
    },
    skip: !goalId && !goalSlug,
  });

  const goal = data?.goal;

  // Family member editing state
  const [editingFamilyMember, setEditingFamilyMember] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>("");

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const [updateGoal, { loading: updatingFamilyMember }] = useUpdateGoalMutation({
    onCompleted: () => {
      setEditingFamilyMember(false);
      setSelectedFamilyMemberId("");
    },
    refetchQueries: ["GetGoal"],
  });

  const handleFamilyMemberSave = async () => {
    if (!goal || !selectedFamilyMemberId) return;
    await updateGoal({
      variables: {
        id: goal.id,
        input: { familyMemberId: parseInt(selectedFamilyMemberId, 10) },
      },
    });
  };

  const handleFamilyMemberEditStart = () => {
    setSelectedFamilyMemberId(goal?.familyMemberId ? String(goal.familyMemberId) : "");
    setEditingFamilyMember(true);
  };

  const [deleteGoal, { loading: deleting }] = useDeleteGoalMutation({
    onCompleted: () => {
      if (goal?.parentGoal) {
        router.push(
          goal.parentGoal.slug
            ? `/goals/${goal.parentGoal.slug}`
            : `/goals/${goal.parentGoal.id}`,
        );
      } else {
        router.push("/goals");
      }
    },
    refetchQueries: ["GetGoals", "GetGoal"],
  });

  const [researchMessage, setResearchMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [researchJobId, setResearchJobId] = useState<string | null>(null);

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: researchJobId! },
    skip: !researchJobId,
    pollInterval: 2000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    onCompleted: (d) => {
      const status = d.generationJob?.status;
      if (status === "SUCCEEDED" || status === "FAILED") {
        stopPolling();
        setResearchJobId(null);
        if (status === "SUCCEEDED") {
          apolloClient.refetchQueries({ include: ["GetGoal"] });
        } else {
          setResearchMessage({
            text: d.generationJob?.error?.message ?? "Research generation failed.",
            type: "error",
          });
        }
      }
    },
  });
  const jobProgress = jobData?.generationJob?.progress ?? 0;
  const jobStatus = jobData?.generationJob?.status;
  const isJobRunning = !!researchJobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED";

  const [deleteResearch, { loading: deletingResearch }] =
    useDeleteResearchMutation({
      onCompleted: (data) => {
        if (data.deleteResearch.success) {
          setResearchMessage({
            text: data.deleteResearch.message || "Research deleted.",
            type: "success",
          });
        } else {
          setResearchMessage({
            text: data.deleteResearch.message || "Failed to delete research.",
            type: "error",
          });
        }
      },
      onError: (err) => {
        setResearchMessage({
          text: err.message || "An error occurred while deleting research.",
          type: "error",
        });
      },
      refetchQueries: ["GetGoal"],
    });

  const [generateResearch, { loading: generatingResearch }] =
    useGenerateResearchMutation({
      onCompleted: (data) => {
        if (data.generateResearch.success) {
          setResearchMessage(null);
          if (data.generateResearch.jobId) {
            setResearchJobId(data.generateResearch.jobId);
          }
        } else {
          setResearchMessage({
            text:
              data.generateResearch.message || "Failed to generate research.",
            type: "error",
          });
        }
      },
      onError: (err) => {
        setResearchMessage({
          text: err.message || "An error occurred while generating research.",
          type: "error",
        });
      },
      // No refetchQueries here — the job runs asynchronously. The correct refetch
      // happens inside onCompleted of the polling query when status === "SUCCEEDED".
    });

  const handleGenerateResearch = async () => {
    if (!goal) return;
    setResearchMessage(null);
    await generateResearch({ variables: { goalId: goal.id } });
  };

  // --- Story generation ---
  const [storyMessage, setStoryMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [storyJobId, setStoryJobId] = useState<string | null>(null);

  const { data: userSettingsData } = useGetUserSettingsQuery();
  const storyLanguage =
    userSettingsData?.userSettings?.storyLanguage ?? "English";
  const storyMinutes = userSettingsData?.userSettings?.storyMinutes ?? 10;

  const { data: storyJobData, stopPolling: stopStoryPolling } =
    useGetGenerationJobQuery({
      variables: { id: storyJobId! },
      skip: !storyJobId,
      pollInterval: 2000,
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
            setStoryMessage({
              text: d.generationJob?.error?.message ?? "Story generation failed.",
              type: "error",
            });
          }
        }
      },
    });
  const storyJobProgress = storyJobData?.generationJob?.progress ?? 0;
  const storyJobStatus = storyJobData?.generationJob?.status;
  const isStoryJobRunning =
    !!storyJobId && storyJobStatus !== "SUCCEEDED" && storyJobStatus !== "FAILED";

  const [generateStory, { loading: generatingStory }] =
    useGenerateLongFormTextMutation({
      onCompleted: (data) => {
        if (data.generateLongFormText.success) {
          setStoryMessage(null);
          if (data.generateLongFormText.jobId) {
            setStoryJobId(data.generateLongFormText.jobId);
          }
        } else {
          setStoryMessage({
            text:
              data.generateLongFormText.message || "Failed to generate story.",
            type: "error",
          });
        }
      },
      onError: (err) => {
        setStoryMessage({
          text: err.message || "An error occurred while generating the story.",
          type: "error",
        });
      },
    });

  const handleGenerateStory = async () => {
    if (!goal) return;
    setStoryMessage(null);
    await generateStory({
      variables: { goalId: goal.id, language: storyLanguage, minutes: storyMinutes },
    });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !goal) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Goal not found"}
        </Text>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "green";
      case "completed":
        return "blue";
      case "paused":
        return "orange";
      case "archived":
        return "gray";
      default:
        return "gray";
    }
  };

  const handleAddStory = () => {
    if (!goal) return;
    router.push(`/stories/new?goalId=${goal.id}`);
  };

  const handleDelete = async () => {
    await deleteGoal({ variables: { id: goal.id } });
  };

  const parentHref = goal.parentGoal
    ? goal.parentGoal.slug
      ? `/goals/${goal.parentGoal.slug}`
      : `/goals/${goal.parentGoal.id}`
    : "/goals";

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={
          goal.parentGoal
            ? [
                { label: "Goals", href: "/goals" },
                { label: goal.parentGoal.title, href: parentHref },
                { label: goal.title },
              ]
            : [{ label: "Goals", href: "/goals" }, { label: goal.title }]
        }
      />

      {/* Parent Goal Link */}
      {goal.parentGoal && (
        <Card
          style={{
            backgroundColor: "var(--amber-3)",
            border: "1px solid var(--amber-6)",
          }}
          asChild
        >
          <NextLink href={parentHref} style={{ textDecoration: "none" }}>
            <Flex align="center" gap="3" p="1">
              <ArrowLeftIcon width="16" height="16" />
              <Flex direction="column" gap="0">
                <Text size="1" color="gray" weight="medium">
                  Parent Goal
                </Text>
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    {goal.parentGoal.title}
                  </Text>
                  <Badge
                    color={getStatusColor(goal.parentGoal.status)}
                    size="1"
                  >
                    {goal.parentGoal.status}
                  </Badge>
                </Flex>
              </Flex>
            </Flex>
          </NextLink>
        </Card>
      )}

      {/* Main Goal Card */}
      <Card
        style={{
          backgroundColor: goal.parentGoalId
            ? "var(--violet-3)"
            : "var(--indigo-3)",
        }}
      >
        <Flex direction="column" gap="4" p="1">
          <Flex justify="between" align="start" gap="3">
            <Flex direction="column" gap="1">
              {goal.parentGoalId && (
                <Badge
                  color="violet"
                  variant="soft"
                  size="1"
                  style={{ width: "fit-content" }}
                >
                  Sub-Goal
                </Badge>
              )}
              <Heading size="7">{goal.title}</Heading>
              {editingFamilyMember ? (
                <Flex align="center" gap="2">
                  <Select.Root
                    value={selectedFamilyMemberId}
                    onValueChange={setSelectedFamilyMemberId}
                    disabled={updatingFamilyMember}
                  >
                    <Select.Trigger placeholder="Select family member…" />
                    <Select.Content>
                      {familyMembers.map((fm) => (
                        <Select.Item key={fm.id} value={String(fm.id)}>
                          {fm.firstName ?? fm.name}
                          {fm.relationship ? ` (${fm.relationship})` : ""}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <IconButton
                    size="1"
                    variant="soft"
                    color="green"
                    disabled={!selectedFamilyMemberId || updatingFamilyMember}
                    onClick={handleFamilyMemberSave}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    size="1"
                    variant="soft"
                    color="gray"
                    disabled={updatingFamilyMember}
                    onClick={() => setEditingFamilyMember(false)}
                  >
                    <Cross2Icon />
                  </IconButton>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  {goal.familyMember ? (
                    <Badge color="cyan" size="2" style={{ width: "fit-content" }}>
                      {goal.familyMember.firstName ?? goal.familyMember.name}
                      {goal.familyMember.relationship
                        ? ` · ${goal.familyMember.relationship}`
                        : ""}
                    </Badge>
                  ) : null}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={handleFamilyMemberEditStart}
                    title="Change family member"
                  >
                    <Pencil2Icon />
                  </IconButton>
                </Flex>
              )}
            </Flex>
            <Flex align="center" gap="2">
              <Badge color={getStatusColor(goal.status)} size="2">
                {goal.status}
              </Badge>
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
                  <AlertDialog.Title>
                    Delete {goal.parentGoalId ? "Sub-Goal" : "Goal"}
                  </AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete &ldquo;{goal.title}&rdquo;?
                    This will permanently remove the{" "}
                    {goal.parentGoalId ? "sub-goal" : "goal"} and all its
                    associated data (stories, research, notes, etc.).
                    {goal.subGoals && goal.subGoals.length > 0 && (
                      <Text as="p" size="2" color="red" weight="bold" mt="2">
                        Warning: This goal has {goal.subGoals.length} sub-goal
                        {goal.subGoals.length !== 1 ? "s" : ""} that will also
                        be orphaned.
                      </Text>
                    )}
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

          {goal.description && (
            <Text size="3" style={{ whiteSpace: "pre-wrap" }}>
              {goal.description}
            </Text>
          )}

          <Flex gap="4" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Created
              </Text>
              <Text size="2">
                {new Date(goal.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
            {goal.updatedAt !== goal.createdAt && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Last Updated
                </Text>
                <Text size="2">
                  {new Date(goal.updatedAt).toLocaleDateString()}
                </Text>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Sub-Goals */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Sub-Goals {goal.subGoals ? `(${goal.subGoals.length})` : ""}
            </Heading>
            <AddSubGoalButton goalId={goal.id} />
          </Flex>

          {goal.subGoals && goal.subGoals.length > 0 ? (
            <Flex direction="column" gap="2">
              {goal.subGoals.map((subGoal) => (
                <Card
                  key={subGoal.id}
                  style={{ backgroundColor: "var(--gray-2)" }}
                  asChild
                >
                  <NextLink
                    href={
                      subGoal.slug
                        ? `/goals/${subGoal.slug}`
                        : `/goals/${subGoal.id}`
                    }
                    style={{ textDecoration: "none" }}
                  >
                  <Flex direction="column" gap="2" p="3">
                    <Flex justify="between" align="center">
                      <Text size="3" weight="medium">
                        {subGoal.title}
                      </Text>
                      <Badge color={getStatusColor(subGoal.status)} size="1">
                        {subGoal.status}
                      </Badge>
                    </Flex>
                    {subGoal.description && (
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
                        {subGoal.description}
                      </Text>
                    )}
                    <Text size="1" color="gray">
                      Created {new Date(subGoal.createdAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                  </NextLink>
                </Card>
              ))}
            </Flex>
          ) : (
            <Text size="2" color="gray">
              No sub-goals yet. Break this goal into smaller steps.
            </Text>
          )}
        </Flex>
      </Card>

      {/* Therapeutic Content */}
      {goal.therapeuticText && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Flex align="center" gap="2">
              <Heading size="4">Therapeutic Guidance</Heading>
              {goal.therapeuticTextLanguage && (
                <Badge variant="soft" size="1">
                  {goal.therapeuticTextLanguage}
                </Badge>
              )}
            </Flex>
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {goal.therapeuticText}
            </Text>
            {goal.therapeuticTextGeneratedAt && (
              <Text size="1" color="gray">
                Generated{" "}
                {new Date(goal.therapeuticTextGeneratedAt).toLocaleDateString()}
              </Text>
            )}
          </Flex>
        </Card>
      )}

      {/* Related Notes */}
      {goal.notes && goal.notes.length > 0 && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="4">Related Notes ({goal.notes.length})</Heading>
            <Flex direction="column" gap="2">
              {goal.notes.map((note) => (
                <Card
                  key={note.id}
                  style={{
                    cursor: "pointer",
                    backgroundColor: "var(--gray-2)",
                  }}
                  onClick={() => {
                    if (note.slug) {
                      router.push(`/notes/${note.slug}`);
                    }
                  }}
                >
                  <Flex direction="column" gap="2" p="3">
                    <Flex align="center" gap="2">
                      {note.noteType && (
                        <Badge color="blue" size="1">
                          {note.noteType}
                        </Badge>
                      )}
                      <Text size="1" color="gray">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </Flex>
                    <Text
                      size="2"
                      style={{
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {note.content}
                    </Text>
                    {note.tags && note.tags.length > 0 && (
                      <Flex gap="1" wrap="wrap">
                        {note.tags.map((tag, idx) => (
                          <Badge key={idx} variant="soft" size="1">
                            {tag}
                          </Badge>
                        ))}
                      </Flex>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {/* User Stories */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Stories {goal.userStories ? `(${goal.userStories.length})` : ""}
            </Heading>
            <Button asChild>
              <NextLink href={goal ? `/stories/new?goalId=${goal.id}` : "/stories/new"}>
                Add Story
              </NextLink>
            </Button>
          </Flex>

          {goal.userStories && goal.userStories.length > 0 ? (
            <Flex direction="column" gap="2">
              {goal.userStories.map((story) => (
                <Card
                  key={story.id}
                  style={{ backgroundColor: "var(--gray-2)" }}
                  asChild
                >
                  <NextLink
                    href={`/stories/${story.id}`}
                    style={{ textDecoration: "none" }}
                  >
                  <Flex direction="column" gap="2" p="3">
                    <Flex align="center" gap="2">
                      <Text size="1" color="gray">
                        {new Date(story.createdAt).toLocaleDateString()}
                      </Text>
                      <Text size="1" color="gray">
                        by {story.createdBy}
                      </Text>
                    </Flex>
                    <Text
                      size="2"
                      style={{
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {story.content}
                    </Text>
                  </Flex>
                  </NextLink>
                </Card>
              ))}
            </Flex>
          ) : (
            <Text size="2" color="gray">
              No stories yet. Add your first story to capture your experience.
            </Text>
          )}
        </Flex>
      </Card>

      {/* Generated Stories */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">
              Generated Stories{" "}
              {goal.stories ? `(${goal.stories.length})` : ""}
            </Heading>
            <Flex align="center" gap="3">
              <UserSettingsLanguageSelector />
              <GlassButton
                variant="primary"
                size="medium"
                loading={generatingStory}
                disabled={isStoryJobRunning}
                onClick={handleGenerateStory}
              >
                Generate Story
              </GlassButton>
            </Flex>
          </Flex>

          {storyMessage && (
            <Text
              size="2"
              color={storyMessage.type === "success" ? "green" : "red"}
            >
              {storyMessage.text}
            </Text>
          )}

          {isStoryJobRunning && (
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  {STORY_STEP_LABELS[storyJobProgress] ?? "Generating story…"}
                </Text>
                {storyJobProgress > 0 && (
                  <Text size="2" color="gray">
                    {storyJobProgress}%
                  </Text>
                )}
              </Flex>
              <Box
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--gray-4)",
                  overflow: "hidden",
                }}
              >
                {storyJobProgress > 0 ? (
                  <Box
                    style={{
                      height: "100%",
                      width: `${storyJobProgress}%`,
                      background: "var(--violet-9)",
                      transition: "width 0.4s ease",
                      borderRadius: 3,
                    }}
                  />
                ) : (
                  <Box
                    style={{
                      height: "100%",
                      width: "40%",
                      background: "var(--violet-9)",
                      borderRadius: 3,
                      animation: "researchSweep 1.4s ease-in-out infinite",
                    }}
                  />
                )}
              </Box>
            </Flex>
          )}

          {goal.stories && goal.stories.length > 0 ? (
            <Flex direction="column" gap="3">
              {goal.stories.map((story) => (
                <Card
                  key={story.id}
                  style={{ backgroundColor: "var(--gray-2)" }}
                  asChild
                >
                  <NextLink
                    href={`/stories/goal-story/${story.id}`}
                    style={{ textDecoration: "none", cursor: "pointer" }}
                  >
                  <Flex direction="column" gap="2" p="3">
                    <Flex justify="between" align="center">
                      <Flex align="center" gap="2">
                        <Badge color="violet" size="1">
                          {story.language}
                        </Badge>
                        <Badge variant="soft" size="1">
                          {story.minutes} min
                        </Badge>
                      </Flex>
                      <Text size="1" color="gray">
                        {new Date(story.createdAt).toLocaleDateString()}
                      </Text>
                    </Flex>
                    <Text
                      size="2"
                      style={{
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {story.text}
                    </Text>
                  </Flex>
                  </NextLink>
                </Card>
              ))}
            </Flex>
          ) : (
            !isStoryJobRunning && (
              <Text size="2" color="gray">
                No generated stories yet. Click &ldquo;Generate Story&rdquo; to
                create a research-backed therapeutic story for this goal.
              </Text>
            )
          )}
        </Flex>
      </Card>

      {/* Linked Research */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">
                Research {goal.research ? `(${goal.research.length})` : ""}
              </Heading>
              {goal.familyMember && (
                <Text size="2" color="gray">
                  Personalized for{" "}
                  <Text as="span" weight="medium" color="cyan">
                    {goal.familyMember.firstName ?? goal.familyMember.name}
                  </Text>
                  {goal.familyMember.ageYears != null && (
                    <Text as="span" color="gray">
                      {" "}· age {goal.familyMember.ageYears}
                    </Text>
                  )}
                </Text>
              )}
            </Flex>
            <Flex gap="2" align="center">
              {goal.research && goal.research.length > 0 && (
                <AlertDialog.Root>
                  <AlertDialog.Trigger>
                    <GlassButton
                      variant="destructive"
                      size="medium"
                      loading={deletingResearch}
                    >
                      <TrashIcon />
                      Delete Research
                    </GlassButton>
                  </AlertDialog.Trigger>
                  <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title>Delete Research</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                      This will permanently delete all {goal.research.length}{" "}
                      research paper{goal.research.length !== 1 ? "s" : ""} for
                      this goal. This action cannot be undone.
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
                          onClick={() =>
                            deleteResearch({ variables: { goalId: goal.id } })
                          }
                        >
                          Delete
                        </Button>
                      </AlertDialog.Action>
                    </Flex>
                  </AlertDialog.Content>
                </AlertDialog.Root>
              )}
              <GlassButton
                variant="primary"
                size="medium"
                loading={generatingResearch}
                onClick={handleGenerateResearch}
              >
                <MagnifyingGlassIcon />
                Generate Research
              </GlassButton>
            </Flex>
          </Flex>

          {researchMessage && (
            <Text
              size="2"
              color={researchMessage.type === "success" ? "green" : "red"}
            >
              {researchMessage.text}
            </Text>
          )}

          {isJobRunning && (
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  {STEP_LABELS[jobProgress] ?? "Searching for papers…"}
                </Text>
                {jobProgress > 0 && (
                  <Text size="2" color="gray">
                    {jobProgress}%
                  </Text>
                )}
              </Flex>
              <Box
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--gray-4)",
                  overflow: "hidden",
                }}
              >
                {jobProgress > 0 ? (
                  <Box
                    style={{
                      height: "100%",
                      width: `${jobProgress}%`,
                      background: "var(--indigo-9)",
                      transition: "width 0.4s ease",
                      borderRadius: 3,
                    }}
                  />
                ) : (
                  <Box
                    style={{
                      height: "100%",
                      width: "40%",
                      background: "var(--indigo-9)",
                      borderRadius: 3,
                      animation: "researchSweep 1.4s ease-in-out infinite",
                    }}
                  />
                )}
              </Box>
            </Flex>
          )}

          {goal.research && goal.research.length > 0 ? (
            <Accordion.Root type="multiple" style={{ width: "100%" }}>
              {goal.research.map((paper, idx) => (
                <Accordion.Item
                  key={paper.id}
                  value={`research-${idx}`}
                  style={{
                    borderBottom: "1px solid var(--gray-6)",
                    paddingBottom: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <Accordion.Header style={{ all: "unset" }}>
                    <Accordion.Trigger
                      className="AccordionTrigger"
                      style={{
                        all: "unset",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "12px 0",
                        cursor: "pointer",
                        gap: "8px",
                      }}
                    >
                      <Flex direction="column" gap="1" style={{ flex: 1 }}>
                        <Text size="3" weight="medium">
                          {paper.title}
                        </Text>
                        <Flex gap="2" align="center">
                          {paper.year && (
                            <Badge size="1" variant="soft">
                              {paper.year}
                            </Badge>
                          )}
                          {paper.authors && paper.authors.length > 0 && (
                            <Text size="1" color="gray">
                              {paper.authors.slice(0, 3).join(", ")}
                              {paper.authors.length > 3 && " et al."}
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                      <ChevronDownIcon
                        className="AccordionChevron"
                        style={{
                          transition: "transform 300ms",
                        }}
                        aria-hidden
                      />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="AccordionContent">
                    <div className="AccordionContentText">
                      <Flex direction="column" gap="2">
                        {paper.journal && (
                          <Text
                            size="2"
                            color="gray"
                            style={{ fontStyle: "italic" }}
                          >
                            {paper.journal}
                          </Text>
                        )}
                        {paper.url && (
                          <Link href={paper.url} target="_blank" size="2">
                            View Paper →
                          </Link>
                        )}
                      </Flex>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          ) : (
            <Text size="2" color="gray">
              No research yet. Click &ldquo;Generate Research&rdquo; to find
              relevant therapeutic papers for this goal.
            </Text>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

const DynamicGoalPageContent = dynamic(() => Promise.resolve(GoalPageContent), {
  ssr: false,
});

export default function GoalPage() {
  const params = useParams();
  const goalId = parseInt(params.id as string);

  const { data } = useGetGoalQuery({
    variables: { id: goalId },
    skip: !goalId,
  });

  const goal = data?.goal;
  const backHref = goal?.parentGoal
    ? goal.parentGoal.slug
      ? `/goals/${goal.parentGoal.slug}`
      : `/goals/${goal.parentGoal.id}`
    : "/goals";
  const backLabel = goal?.parentGoal ? goal.parentGoal.title : "Goals";

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
          marginLeft: "calc(-1 * var(--space-5))",
          marginRight: "calc(-1 * var(--space-5))",
          paddingLeft: "var(--space-5)",
          paddingRight: "var(--space-5)",
        }}
      >
        <Flex
          py="4"
          align="center"
          gap="4"
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href={backHref}>
              <ArrowLeftIcon />
              {backLabel}
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              {goal?.title || "Loading goal\u2026"}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ width: "100%" }}>
        <DynamicGoalPageContent />
      </Box>
    </Flex>
  );
}
