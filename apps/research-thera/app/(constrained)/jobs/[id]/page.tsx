"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import {
  useGetGenerationJobQuery,
  JobStatus,
  JobType,
} from "@/app/__generated__/hooks";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

function typeLabel(type: JobType): string {
  switch (type) {
    case "AUDIO": return "Audio";
    case "RESEARCH": return "Research";
    case "QUESTIONS": return "Questions";
    case "LONGFORM": return "Story";
    case "DEEP_ANALYSIS": return "Deep Analysis";
    case "RECOMMENDED_BOOKS": return "Recommended Books";
    default: return String(type);
  }
}

function statusColor(status: JobStatus) {
  switch (status) {
    case "RUNNING": return "indigo" as const;
    case "SUCCEEDED": return "green" as const;
    case "FAILED": return "red" as const;
    default: return "gray" as const;
  }
}

function formatElapsed(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms < 1000) return "<1s";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, loading, error, stopPolling } = useGetGenerationJobQuery({
    variables: { id },
    skip: !id,
    pollInterval: 15000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const job = data?.generationJob;

  useEffect(() => {
    if (job && job.status !== "RUNNING") {
      stopPolling();
    }
  }, [job, stopPolling]);

  if (loading && !job) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 200 }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !job) {
    return (
      <Flex direction="column" gap="4">
        <Breadcrumbs crumbs={[{ label: "Jobs" }, { label: id }]} />
        <Card>
          <Box p="4">
            <Text color="red">
              {error ? `Error: ${error.message}` : "Job not found"}
            </Text>
          </Box>
        </Card>
      </Flex>
    );
  }

  let sourceHref: string | null = null;
  let sourceLabel = "View source";
  if (job.type === "LONGFORM" && job.storyId) {
    sourceHref = `/stories/${job.storyId}`;
    sourceLabel = "View story";
  } else if (job.goalId) {
    sourceHref = `/goals/${job.goalId}`;
    sourceLabel = "View goal";
  }

  const isRunning = job.status === "RUNNING";

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={[
          { label: "Jobs" },
          { label: `${typeLabel(job.type)} · ${job.id.slice(0, 8)}` },
        ]}
      />

      <Flex gap="2" align="center" wrap="wrap">
        <Button variant="soft" size="2" color="gray" onClick={() => router.back()}>
          <ArrowLeftIcon />
          Back
        </Button>
        {sourceHref && (
          <Button asChild variant="soft" size="2" color="indigo">
            <NextLink href={sourceHref}>{sourceLabel}</NextLink>
          </Button>
        )}
      </Flex>

      {/* Overview */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Box>
              <Heading size="4" mb="1">{typeLabel(job.type)}</Heading>
              <Text size="1" color="gray" style={{ fontFamily: "var(--code-font-family)" }}>
                {job.id}
              </Text>
            </Box>
            <Flex gap="2" align="center">
              {isRunning && <Spinner size="2" />}
              <Badge variant="soft" color={statusColor(job.status)} size="2">
                {job.status.toLowerCase()}
              </Badge>
            </Flex>
          </Flex>

          {isRunning && (
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              <Box
                style={
                  job.progress > 0
                    ? { height: "100%", width: `${job.progress}%`, background: "var(--indigo-9)", borderRadius: 3, transition: "width 0.4s ease" }
                    : { height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }
                }
              />
            </Box>
          )}

          <Separator size="4" />

          <Flex gap="5" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">Started</Text>
              <Text size="2">{new Date(job.createdAt).toLocaleString()}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">Last updated</Text>
              <Text size="2">{new Date(job.updatedAt).toLocaleString()}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">Elapsed</Text>
              <Text size="2">{formatElapsed(job.createdAt, job.updatedAt)}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">Progress</Text>
              <Text size="2">{Math.round(job.progress)}%</Text>
            </Flex>
            {job.goalId && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">Goal</Text>
                <Text size="2">#{job.goalId}</Text>
              </Flex>
            )}
            {job.storyId && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">Story</Text>
                <Text size="2">#{job.storyId}</Text>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Error */}
      {job.error?.message && (
        <Card style={{ background: "var(--red-3)", borderColor: "var(--red-6)" }}>
          <Flex direction="column" gap="2" p="4">
            <Text size="2" weight="bold" color="red">Error</Text>
            <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
              {job.error.message}
            </Text>
          </Flex>
        </Card>
      )}

      {/* Result */}
      {job.result && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="3">Result</Heading>
            <Separator size="4" />
            {typeof job.result.message === "string" && job.result.message.length > 0 && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">Message</Text>
                <Text size="2" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                  {job.result.message}
                </Text>
              </Flex>
            )}
            <Flex gap="5" wrap="wrap">
              {job.result.stage && (
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium">Stage</Text>
                  <Text size="2">{job.result.stage}</Text>
                </Flex>
              )}
              {job.result.count != null && (
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium">Count</Text>
                  <Text size="2">{job.result.count}</Text>
                </Flex>
              )}
              {job.result.progress != null && (
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium">Internal progress</Text>
                  <Text size="2">{job.result.progress}%</Text>
                </Flex>
              )}
            </Flex>
            {job.result.audioUrl && (
              <Flex direction="column" gap="1">
                <Text size="1" color="gray" weight="medium">Audio URL</Text>
                <Text size="2" style={{ wordBreak: "break-all" }}>
                  <a href={job.result.audioUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--indigo-11)" }}>
                    {job.result.audioUrl}
                  </a>
                </Text>
              </Flex>
            )}

            {job.result.diagnostics && (
              <>
                <Separator size="4" />
                <Text size="2" weight="bold">Pipeline diagnostics</Text>
                <Flex gap="5" wrap="wrap">
                  {job.result.diagnostics.searchCount != null && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">Searched</Text>
                      <Text size="2">{job.result.diagnostics.searchCount}</Text>
                    </Flex>
                  )}
                  {job.result.diagnostics.enrichedCount != null && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">Enriched</Text>
                      <Text size="2">
                        {job.result.diagnostics.enrichedCount}
                        {job.result.diagnostics.enrichedDropped != null && ` (dropped ${job.result.diagnostics.enrichedDropped})`}
                      </Text>
                    </Flex>
                  )}
                  {job.result.diagnostics.extractedCount != null && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">Extracted</Text>
                      <Text size="2">{job.result.diagnostics.extractedCount}</Text>
                    </Flex>
                  )}
                  {job.result.diagnostics.qualifiedCount != null && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">Qualified</Text>
                      <Text size="2">{job.result.diagnostics.qualifiedCount}</Text>
                    </Flex>
                  )}
                  {job.result.diagnostics.persistedCount != null && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">Persisted</Text>
                      <Text size="2">{job.result.diagnostics.persistedCount}</Text>
                    </Flex>
                  )}
                  {job.result.diagnostics.searchUsedFallback && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">Fallback search</Text>
                      <Text size="2">yes</Text>
                    </Flex>
                  )}
                </Flex>
              </>
            )}
          </Flex>
        </Card>
      )}
    </Flex>
  );
}
