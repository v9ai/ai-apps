"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Popover,
  ScrollArea,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { ActivityLogIcon } from "@radix-ui/react-icons";
import NextLink from "next/link";
import { useGetRecentJobsQuery, JobStatus, JobType } from "@/app/__generated__/hooks";

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

function formatElapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 1000) return "just now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function jobHref(job: { type: JobType; goalId?: number | null; storyId?: number | null }): string | null {
  if (job.type === "LONGFORM" && job.storyId) return `/stories/${job.storyId}`;
  if (job.goalId) {
    switch (job.type) {
      case "RESEARCH":
      case "QUESTIONS":
      case "RECOMMENDED_BOOKS":
        return `/goals/${job.goalId}`;
      default:
        return `/goals/${job.goalId}`;
    }
  }
  return null;
}

export function JobsIndicator() {
  const [open, setOpen] = useState(false);

  const { data, loading } = useGetRecentJobsQuery({
    pollInterval: 3000,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const jobs = useMemo(() => (data?.generationJobs ?? []).slice(0, 20), [data?.generationJobs]);
  const runningCount = useMemo(
    () => jobs.filter((j) => j.status === "RUNNING").length,
    [jobs],
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <IconButton
          variant="ghost"
          size="2"
          color={runningCount > 0 ? "indigo" : "gray"}
          aria-label={runningCount > 0 ? `${runningCount} jobs running` : "Jobs"}
          style={{ position: "relative" }}
        >
          {runningCount > 0 ? <Spinner size="2" /> : <ActivityLogIcon width="18" height="18" />}
          {runningCount > 0 && (
            <Badge
              color="indigo"
              radius="full"
              size="1"
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                fontSize: 10,
                lineHeight: "16px",
              }}
            >
              {runningCount}
            </Badge>
          )}
        </IconButton>
      </Popover.Trigger>
      <Popover.Content align="end" sideOffset={8} style={{ width: 360, padding: 0 }}>
        <Flex direction="column">
          <Box px="3" py="2">
            <Flex justify="between" align="center">
              <Text size="2" weight="bold">Jobs</Text>
              {loading && <Spinner size="1" />}
            </Flex>
            <Text size="1" color="gray">
              {runningCount > 0
                ? `${runningCount} running · ${jobs.length} recent`
                : jobs.length > 0
                ? `${jobs.length} recent`
                : "No recent jobs"}
            </Text>
          </Box>
          <Separator size="4" />

          {jobs.length === 0 ? (
            <Box p="4">
              <Text size="1" color="gray">Your background generations will show up here.</Text>
            </Box>
          ) : (
            <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 360 }}>
              <Flex direction="column">
                {jobs.map((job, idx) => {
                  const href = jobHref(job);
                  const Row = (
                    <Flex
                      direction="column"
                      gap="1"
                      px="3"
                      py="2"
                      style={{ cursor: href ? "pointer" : "default" }}
                    >
                      <Flex justify="between" align="center" gap="2">
                        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                          <Text size="2" weight="medium" truncate>
                            {typeLabel(job.type)}
                          </Text>
                          <Badge variant="soft" color={statusColor(job.status)} size="1">
                            {job.status === "RUNNING" ? "running" : job.status.toLowerCase()}
                          </Badge>
                        </Flex>
                        <Text size="1" color="gray" style={{ flexShrink: 0 }}>
                          {formatElapsed(job.updatedAt)}
                        </Text>
                      </Flex>

                      {job.status === "RUNNING" && (
                        <Box style={{ height: 4, borderRadius: 2, background: "var(--gray-4)", overflow: "hidden" }}>
                          <Box
                            style={
                              job.progress > 0
                                ? { height: "100%", width: `${job.progress}%`, background: "var(--indigo-9)", borderRadius: 2, transition: "width 0.4s ease" }
                                : { height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 2, animation: "researchSweep 1.4s ease-in-out infinite" }
                            }
                          />
                        </Box>
                      )}

                      {job.error?.message && (
                        <Text size="1" color="red" style={{ lineHeight: "1.4" }}>
                          {job.error.message}
                        </Text>
                      )}
                      {job.status === "SUCCEEDED" && job.result?.count != null && (
                        <Text size="1" color="gray">{job.result.count} items</Text>
                      )}
                    </Flex>
                  );

                  return (
                    <Box key={job.id}>
                      {href ? (
                        <NextLink href={href} style={{ textDecoration: "none", color: "inherit" }} onClick={() => setOpen(false)}>
                          {Row}
                        </NextLink>
                      ) : (
                        Row
                      )}
                      {idx < jobs.length - 1 && <Separator size="4" />}
                    </Box>
                  );
                })}
              </Flex>
            </ScrollArea>
          )}

          {jobs.length > 0 && (
            <>
              <Separator size="4" />
              <Box px="3" py="2">
                <Button variant="ghost" size="1" color="gray" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </Box>
            </>
          )}
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
