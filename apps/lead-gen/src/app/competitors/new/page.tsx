import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { NewCompetitorAnalysisForm } from "../components/new-form";

export default function NewCompetitorAnalysisPage() {
  return (
    <Suspense
      fallback={
        <Container size="3" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <NewCompetitorAnalysisForm />
    </Suspense>
  );
}
