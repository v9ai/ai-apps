"use client";

import { Container, Text } from "@radix-ui/themes";
import { useOpportunitiesPageQuery } from "@/__generated__/hooks";
import { OpportunitiesClient } from "./opportunities-client";

export function OpportunitiesProvider() {
  const { data, loading, error } = useOpportunitiesPageQuery({
    fetchPolicy: "cache-and-network",
  });

  if (loading && !data) {
    return (
      <Container size="4" p="8">
        <Text color="gray">Loading...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p="8">
        <Text color="red">Error: {error.message}</Text>
      </Container>
    );
  }

  if (!data) return null;

  return (
    <OpportunitiesClient
      opportunities={data.opportunitiesPage.opportunities}
      d1Pending={data.opportunitiesPage.d1Pending}
      evalReport={data.opportunitiesPage.evalReport}
    />
  );
}
