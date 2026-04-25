"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { useGetGenerationJobQuery } from "@/app/__generated__/hooks";

const STEPS = [
  { label: "Loading context", threshold: 0 },
  { label: "Searching research papers", threshold: 20 },
  { label: "Generating story", threshold: 50 },
  { label: "Saving", threshold: 90 },
  { label: "Done", threshold: 100 },
];

function GeneratingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";

  const { data, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId },
    skip: !jobId,
    pollInterval: 5000,
    fetchPolicy: "network-only",
  });

  const job = data?.generationJob;
  const status = job?.status;
  const progress = job?.progress ?? 0;

  useEffect(() => {
    if (status === "SUCCEEDED") {
      stopPolling();
      const storyId = job?.storyId;
      if (storyId) {
        router.push(`/stories/${storyId}`);
      }
    }
    if (status === "FAILED") {
      stopPolling();
    }
  }, [status, job?.storyId]);

  const currentStep = [...STEPS].reverse().find((s) => progress >= s.threshold) ?? STEPS[0];

  return (
    <Flex direction="column" align="center" justify="center" style={{ minHeight: "60vh" }} gap="6">
      <Card style={{ width: "100%", maxWidth: 480 }}>
        <Flex direction="column" gap="5" p="5" align="center">
          {status === "FAILED" ? (
            <>
              <Heading size="5" color="red">Generation failed</Heading>
              <Text size="2" color="gray">{job?.error?.message ?? "Something went wrong."}</Text>
              <Text
                size="2"
                color="indigo"
                style={{ cursor: "pointer" }}
                onClick={() => router.push("/stories/new")}
              >
                Try again
              </Text>
            </>
          ) : (
            <>
              <Spinner size="3" />
              <Flex direction="column" align="center" gap="1">
                <Heading size="5">Generating your story</Heading>
                <Text size="2" color="gray">{currentStep.label}…</Text>
              </Flex>

              {/* Progress bar */}
              <Box style={{ width: "100%", height: 6, background: "var(--gray-a4)", borderRadius: 99, overflow: "hidden" }}>
                <Box
                  style={{
                    height: "100%",
                    width: `${Math.max(4, progress)}%`,
                    background: "var(--indigo-9)",
                    borderRadius: 99,
                    transition: "width 0.6s ease",
                  }}
                />
              </Box>

              <Text size="1" color="gray">This usually takes 30–90 seconds</Text>
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

export default function GeneratingPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" style={{ minHeight: "60vh" }}>
          <Spinner size="3" />
        </Flex>
      }
    >
      <GeneratingContent />
    </Suspense>
  );
}
