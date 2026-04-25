"use client";

import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import NextLink from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";
import {
  useGetBogdanDiscussionJobsQuery,
  JobStatus,
} from "@/app/__generated__/hooks";

function statusColor(status: JobStatus) {
  switch (status) {
    case "RUNNING":
      return "indigo" as const;
    case "SUCCEEDED":
      return "green" as const;
    case "FAILED":
      return "red" as const;
    default:
      return "gray" as const;
  }
}

function statusLabelRo(status: JobStatus): string {
  switch (status) {
    case "RUNNING":
      return "în curs";
    case "SUCCEEDED":
      return "finalizat";
    case "FAILED":
      return "eșuat";
    default:
      return String(status).toLowerCase();
  }
}

function formatElapsedRo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ro });
}

export function BogdanJobsSection() {
  const { data, loading } = useGetBogdanDiscussionJobsQuery({
    pollInterval: 5000,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const jobs = (data?.generationJobs ?? []).slice(0, 10);

  if (!jobs.length && !loading) return null;
  if (!jobs.length) return null;

  return (
    <Card>
      <Flex direction="column" gap="2" p="2">
        <Heading size="3">Generări</Heading>
        <Flex direction="column">
          {jobs.map((job, idx) => (
            <Box key={job.id}>
              <NextLink
                href={`/jobs/${job.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Flex direction="column" gap="1" py="2" style={{ cursor: "pointer" }}>
                  <Flex justify="between" align="center" gap="2">
                    <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                      <Text size="2" weight="medium">
                        Ghid Bogdan
                      </Text>
                      <Badge
                        variant="soft"
                        color={statusColor(job.status)}
                        size="1"
                      >
                        {statusLabelRo(job.status)}
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray" style={{ flexShrink: 0 }}>
                      {formatElapsedRo(job.updatedAt)}
                    </Text>
                  </Flex>

                  {job.status === "RUNNING" && (
                    <Box
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: "var(--gray-4)",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={
                          job.progress > 0
                            ? {
                                height: "100%",
                                width: `${job.progress}%`,
                                background: "var(--indigo-9)",
                                borderRadius: 2,
                                transition: "width 0.4s ease",
                              }
                            : {
                                height: "100%",
                                width: "40%",
                                background: "var(--indigo-9)",
                                borderRadius: 2,
                                animation:
                                  "researchSweep 1.4s ease-in-out infinite",
                              }
                        }
                      />
                    </Box>
                  )}

                  {job.error?.message && (
                    <Text size="1" color="red" style={{ lineHeight: "1.4" }}>
                      {job.error.message}
                    </Text>
                  )}
                </Flex>
              </NextLink>
              {idx < jobs.length - 1 && <Separator size="4" />}
            </Box>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
