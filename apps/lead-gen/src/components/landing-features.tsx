"use client";

import {
  Box,
  Flex,
  Container,
  Heading,
  Text,
  Grid,
  Section,
  Card,
} from "@radix-ui/themes";

/**
 * Improvement 4: Features as pure differentiators — no redundant copy.
 *
 * Removed: the subtitle that repeated the hero's subheadline verbatim.
 * Removed: tech stack badges and open-source callout (moved to LandingClosing).
 * What remains: a clean H2 + three differentiator cards that explain
 * WHY this pipeline is different (multi-model, real-time, vector matching).
 * The pipeline flow is already shown in LandingPipeline above —
 * no need to describe it again here.
 */

const cardStyle: React.CSSProperties = {
  borderRadius: 0,
  boxShadow: "none",
  border: "1px solid var(--gray-6)",
  background: "var(--gray-2)",
};

interface FeatureCardProps {
  title: string;
  description: string;
  details: string[];
}

function FeatureCard({ title, description, details }: FeatureCardProps) {
  return (
    <Card style={cardStyle}>
      <Box p="4">
        <Heading
          as="h3"
          size="3"
          weight="medium"
          style={{ color: "var(--gray-12)", letterSpacing: "-0.005em" }}
          mb="3"
        >
          {title}
        </Heading>
        <Text
          as="p"
          size="2"
          style={{ color: "var(--gray-11)", lineHeight: 1.6 }}
          mb="4"
        >
          {description}
        </Text>
        <Flex direction="column" gap="1">
          {details.map((detail) => (
            <Text
              key={detail}
              as="p"
              size="1"
              style={{ color: "var(--gray-11)" }}
            >
              {detail}
            </Text>
          ))}
        </Flex>
      </Box>
    </Card>
  );
}

const features: FeatureCardProps[] = [
  {
    title: "multi-model intelligence",
    description:
      "DeepSeek classifies jobs, Qwen enriches companies, Claude generates outreach — each model tuned for its task.",
    details: [
      "7-layer country signal resolution",
      "180+ regression tests for classification accuracy",
      "model-specific prompt tuning per task",
    ],
  },
  {
    title: "real-time pipeline",
    description:
      "Cron-triggered ingestion from Greenhouse, Lever, Ashby APIs with parallel processing and retry backoff.",
    details: [
      "classification: new \u2192 enhanced \u2192 role-match \u2192 eu-remote",
      "parallel worker execution with retry backoff",
      "sub-second classification latency per job",
    ],
  },
  {
    title: "vector-powered matching",
    description:
      "LanceDB embeddings match your skills against job requirements. Resume-aware scoring beyond keyword matching.",
    details: [
      "ESCO taxonomy for cross-border EU skill mapping",
      "semantic similarity beyond keyword matching",
      "continuous re-ranking as new jobs arrive",
    ],
  },
];

export function LandingFeatures() {
  return (
    <Section size="2">
      <Container size="3">
        {/* heading — no redundant subtitle */}
        <Box mb="6">
          <Heading
            as="h2"
            size="5"
            weight="bold"
            style={{ color: "var(--gray-12)", letterSpacing: "-0.02em" }}
          >
            why neural lead gen
          </Heading>
        </Box>

        {/* feature cards */}
        <Grid columns={{ initial: "1", md: "3" }} gap="4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
