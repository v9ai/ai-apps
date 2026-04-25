"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  useDeleteRoutineAnalysisMutation,
  useGenerateRoutineAnalysisMutation,
  useGetGenerationJobQuery,
  useGetRoutineAnalysesQuery,
} from "@/app/__generated__/hooks";

type Props = {
  familyMemberId: number;
  subjectLabel?: string | null;
};

const priorityColor: Record<string, "indigo" | "orange" | "gray"> = {
  immediate: "orange",
  short_term: "indigo",
  long_term: "gray",
};

/** Extract unique numeric IDs from [ID:N] citation patterns in a string. */
function extractIssueIdCitations(text: string): number[] {
  const seen = new Set<number>();
  const re = /\[ID:(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    seen.add(Number(m[1]));
  }
  return Array.from(seen);
}

/** Collect all cited issue IDs across summary, gap rationales, and suggestion rationales. */
function collectAllCitedIssueIds(
  summary: string,
  gaps: Array<{ rationale: string }>,
  suggestions: Array<{ rationale: string }>
): number[] {
  const allText = [
    summary,
    ...gaps.map((g) => g.rationale),
    ...suggestions.map((s) => s.rationale),
  ].join(" ");
  return extractIssueIdCitations(allText);
}

/** Return true when the analysis is more than 7 days old. */
function isOlderThanSevenDays(createdAt: string): boolean {
  const MS_PER_DAY = 86_400_000;
  return Date.now() - new Date(createdAt).getTime() > 7 * MS_PER_DAY;
}

export function RoutineAnalysisPanel({ familyMemberId, subjectLabel }: Props) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<
    { text: string; type: "success" | "error" } | null
  >(null);

  const { data, refetch } = useGetRoutineAnalysesQuery({
    variables: { familyMemberId },
    skip: !familyMemberId,
    fetchPolicy: "cache-and-network",
  });
  const latest = data?.routineAnalyses?.[0] ?? null;

  const [generate, { loading: generating }] = useGenerateRoutineAnalysisMutation({
    onCompleted: (resp) => {
      if (
        resp.generateRoutineAnalysis.success &&
        resp.generateRoutineAnalysis.jobId
      ) {
        setMessage(null);
        setJobId(resp.generateRoutineAnalysis.jobId);
      } else {
        setMessage({
          text: resp.generateRoutineAnalysis.message || "Failed",
          type: "error",
        });
      }
    },
    onError: (err) => setMessage({ text: err.message, type: "error" }),
  });

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId! },
    skip: !jobId,
    pollInterval: 5000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const status = jobData?.generationJob?.status;
    if (status === "SUCCEEDED" || status === "FAILED") {
      stopPolling();
      setJobId(null);
      if (status === "SUCCEEDED") {
        setMessage({ text: "Routine analysis complete.", type: "success" });
        refetch();
      } else {
        setMessage({
          text: jobData?.generationJob?.error?.message ?? "Analysis failed.",
          type: "error",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobData]);

  const isRunning =
    !!jobId &&
    jobData?.generationJob?.status !== "SUCCEEDED" &&
    jobData?.generationJob?.status !== "FAILED";

  const [del, { loading: deleting }] = useDeleteRoutineAnalysisMutation({
    onCompleted: () => {
      setMessage(null);
      refetch();
    },
  });

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Box>
            <Heading size="3" mb="1">
              Routine analysis
            </Heading>
            <Text size="2" color="gray">
              Review habit adherence, balance, and optimization suggestions for{" "}
              {subjectLabel ?? "this family member"}.
            </Text>
          </Box>
          <Flex direction="column" gap="1" align="end">
            <Flex gap="2">
              {latest && !isRunning && (
                <Button
                  variant="soft"
                  color="red"
                  disabled={deleting}
                  onClick={() => del({ variables: { id: latest.id } })}
                >
                  Delete
                </Button>
              )}
              <Button
                disabled={generating || isRunning}
                onClick={() => generate({ variables: { familyMemberId } })}
              >
                {isRunning || generating ? <Spinner size="1" /> : null}
                {latest ? "Regenerate" : "Generate"}
              </Button>
            </Flex>
            {latest && !isRunning && (
              <Text size="1" color="gray" align="right">
                Regenerating pulls the latest journal entries, issues, and prior analyses
              </Text>
            )}
          </Flex>
        </Flex>

        {message && (
          <Text size="2" color={message.type === "error" ? "red" : "green"}>
            {message.text}
          </Text>
        )}

        {isRunning && (
          <Flex align="center" gap="2">
            <Spinner size="2" />
            <Text size="2" color="gray">
              Analyzing routine — this may take 30–60 seconds.
            </Text>
          </Flex>
        )}

        {latest && !isRunning && (
          <Flex direction="column" gap="4">
            <Box>
              <Flex gap="2" wrap="wrap" mb="2">
                <Badge color="indigo" variant="soft">
                  {latest.dataSnapshot.habitsCount} habit
                  {latest.dataSnapshot.habitsCount === 1 ? "" : "s"}
                </Badge>
                {latest.dataSnapshot.issueCount != null && (
                  <Badge color="gray" variant="soft">
                    {latest.dataSnapshot.issueCount} issue
                    {latest.dataSnapshot.issueCount === 1 ? "" : "s"}
                  </Badge>
                )}
                {latest.dataSnapshot.journalEntryCount != null && (
                  <Badge color="gray" variant="soft">
                    {latest.dataSnapshot.journalEntryCount} journal
                    {latest.dataSnapshot.journalEntryCount === 1 ? "" : "s"}
                  </Badge>
                )}
                {latest.dataSnapshot.researchPaperCount > 0 && (
                  <Badge color="gray" variant="soft">
                    {latest.dataSnapshot.researchPaperCount} research paper
                    {latest.dataSnapshot.researchPaperCount === 1 ? "" : "s"}
                  </Badge>
                )}
                <Badge color="gray" variant="soft">
                  {Math.round(latest.dataSnapshot.overallAdherence * 100)}%
                  adherence
                </Badge>
                <Badge color="gray" variant="soft">
                  window {latest.dataSnapshot.windowDays}d
                </Badge>
                <Badge color="gray" variant="soft">
                  balance: {latest.routineBalance.verdict}
                </Badge>
                <Badge color="gray" variant="soft">
                  momentum: {latest.streaks.momentum}
                </Badge>
                {(latest.dataSnapshot.narrowTherapyHabitsCount ?? 0) > 0 && (
                  <Badge color="orange" variant="soft">
                    {latest.dataSnapshot.narrowTherapyHabitsCount} narrow-therapy
                    habit{latest.dataSnapshot.narrowTherapyHabitsCount === 1 ? "" : "s"}{" "}
                    excluded from verdict
                  </Badge>
                )}
              </Flex>
              <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                {latest.summary}
              </Text>
            </Box>

            {/* FIX 1 — "Based on" sources section */}
            {(() => {
              const citedIds = collectAllCitedIssueIds(
                latest.summary,
                latest.gaps,
                latest.optimizationSuggestions
              );
              const hasCitations = citedIds.length > 0;
              const stale = isOlderThanSevenDays(latest.createdAt);

              if (!hasCitations && !stale) return null;

              return (
                <>
                  <Separator size="4" />
                  <Box>
                    {hasCitations && (
                      <>
                        <Heading size="2" mb="2">
                          Based on
                        </Heading>
                        <Flex gap="2" wrap="wrap" mb={stale ? "3" : "0"}>
                          {citedIds.map((id) => (
                            <Badge
                              key={id}
                              variant="surface"
                              color="blue"
                              asChild
                            >
                              <Link
                                href={`/family/${familyMemberId}/issues/${id}`}
                              >
                                Issue #{id}
                              </Link>
                            </Badge>
                          ))}
                        </Flex>
                      </>
                    )}
                    {stale && (
                      <Callout.Root color="amber" variant="soft" size="1">
                        <Callout.Icon>
                          <InfoCircledIcon />
                        </Callout.Icon>
                        <Callout.Text>
                          This analysis is more than 7 days old. Regenerating
                          will incorporate newer journal entries, issues, and
                          prior analyses.
                        </Callout.Text>
                      </Callout.Root>
                    )}
                  </Box>
                </>
              );
            })()}

            {latest.optimizationSuggestions.length > 0 && (
              <>
                <Separator size="4" />
                <Box>
                  <Heading size="2" mb="2">
                    Top suggestions
                  </Heading>
                  <Flex direction="column" gap="2">
                    {latest.optimizationSuggestions.slice(0, 3).map((s, i) => (
                      <Card key={i} variant="surface">
                        <Flex direction="column" gap="1" p="2">
                          <Flex gap="2" align="center" wrap="wrap">
                            <Text weight="medium">{s.title}</Text>
                            <Badge
                              color={priorityColor[s.priority] ?? "gray"}
                              variant="soft"
                              size="1"
                            >
                              {s.priority.replace("_", " ")}
                            </Badge>
                            <Badge color="gray" variant="soft" size="1">
                              {s.changeType}
                            </Badge>
                          </Flex>
                          <Text size="2" color="gray">
                            {s.rationale}
                          </Text>
                          {s.concreteSteps.length > 0 && (
                            <Box as="div" pl="3">
                              {s.concreteSteps.map((step, si) => (
                                <Text key={si} size="2" as="p">
                                  • {step}
                                </Text>
                              ))}
                            </Box>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>
                </Box>
              </>
            )}

            {latest.adherencePatterns.length > 0 && (
              <>
                <Separator size="4" />
                <Box>
                  <Heading size="2" mb="2">
                    Adherence by habit
                  </Heading>
                  <Flex direction="column" gap="1">
                    {latest.adherencePatterns.map((a) => (
                      <Flex
                        key={a.habitId}
                        justify="between"
                        align="center"
                        gap="3"
                        wrap="wrap"
                      >
                        <Text size="2" style={{ minWidth: 0 }}>
                          {a.habitTitle}{" "}
                          <Text size="1" color="gray">
                            ({a.frequency})
                          </Text>
                        </Text>
                        <Flex gap="2" align="center">
                          <Badge color="gray" variant="soft" size="1">
                            {Math.round(a.consistency * 100)}%
                          </Badge>
                          <Badge color="gray" variant="soft" size="1">
                            streak {a.currentStreak}
                          </Badge>
                          {a.missedPattern && (
                            <Badge color="orange" variant="soft" size="1">
                              misses {a.missedPattern}
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              </>
            )}

            <Text size="1" color="gray">
              Generated {new Date(latest.createdAt).toLocaleString()} ·{" "}
              {latest.model}
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
