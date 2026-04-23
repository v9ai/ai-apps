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
  useGenerateDeepAnalysisMutation,
  useGetDeepAnalysesQuery,
  useDeleteDeepAnalysisMutation,
  useGetGenerationJobQuery,
  DeepAnalysisSubjectType,
  DeepAnalysisTriggerType,
} from "@/app/__generated__/hooks";
import { getCategoryColor } from "@/app/lib/issue-colors";

type Props = {
  subjectType: DeepAnalysisSubjectType;
  subjectId: number;
  subjectLabel?: string | null;
  trigger?: { type: DeepAnalysisTriggerType; id: number } | null;
  description?: string;
  onAnalysisCreated?: () => void;
};

export function DeepAnalysisPanel({
  subjectType,
  subjectId,
  subjectLabel = null,
  trigger = null,
  description,
  onAnalysisCreated,
}: Props) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"advice" | "patterns" | "timeline" | "family" | "priorities" | "research">("advice");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const formatAdviceText = (item: { title: string; advice: string; concreteSteps: string[]; developmentalContext?: string | null; relatedResearchTitles?: string[] | null }) => {
    let text = `${item.title}\n\n${item.advice}`;
    if (item.developmentalContext) text += `\n\nDevelopmental context: ${item.developmentalContext}`;
    if (item.concreteSteps.length > 0) text += `\n\nConcrete steps:\n${item.concreteSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    if (item.relatedResearchTitles?.length) text += `\n\nResearch: ${item.relatedResearchTitles.join("; ")}`;
    return text;
  };

  const copyAdvice = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const { data, refetch } = useGetDeepAnalysesQuery({
    variables: { subjectType, subjectId },
    skip: !subjectId,
  });

  const analyses = data?.deepAnalyses ?? [];
  const latest = analyses[0] ?? null;

  const [generate, { loading: generating }] = useGenerateDeepAnalysisMutation({
    onCompleted: (resp) => {
      if (resp.generateDeepAnalysis.success && resp.generateDeepAnalysis.jobId) {
        setMessage(null);
        setJobId(resp.generateDeepAnalysis.jobId);
      } else {
        setMessage({ text: resp.generateDeepAnalysis.message || "Failed", type: "error" });
      }
    },
    onError: (err) => setMessage({ text: err.message, type: "error" }),
  });

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId! },
    skip: !jobId,
    pollInterval: 3000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const status = jobData?.generationJob?.status;
    if (status === "SUCCEEDED" || status === "FAILED") {
      stopPolling();
      setJobId(null);
      if (status === "SUCCEEDED") {
        setMessage({ text: "Deep analysis complete.", type: "success" });
        refetch();
        onAnalysisCreated?.();
      } else {
        setMessage({ text: jobData?.generationJob?.error?.message ?? "Analysis failed.", type: "error" });
      }
    }
  }, [jobData]);

  const progress = jobData?.generationJob?.progress ?? 0;
  const isRunning =
    !!jobId &&
    jobData?.generationJob?.status !== "SUCCEEDED" &&
    jobData?.generationJob?.status !== "FAILED";

  const [del, { loading: deleting }] = useDeleteDeepAnalysisMutation({
    onCompleted: () => {
      setMessage(null);
      refetch();
    },
  });

  const handleGenerate = async () => {
    setMessage(null);
    await generate({
      variables: {
        subjectType,
        subjectId,
        triggerType: trigger?.type,
        triggerId: trigger?.id,
      },
    });
  };

  const handleDelete = async () => {
    if (!latest) return;
    await del({ variables: { id: latest.id } });
  };

  const subjectNoun: Record<DeepAnalysisSubjectType, string> = {
    GOAL: "goal",
    NOTE: "note",
    JOURNAL_ENTRY: "journal entry",
    FAMILY_MEMBER: "family member",
  };
  const defaultDescription =
    subjectType === "FAMILY_MEMBER"
      ? `Analyze all issues and feedback for ${subjectLabel ?? "this member"} to find patterns, systemic dynamics, and priorities.`
      : `Surface patterns, systemic dynamics, and priorities for ${subjectLabel ? `"${subjectLabel}"` : `this ${subjectNoun[subjectType]}`}.`;
  const descriptionText = description ?? defaultDescription;

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Box>
            <Heading size="3" mb="1">Deep Analysis</Heading>
            <Text size="2" color="gray">{descriptionText}</Text>
          </Box>
          <Flex gap="2">
            {latest && (
              <Button
                variant="soft"
                color="red"
                size="2"
                onClick={handleDelete}
                disabled={deleting || isRunning}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={generating || isRunning}>
              {(generating || isRunning) && <Spinner />}
              {generating || isRunning ? "Analyzing..." : latest ? "Regenerate" : "Run Deep Analysis"}
            </Button>
          </Flex>
        </Flex>

        {isRunning && (
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              {progress > 0 ? `Analyzing... ${progress}%` : "Collecting data and analyzing..."}
            </Text>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              {progress > 0 ? (
                <Box style={{ height: "100%", width: `${progress}%`, background: "var(--indigo-9)", transition: "width 0.4s ease", borderRadius: 3 }} />
              ) : (
                <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
              )}
            </Box>
          </Flex>
        )}

        {message && (
          <Text size="2" color={message.type === "success" ? "green" : "red"}>
            {message.text}
          </Text>
        )}

        {latest && (
          <>
            <Separator size="4" />

            <Box>
              <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>
                {latest.summary}
              </Text>
              <Flex gap="2" mt="2" wrap="wrap">
                <Badge variant="outline" color="gray" size="1">
                  {latest.dataSnapshot.issueCount} issues
                </Badge>
                <Badge variant="outline" color="gray" size="1">
                  {latest.dataSnapshot.observationCount} observations
                </Badge>
                <Badge variant="outline" color="gray" size="1">
                  {latest.dataSnapshot.journalEntryCount} journal entries
                </Badge>
                {latest.dataSnapshot.relatedMemberIssueCount > 0 && (
                  <Badge variant="outline" color="purple" size="1">
                    {latest.dataSnapshot.relatedMemberIssueCount} cross-member issues
                  </Badge>
                )}
                <Badge variant="outline" color="gray" size="1">
                  {new Date(latest.createdAt).toLocaleDateString()}
                </Badge>
              </Flex>
            </Box>

            <Flex gap="2" wrap="wrap">
              {(["advice", "patterns", "timeline", "family", "priorities", "research"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "solid" : "soft"}
                  size="1"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "advice" ? `Advice (${latest.parentAdvice.length})`
                    : tab === "patterns" ? `Patterns (${latest.patternClusters.length})`
                    : tab === "timeline" ? "Timeline"
                    : tab === "family" ? `Family (${latest.familySystemInsights.length})`
                    : tab === "priorities" ? `Priorities (${latest.priorityRecommendations.length})`
                    : `Research (${latest.researchRelevance.length})`}
                </Button>
              ))}
            </Flex>

            {activeTab === "patterns" && latest.patternClusters.map((cluster, idx) => (
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

            {activeTab === "timeline" && (
              <Flex direction="column" gap="3">
                <Flex gap="2" wrap="wrap">
                  <Badge variant="soft" color={
                    latest.timelineAnalysis.escalationTrend === "worsening" ? "red"
                    : latest.timelineAnalysis.escalationTrend === "improving" ? "green"
                    : "gray"
                  } size="2">
                    Trend: {latest.timelineAnalysis.escalationTrend}
                  </Badge>
                  {latest.timelineAnalysis.criticalPeriods.map((p, i) => (
                    <Badge key={i} variant="outline" color="red" size="1">Critical: {p}</Badge>
                  ))}
                </Flex>
                {latest.timelineAnalysis.moodCorrelation && (
                  <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                    {latest.timelineAnalysis.moodCorrelation}
                  </Text>
                )}
                {latest.timelineAnalysis.phases.map((phase, idx) => (
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

            {activeTab === "family" && latest.familySystemInsights.map((insight, idx) => (
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

            {activeTab === "priorities" && latest.priorityRecommendations.map((rec, idx) => (
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

            {activeTab === "research" && latest.researchRelevance.map((rr, idx) => (
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

            {activeTab === "advice" && <>
              <Flex justify="end">
                <Tooltip content={copiedIdx === -1 ? "Copied!" : "Copy all advice"}>
                  <Button
                    size="1"
                    variant="soft"
                    color={copiedIdx === -1 ? "green" : "gray"}
                    onClick={() => {
                      const allText = latest.parentAdvice.map((a) => formatAdviceText(a)).join("\n\n---\n\n");
                      copyAdvice(allText, -1);
                    }}
                  >
                    {copiedIdx === -1 ? <CheckIcon /> : <CopyIcon />}
                    {copiedIdx === -1 ? "Copied" : "Copy all"}
                  </Button>
                </Tooltip>
              </Flex>
              {latest.parentAdvice.map((item, idx) => (
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
                        <Tooltip content={copiedIdx === idx ? "Copied!" : "Copy"}>
                          <IconButton
                            size="1"
                            variant="ghost"
                            color={copiedIdx === idx ? "green" : "gray"}
                            onClick={() => copyAdvice(formatAdviceText(item), idx)}
                          >
                            {copiedIdx === idx ? <CheckIcon /> : <CopyIcon />}
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

export default DeepAnalysisPanel;
