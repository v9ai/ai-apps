import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Box, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { TrajectoryPreview } from "./trajectory/trajectory-preview";
import { TrajectoryInsights } from "./trajectory/trajectory-insights";
import { WhyTrajectory } from "./why-trajectory";
import { QuickStats } from "./dashboard/quick-stats";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <Box py="8" style={{ maxWidth: 900, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7">Health Dashboard</Heading>
          <Text size="2" color="gray">
            Your health trajectory at a glance — how your overall state evolves
            across blood panels.
          </Text>
        </Flex>

        <Flex direction="column" gap="3">
          <Heading size="4">Health Trajectory</Heading>
          <Suspense fallback={<Skeleton height="200px" />}>
            <TrajectoryPreview />
          </Suspense>
        </Flex>

        <TrajectoryInsights />

        <Separator size="4" />

        <WhyTrajectory />

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Overview</Heading>
          <Suspense fallback={
            <Flex gap="4">
              <Skeleton height="80px" style={{ flex: 1 }} />
              <Skeleton height="80px" style={{ flex: 1 }} />
              <Skeleton height="80px" style={{ flex: 1 }} />
            </Flex>
          }>
            <QuickStats />
          </Suspense>
        </Flex>
      </Flex>
    </Box>
  );
}
