"use client";

import { Flex, Heading, Text, Card, Spinner } from "@radix-ui/themes";
import { AuthGate } from "@/app/components/AuthGate";
import { useGetGoalQuery } from "@/app/__generated__/hooks";

function HouseContent() {
  const { data, loading, error } = useGetGoalQuery({
    variables: { slug: "house" },
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  const goal = data?.goal;

  return (
    <Flex direction="column" gap="4" p="4">
      <Heading size="6">House</Heading>
      <Card>
        <Flex direction="column" gap="2" p="4">
          {error ? (
            <Text color="red">Error: {error.message}</Text>
          ) : !goal ? (
            <Text color="gray">
              No goal with slug &quot;house&quot; found. Create a goal with slug
              &quot;house&quot; in /goals to populate this page.
            </Text>
          ) : (
            <>
              <Text size="2" color="gray">
                Tied to goal
              </Text>
              <Heading size="4">{goal.title}</Heading>
              <Text color="gray">Empty for now.</Text>
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

export default function HousePage() {
  return (
    <AuthGate>
      <HouseContent />
    </AuthGate>
  );
}
