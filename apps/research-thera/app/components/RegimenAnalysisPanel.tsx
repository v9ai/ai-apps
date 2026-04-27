"use client";

import { useEffect, useState } from "react";
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
import { AlertTriangle, Layers, RefreshCw, ShieldAlert } from "lucide-react";
import {
  useRegimenAnalysisQuery,
  useGenerateRegimenAnalysisMutation,
  useGetGenerationJobQuery,
  RegimenAnalysisDocument,
} from "../__generated__/hooks";

const SEVERITY_BADGE: Record<
  string,
  { color: "green" | "yellow" | "orange" | "red" | "gray"; label: string }
> = {
  none: { color: "green", label: "No flags" },
  low: { color: "yellow", label: "Low" },
  moderate: { color: "orange", label: "Moderate" },
  high: { color: "red", label: "High" },
};

const FLAG_TYPE_LABEL: Record<string, string> = {
  interaction: "Interaction",
  duplicate: "Duplicate therapy",
  risky_combo: "Risky combination",
};

const FLAG_SEVERITY_COLOR: Record<
  string,
  "yellow" | "orange" | "red" | "gray"
> = {
  low: "yellow",
  moderate: "orange",
  high: "red",
};

export function RegimenAnalysisPanel({
  slug,
  language,
}: {
  slug: "me" | "bogdan";
  language?: string;
}) {
  const { data, loading, error, refetch } = useRegimenAnalysisQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const [generate, { loading: generating, error: genError }] =
    useGenerateRegimenAnalysisMutation({
      refetchQueries: [
        {
          query: RegimenAnalysisDocument,
          variables: { slug },
        },
      ],
    });

  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: pollingJobId ?? "" },
    skip: !pollingJobId,
    pollInterval: 1500,
  });

  useEffect(() => {
    if (!pollingJobId || !jobData?.generationJob) return;
    const status = jobData.generationJob.status;
    if (status === "SUCCEEDED" || status === "FAILED") {
      stopPolling();
      setPollingJobId(null);
      void refetch();
    }
  }, [jobData, pollingJobId, refetch, stopPolling]);

  const analysis = data?.regimenAnalysis;
  const jobStatus = jobData?.generationJob?.status;
  const jobProgress = jobData?.generationJob?.progress ?? 0;

  async function handleGenerate() {
    const result = await generate({
      variables: { slug, language },
    });
    const jobId = result.data?.generateRegimenAnalysis?.jobId;
    if (jobId) setPollingJobId(jobId);
  }

  const isWorking =
    generating ||
    (!!pollingJobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED");

  const overall = analysis?.severityOverall ?? "none";
  const overallBadge = SEVERITY_BADGE[overall] ?? SEVERITY_BADGE.none;

  return (
    <Card>
      <Flex direction="column" gap="3" p="2">
        <Flex justify="between" align="center" gap="2" wrap="wrap">
          <Flex align="center" gap="2">
            <ShieldAlert size={18} color="var(--indigo-10)" />
            <Heading size="4">Regimen interaction screen</Heading>
            {analysis && (
              <Badge color={overallBadge.color} variant="soft" size="2">
                {overallBadge.label}
              </Badge>
            )}
          </Flex>
          <Button
            variant="soft"
            color={analysis ? "gray" : "indigo"}
            disabled={isWorking}
            onClick={handleGenerate}
          >
            {isWorking ? (
              <>
                <Spinner size="1" />{" "}
                {pollingJobId ? `Running… ${jobProgress}%` : "Starting…"}
              </>
            ) : (
              <>
                <RefreshCw size={14} />{" "}
                {analysis ? "Re-run analysis" : "Run regimen analysis"}
              </>
            )}
          </Button>
        </Flex>

        {(error || genError) && (
          <Callout.Root color="red" size="1">
            <Callout.Text>
              {error?.message ??
                genError?.message ??
                "Unknown error"}
            </Callout.Text>
          </Callout.Root>
        )}

        {loading && !analysis && (
          <Flex justify="center" py="4">
            <Spinner size="2" />
          </Flex>
        )}

        {!loading && !analysis && (
          <Text size="2" color="gray">
            Run the analysis to screen this regimen for drug-drug interactions
            and duplicate therapies across all currently-active medications.
          </Text>
        )}

        {analysis && (
          <Flex direction="column" gap="3">
            {analysis.summary && (
              <Text size="2" style={{ lineHeight: 1.6 }}>
                {analysis.summary}
              </Text>
            )}

            {analysis.flags.length > 0 && (
              <Flex direction="column" gap="2">
                {analysis.flags.map((flag, i) => {
                  const sevColor = FLAG_SEVERITY_COLOR[flag.severity] ?? "gray";
                  const isInteraction = flag.type === "interaction";
                  return (
                    <Box
                      key={i}
                      p="2"
                      style={{
                        borderLeft: `3px solid var(--${sevColor}-9)`,
                        background: `var(--${sevColor}-2)`,
                        borderRadius: 4,
                      }}
                    >
                      <Flex align="center" gap="2" wrap="wrap" mb="1">
                        {isInteraction ? (
                          <AlertTriangle size={14} color={`var(--${sevColor}-10)`} />
                        ) : (
                          <Layers size={14} color={`var(--${sevColor}-10)`} />
                        )}
                        <Text size="2" weight="bold">
                          {FLAG_TYPE_LABEL[flag.type] ?? flag.type}
                        </Text>
                        <Badge color={sevColor} variant="soft" size="1">
                          {flag.severity}
                        </Badge>
                        {flag.drugs.length > 0 && (
                          <Text size="1" color="gray">
                            · {flag.drugs.join(" + ")}
                          </Text>
                        )}
                      </Flex>
                      <Text size="2" as="p">
                        {flag.message}
                      </Text>
                      {flag.recommendation && (
                        <Text size="1" color="gray" as="p" mt="1">
                          → {flag.recommendation}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </Flex>
            )}

            {analysis.missingFacts.length > 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Text>
                  Missing pharmacology facts for:{" "}
                  <Text weight="bold">
                    {analysis.missingFacts.join(", ")}
                  </Text>
                  . Run per-drug deep research to improve accuracy.
                </Callout.Text>
              </Callout.Root>
            )}

            <Separator size="4" />
            <Flex justify="between" wrap="wrap" gap="2">
              <Text size="1" color="gray">
                {analysis.medsCount} medication
                {analysis.medsCount === 1 ? "" : "s"} screened
              </Text>
              <Text size="1" color="gray">
                Updated: {new Date(analysis.updatedAt).toLocaleString()}
              </Text>
            </Flex>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
