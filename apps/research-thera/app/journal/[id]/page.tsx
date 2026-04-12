"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Separator,
  AlertDialog,
  Button,
  Select,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  TrashIcon,
  LockClosedIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetJournalEntryQuery,
  useDeleteJournalEntryMutation,
  useGenerateResearchMutation,
  useGetResearchQuery,
  useGetGenerationJobQuery,
  useGenerateTherapeuticQuestionsMutation,
  useDeleteTherapeuticQuestionsMutation,
  useGetTherapeuticQuestionsQuery,
  useGenerateLongFormTextMutation,
  useGenerateJournalAnalysisMutation,
  useDeleteJournalAnalysisMutation,
  useGenerateDiscussionGuideMutation,
  useDeleteDiscussionGuideMutation,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

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

function JournalEntryContent() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { data, loading, error, refetch: refetchEntry } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const entry = data?.journalEntry;

  const [deleteJournalEntry, { loading: deleting }] =
    useDeleteJournalEntryMutation({
      onCompleted: () => {
        router.push("/journal");
      },
      refetchQueries: ["GetJournalEntries"],
    });

  const handleDelete = async () => {
    await deleteJournalEntry({ variables: { id } });
  };

  // Research generation state
  const [researchJobId, setResearchJobId] = useState<string | null>(null);
  const [researchMessage, setResearchMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const { data: researchData, refetch: refetchResearch } = useGetResearchQuery({
    variables: { journalEntryId: id },
    skip: !id,
  });
  const researchPapers = researchData?.research ?? [];

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
            text: data.generateResearch.message || "Failed to generate research.",
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
    });

  const { data: researchJobData, stopPolling: stopResearchPolling } =
    useGetGenerationJobQuery({
      variables: { id: researchJobId! },
      skip: !researchJobId,
      pollInterval: 2000,
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "network-only",
    });

  useEffect(() => {
    const status = researchJobData?.generationJob?.status;
    if (status === "SUCCEEDED" || status === "FAILED") {
      stopResearchPolling();
      setResearchJobId(null);
      if (status === "SUCCEEDED") {
        setResearchMessage({ text: "Research generated successfully.", type: "success" });
        refetchResearch();
      } else {
        setResearchMessage({
          text: researchJobData?.generationJob?.error?.message ?? "Research generation failed.",
          type: "error",
        });
      }
    }
  }, [researchJobData]);

  const researchJobProgress = researchJobData?.generationJob?.progress ?? 0;
  const researchJobStatus = researchJobData?.generationJob?.status;
  const isResearchJobRunning =
    !!researchJobId && researchJobStatus !== "SUCCEEDED" && researchJobStatus !== "FAILED";

  const handleGenerateResearch = async () => {
    if (!entry) return;
    setResearchMessage(null);
    await generateResearch({ variables: { journalEntryId: entry.id } });
  };

  // Questions state
  const { data: questionsData, refetch: refetchQuestions } = useGetTherapeuticQuestionsQuery({
    variables: { journalEntryId: id },
    skip: !id,
  });
  const questions = questionsData?.therapeuticQuestions ?? [];

  const [generateQuestions, { loading: generatingQuestions }] =
    useGenerateTherapeuticQuestionsMutation({
      onCompleted: () => refetchQuestions(),
    });

  const [deleteQuestions, { loading: deletingQuestions }] =
    useDeleteTherapeuticQuestionsMutation({
      onCompleted: () => refetchQuestions(),
    });

  const [questionsMessage, setQuestionsMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleGenerateQuestions = async () => {
    if (!entry) return;
    setQuestionsMessage(null);
    try {
      const result = await generateQuestions({ variables: { journalEntryId: entry.id } });
      const res = result.data?.generateTherapeuticQuestions;
      if (res?.success) {
        setQuestionsMessage({ text: res.message || "Questions generated.", type: "success" });
      } else {
        setQuestionsMessage({ text: res?.message || "Failed to generate questions.", type: "error" });
      }
    } catch (err: any) {
      setQuestionsMessage({ text: err.message || "Error generating questions.", type: "error" });
    }
  };

  const handleDeleteQuestions = async () => {
    if (!entry) return;
    try {
      await deleteQuestions({ variables: { journalEntryId: entry.id } });
      setQuestionsMessage(null);
    } catch (err: any) {
      setQuestionsMessage({ text: err.message || "Error deleting questions.", type: "error" });
    }
  };

  // Story generation state
  const [storyLanguage, setStoryLanguage] = useState("English");
  const [storyMinutes, setStoryMinutes] = useState("5");
  const [storyJobId, setStoryJobId] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<number | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  const [generateLongFormText, { loading: generatingStory }] =
    useGenerateLongFormTextMutation();

  const { data: storyJobData } = useGetGenerationJobQuery({
    variables: { id: storyJobId! },
    skip: !storyJobId,
    pollInterval: 3000,
  });

  useEffect(() => {
    if (!storyJobData?.generationJob) return;
    const job = storyJobData.generationJob;
    if (job.status === "SUCCEEDED") {
      setStoryJobId(null);
    } else if (job.status === "FAILED") {
      setStoryError(job.error?.message || "Story generation failed");
      setStoryJobId(null);
    }
  }, [storyJobData]);

  const isGenerating = generatingStory || !!storyJobId;
  const storyJobStatus = storyJobData?.generationJob;

  const handleGenerateStory = async () => {
    if (!entry) return;
    setStoryError(null);
    setStoryText(null);
    setStoryId(null);
    try {
      const result = await generateLongFormText({
        variables: {
          journalEntryId: entry.id,
          familyMemberId: entry.familyMemberId ?? undefined,
          language: storyLanguage,
          minutes: parseInt(storyMinutes, 10),
        },
      });
      const res = result.data?.generateLongFormText;
      if (res?.text) setStoryText(res.text);
      if (res?.storyId) setStoryId(res.storyId);
      if (res?.jobId) setStoryJobId(res.jobId);
    } catch (err: any) {
      setStoryError(err.message || "Failed to generate story");
    }
  };

  // Deep Analysis state
  const analysis = entry?.analysis ?? null;
  const [analysisMessage, setAnalysisMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"emotions" | "insights" | "recommendations" | "prompts">("emotions");

  const [generateAnalysis, { loading: generatingAnalysis }] = useGenerateJournalAnalysisMutation({
    onCompleted: (data) => {
      if (data.generateJournalAnalysis.success) {
        setAnalysisMessage({ text: data.generateJournalAnalysis.message || "Analysis generated.", type: "success" });
        refetchEntry();
      } else {
        setAnalysisMessage({ text: data.generateJournalAnalysis.message || "Failed.", type: "error" });
      }
    },
    onError: (err) => {
      setAnalysisMessage({ text: err.message, type: "error" });
    },
  });

  const [deleteAnalysis, { loading: deletingAnalysis }] = useDeleteJournalAnalysisMutation({
    onCompleted: () => {
      setAnalysisMessage(null);
      refetchEntry();
    },
  });

  const handleGenerateAnalysis = async () => {
    if (!entry) return;
    setAnalysisMessage(null);
    await generateAnalysis({ variables: { journalEntryId: entry.id } });
  };

  const handleDeleteAnalysis = async () => {
    if (!entry) return;
    await deleteAnalysis({ variables: { journalEntryId: entry.id } });
  };

  // Discussion Guide state
  const discussionGuide = entry?.discussionGuide ?? null;
  const [guideMessage, setGuideMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<
    "context" | "starters" | "talking" | "language" | "reactions" | "followup"
  >("context");

  const [generateGuide, { loading: generatingGuide }] = useGenerateDiscussionGuideMutation({
    onCompleted: (data) => {
      if (data.generateDiscussionGuide.success) {
        setGuideMessage({ text: data.generateDiscussionGuide.message || "Guide generated.", type: "success" });
        refetchEntry();
      } else {
        setGuideMessage({ text: data.generateDiscussionGuide.message || "Failed.", type: "error" });
      }
    },
    onError: (err) => {
      setGuideMessage({ text: err.message, type: "error" });
    },
  });

  const [deleteGuide, { loading: deletingGuide }] = useDeleteDiscussionGuideMutation({
    onCompleted: () => {
      setGuideMessage(null);
      refetchEntry();
    },
  });

  const handleGenerateGuide = async () => {
    if (!entry) return;
    setGuideMessage(null);
    await generateGuide({ variables: { journalEntryId: entry.id } });
  };

  const handleDeleteGuide = async () => {
    if (!entry) return;
    await deleteGuide({ variables: { journalEntryId: entry.id } });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !entry) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Journal entry not found"}
        </Text>
      </Card>
    );
  }

  const entryTitle =
    entry.title ||
    new Date(entry.entryDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={[
          { label: "Journal", href: "/journal" },
          { label: entryTitle },
        ]}
      />

      {/* Main Entry Card */}
      <Card style={{ backgroundColor: "var(--indigo-3)" }}>
        <Flex direction="column" gap="4" p="1">
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Flex direction="column" gap="1">
              <Heading size={{ initial: "5", md: "7" }}>{entryTitle}</Heading>
              <Flex align="center" gap="2" wrap="wrap">
                <Badge color="gray" variant="soft" size="2">
                  {new Date(entry.entryDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Badge>
                {entry.mood && (
                  <Badge
                    color={moodColor(entry.mood) as any}
                    variant="soft"
                    size="2"
                  >
                    {entry.mood}
                    {entry.moodScore !== null &&
                      entry.moodScore !== undefined &&
                      ` (${entry.moodScore}/10)`}
                  </Badge>
                )}
                {entry.isPrivate && (
                  <Badge color="gray" variant="soft" size="2">
                    <LockClosedIcon width="12" height="12" />
                    Private
                  </Badge>
                )}
              </Flex>
            </Flex>
            <Flex align="center" gap="4">
              <Button
                variant="ghost"
                size="3"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/journal/${entry.id}/edit`)}
              >
                <Pencil1Icon width="20" height="20" />
              </Button>
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
                  <AlertDialog.Title>Delete Journal Entry</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete this journal entry? This
                    action cannot be undone.
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

          {/* Content */}
          {entry.content && (
            <Text size="3" style={{ whiteSpace: "pre-wrap" }}>
              {entry.content}
            </Text>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <Flex gap="2" wrap="wrap">
              {entry.tags.map((tag, idx) => (
                <Badge
                  key={idx}
                  variant="soft"
                  size="1"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/tag/${encodeURIComponent(tag)}`)}
                >
                  {tag}
                </Badge>
              ))}
            </Flex>
          )}

          {/* Family Member */}
          {entry.familyMember && (
            <Flex align="center" gap="2">
              <Text size="1" color="gray" weight="medium">
                Family Member:
              </Text>
              <Badge color="cyan" size="2" style={{ width: "fit-content" }}>
                {entry.familyMember.firstName ?? entry.familyMember.name}
              </Badge>
            </Flex>
          )}

          {/* Linked Goal */}
          {entry.goal && (
            <Flex align="center" gap="2">
              <Text size="1" color="gray" weight="medium">
                Linked Goal:
              </Text>
              <Badge
                color="indigo"
                size="2"
                style={{ width: "fit-content", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/goals/${entry.goal!.id}`);
                }}
              >
                {entry.goal.title}
              </Badge>
            </Flex>
          )}

          {/* Linked Issue */}
          {entry.issue && (
            <Flex align="center" gap="2">
              <Text size="1" color="gray" weight="medium">
                Linked Issue:
              </Text>
              <Badge
                color="orange"
                size="2"
                style={{ width: "fit-content", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/family/${entry.issue!.familyMember?.id}/issues/${entry.issue!.id}`,
                  );
                }}
              >
                {entry.issue.title}
              </Badge>
              <Badge
                color={
                  entry.issue.severity === "high"
                    ? "red"
                    : entry.issue.severity === "medium"
                      ? "orange"
                      : "green"
                }
                variant="soft"
                size="1"
              >
                {entry.issue.severity}
              </Badge>
            </Flex>
          )}

          <Flex gap="4" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Created
              </Text>
              <Text size="2">
                {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
            {entry.updatedAt !== entry.createdAt && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">
                  Last Updated
                </Text>
                <Text size="2">
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </Text>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Deep Analysis */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Box>
              <Heading size="3" mb="1">Deep Analysis</Heading>
              <Text size="2" color="gray">
                Clinical therapeutic analysis of this journal entry.
              </Text>
            </Box>
            <Flex gap="2">
              {analysis && (
                <Button
                  variant="soft"
                  color="red"
                  size="2"
                  onClick={handleDeleteAnalysis}
                  disabled={deletingAnalysis || generatingAnalysis}
                >
                  {deletingAnalysis ? "Deleting..." : "Delete"}
                </Button>
              )}
              <Button
                onClick={handleGenerateAnalysis}
                disabled={generatingAnalysis}
              >
                {generatingAnalysis && <Spinner />}
                {generatingAnalysis ? "Analyzing..." : analysis ? "Regenerate" : "Run Deep Analysis"}
              </Button>
            </Flex>
          </Flex>

          {generatingAnalysis && (
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Analyzing journal entry...</Text>
              <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
                <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
              </Box>
            </Flex>
          )}

          {analysisMessage && (
            <Text size="2" color={analysisMessage.type === "success" ? "green" : "red"}>
              {analysisMessage.text}
            </Text>
          )}

          {analysis && (
            <>
              <Separator size="4" />

              {/* Summary */}
              <Box>
                <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
                  {analysis.summary}
                </Text>
                <Flex gap="2" mt="2" wrap="wrap">
                  <Badge variant="outline" color="gray" size="1">
                    {analysis.model}
                  </Badge>
                  <Badge variant="outline" color="gray" size="1">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </Badge>
                </Flex>
              </Box>

              {/* Tabs */}
              <Flex gap="2" wrap="wrap">
                {(["emotions", "insights", "recommendations", "prompts"] as const).map((tab) => (
                  <Button
                    key={tab}
                    variant={activeAnalysisTab === tab ? "solid" : "soft"}
                    size="1"
                    onClick={() => setActiveAnalysisTab(tab)}
                  >
                    {tab === "emotions" ? "Emotions"
                      : tab === "insights" ? `Insights (${analysis.therapeuticInsights.length})`
                      : tab === "recommendations" ? `Recommendations (${analysis.actionableRecommendations.length})`
                      : `Reflection (${analysis.reflectionPrompts.length})`}
                  </Button>
                ))}
              </Flex>

              {/* Emotional Landscape Tab */}
              {activeAnalysisTab === "emotions" && (
                <Flex direction="column" gap="3">
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">Primary Emotions</Text>
                    <Flex gap="2" wrap="wrap">
                      {analysis.emotionalLandscape.primaryEmotions.map((e, i) => (
                        <Badge key={i} variant="soft" color="indigo" size="2">{e}</Badge>
                      ))}
                    </Flex>
                  </Box>
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">Underlying Emotions</Text>
                    <Flex gap="2" wrap="wrap">
                      {analysis.emotionalLandscape.underlyingEmotions.map((e, i) => (
                        <Badge key={i} variant="soft" color="purple" size="2">{e}</Badge>
                      ))}
                    </Flex>
                  </Box>
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">Emotional Regulation</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                      {analysis.emotionalLandscape.emotionalRegulation}
                    </Text>
                  </Box>
                  {analysis.emotionalLandscape.attachmentPatterns && (
                    <Box>
                      <Text size="2" weight="bold" mb="1" as="div">Attachment Patterns</Text>
                      <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                        {analysis.emotionalLandscape.attachmentPatterns}
                      </Text>
                    </Box>
                  )}
                </Flex>
              )}

              {/* Therapeutic Insights Tab */}
              {activeAnalysisTab === "insights" && (
                <Flex direction="column" gap="3">
                  {analysis.therapeuticInsights.map((insight, i) => (
                    <Card key={i} variant="surface">
                      <Flex direction="column" gap="2" p="3">
                        <Text size="2" weight="bold">{insight.title}</Text>
                        <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                          {insight.observation}
                        </Text>
                        <Text size="1" color="indigo" style={{ lineHeight: "1.6" }}>
                          {insight.clinicalRelevance}
                        </Text>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}

              {/* Actionable Recommendations Tab */}
              {activeAnalysisTab === "recommendations" && (
                <Flex direction="column" gap="3">
                  {analysis.actionableRecommendations.map((rec, i) => (
                    <Card key={i} variant="surface">
                      <Flex direction="column" gap="2" p="3">
                        <Flex justify="between" align="center">
                          <Text size="2" weight="bold">{rec.title}</Text>
                          <Badge
                            variant="soft"
                            size="1"
                            color={rec.priority === "immediate" ? "red" : rec.priority === "short_term" ? "orange" : "green"}
                          >
                            {rec.priority.replace("_", " ")}
                          </Badge>
                        </Flex>
                        <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                          {rec.description}
                        </Text>
                        {rec.concreteSteps.length > 0 && (
                          <Box>
                            <Text size="1" weight="medium" mb="1" as="div">Steps</Text>
                            <ul style={{ margin: 0, paddingLeft: "16px" }}>
                              {rec.concreteSteps.map((step, j) => (
                                <li key={j}><Text size="1" color="gray">{step}</Text></li>
                              ))}
                            </ul>
                          </Box>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}

              {/* Reflection Prompts Tab */}
              {activeAnalysisTab === "prompts" && (
                <Flex direction="column" gap="3">
                  {analysis.reflectionPrompts.map((prompt, i) => (
                    <Card key={i} variant="surface">
                      <Box p="3">
                        <Text size="2" style={{ lineHeight: "1.6" }}>{prompt}</Text>
                      </Box>
                    </Card>
                  ))}
                </Flex>
              )}
            </>
          )}
        </Flex>
      </Card>

      {/* Discussion Guide */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Box>
              <Heading size="3" mb="1">Discussion Guide</Heading>
              <Text size="2" color="gray">
                Research-grounded guide for discussing this with your child.
              </Text>
            </Box>
            <Flex gap="2">
              {discussionGuide && (
                <Button
                  variant="soft"
                  color="red"
                  size="2"
                  onClick={handleDeleteGuide}
                  disabled={deletingGuide || generatingGuide}
                >
                  {deletingGuide ? "Deleting..." : "Delete"}
                </Button>
              )}
              <Button
                size="2"
                onClick={handleGenerateGuide}
                disabled={generatingGuide}
              >
                {generatingGuide && <Spinner />}
                {generatingGuide ? "Generating..." : discussionGuide ? "Regenerate" : "Generate Guide"}
              </Button>
            </Flex>
          </Flex>

          {generatingGuide && (
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">Preparing discussion guide...</Text>
              <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
                <Box style={{ height: "100%", width: "40%", background: "var(--teal-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
              </Box>
            </Flex>
          )}

          {guideMessage && (
            <Text size="2" color={guideMessage.type === "success" ? "green" : "red"}>
              {guideMessage.text}
            </Text>
          )}

          {discussionGuide && (
            <>
              <Separator size="4" />

              {/* Behavior Summary */}
              <Box>
                <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
                  {discussionGuide.behaviorSummary}
                </Text>
                {discussionGuide.childAge && (
                  <Flex gap="2" mt="2" wrap="wrap">
                    <Badge variant="outline" color="teal" size="1">
                      Age {discussionGuide.childAge}
                    </Badge>
                    <Badge variant="outline" color="gray" size="1">
                      {discussionGuide.model}
                    </Badge>
                    <Badge variant="outline" color="gray" size="1">
                      {new Date(discussionGuide.createdAt).toLocaleDateString()}
                    </Badge>
                  </Flex>
                )}
              </Box>

              {/* Tabs */}
              <Flex gap="2" wrap="wrap">
                {([
                  ["context", "Context"],
                  ["starters", `Starters (${discussionGuide.conversationStarters.length})`],
                  ["talking", `Talking Points (${discussionGuide.talkingPoints.length})`],
                  ["language", "Language"],
                  ["reactions", `Reactions (${discussionGuide.anticipatedReactions.length})`],
                  ["followup", `Follow-Up (${discussionGuide.followUpPlan.length})`],
                ] as const).map(([tab, label]) => (
                  <Button
                    key={tab}
                    variant={activeGuideTab === tab ? "solid" : "soft"}
                    color="teal"
                    size="1"
                    onClick={() => setActiveGuideTab(tab)}
                  >
                    {label}
                  </Button>
                ))}
              </Flex>

              {/* Context Tab */}
              {activeGuideTab === "context" && (
                <Flex direction="column" gap="3">
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">Developmental Stage</Text>
                    <Badge variant="soft" color="teal" size="2">{discussionGuide.developmentalContext.stage}</Badge>
                  </Box>
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">Why This Happens</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                      {discussionGuide.developmentalContext.explanation}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="2" weight="bold" mb="1" as="div">What's Age-Typical</Text>
                    <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                      {discussionGuide.developmentalContext.normalizedBehavior}
                    </Text>
                  </Box>
                  {discussionGuide.developmentalContext.researchBasis && (
                    <Box>
                      <Text size="2" weight="bold" mb="1" as="div">Research Basis</Text>
                      <Text size="1" color="teal" style={{ lineHeight: "1.6" }}>
                        {discussionGuide.developmentalContext.researchBasis}
                      </Text>
                    </Box>
                  )}
                </Flex>
              )}

              {/* Starters Tab */}
              {activeGuideTab === "starters" && (
                <Flex direction="column" gap="3">
                  {discussionGuide.conversationStarters.map((starter, i) => (
                    <Card key={i} variant="surface">
                      <Flex direction="column" gap="2" p="3">
                        <Text size="2" weight="bold" style={{ fontStyle: "italic" }}>
                          &ldquo;{starter.opener}&rdquo;
                        </Text>
                        <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                          {starter.context}
                        </Text>
                        {starter.ageAppropriateNote && (
                          <Text size="1" color="teal" style={{ lineHeight: "1.6" }}>
                            {starter.ageAppropriateNote}
                          </Text>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}

              {/* Talking Points Tab */}
              {activeGuideTab === "talking" && (
                <Flex direction="column" gap="3">
                  {discussionGuide.talkingPoints.map((tp, i) => (
                    <Card key={i} variant="surface">
                      <Flex direction="column" gap="2" p="3">
                        <Text size="2" weight="bold">{tp.point}</Text>
                        <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                          {tp.explanation}
                        </Text>
                        {tp.researchBacking && (
                          <Text size="1" color="teal" style={{ lineHeight: "1.6" }}>
                            {tp.researchBacking}
                          </Text>
                        )}
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}

              {/* Language Tab */}
              {activeGuideTab === "language" && (
                <Flex direction="column" gap="4">
                  <Box>
                    <Text size="2" weight="bold" mb="2" as="div" color="green">What To Say</Text>
                    <Flex direction="column" gap="2">
                      {discussionGuide.languageGuide.whatToSay.map((item, i) => (
                        <Card key={i} variant="surface">
                          <Flex direction="column" gap="1" p="3">
                            <Text size="2" weight="bold" color="green" style={{ fontStyle: "italic" }}>
                              &ldquo;{item.phrase}&rdquo;
                            </Text>
                            <Text size="1" color="gray">{item.reason}</Text>
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  </Box>
                  <Box>
                    <Text size="2" weight="bold" mb="2" as="div" color="red">What Not To Say</Text>
                    <Flex direction="column" gap="2">
                      {discussionGuide.languageGuide.whatNotToSay.map((item, i) => (
                        <Card key={i} variant="surface">
                          <Flex direction="column" gap="1" p="3">
                            <Text size="2" weight="bold" color="red" style={{ fontStyle: "italic", textDecoration: "line-through" }}>
                              &ldquo;{item.phrase}&rdquo;
                            </Text>
                            <Text size="1" color="gray">{item.reason}</Text>
                            {item.alternative && (
                              <Text size="1" color="green">
                                Instead: &ldquo;{item.alternative}&rdquo;
                              </Text>
                            )}
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  </Box>
                </Flex>
              )}

              {/* Reactions Tab */}
              {activeGuideTab === "reactions" && (
                <Flex direction="column" gap="3">
                  {discussionGuide.anticipatedReactions.map((reaction, i) => (
                    <Card key={i} variant="surface">
                      <Flex direction="column" gap="2" p="3">
                        <Flex justify="between" align="center">
                          <Text size="2" weight="bold">{reaction.reaction}</Text>
                          <Badge
                            variant="soft"
                            size="1"
                            color={reaction.likelihood === "high" ? "red" : reaction.likelihood === "medium" ? "orange" : "green"}
                          >
                            {reaction.likelihood}
                          </Badge>
                        </Flex>
                        <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                          {reaction.howToRespond}
                        </Text>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}

              {/* Follow-Up Tab */}
              {activeGuideTab === "followup" && (
                <Flex direction="column" gap="3">
                  {discussionGuide.followUpPlan.map((step, i) => (
                    <Card key={i} variant="surface">
                      <Flex direction="column" gap="2" p="3">
                        <Flex justify="between" align="center">
                          <Text size="2" weight="bold">{step.action}</Text>
                          <Badge variant="soft" color="teal" size="1">
                            {step.timing}
                          </Badge>
                        </Flex>
                        <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                          {step.description}
                        </Text>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}
            </>
          )}
        </Flex>
      </Card>

      {/* Research Generation */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Box>
              <Heading size="3" mb="1">Generate Research</Heading>
              <Text size="2" color="gray">
                Find evidence-based academic papers for this journal entry.
              </Text>
            </Box>
            <Button
              onClick={handleGenerateResearch}
              disabled={generatingResearch || isResearchJobRunning}
            >
              {(generatingResearch || isResearchJobRunning) && <Spinner />}
              {generatingResearch || isResearchJobRunning ? "Generating..." : "Generate Research"}
            </Button>
          </Flex>

          {isResearchJobRunning && (
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  {researchJobProgress > 0
                    ? `Searching for papers... ${researchJobProgress}%`
                    : "Searching for papers..."}
                </Text>
              </Flex>
              <Box
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "var(--gray-4)",
                  overflow: "hidden",
                }}
              >
                {researchJobProgress > 0 ? (
                  <Box
                    style={{
                      height: "100%",
                      width: `${researchJobProgress}%`,
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

          {researchMessage && (
            <Text size="2" color={researchMessage.type === "success" ? "green" : "red"}>
              {researchMessage.text}
            </Text>
          )}
        </Flex>
      </Card>

      {/* Research Results */}
      {researchPapers.length > 0 && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="3">Research ({researchPapers.length})</Heading>
            <Separator size="4" />
            {researchPapers.map((paper) => (
              <Card key={paper.id} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="start" gap="3">
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text size="2" weight="bold">
                        {paper.url ? (
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--indigo-11)", textDecoration: "underline" }}>
                            {paper.title}
                          </a>
                        ) : paper.title}
                      </Text>
                      <Text size="1" color="gray">
                        {[paper.authors?.join(", "), paper.year, paper.journal].filter(Boolean).join(" · ")}
                      </Text>
                    </Flex>
                    <Flex gap="2" align="center" style={{ flexShrink: 0 }}>
                      {paper.evidenceLevel && (
                        <Badge variant="soft" color="indigo" size="1">{paper.evidenceLevel}</Badge>
                      )}
                      {paper.relevanceScore != null && (
                        <Badge variant="soft" color="gray" size="1">{Math.round(paper.relevanceScore * 100)}% relevant</Badge>
                      )}
                    </Flex>
                  </Flex>
                  {paper.abstract && (
                    <Text size="1" color="gray" style={{ lineHeight: "1.6" }}>
                      {paper.abstract}
                    </Text>
                  )}
                  {paper.keyFindings && paper.keyFindings.length > 0 && (
                    <Box>
                      <Text size="1" weight="medium" mb="1">Key Findings</Text>
                      <ul style={{ margin: 0, paddingLeft: "16px" }}>
                        {paper.keyFindings.map((f, i) => (
                          <li key={i}><Text size="1" color="gray">{f}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  {paper.therapeuticTechniques && paper.therapeuticTechniques.length > 0 && (
                    <Flex gap="1" wrap="wrap">
                      {paper.therapeuticTechniques.map((t, i) => (
                        <Badge key={i} variant="outline" color="teal" size="1">{t}</Badge>
                      ))}
                    </Flex>
                  )}
                </Flex>
              </Card>
            ))}
          </Flex>
        </Card>
      )}

      {/* Generate Questions */}
      {researchPapers.length > 0 && (
        <Card>
          <Flex direction="column" gap="4" p="4">
            <Flex justify="between" align="start" wrap="wrap" gap="3">
              <Box>
                <Heading size="3" mb="1">Expand with Questions</Heading>
                <Text size="2" color="gray">
                  Generate follow-up questions based on research findings.
                </Text>
              </Box>
              <Flex gap="2">
                {questions.length > 0 && (
                  <Button
                    variant="soft"
                    color="red"
                    size="2"
                    onClick={handleDeleteQuestions}
                    disabled={deletingQuestions || generatingQuestions}
                  >
                    {deletingQuestions ? "Deleting..." : "Clear"}
                  </Button>
                )}
                <Button
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions && <Spinner />}
                  {generatingQuestions ? "Generating..." : questions.length > 0 ? "Regenerate" : "Generate Questions"}
                </Button>
              </Flex>
            </Flex>

            {questionsMessage && (
              <Text size="2" color={questionsMessage.type === "success" ? "green" : "red"}>
                {questionsMessage.text}
              </Text>
            )}

            {questions.length > 0 && (
              <>
                <Separator size="4" />
                {questions.map((q) => (
                  <Card key={q.id} variant="surface">
                    <Flex direction="column" gap="2" p="3">
                      <Text size="2" weight="bold">{q.question}</Text>
                      <Text size="1" color="gray" style={{ lineHeight: "1.6" }}>
                        {q.rationale}
                      </Text>
                      {q.researchTitle && (
                        <Flex gap="1" align="center">
                          <Badge variant="outline" color="indigo" size="1">
                            Based on: {q.researchTitle}
                          </Badge>
                        </Flex>
                      )}
                    </Flex>
                  </Card>
                ))}
              </>
            )}
          </Flex>
        </Card>
      )}

      {/* Story Generation */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Box>
            <Heading size="3" mb="1">Generate Story</Heading>
            <Text size="2" color="gray">
              Create a therapeutic story based on this journal entry.
            </Text>
          </Box>

          <Flex gap="3" align="end" wrap="wrap">
            <Box style={{ minWidth: 140 }}>
              <Text as="div" size="2" weight="medium" mb="1">Language</Text>
              <Select.Root
                value={storyLanguage}
                onValueChange={setStoryLanguage}
                disabled={isGenerating}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="English">English</Select.Item>
                  <Select.Item value="Romanian">Romanian</Select.Item>
                  <Select.Item value="Spanish">Spanish</Select.Item>
                  <Select.Item value="French">French</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>

            <Box style={{ minWidth: 140 }}>
              <Text as="div" size="2" weight="medium" mb="1">Duration</Text>
              <Select.Root
                value={storyMinutes}
                onValueChange={setStoryMinutes}
                disabled={isGenerating}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="3">3 minutes</Select.Item>
                  <Select.Item value="5">5 minutes</Select.Item>
                  <Select.Item value="10">10 minutes</Select.Item>
                  <Select.Item value="30">30 minutes</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>

            <Button onClick={handleGenerateStory} disabled={isGenerating}>
              {isGenerating && <Spinner />}
              {isGenerating ? "Generating..." : "Generate Story"}
            </Button>
          </Flex>

          {storyJobId && storyJobStatus && (
            <Flex align="center" gap="2">
              <Spinner size="1" />
              <Text size="2" color="gray">
                {storyJobStatus.status === "RUNNING"
                  ? `Generating${storyJobStatus.progress ? ` · ${storyJobStatus.progress}%` : "..."}`
                  : storyJobStatus.status}
              </Text>
            </Flex>
          )}

          {storyError && (
            <Text color="red" size="2">{storyError}</Text>
          )}

          {storyText && (
            <Box>
              <Flex justify="between" align="center" mb="2">
                <Text as="div" size="2" weight="medium">Generated Story</Text>
                {storyId && (
                  <Button variant="soft" size="1" asChild>
                    <NextLink href={`/stories/${storyId}`}>View Story Page</NextLink>
                  </Button>
                )}
              </Flex>
              <Card variant="surface">
                <Box p="3">
                  <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
                    {storyText}
                  </Text>
                </Box>
              </Card>
            </Box>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

const DynamicJournalEntryContent = dynamic(
  () => Promise.resolve(JournalEntryContent),
  { ssr: false },
);

export default function JournalEntryPage() {
  const params = useParams();
  const id = parseInt(params.id as string);

  const { data } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const entry = data?.journalEntry;
  const pageTitle =
    entry?.title ||
    (entry?.entryDate
      ? new Date(entry.entryDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Loading entry...");

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
            <NextLink href="/journal">
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>Journal</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}><Separator orientation="vertical" style={{ height: 20 }} /></Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              {pageTitle}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicJournalEntryContent />
      </Box>
    </Flex>
  );
}
