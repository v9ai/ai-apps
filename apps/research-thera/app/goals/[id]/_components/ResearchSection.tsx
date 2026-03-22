"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Link,
  AlertDialog,
} from "@radix-ui/themes";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDownIcon, MagnifyingGlassIcon, TrashIcon } from "@radix-ui/react-icons";
import { useApolloClient } from "@apollo/client";
import { GlassButton } from "@/app/components/GlassButton";
import {
  useGenerateResearchMutation,
  useDeleteResearchMutation,
  useGetGenerationJobQuery,
  type GetGoalQuery,
} from "@/app/__generated__/hooks";
import "../accordion.css";

type Goal = NonNullable<GetGoalQuery["goal"]>;

const STEP_LABELS: Record<number, string> = {
  5: "Loading goal context\u2026",
  10: "Preparing search prompts\u2026",
  20: "Planning search queries\u2026",
  40: "Searching Crossref, PubMed, Semantic Scholar\u2026",
  60: "Enriching paper abstracts\u2026",
  65: "Preparing extraction\u2026",
  85: "Extracting relevant findings\u2026",
  95: "Saving papers to database\u2026",
};

function evidenceLevelColor(level: string | null | undefined) {
  if (!level) return "gray" as const;
  const l = level.toLowerCase();
  if (l.includes("meta") || l.includes("systematic")) return "green" as const;
  if (l.includes("rct") || l.includes("randomized")) return "blue" as const;
  if (l.includes("cohort") || l.includes("observational")) return "orange" as const;
  return "gray" as const;
}

export default function ResearchSection({ goal }: { goal: Goal }) {
  const apolloClient = useApolloClient();

  const [researchMessage, setResearchMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [researchJobId, setResearchJobId] = useState<string | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<number>>(new Set());

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
        if (status === "SUCCEEDED") {
          const diag = d.generationJob?.result?.diagnostics;
          if (diag) {
            setDiagnostics(diag);
          }
          apolloClient.refetchQueries({ include: ["GetGoal"] });
        } else {
          setResearchMessage({ text: d.generationJob?.error?.message ?? "Research generation failed.", type: "error" });
        }
        setResearchJobId(null);
      }
    },
  });

  const jobProgress = jobData?.generationJob?.progress ?? 0;
  const jobStatus = jobData?.generationJob?.status;
  const isJobRunning = !!researchJobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED";

  const [diagnostics, setDiagnostics] = useState<{
    searchCount?: number | null;
    enrichedCount?: number | null;
    extractedCount?: number | null;
    qualifiedCount?: number | null;
    persistedCount?: number | null;
  } | null>(null);

  const [deleteResearch, { loading: deletingResearch }] = useDeleteResearchMutation({
    onCompleted: (data) => {
      setResearchMessage(data.deleteResearch.success
        ? { text: data.deleteResearch.message || "Research deleted.", type: "success" }
        : { text: data.deleteResearch.message || "Failed to delete research.", type: "error" });
      setDiagnostics(null);
    },
    onError: (err) => setResearchMessage({ text: err.message, type: "error" }),
    refetchQueries: ["GetGoal"],
  });

  const [generateResearch, { loading: generatingResearch }] = useGenerateResearchMutation({
    onCompleted: (data) => {
      if (data.generateResearch.success) {
        setResearchMessage(null);
        setDiagnostics(null);
        if (data.generateResearch.jobId) setResearchJobId(data.generateResearch.jobId);
      } else {
        setResearchMessage({ text: data.generateResearch.message || "Failed to generate research.", type: "error" });
      }
    },
    onError: (err) => setResearchMessage({ text: err.message, type: "error" }),
  });

  const toggleAbstract = (paperId: number) => {
    setExpandedAbstracts((prev) => {
      const next = new Set(prev);
      if (next.has(paperId)) { next.delete(paperId); } else { next.add(paperId); }
      return next;
    });
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
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
                  <Text as="span" color="gray"> &middot; age {goal.familyMember.ageYears}</Text>
                )}
              </Text>
            )}
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            {goal.research && goal.research.length > 0 && (
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <GlassButton variant="destructive" size="medium" loading={deletingResearch}>
                    <TrashIcon />
                    Delete Research
                  </GlassButton>
                </AlertDialog.Trigger>
                <AlertDialog.Content maxWidth="450px">
                  <AlertDialog.Title>Delete Research</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    This will permanently delete all {goal.research.length} research paper
                    {goal.research.length !== 1 ? "s" : ""} for this goal.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={() => deleteResearch({ variables: { goalId: goal.id } })}>
                        Delete
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            )}
            <GlassButton variant="primary" size="medium" loading={generatingResearch} onClick={() => generateResearch({ variables: { goalId: goal.id } })}>
              <MagnifyingGlassIcon />
              Generate Research
            </GlassButton>
          </Flex>
        </Flex>

        {researchMessage && (
          <Text size="2" color={researchMessage.type === "success" ? "green" : "red"}>
            {researchMessage.text}
          </Text>
        )}

        {/* Pipeline diagnostics */}
        {diagnostics && (
          <Flex gap="2" align="center" wrap="wrap" style={{ fontSize: 12, color: "var(--gray-9)" }}>
            {diagnostics.searchCount != null && <Badge variant="soft" size="1">{diagnostics.searchCount} searched</Badge>}
            {diagnostics.enrichedCount != null && <Text size="1">&rarr;</Text>}
            {diagnostics.enrichedCount != null && <Badge variant="soft" size="1">{diagnostics.enrichedCount} enriched</Badge>}
            {diagnostics.extractedCount != null && <Text size="1">&rarr;</Text>}
            {diagnostics.extractedCount != null && <Badge variant="soft" size="1">{diagnostics.extractedCount} extracted</Badge>}
            {diagnostics.persistedCount != null && <Text size="1">&rarr;</Text>}
            {diagnostics.persistedCount != null && <Badge variant="soft" color="green" size="1">{diagnostics.persistedCount} saved</Badge>}
          </Flex>
        )}

        {/* Progress bar */}
        {isJobRunning && (
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">{STEP_LABELS[jobProgress] ?? "Searching for papers\u2026"}</Text>
              {jobProgress > 0 && <Text size="2" color="gray">{jobProgress}%</Text>}
            </Flex>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              {jobProgress > 0 ? (
                <Box style={{ height: "100%", width: `${jobProgress}%`, background: "var(--indigo-9)", transition: "width 0.4s ease", borderRadius: 3 }} />
              ) : (
                <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
              )}
            </Box>
          </Flex>
        )}

        {/* Research papers */}
        {goal.research && goal.research.length > 0 ? (
          <Accordion.Root type="multiple" style={{ width: "100%" }}>
            {goal.research.map((paper, idx) => (
              <Accordion.Item
                key={paper.id}
                value={`research-${idx}`}
                style={{ borderBottom: "1px solid var(--gray-6)", paddingBottom: 12, marginBottom: 12 }}
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
                      gap: 8,
                    }}
                  >
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text size="3" weight="medium">{paper.title}</Text>
                      <Flex gap="2" align="center" wrap="wrap">
                        {paper.year && <Badge size="1" variant="soft">{paper.year}</Badge>}
                        {paper.evidenceLevel && (
                          <Badge size="1" variant="soft" color={evidenceLevelColor(paper.evidenceLevel)}>
                            {paper.evidenceLevel}
                          </Badge>
                        )}
                        {paper.relevanceScore != null && (
                          <Badge size="1" variant="outline" color="indigo">
                            {Math.round(paper.relevanceScore * 100)}% relevant
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
                    <ChevronDownIcon className="AccordionChevron" style={{ transition: "transform 300ms" }} aria-hidden />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="AccordionContent">
                  <div className="AccordionContentText">
                    <Flex direction="column" gap="3">
                      {paper.journal && (
                        <Text size="2" color="gray" style={{ fontStyle: "italic" }}>{paper.journal}</Text>
                      )}

                      {/* Abstract */}
                      {paper.abstract && (
                        <Flex direction="column" gap="1">
                          <Text size="1" weight="medium" color="gray">Abstract</Text>
                          <Text size="2" style={{ lineHeight: "1.6" }}>
                            {expandedAbstracts.has(paper.id)
                              ? paper.abstract
                              : paper.abstract.slice(0, 300) + (paper.abstract.length > 300 ? "..." : "")}
                          </Text>
                          {paper.abstract.length > 300 && (
                            <Text
                              size="1"
                              color="indigo"
                              style={{ cursor: "pointer" }}
                              onClick={() => toggleAbstract(paper.id)}
                            >
                              {expandedAbstracts.has(paper.id) ? "Show less" : "Show more"}
                            </Text>
                          )}
                        </Flex>
                      )}

                      {/* Key Findings */}
                      {paper.keyFindings && paper.keyFindings.length > 0 && (
                        <Flex direction="column" gap="1">
                          <Text size="1" weight="medium" color="gray">Key Findings</Text>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {paper.keyFindings.map((finding, i) => (
                              <li key={i}><Text size="2">{finding}</Text></li>
                            ))}
                          </ul>
                        </Flex>
                      )}

                      {/* Therapeutic Techniques */}
                      {paper.therapeuticTechniques && paper.therapeuticTechniques.length > 0 && (
                        <Flex direction="column" gap="1">
                          <Text size="1" weight="medium" color="gray">Therapeutic Techniques</Text>
                          <Flex gap="1" wrap="wrap">
                            {paper.therapeuticTechniques.map((tech, i) => (
                              <Badge key={i} variant="soft" color="violet" size="1">{tech}</Badge>
                            ))}
                          </Flex>
                        </Flex>
                      )}

                      {paper.url && (
                        <Link href={paper.url} target="_blank" size="2">View Paper &rarr;</Link>
                      )}
                    </Flex>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        ) : (
          <Text size="2" color="gray">
            No research yet. Click &ldquo;Generate Research&rdquo; to find relevant therapeutic papers.
          </Text>
        )}
      </Flex>
    </Card>
  );
}
