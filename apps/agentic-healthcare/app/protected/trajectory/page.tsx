import { Box, Callout, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { TrajectoryTimeline } from "./trajectory-timeline";
import { TrajectoryInsights } from "./trajectory-insights";

export default function TrajectoryPage() {
  return (
    <Box py="8" style={{ maxWidth: 700, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Heading size="7" weight="bold">Health Trajectory</Heading>
          <Text size="2" color="gray">
            Each blood panel is encoded into a 1024-dimensional health state
            vector. Over multiple tests, these form a trajectory showing how
            your overall health evolves. Cosine similarity measures how close
            each state is to your latest panel.
          </Text>
        </Flex>

        <Callout.Root size="1" color="gray">
          <Callout.Text size="1">
            <Text weight="bold">Methodology.</Text> Derived ratios are
            classified using published clinical thresholds — hover over any
            metric badge to see the source paper. Trajectory velocity tracks
            the rate of change between consecutive panels following
            longitudinal biomarker analysis approaches (Lacher DA et al. Clin
            Chem. 2005;51(7):1232-1239). Risk tiers for each ratio (TG/HDL,
            NLR, TyG, De Ritis, etc.) are grounded in peer-reviewed research.
            This is informational only — always consult your physician.
          </Callout.Text>
        </Callout.Root>

        <Suspense fallback={<Skeleton height="200px" />}>
          <TrajectoryTimeline />
        </Suspense>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Trajectory Insights</Heading>
          <TrajectoryInsights />
        </Flex>
      </Flex>
    </Box>
  );
}
