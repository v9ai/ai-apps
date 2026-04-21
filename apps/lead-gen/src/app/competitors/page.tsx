import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { CompetitorAnalysesList } from "./components/analyses-list";

export default function CompetitorsPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <CompetitorAnalysesList />
    </Suspense>
  );
}
