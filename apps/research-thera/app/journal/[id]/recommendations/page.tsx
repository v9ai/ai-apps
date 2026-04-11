import type { Metadata } from "next";
import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
} from "@radix-ui/themes";
import { getJournalAnalysisPublic } from "@/src/db/index";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Recommendations | Journal Entry ${id} | ResearchThera`,
    description:
      "Actionable therapeutic recommendations from journal analysis",
  };
}

export default async function RecommendationsPage({ params }: PageProps) {
  const { id } = await params;
  const journalEntryId = parseInt(id, 10);

  if (isNaN(journalEntryId)) {
    return (
      <Card>
        <Box p="4">
          <Text color="red">Invalid journal entry ID.</Text>
        </Box>
      </Card>
    );
  }

  const analysis = await getJournalAnalysisPublic(journalEntryId);

  if (!analysis) {
    return (
      <Flex direction="column" gap="4">
        <Heading size="5">Recommendations</Heading>
        <Card>
          <Box p="4">
            <Text color="gray">No analysis found for this journal entry.</Text>
          </Box>
        </Card>
      </Flex>
    );
  }

  const recommendations = analysis.actionableRecommendations as Array<{
    title: string;
    description: string;
    priority: string;
    concreteSteps: string[];
  }>;

  if (recommendations.length === 0) {
    return (
      <Flex direction="column" gap="4">
        <Heading size="5">Recommendations</Heading>
        <Card>
          <Box p="4">
            <Text color="gray">
              No recommendations available for this entry.
            </Text>
          </Box>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="5" py="4">
      <Box>
        <Heading size="6" mb="2">
          Recommendations
        </Heading>
        <Text size="2" color="gray">
          {recommendations.length} actionable recommendation
          {recommendations.length !== 1 ? "s" : ""} from journal analysis
        </Text>
      </Box>

      <Separator size="4" />

      <Flex direction="column" gap="3">
        {recommendations.map((rec, i) => (
          <Card key={i} variant="surface">
            <Flex direction="column" gap="2" p="3">
              <Flex justify="between" align="start" gap="3">
                <Text size="3" weight="bold">
                  {rec.title}
                </Text>
                <Badge
                  variant="soft"
                  size="1"
                  color={
                    rec.priority === "immediate"
                      ? "red"
                      : rec.priority === "short_term"
                        ? "orange"
                        : "green"
                  }
                  style={{ flexShrink: 0 }}
                >
                  {rec.priority.replace("_", " ")}
                </Badge>
              </Flex>

              <Text size="2" color="gray" style={{ lineHeight: "1.6" }}>
                {rec.description}
              </Text>

              {rec.concreteSteps.length > 0 && (
                <Box mt="1">
                  <Text size="2" weight="medium" mb="1" as="div">
                    Steps
                  </Text>
                  <Flex direction="column" gap="2" mt="1">
                    {rec.concreteSteps.map((step, j) => (
                      <Flex key={j} gap="2" align="start">
                        <Badge
                          variant="surface"
                          size="1"
                          color="gray"
                          style={{ flexShrink: 0, marginTop: 2 }}
                        >
                          {j + 1}
                        </Badge>
                        <Text size="2" color="gray" style={{ lineHeight: "1.5" }}>
                          {step}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Card>
        ))}
      </Flex>
    </Flex>
  );
}
