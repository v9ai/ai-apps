"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  IconButton,
  Tooltip,
  Separator,
} from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import {
  useGenerateDeepIssueAnalysisMutation,
  useGetDeepIssueAnalysesQuery,
  useDeleteDeepIssueAnalysisMutation,
  useGetGenerationJobQuery,
} from "@/app/__generated__/hooks";
import { getCategoryColor } from "@/app/lib/issue-colors";

type Props = {
  familyMemberId: number;
  triggerIssueId?: number | null;
  familyMemberFirstName?: string | null;
  description?: string;
};

export function DeepIssueAnalysisCard({
  familyMemberId,
  triggerIssueId = null,
  familyMemberFirstName = null,
  description,
}: Props) {
  const [deepAnalysisJobId, setDeepAnalysisJobId] = useState<string | null>(null);
  const [deepAnalysisMessage, setDeepAnalysisMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"advice" | "patterns" | "timeline" | "family" | "priorities" | "research">("advice");
  const [copiedAdviceIdx, setCopiedAdviceIdx] = useState<number | null>(null);

  const formatAdviceText = (item: { title: string; advice: string; concreteSteps: string[]; developmentalContext?: string | null; relatedResearchTitles?: string[] | null }) => {
    let text = `${item.title}\n\n${item.advice}`;
    if (item.developmentalContext) text += `\n\nDevelopmental context: ${item.developmentalContext}`;
    if (item.concreteSteps.length > 0) text += `\n\nConcrete steps:\n${item.concreteSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    if (item.relatedResearchTitles?.length) text += `\n\nResearch: ${item.relatedResearchTitles.join("; ")}`;
    return text;
  };

  const copyAdvice = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedAdviceIdx(idx);
    setTimeout(() => setCopiedAdviceIdx(null), 2000);
  };

  const { data: deepAnalysesData, refetch: refetchDeepAnalyses } = useGetDeepIssueAnalysesQuery({
    variables: { familyMemberId },
    skip: !familyMemberId,
  });

  const analyses = deepAnalysesData?.deepIssueAnalyses ?? [];
  const latestAnalysis =
    (triggerIssueId != null ? analyses.find((a) => a.triggerIssueId === triggerIssueId) : null) ??
    analyses[0] ??
    null;

  const [generateDeepAnalysis, { loading: generatingDeepAnalysis }] = useGenerateDeepIssueAnalysisMutation({
    onCompleted: (data) => {
      if (data.generateDeepIssueAnalysis.success && data.generateDeepIssueAnalysis.jobId) {
        setDeepAnalysisMessage(null);
        setDeepAnalysisJobId(data.generateDeepIssueAnalysis.jobId);
      } else {
        setDeepAnalysisMessage({ text: data.generateDeepIssueAnalysis.message || "Failed", type: "error" });
      }
    },
    onError: (err) => {
      setDeepAnalysisMessage({ text: err.message, type: "error" });
    },
  });

  const { data: deepAnalysisJobData, stopPolling: stopDeepAnalysisPolling } = useGetGenerationJobQuery({
    variables: { id: deepAnalysisJobId! },
    skip: !deepAnalysisJobId,
    pollInterval: 5000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const status = deepAnalysisJobData?.generationJob?.status;
    if (status === "SUCCEEDED" || status === "FAILED") {
      stopDeepAnalysisPolling();
      setDeepAnalysisJobId(null);
      if (status === "SUCCEEDED") {
        setDeepAnalysisMessage({ text: "Deep analysis complete.", type: "success" });
        refetchDeepAnalyses();
      } else {
        setDeepAnalysisMessage({ text: deepAnalysisJobData?.generationJob?.error?.message ?? "Analysis failed.", type: "error" });
      }
    }
  }, [deepAnalysisJobData]);

  const deepAnalysisProgress = deepAnalysisJobData?.generationJob?.progress ?? 0;
  const isDeepAnalysisRunning =
    !!deepAnalysisJobId &&
    deepAnalysisJobData?.generationJob?.status !== "SUCCEEDED" &&
    deepAnalysisJobData?.generationJob?.status !== "FAILED";

  const [deleteDeepAnalysis, { loading: deletingDeepAnalysis }] = useDeleteDeepIssueAnalysisMutation({
    onCompleted: () => {
      setDeepAnalysisMessage(null);
      refetchDeepAnalyses();
    },
  });

  const handleGenerateDeepAnalysis = async () => {
    setDeepAnalysisMessage(null);
    await generateDeepAnalysis({
      variables: {
        familyMemberId,
        triggerIssueId: triggerIssueId ?? undefined,
      },
    });
  };

  const handleDeleteDeepAnalysis = async () => {
    if (!latestAnalysis) return;
    await deleteDeepAnalysis({ variables: { id: latestAnalysis.id } });
  };

  const descriptionText =
    description ??
    `Analyze all issues for ${familyMemberFirstName ?? "this member"} to find patterns, systemic dynamics, and priorities.`;

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Box>
            <Heading size="3" mb="1">Deep Issue Analysis</Heading>
            <Text size="2" color="gray">
              {descriptionText}
            </Text>
          </Box>
          <Flex gap="2">
            {latestAnalysis && (
              <Button
                variant="soft"
                color="red"
                size="2"
                onClick={handleDeleteDeepAnalysis}
                disabled={deletingDeepAnalysis || isDeepAnalysisRunning}
              >
                {deletingDeepAnalysis ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button
              onClick={handleGenerateDeepAnalysis}
              disabled={generatingDeepAnalysis || isDeepAnalysisRunning}
            >
              {(generatingDeepAnalysis || isDeepAnalysisRunning) && <Spinner />}
              {generatingDeepAnalysis || isDeepAnalysisRunning ? "Analyzing..." : latestAnalysis ? "Regenerate" : "Run Deep Analysis"}
            </Button>
          </Flex>
        </Flex>

        {isDeepAnalysisRunning && (
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              {deepAnalysisProgress > 0 ? `Analyzing... ${deepAnalysisProgress}%` : "Collecting data and analyzing..."}
            </Text>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              {deepAnalysisProgress > 0 ? (
                <Box style={{ height: "100%", width: `${deepAnalysisProgress}%`, background: "var(--indigo-9)", transition: "width 0.4s ease", borderRadius: 3 }} />
              ) : (
                <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
              )}
            </Box>
          </Flex>
        )}

        {deepAnalysisMessage && (
          <Text size="2" color={deepAnalysisMessage.type === "success" ? "green" : "red"}>
            {deepAnalysisMessage.text}
          </Text>
        )}

        {latestAnalysis && (
          <>
            <Separator size="4" />

            {/* Summary */}
            <Box>
              <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
                {latestAnalysis.summary}
              </Text>
              <Flex gap="2" mt="2" wrap="wrap">
                <Badge variant="outline" color="gray" size="1">
                  {latestAnalysis.dataSnapshot.issueCount} issues
                </Badge>
                <Badge variant="outline" color="gray" size="1">
                  {latestAnalysis.dataSnapshot.observationCount} observations
                </Badge>
                <Badge variant="outline" color="gray" size="1">
                  {latestAnalysis.dataSnapshot.journalEntryCount} journal entries
                </Badge>
                {latestAnalysis.dataSnapshot.relatedMemberIssueCount > 0 && (
                  <Badge variant="outline" color="purple" size="1">
                    {latestAnalysis.dataSnapshot.relatedMemberIssueCount} cross-member issues
                  </Badge>
                )}
                <Badge variant="outline" color="gray" size="1">
                  {new Date(latestAnalysis.createdAt).toLocaleDateString()}
                </Badge>
              </Flex>
            </Box>

            {/* Tabs */}
            <Flex gap="2" wrap="wrap">
              {(["advice", "patterns", "timeline", "family", "priorities", "research"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeAnalysisTab === tab ? "solid" : "soft"}
                  size="1"
                  onClick={() => setActiveAnalysisTab(tab)}
                >
                  {tab === "advice" ? `Advice (${latestAnalysis.parentAdvice.length})`
                    : tab === "patterns" ? `Patterns (${latestAnalysis.patternClusters.length})`
                    : tab === "timeline" ? "Timeline"
                    : tab === "family" ? `Family (${latestAnalysis.familySystemInsights.length})`
                    : tab === "priorities" ? `Priorities (${latestAnalysis.priorityRecommendations.length})`
                    : `Research (${latestAnalysis.researchRelevance.length})`}
                </Button>
              ))}
            </Flex>

            {/* Tab Content: Patterns */}
            {activeAnalysisTab === "patterns" && latestAnalysis.patternClusters.map((cluster, idx) => (
              <Card key={idx} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Text size="2" weight="bold">{cluster.name}</Text>
                    <Flex gap="1">
                      <Badge variant="soft" color={cluster.pattern === "escalating" ? "red" : cluster.pattern === "recurring" ? "orange" : "blue"} size="1">
                        {cluster.pattern}
                      </Badge>
                      <Badge variant="outline" color="gray" size="1">
                        {Math.round(cluster.confidence * 100)}% confidence
                      </Badge>
                    </Flex>
                  </Flex>
                  <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>{cluster.description}</Text>
                  <Flex gap="1" wrap="wrap">
                    {cluster.issueTitles.map((title, i) => (
                      <Badge key={i} variant="outline" color="indigo" size="1">{title}</Badge>
                    ))}
                  </Flex>
                  {cluster.categories.length > 0 && (
                    <Flex gap="1" wrap="wrap">
                      {cluster.categories.map((cat, i) => (
                        <Badge key={i} variant="outline" color={getCategoryColor(cat)} size="1">{cat}</Badge>
                      ))}
                    </Flex>
                  )}
                  {cluster.suggestedRootCause && (
                    <Box style={{ borderLeft: "3px solid var(--orange-7)", paddingLeft: 12, marginTop: 4 }}>
                      <Text size="1" weight="medium" color="orange">Possible root cause</Text>
                      <Text size="2" color="gray" style={{ display: "block" }}>{cluster.suggestedRootCause}</Text>
                    </Box>
                  )}
                </Flex>
              </Card>
            ))}

            {/* Tab Content: Timeline */}
            {activeAnalysisTab === "timeline" && (
              <Flex direction="column" gap="3">
                <Flex gap="2" wrap="wrap">
                  <Badge variant="soft" color={
                    latestAnalysis.timelineAnalysis.escalationTrend === "worsening" ? "red"
                    : latestAnalysis.timelineAnalysis.escalationTrend === "improving" ? "green"
                    : "gray"
                  } size="2">
                    Trend: {latestAnalysis.timelineAnalysis.escalationTrend}
                  </Badge>
                  {latestAnalysis.timelineAnalysis.criticalPeriods.map((p, i) => (
                    <Badge key={i} variant="outline" color="red" size="1">Critical: {p}</Badge>
                  ))}
                </Flex>
                {latestAnalysis.timelineAnalysis.moodCorrelation && (
                  <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                    {latestAnalysis.timelineAnalysis.moodCorrelation}
                  </Text>
                )}
                {latestAnalysis.timelineAnalysis.phases.map((phase, idx) => (
                  <Card key={idx} variant="surface">
                    <Flex direction="column" gap="2" p="3">
                      <Flex justify="between" align="center" wrap="wrap" gap="2">
                        <Text size="2" weight="bold">{phase.period}</Text>
                        {phase.moodTrend && (
                          <Badge variant="soft" color={phase.moodTrend === "declining" ? "red" : phase.moodTrend === "improving" ? "green" : "gray"} size="1">
                            Mood: {phase.moodTrend}
                          </Badge>
                        )}
                      </Flex>
                      <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>{phase.description}</Text>
                      {phase.keyEvents.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: "16px" }}>
                          {phase.keyEvents.map((e, i) => (
                            <li key={i}><Text size="1" color="gray">{e}</Text></li>
                          ))}
                        </ul>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}

            {/* Tab Content: Family System */}
            {activeAnalysisTab === "family" && latestAnalysis.familySystemInsights.map((insight, idx) => (
              <Card key={idx} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Flex gap="1" wrap="wrap">
                      {insight.involvedMemberNames.map((name, i) => (
                        <Badge key={i} variant="soft" color="purple" size="1">{name}</Badge>
                      ))}
                    </Flex>
                    <Flex gap="1">
                      {insight.systemicPattern && (
                        <Badge variant="outline" color="orange" size="1">{insight.systemicPattern.replace(/_/g, " ")}</Badge>
                      )}
                      {insight.actionable && (
                        <Badge variant="soft" color="green" size="1">actionable</Badge>
                      )}
                    </Flex>
                  </Flex>
                  <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>{insight.insight}</Text>
                </Flex>
              </Card>
            ))}

            {/* Tab Content: Priorities */}
            {activeAnalysisTab === "priorities" && latestAnalysis.priorityRecommendations.map((rec, idx) => (
              <Card key={idx} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Flex gap="2" align="center">
                      <Badge variant="solid" color="gray" size="1">#{rec.rank}</Badge>
                      <Text size="2" weight="bold">{rec.issueTitle || "General"}</Text>
                    </Flex>
                    <Badge variant="soft" color={rec.urgency === "immediate" ? "red" : rec.urgency === "short_term" ? "orange" : "blue"} size="1">
                      {rec.urgency.replace(/_/g, " ")}
                    </Badge>
                  </Flex>
                  <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>{rec.rationale}</Text>
                  <Box style={{ borderLeft: "3px solid var(--indigo-7)", paddingLeft: 12 }}>
                    <Text size="1" weight="medium" color="indigo">Suggested approach</Text>
                    <Text size="2" color="gray" style={{ display: "block" }}>{rec.suggestedApproach}</Text>
                  </Box>
                </Flex>
              </Card>
            ))}

            {/* Tab Content: Research Gaps */}
            {activeAnalysisTab === "research" && latestAnalysis.researchRelevance.map((rr, idx) => (
              <Card key={idx} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Text size="2" weight="bold">{rr.patternClusterName}</Text>
                  {rr.relevantResearchTitles.length > 0 && (
                    <Box>
                      <Text size="1" weight="medium" mb="1">Covered by research:</Text>
                      <ul style={{ margin: 0, paddingLeft: "16px" }}>
                        {rr.relevantResearchTitles.map((t, i) => (
                          <li key={i}><Text size="1" color="gray">{t}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  {rr.coverageGaps.length > 0 && (
                    <Box>
                      <Text size="1" weight="medium" color="orange" mb="1">Gaps — needs more research:</Text>
                      <ul style={{ margin: 0, paddingLeft: "16px" }}>
                        {rr.coverageGaps.map((g, i) => (
                          <li key={i}><Text size="1" color="orange">{g}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Flex>
              </Card>
            ))}

            {/* Tab Content: Parent Advice */}
            {activeAnalysisTab === "advice" && <>
              <Flex justify="end">
                <Tooltip content={copiedAdviceIdx === -1 ? "Copied!" : "Copy all advice"}>
                  <Button
                    size="1"
                    variant="soft"
                    color={copiedAdviceIdx === -1 ? "green" : "gray"}
                    onClick={() => {
                      const allText = latestAnalysis.parentAdvice.map(a => formatAdviceText(a)).join("\n\n---\n\n");
                      copyAdvice(allText, -1);
                    }}
                  >
                    {copiedAdviceIdx === -1 ? <CheckIcon /> : <CopyIcon />}
                    {copiedAdviceIdx === -1 ? "Copied" : "Copy all"}
                  </Button>
                </Tooltip>
              </Flex>
              {latestAnalysis.parentAdvice.map((item, idx) => (
              <Card key={idx} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="center" wrap="wrap" gap="2">
                    <Text size="2" weight="bold">{item.title}</Text>
                    <Flex gap="1" align="center">
                      <Badge
                        variant="soft"
                        color={item.priority === "immediate" ? "red" : item.priority === "short_term" ? "orange" : "blue"}
                        size="1"
                      >
                        {item.priority.replace(/_/g, " ")}
                      </Badge>
                      {item.ageAppropriate ? (
                        <Badge variant="soft" color="green" size="1">age-appropriate</Badge>
                      ) : (
                        <Badge variant="soft" color="red" size="1">review age fit</Badge>
                      )}
                      <Tooltip content={copiedAdviceIdx === idx ? "Copied!" : "Copy"}>
                        <IconButton
                          size="1"
                          variant="ghost"
                          color={copiedAdviceIdx === idx ? "green" : "gray"}
                          onClick={() => copyAdvice(formatAdviceText(item), idx)}
                        >
                          {copiedAdviceIdx === idx ? <CheckIcon /> : <CopyIcon />}
                        </IconButton>
                      </Tooltip>
                    </Flex>
                  </Flex>

                  <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>{item.advice}</Text>

                  {item.developmentalContext && (
                    <Box style={{ borderLeft: "3px solid var(--cyan-7)", paddingLeft: 12, marginTop: 4 }}>
                      <Text size="1" weight="medium" color="cyan">Developmental context</Text>
                      <Text size="2" color="gray" style={{ display: "block" }}>{item.developmentalContext}</Text>
                    </Box>
                  )}

                  {item.concreteSteps.length > 0 && (
                    <Box>
                      <Text size="1" weight="medium" mb="1">Concrete steps:</Text>
                      <ol style={{ margin: 0, paddingLeft: "20px" }}>
                        {item.concreteSteps.map((step, i) => (
                          <li key={i}><Text size="2" color="gray">{step}</Text></li>
                        ))}
                      </ol>
                    </Box>
                  )}

                  {item.targetIssueTitles.length > 0 && (
                    <Flex gap="1" wrap="wrap">
                      {item.targetIssueTitles.map((title, i) => (
                        <Badge key={i} variant="outline" color="indigo" size="1">{title}</Badge>
                      ))}
                    </Flex>
                  )}

                  {item.relatedPatternCluster && (
                    <Badge variant="outline" color="orange" size="1">
                      Pattern: {item.relatedPatternCluster}
                    </Badge>
                  )}

                  {item.relatedResearchTitles && item.relatedResearchTitles.length > 0 && (
                    <Box>
                      <Text size="1" weight="medium" color="gray" mb="1">Research basis:</Text>
                      <ul style={{ margin: 0, paddingLeft: "16px" }}>
                        {item.relatedResearchTitles.map((t, i) => (
                          <li key={i}><Text size="1" color="gray">{t}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Flex>
              </Card>
            ))}
            </>}
          </>
        )}
      </Flex>
    </Card>
  );
}

export default DeepIssueAnalysisCard;
