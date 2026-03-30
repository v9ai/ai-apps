import { withAuth } from "@/lib/auth-helpers";
import { Box, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { css } from "styled-system/css";
import { TrajectoryPreview } from "../trajectory/trajectory-preview";
import { TrajectoryInsights } from "../trajectory/trajectory-insights";
import { WhyTrajectory } from "../why-trajectory";
import { QuickStats } from "./quick-stats";

const twoColGrid = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "8",
  "@media (min-width: 900px)": {
    gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  },
});

const sectionHeadingAccent = css({
  borderLeft: "3px solid var(--indigo-9)",
  paddingLeft: "var(--space-4)",
});

const statsSkeletonFlex = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "var(--space-4)",
  "@media (min-width: 640px)": {
    gridTemplateColumns: "repeat(3, 1fr)",
  },
});

const sidebarCard = css({
  borderRadius: "var(--radius-4)",
  border: "1px solid var(--indigo-a5)",
  background: "var(--indigo-a2)",
  padding: "var(--space-5)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
});

export default async function ProtectedPage() {
  await withAuth();

  return (
    <Box>
      {/* Page header */}
      <Flex direction="column" gap="1" mb="8">
        <div className={sectionHeadingAccent}>
          <Heading size="8">Health Dashboard</Heading>
          <Text size="2" color="gray">
            Your health trajectory at a glance — how your overall state evolves
            across blood panels.
          </Text>
        </div>
      </Flex>

      {/* Two-column layout */}
      <div className={twoColGrid}>
        {/* Left column: main content */}
        <Flex direction="column" gap="8">
          {/* Trajectory chart */}
          <Flex direction="column" gap="3">
            <Heading size="5">Health Trajectory</Heading>
            <Suspense fallback={<Skeleton height="200px" />}>
              <TrajectoryPreview />
            </Suspense>
          </Flex>

          {/* AI Analysis */}
          <Flex direction="column" gap="3">
            <Heading size="5">Trajectory Analysis</Heading>
            <TrajectoryInsights />
          </Flex>

          {/* Why Trajectory section */}
          <Box py="2">
            <WhyTrajectory />
          </Box>
        </Flex>

        {/* Right column: stats sidebar */}
        <Box>
          <div className={sidebarCard}>
            <Flex direction="column" gap="1">
              <Heading size="4">Overview</Heading>
              <Text size="1" color="gray">
                Your records at a glance
              </Text>
            </Flex>
            <Suspense
              fallback={
                <div className={statsSkeletonFlex}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} height="80px" />
                  ))}
                </div>
              }
            >
              <QuickStats />
            </Suspense>
          </div>
        </Box>
      </div>
    </Box>
  );
}
