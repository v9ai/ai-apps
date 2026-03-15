"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  TextField,
  TextArea,
  Select,
  Dialog,
  AlertDialog,
  Separator,
  Link,
} from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowLeftIcon, ChevronDownIcon, MagicWandIcon, MagnifyingGlassIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { useApolloClient } from "@apollo/client";
import {
  useGetContactQuery,
  useGetContactFeedbackQuery,
  useUpdateContactFeedbackMutation,
  useDeleteContactFeedbackMutation,
  useExtractContactFeedbackIssuesMutation,
  useGenerateResearchMutation,
  useGetGenerationJobQuery,
  useGetResearchQuery,
  FeedbackSource,
} from "@/app/__generated__/hooks";

const RESEARCH_STEP_LABELS: Record<number, string> = {
  5: "Loading goal context\u2026",
  10: "Preparing search prompts\u2026",
  20: "Planning search queries\u2026",
  40: "Searching Crossref, PubMed, Semantic Scholar\u2026",
  60: "Enriching paper abstracts\u2026",
  65: "Preparing extraction\u2026",
  85: "Extracting relevant findings\u2026",
  95: "Saving papers to database\u2026",
  100: "Research complete!",
};

const SOURCE_LABELS: Record<FeedbackSource, string> = {
  [FeedbackSource.Email]: "Email",
  [FeedbackSource.Meeting]: "Meeting",
  [FeedbackSource.Report]: "Report",
  [FeedbackSource.Phone]: "Phone",
  [FeedbackSource.Note]: "Note",
  [FeedbackSource.Other]: "Other",
};

const SOURCE_COLORS: Record<FeedbackSource, string> = {
  [FeedbackSource.Email]: "blue",
  [FeedbackSource.Meeting]: "green",
  [FeedbackSource.Report]: "purple",
  [FeedbackSource.Phone]: "orange",
  [FeedbackSource.Note]: "cyan",
  [FeedbackSource.Other]: "gray",
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ContactFeedbackDetailContent() {
  const router = useRouter();
  const params = useParams();
  const familySlug = params.id as string;
  const contactRaw = params.contactId as string;
  const feedbackId = parseInt(params.feedbackId as string, 10);

  const { data, loading, error } = useGetContactFeedbackQuery({
    variables: { id: feedbackId },
    skip: isNaN(feedbackId),
  });

  const fb = data?.contactFeedback;

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editFeedbackDate, setEditFeedbackDate] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSource, setEditSource] = useState<FeedbackSource | "">("");
  const [editError, setEditError] = useState<string | null>(null);

  const [updateFeedback, { loading: updating }] =
    useUpdateContactFeedbackMutation({
      onCompleted: () => {
        setEditOpen(false);
        setEditError(null);
      },
      onError: (err) => setEditError(err.message),
      refetchQueries: ["GetContactFeedback"],
    });

  const [deleteFeedback, { loading: deleting }] =
    useDeleteContactFeedbackMutation({
      onCompleted: () => {
        router.push(
          `/family/${familySlug}/contacts/${contactRaw}/feedback`,
        );
      },
    });

  const [extractIssues, { loading: extracting }] =
    useExtractContactFeedbackIssuesMutation({
      refetchQueries: ["GetContactFeedback"],
    });

  const handleExtract = () => {
    if (!fb) return;
    extractIssues({ variables: { id: fb.id } });
  };

  // Research generation & display
  const apolloClient = useApolloClient();
  const { data: researchData } = useGetResearchQuery({
    variables: { feedbackId },
    skip: isNaN(feedbackId),
  });

  const [researchJobId, setResearchJobId] = useState<string | null>(null);
  const [researchMessage, setResearchMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

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
          const count = d.generationJob?.result?.count ?? 0;
          apolloClient.refetchQueries({ include: ["GetContactFeedback", "GetResearch"] });
          if (count > 0) {
            setResearchMessage({
              text: `Research generated successfully \u2014 ${count} paper${count === 1 ? "" : "s"} found.`,
              type: "success",
            });
          } else {
            const diag = d.generationJob?.result?.diagnostics;
            const funnel = diag
              ? `Pipeline: ${diag.searchCount ?? 0} found in search \u2192 ${diag.enrichedCount ?? 0} after enrichment \u2192 ${diag.extractedCount ?? 0} passed extraction \u2192 ${diag.qualifiedCount ?? 0} qualified.${diag.searchUsedFallback ? " (used fallback queries)" : ""}`
              : "";
            setResearchMessage({
              text: `No papers met the quality threshold.${funnel ? ` ${funnel}` : ""}`,
              type: "error",
            });
          }
        } else {
          const diag = d.generationJob?.result?.diagnostics;
          const funnel = diag
            ? ` Pipeline: ${diag.searchCount ?? 0} found in search \u2192 ${diag.enrichedCount ?? 0} after enrichment \u2192 ${diag.extractedCount ?? 0} passed extraction \u2192 ${diag.qualifiedCount ?? 0} qualified.`
            : "";
          setResearchMessage({
            text: (d.generationJob?.error?.message ?? "Research generation failed.") + funnel,
            type: "error",
          });
        }
      }
    },
  });
  const jobProgress = jobData?.generationJob?.progress ?? 0;
  const jobStatus = jobData?.generationJob?.status;
  const isJobRunning = !!researchJobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED";

  const [generateResearch, { loading: generatingResearch }] = useGenerateResearchMutation({
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
      setResearchMessage({ text: err.message || "An error occurred.", type: "error" });
    },
  });

  const handleGenerateResearch = async () => {
    setResearchMessage(null);
    await generateResearch({
      variables: { feedbackId },
    });
  };

  function openEditDialog() {
    if (!fb) return;
    setEditSubject(fb.subject ?? "");
    setEditFeedbackDate(fb.feedbackDate);
    setEditContent(fb.content);
    setEditTags(fb.tags?.join(", ") ?? "");
    setEditSource((fb.source as FeedbackSource) ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fb) return;
    if (!editContent.trim()) {
      setEditError("Content is required");
      return;
    }
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await updateFeedback({
      variables: {
        id: fb.id,
        input: {
          subject: editSubject.trim() || undefined,
          feedbackDate: editFeedbackDate || undefined,
          content: editContent.trim(),
          tags: tags.length > 0 ? tags : undefined,
          source: editSource || undefined,
        },
      },
    });
  };

  const handleDelete = () => {
    if (!fb) return;
    deleteFeedback({ variables: { id: fb.id } });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !fb) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Feedback not found"}
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="5">
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Feedback Details</Heading>
            <Flex gap="2">
              <Button
                variant="soft"
                color="violet"
                size="2"
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? <Spinner size="1" /> : <MagicWandIcon />}
                {extracting ? "Extracting..." : "Extract Issues"}
              </Button>
              <Button variant="soft" size="2" onClick={openEditDialog}>
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
                  <AlertDialog.Title>Delete Feedback</AlertDialog.Title>
                  <AlertDialog.Description>
                    Are you sure you want to delete this feedback? This action
                    cannot be undone.
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
          <Flex direction="column" gap="2">
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Date
              </Text>
              <Text size="2" color="gray">
                {formatDate(fb.feedbackDate)}
              </Text>
            </Flex>
            {fb.subject && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Subject
                </Text>
                <Badge color="indigo" variant="soft" size="1">
                  {fb.subject}
                </Badge>
              </Flex>
            )}
            {fb.source && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Source
                </Text>
                <Badge
                  color={SOURCE_COLORS[fb.source] as any}
                  variant="outline"
                  size="1"
                >
                  {SOURCE_LABELS[fb.source]}
                </Badge>
              </Flex>
            )}
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Content
              </Text>
              <Text size="2" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                {fb.content}
              </Text>
            </Flex>
            {fb.tags && fb.tags.length > 0 && (
              <Flex gap="2" align="start">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Tags
                </Text>
                <Flex gap="1" wrap="wrap">
                  {fb.tags.map((tag) => (
                    <Badge key={tag} color="gray" variant="soft" size="1">
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            )}
            {fb.extracted && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Status
                </Text>
                <Badge color="green" variant="soft" size="1">
                  Extracted
                </Badge>
              </Flex>
            )}
            {fb.contact && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Contact
                </Text>
                <Text size="2" color="gray">
                  {fb.contact.firstName}
                  {fb.contact.lastName ? ` ${fb.contact.lastName}` : ""}
                </Text>
              </Flex>
            )}
            {fb.familyMember && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Family Member
                </Text>
                <Text size="2" color="gray">
                  {fb.familyMember.firstName}
                  {fb.familyMember.name ? ` ${fb.familyMember.name}` : ""}
                </Text>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Extracted Issues */}
      {fb.extractedIssues && fb.extractedIssues.length > 0 && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="3">Extracted Issues ({fb.extractedIssues.length})</Heading>
            <Separator size="4" />
            <Flex direction="column" gap="3">
              {fb.extractedIssues.map((issue, idx) => (
                <Card key={idx} variant="surface">
                  <Flex direction="column" gap="2" p="3">
                    <Flex justify="between" align="center">
                      <Text size="2" weight="bold">{issue.title}</Text>
                      <Flex gap="1">
                        <Badge
                          color={
                            issue.severity === "high"
                              ? "red"
                              : issue.severity === "medium"
                                ? "orange"
                                : "green"
                          }
                          variant="soft"
                          size="1"
                        >
                          {issue.severity}
                        </Badge>
                        <Badge color="iris" variant="outline" size="1">
                          {issue.category}
                        </Badge>
                      </Flex>
                    </Flex>
                    <Text size="2" color="gray">{issue.description}</Text>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Generate Research */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="3">Generate Research</Heading>
              <Text size="1" color="gray">
                Find academic papers based on this feedback
              </Text>
            </Flex>
          </Flex>
          <Separator size="4" />
          {researchMessage && (
            <Text size="2" color={researchMessage.type === "success" ? "green" : "red"}>
              {researchMessage.text}
            </Text>
          )}
          {isJobRunning ? (
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  {RESEARCH_STEP_LABELS[jobProgress] ?? "Searching for papers\u2026"}
                </Text>
                {jobProgress > 0 && (
                  <Text size="2" color="gray">{jobProgress}%</Text>
                )}
              </Flex>
              <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
                {jobProgress > 0 ? (
                  <Box style={{ height: "100%", width: `${jobProgress}%`, background: "var(--indigo-9)", transition: "width 0.4s ease", borderRadius: 3 }} />
                ) : (
                  <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
                )}
              </Box>
            </Flex>
          ) : (
            <Button
              size="2"
              variant="soft"
              disabled={generatingResearch}
              loading={generatingResearch}
              onClick={() => handleGenerateResearch()}
            >
              <MagnifyingGlassIcon />
              Generate Research
            </Button>
          )}
        </Flex>
      </Card>

      {/* Research Papers */}
      {researchData?.research && researchData.research.length > 0 && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="3">
              Research Papers ({researchData.research.length})
            </Heading>
            <Separator size="4" />
            <Accordion.Root type="multiple" style={{ width: "100%" }}>
              {researchData.research.map((paper, idx) => (
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
                          {paper.evidenceLevel && (
                            <Badge size="1" variant="outline" color="green">
                              {paper.evidenceLevel}
                            </Badge>
                          )}
                          {paper.relevanceScore != null && (
                            <Badge size="1" variant="soft" color="blue">
                              {Math.round(paper.relevanceScore * 100)}% relevance
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                      <ChevronDownIcon
                        className="AccordionChevron"
                        style={{ transition: "transform 300ms" }}
                        aria-hidden
                      />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="AccordionContent">
                    <div className="AccordionContentText">
                      <Flex direction="column" gap="2">
                        {paper.journal && (
                          <Text size="2" color="gray" style={{ fontStyle: "italic" }}>
                            {paper.journal}
                          </Text>
                        )}
                        {paper.keyFindings && paper.keyFindings.length > 0 && (
                          <Flex direction="column" gap="1">
                            <Text size="2" weight="medium">Key Findings</Text>
                            {paper.keyFindings.map((finding, i) => (
                              <Text key={i} size="2" color="gray">
                                • {finding}
                              </Text>
                            ))}
                          </Flex>
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
          </Flex>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 540 }}>
          <Dialog.Title>Edit Feedback</Dialog.Title>
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="4">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Subject
                </Text>
                <TextField.Root
                  placeholder="e.g. Mathematics, General, Behavior"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  disabled={updating}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Date
                </Text>
                <TextField.Root
                  type="date"
                  value={editFeedbackDate}
                  onChange={(e) => setEditFeedbackDate(e.target.value)}
                  disabled={updating}
                />
              </label>

              <Flex direction="column" gap="1">
                <Text as="div" size="2" weight="medium">
                  Source
                </Text>
                <Select.Root
                  value={editSource || "none"}
                  onValueChange={(value) =>
                    setEditSource(
                      value === "none" ? "" : (value as FeedbackSource),
                    )
                  }
                  disabled={updating}
                >
                  <Select.Trigger
                    placeholder="How was this received?"
                    style={{ width: "100%" }}
                  />
                  <Select.Content>
                    <Select.Item value="none">Not specified</Select.Item>
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                      <Select.Item key={value} value={value}>
                        {label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Content *
                </Text>
                <TextArea
                  placeholder="Enter the feedback..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  required
                  disabled={updating}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Tags
                </Text>
                <TextField.Root
                  placeholder="Comma-separated, e.g. behavior, academic, social"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  disabled={updating}
                />
              </label>

              {editError && (
                <Text color="red" size="2">
                  {editError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray" disabled={updating}>
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
    </Flex>
  );
}

const DynamicContent = dynamic(
  () => Promise.resolve(ContactFeedbackDetailContent),
  { ssr: false },
);

export default function ContactFeedbackDetailPage() {
  const params = useParams();
  const familySlug = params.id as string;
  const contactRaw = params.contactId as string;

  const isContactNumeric = /^\d+$/.test(contactRaw);
  const contactId = isContactNumeric ? parseInt(contactRaw, 10) : NaN;
  const contactSlug = isContactNumeric ? undefined : contactRaw;

  const { data: contactData } = useGetContactQuery({
    variables: isContactNumeric ? { id: contactId } : { slug: contactSlug },
    skip: isContactNumeric ? isNaN(contactId) : !contactSlug,
  });

  const contact = contactData?.contact;
  const contactName = contact
    ? `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ""}`
    : "Contact";

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
            <NextLink
              href={`/family/${familySlug}/contacts/${contactRaw}/feedback`}
            >
              <ArrowLeftIcon />
              <Text as="span" size="2" weight="medium">
                Feedback
              </Text>
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              {contactName}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicContent />
      </Box>
    </Flex>
  );
}
