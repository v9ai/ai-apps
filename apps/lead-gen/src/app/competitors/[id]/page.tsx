import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { CompetitorAnalysisDetail } from "../components/detail";

type Params = { id: string };

export default async function CompetitorAnalysisDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const analysisId = Number.parseInt(id, 10);

  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <CompetitorAnalysisDetail analysisId={analysisId} />
    </Suspense>
  );
}
