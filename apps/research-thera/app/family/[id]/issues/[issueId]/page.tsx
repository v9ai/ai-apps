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
  Button,
  Separator,
  Dialog,
  AlertDialog,
  TextArea,
  TextField,
  Select,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import {
  useGetIssueQuery,
  useGetFamilyMembersQuery,
  useUpdateIssueMutation,
  useDeleteIssueMutation,
  useConvertIssueToGoalMutation,
  useGenerateLongFormTextMutation,
  useGenerateResearchMutation,
  useGetGenerationJobQuery,
  useGetResearchQuery,
} from "@/app/__generated__/hooks";

const CATEGORY_OPTIONS = [
  "academic",
  "behavioral",
  "social",
  "emotional",
  "developmental",
  "health",
  "communication",
  "other",
];

const SEVERITY_OPTIONS = ["low", "medium", "high"];

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case "high":
      return "red" as const;
    case "medium":
      return "orange" as const;
    case "low":
      return "green" as const;
    default:
      return "gray" as const;
  }
}

function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case "academic":
      return "blue" as const;
    case "behavioral":
      return "orange" as const;
    case "social":
      return "purple" as const;
    case "emotional":
      return "pink" as const;
    case "developmental":
      return "cyan" as const;
    case "health":
      return "red" as const;
    case "communication":
      return "yellow" as const;
    default:
      return "gray" as const;
  }
}

function IssueDetailContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const issueId = parseInt(params.issueId as string, 10);

  const { data, loading, error } = useGetIssueQuery({
    variables: { id: issueId },
    skip: isNaN(issueId),
  });

  const [updateIssue, { loading: updating }] = useUpdateIssueMutation({
    refetchQueries: ["GetIssue"],
  });

  const [deleteIssue, { loading: deleting }] = useDeleteIssueMutation({
    refetchQueries: ["GetIssues"],
  });

  const [convertIssueToGoal, { loading: converting }] =
    useConvertIssueToGoalMutation();

  const { data: familyMembersData } = useGetFamilyMembersQuery();
  const familyMembers = familyMembersData?.familyMembers ?? [];

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSeverity, setEditSeverity] = useState("");
  const [editRecommendations, setEditRecommendations] = useState("");
  const [editFamilyMemberId, setEditFamilyMemberId] = useState<string>("");
  const [editRelatedFamilyMemberId, setEditRelatedFamilyMemberId] = useState<string>("none");
  const [editError, setEditError] = useState<string | null>(null);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTitle, setConvertTitle] = useState("");
  const [convertDescription, setConvertDescription] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);

  // Research generation state
  const [researchJobId, setResearchJobId] = useState<string | null>(null);
  const [researchMessage, setResearchMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const { data: researchData, refetch: refetchResearch } = useGetResearchQuery({
    variables: { issueId },
    skip: isNaN(issueId),
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
      onCompleted: (d) => {
        const status = d.generationJob?.status;
        if (status === "SUCCEEDED" || status === "FAILED") {
          stopResearchPolling();
          setResearchJobId(null);
          if (status === "SUCCEEDED") {
            setResearchMessage({ text: "Research generated successfully.", type: "success" });
            refetchResearch();
          } else {
            setResearchMessage({
              text: d.generationJob?.error?.message ?? "Research generation failed.",
              type: "error",
            });
          }
        }
      },
    });

  const researchJobProgress = researchJobData?.generationJob?.progress ?? 0;
  const researchJobStatus = researchJobData?.generationJob?.status;
  const isResearchJobRunning =
    !!researchJobId && researchJobStatus !== "SUCCEEDED" && researchJobStatus !== "FAILED";

  // Story generation state
  const [storyLanguage, setStoryLanguage] = useState("English");
  const [storyMinutes, setStoryMinutes] = useState("5");
  const [storyJobId, setStoryJobId] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<number | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  const [generateLongFormText, { loading: generatingStory }] =
    useGenerateLongFormTextMutation();

  const { data: jobData } = useGetGenerationJobQuery({
    variables: { id: storyJobId! },
    skip: !storyJobId,
    pollInterval: 3000,
  });

  useEffect(() => {
    if (!jobData?.generationJob) return;
    const job = jobData.generationJob;
    if (job.status === "SUCCEEDED") {
      setStoryJobId(null);
    } else if (job.status === "FAILED") {
      setStoryError(job.error?.message || "Story generation failed");
      setStoryJobId(null);
    }
  }, [jobData]);

  const issue = data?.issue;

  const handleGenerateResearch = async () => {
    if (!issue) return;
    setResearchMessage(null);
    await generateResearch({ variables: { issueId: issue.id } });
  };

  const handleEdit = () => {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditDescription(issue.description);
    setEditCategory(issue.category);
    setEditSeverity(issue.severity);
    setEditRecommendations(issue.recommendations?.join("\n") || "");
    setEditFamilyMemberId(String(issue.familyMemberId));
    setEditRelatedFamilyMemberId(issue.relatedFamilyMemberId ? String(issue.relatedFamilyMemberId) : "none");
    setEditError(null);
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;

    const recommendations = editRecommendations
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      await updateIssue({
        variables: {
          id: issue.id,
          input: {
            familyMemberId: editFamilyMemberId ? parseInt(editFamilyMemberId, 10) : undefined,
            relatedFamilyMemberId: editRelatedFamilyMemberId && editRelatedFamilyMemberId !== "none" ? parseInt(editRelatedFamilyMemberId, 10) : null,
            title: editTitle.trim() || undefined,
            description: editDescription.trim() || undefined,
            category: editCategory || undefined,
            severity: editSeverity || undefined,
            recommendations: recommendations.length > 0 ? recommendations : undefined,
          },
        },
      });
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Failed to update issue");
    }
  };

  const handleDelete = async () => {
    if (!issue) return;
    try {
      await deleteIssue({ variables: { id: issue.id } });
      router.push(`/family/${familySlug}/issues`);
    } catch (err: any) {
      console.error("Failed to delete issue:", err);
    }
  };

  const handleConvertToGoal = async () => {
    if (!issue) return;
    try {
      const result = await convertIssueToGoal({
        variables: {
          id: issue.id,
          input: {
            familyMemberId: issue.familyMemberId,
            title: convertTitle.trim() || issue.title,
            description: convertDescription.trim() || `Goal created from issue: ${issue.description}`,
          },
        },
      });

      if (result.data?.convertIssueToGoal) {
        const goalId = result.data.convertIssueToGoal.id;
        setConvertOpen(false);
        router.push(`/family/${familySlug}/goals/${goalId}`);
      }
    } catch (err: any) {
      setConvertError(err.message || "Failed to convert to goal");
    }
  };

  const openConvertDialog = () => {
    if (!issue) return;
    setConvertTitle(issue.title);
    setConvertDescription(`Goal created from issue: ${issue.description}`);
    setConvertError(null);
    setConvertOpen(true);
  };

  const handleGenerateStory = async () => {
    if (!issue) return;
    setStoryError(null);
    setStoryText(null);
    setStoryId(null);
    try {
      const result = await generateLongFormText({
        variables: {
          issueId: issue.id,
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

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !issue) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Issue not found"}
        </Text>
      </Card>
    );
  }

  const isGenerating = generatingStory || !!storyJobId;
  const jobStatus = jobData?.generationJob;

  return (
    <Flex direction="column" gap="5" p="5">
      {/* Header */}
      <Flex justify="between" align="center">
        <Flex gap="3" align="center">
          <Button variant="ghost" size="2" asChild>
            <NextLink href={`/family/${familySlug}/issues`}>
              <ArrowLeftIcon />
            </NextLink>
          </Button>
          <Heading size="5">Issue Details</Heading>
        </Flex>
        <Flex gap="2">
          <Button
            variant="soft"
            color="iris"
            size="2"
            onClick={openConvertDialog}
            disabled={converting}
          >
            <TargetIcon />
            {converting ? "Converting..." : "Convert to Goal"}
          </Button>
          <Button variant="soft" size="2" onClick={handleEdit}>
            <Pencil1Icon />
            Edit
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button variant="soft" color="red" size="2">
                <TrashIcon />
                Delete
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Issue</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete this issue? This action cannot
                be undone.
              </AlertDialog.Description>
              <Flex gap="3" justify="end" mt="4">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button
                    color="red"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Issue Details */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex gap="2" align="center" wrap="wrap">
            <Heading size="4">{issue.title}</Heading>
            <Badge
              color={getSeverityColor(issue.severity)}
              variant="soft"
              size="2"
            >
              {issue.severity} severity
            </Badge>
            <Badge
              color={getCategoryColor(issue.category)}
              variant="outline"
              size="2"
            >
              {issue.category}
            </Badge>
          </Flex>

          <Box>
            <Text as="div" size="2" weight="medium" mb="1">
              Description
            </Text>
            <Text size="2" color="gray" style={{ whiteSpace: "pre-wrap" }}>
              {issue.description}
            </Text>
          </Box>

          {issue.recommendations && issue.recommendations.length > 0 && (
            <Box>
              <Text as="div" size="2" weight="medium" mb="1">
                Recommendations
              </Text>
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {issue.recommendations.map((rec, idx) => (
                  <li key={idx}>
                    <Text size="2" color="gray">
                      {rec}
                    </Text>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          <Flex gap="6" wrap="wrap">
            <Box>
              <Text as="div" size="2" weight="medium" mb="1">
                Source Feedback
              </Text>
              {issue.feedback ? (
                <NextLink
                  href={`/family/${familySlug}/contacts/${issue.feedback.contactId}/feedback/${issue.feedback.id}`}
                >
                  <Text size="2" color="iris" style={{ textDecoration: "underline" }}>
                    {issue.feedback.subject || "View Feedback"}
                  </Text>
                </NextLink>
              ) : (
                <Text size="2" color="gray">
                  No feedback linked
                </Text>
              )}
            </Box>

            {issue.familyMember && (
              <Box>
                <Text as="div" size="2" weight="medium" mb="1">
                  Family Member
                </Text>
                <NextLink href={`/family/${issue.familyMember.slug ?? familySlug}`}>
                  <Text size="2" color="iris" style={{ textDecoration: "underline" }}>
                    {issue.familyMember.firstName}
                    {issue.familyMember.name ? ` ${issue.familyMember.name}` : ""}
                  </Text>
                </NextLink>
              </Box>
            )}

            {issue.relatedFamilyMember && (
              <Box>
                <Text as="div" size="2" weight="medium" mb="1">
                  Also Involves
                </Text>
                <NextLink href={`/family/${issue.relatedFamilyMember.slug ?? familySlug}`}>
                  <Text size="2" color="iris" style={{ textDecoration: "underline" }}>
                    {issue.relatedFamilyMember.firstName}
                    {issue.relatedFamilyMember.name ? ` ${issue.relatedFamilyMember.name}` : ""}
                  </Text>
                </NextLink>
              </Box>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Research Generation */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex justify="between" align="center">
            <Box>
              <Heading size="3" mb="1">Generate Research</Heading>
              <Text size="2" color="gray">
                Find evidence-based academic papers for this issue.
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
                    ? `Searching for papers… ${researchJobProgress}%`
                    : "Searching for papers…"}
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

      {/* Story Generation */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Box>
            <Heading size="3" mb="1">Generate Story</Heading>
            <Text size="2" color="gray">
              Create a therapeutic story based on this issue.
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

          {storyJobId && jobStatus && (
            <Flex align="center" gap="2">
              <Spinner size="1" />
              <Text size="2" color="gray">
                {jobStatus.status === "RUNNING"
                  ? `Generating${jobStatus.progress ? ` · ${jobStatus.progress}%` : "..."}`
                  : jobStatus.status}
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

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 540 }}>
          <Dialog.Title>Edit Issue</Dialog.Title>
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="4">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Title
                </Text>
                <TextField.Root
                  placeholder="Issue title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={updating}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Description
                </Text>
                <TextArea
                  placeholder="Issue description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  disabled={updating}
                />
              </label>

              <Flex gap="3">
                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Category
                  </Text>
                  <Select.Root
                    value={editCategory}
                    onValueChange={setEditCategory}
                    disabled={updating}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>

                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Severity
                  </Text>
                  <Select.Root
                    value={editSeverity}
                    onValueChange={setEditSeverity}
                    disabled={updating}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <Select.Item key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              </Flex>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Recommendations
                </Text>
                <TextArea
                  placeholder="One recommendation per line"
                  value={editRecommendations}
                  onChange={(e) => setEditRecommendations(e.target.value)}
                  rows={3}
                  disabled={updating}
                />
              </label>

              <Flex gap="3">
                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Family Member
                  </Text>
                  <Select.Root
                    value={editFamilyMemberId}
                    onValueChange={setEditFamilyMemberId}
                    disabled={updating}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      {familyMembers.map((m) => (
                        <Select.Item key={m.id} value={String(m.id)}>
                          {m.firstName}{m.name ? ` ${m.name}` : ""}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>

                <label style={{ flex: 1 }}>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Also Involves
                  </Text>
                  <Select.Root
                    value={editRelatedFamilyMemberId}
                    onValueChange={setEditRelatedFamilyMemberId}
                    disabled={updating}
                  >
                    <Select.Trigger style={{ width: "100%" }} placeholder="None" />
                    <Select.Content>
                      <Select.Item value="none">None</Select.Item>
                      {familyMembers
                        .filter((m) => String(m.id) !== editFamilyMemberId)
                        .map((m) => (
                          <Select.Item key={m.id} value={String(m.id)}>
                            {m.firstName}{m.name ? ` ${m.name}` : ""}
                          </Select.Item>
                        ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              </Flex>

              {editError && (
                <Text color="red" size="2">
                  {editError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Convert to Goal Dialog */}
      <Dialog.Root open={convertOpen} onOpenChange={setConvertOpen}>
        <Dialog.Content style={{ maxWidth: 540 }}>
          <Dialog.Title>Convert Issue to Goal</Dialog.Title>
          <form onSubmit={handleConvertToGoal}>
            <Flex direction="column" gap="4">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Goal Title
                </Text>
                <TextField.Root
                  placeholder="Goal title"
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  disabled={converting}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Goal Description
                </Text>
                <TextArea
                  placeholder="Goal description"
                  value={convertDescription}
                  onChange={(e) => setConvertDescription(e.target.value)}
                  rows={4}
                  disabled={converting}
                />
              </label>

              {convertError && (
                <Text color="red" size="2">
                  {convertError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={converting}>
                  {converting ? "Converting..." : "Convert to Goal"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

export default function IssueDetailPage() {
  return <IssueDetailContent />;
}
