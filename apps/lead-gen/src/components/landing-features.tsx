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
  Badge,
} from "@radix-ui/themes";

const badgeStyle: React.CSSProperties = {
  borderRadius: 0,
  textTransform: "lowercase" as const,
};

/** Each card gets a unique left-border accent for visual differentiation */
const CARD_ACCENTS = [
  "#3E63DD", // accent.primary (indigo)
  "#30A46C", // status.positive (green)
  "#E5484D", // warm red — contrast to complete the triad
];

interface FeatureCardProps {
  title: string;
  description: string;
  details: string[];
  index?: number;
}

function FeatureCard({ title, description, details, index = 0 }: FeatureCardProps) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  return (
    <Card
      style={{
        borderRadius: 0,
        boxShadow: "none",
        border: "1px solid var(--gray-6)",
        borderLeft: `3px solid ${accent}`,
        background: "var(--gray-2)",
      }}
    >
      <Box p="4">
        <Heading
          as="h3"
          size="4"
          weight="bold"
          style={{
            color: "var(--gray-12)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
          mb="3"
        >
          {title}
        </Heading>
        <Text as="p" size="2" style={{ color: "var(--gray-11)", lineHeight: 1.6 }} mb="4">
          {description}
        </Text>
        <Flex direction="column" gap="2">
          {details.map((detail) => (
            <Flex key={detail} align="baseline" gap="2">
              <Box
                style={{
                  width: 4,
                  height: 4,
                  background: accent,
                  flexShrink: 0,
                  marginTop: 6,
                  opacity: 0.6,
                }}
              />
              <Text
                as="p"
                size="1"
                style={{ color: "var(--gray-10)", lineHeight: 1.5 }}
              >
                {detail}
              </Text>
            </Flex>
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
      "Uses DeepSeek for job classification, Qwen for company enrichment, and Claude for outreach generation.",
    details: [
      "7-layer country signal resolution",
      "180+ regression tests for classification accuracy",
      "model-specific prompt tuning per task",
    ],
  },
  {
    title: "real-time pipeline",
    description:
      "Cloudflare Workers process jobs in parallel. Cron-triggered ingestion from Greenhouse, Lever, Ashby APIs.",
    details: [
      "classification pipeline: new \u2192 enhanced \u2192 role-match \u2192 eu-remote",
      "parallel worker execution with retry backoff",
      "sub-second classification latency per job",
    ],
  },
  {
    title: "vector-powered matching",
    description:
      "LanceDB embeddings match your skills against job requirements. Resume-aware scoring.",
    details: [
      "ESCO taxonomy integration for cross-border EU skill mapping",
      "semantic similarity beyond keyword matching",
      "continuous re-ranking as new jobs arrive",
    ],
  },
];

const techStack = [
  "Next.js 16",
  "Neon PostgreSQL",
  "Cloudflare Workers",
  "DeepSeek",
  "LangGraph",
  "LanceDB",
  "GraphQL",
  "Drizzle ORM",
];

export function LandingFeatures() {
  return (
    <Section size="2">
      <Container size="3">
        {/* ── heading ───────────────────────────────────────────── */}
        <Box mt="2" mb="6">
          <Heading
            as="h2"
            size="5"
            weight="bold"
            style={{ color: "var(--gray-12)", letterSpacing: "-0.02em" }}
          >
            why neural lead gen
          </Heading>
          <Text
            as="p"
            size="3"
            mt="2"
            style={{ color: "var(--gray-9)", maxWidth: 560 }}
          >
            an ai pipeline that aggregates remote eu jobs, enriches companies,
            discovers contacts, and generates outreach — end to end.
          </Text>
        </Box>

        {/* ── feature cards ─────────────────────────────────────── */}
        <Grid
          columns={{ initial: "1", md: "3" }}
          gap="4"
          mb="6"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </Grid>

        {/* ── tech stack badges ──────────────────────────────────── */}
        <Box mb="6">
          <Text
            as="p"
            size="1"
            weight="medium"
            mb="3"
            style={{ color: "var(--gray-8)", textTransform: "lowercase" }}
          >
            tech stack
          </Text>
          <Flex gap="2" wrap="wrap">
            {techStack.map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                color="gray"
                size="1"
                style={badgeStyle}
              >
                {tech.toLowerCase()}
              </Badge>
            ))}
          </Flex>
        </Box>

        {/* ── open source callout ───────────────────────────────── */}
        <Box
          py="4"
          px="5"
          style={{
            border: "1px solid var(--green-9)",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Text size="2" style={{ color: "var(--gray-11)" }}>
              fully open source — explore the architecture
            </Text>
            <a
              href="/how-it-works"
              style={{
                color: "var(--green-9)",
                fontSize: "var(--font-size-2)",
                textDecoration: "none",
                textTransform: "lowercase",
                fontWeight: 500,
                borderBottom: "1px solid var(--green-9)",
                paddingBottom: 1,
              }}
            >
              how it works
            </a>
          </Flex>
        </Box>
      </Container>
    </Section>
  );
}
