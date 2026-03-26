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
import Link from "next/link";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { ArrowRightIcon } from "@radix-ui/react-icons";

/**
 * CTA Improvement 3: Post-features conversion block (eliminates dead end).
 * CTA Improvement 5: Open source callout with dual-purpose CTA.
 *
 * After reading features, the user had no action to take. Now:
 * - Full-width conversion block after features with primary CTA
 * - Open source callout bridges credibility -> product (not just /how-it-works)
 */

const badgeStyle: React.CSSProperties = {
  borderRadius: 0,
  textTransform: "lowercase" as const,
};

const CARD_ACCENTS = [
  "#3E63DD", // accent.primary (indigo)
  "#30A46C", // status.positive (green)
  "#E5484D", // warm red
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
      <Box p={{ initial: "3", sm: "4" }}>
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

/**
 * IMPROVEMENT 4 (continued): Feature copy rewritten from specs to impact.
 *
 * Each title is now a claim. Each description answers "so what?"
 * Details mix one technical proof point with two human outcomes.
 */
const features: FeatureCardProps[] = [
  {
    title: "three AI models, one decision",
    description:
      "each model does what it's best at. DeepSeek classifies jobs, Qwen profiles companies, Claude writes outreach. no single model compromises.",
    details: [
      "7-layer country signal resolution catches edge cases humans miss",
      "180+ regression tests — accuracy doesn't regress when models update",
      "you get better results because no one model tries to do everything",
    ],
  },
  {
    title: "jobs arrive while you sleep",
    description:
      "the pipeline runs every few hours. new roles get classified, scored, and queued before you check your inbox.",
    details: [
      "new \u2192 enhanced \u2192 role-match \u2192 eu-remote: four stages, zero clicks",
      "parallel processing means a batch of 200 jobs takes seconds",
      "you see matches the same day they're posted, not a week later",
    ],
  },
  {
    title: "it actually understands your skills",
    description:
      "not keyword matching. vector embeddings compare your real capabilities against job requirements, accounting for EU skill taxonomy.",
    details: [
      "ESCO taxonomy maps skills across EU borders (your \"ML\" = their \"machine learning\")",
      "semantic search surfaces roles you'd miss with keyword filters",
      "re-ranks continuously as new jobs arrive, so your feed stays fresh",
    ],
  },
];

/**
 * TRUST IMPROVEMENT 5: Architecture-layered tech stack.
 *
 * A flat list of tech names reads as "I know these words". Grouping by
 * architectural layer (frontend / API / AI / data) transforms it into
 * evidence of deliberate engineering decisions. Each layer gets a role
 * label that answers "why this tech?" not just "what tech?".
 */
const ARCHITECTURE_LAYERS = [
  {
    layer: "frontend",
    techs: ["Next.js 16", "React 19"],
    role: "app router + server components",
  },
  {
    layer: "API",
    techs: ["GraphQL", "Apollo Server 5"],
    role: "typed schema with codegen",
  },
  {
    layer: "AI / ML",
    techs: ["DeepSeek", "Qwen", "Claude", "LanceDB"],
    role: "multi-model routing by task",
  },
  {
    layer: "data",
    techs: ["Neon PostgreSQL", "Drizzle ORM"],
    role: "serverless postgres + typed queries",
  },
] as const;

export function LandingFeatures() {
  return (
    <Section size="2" id="features" style={{ scrollMarginTop: 56 }}>
      <Container size="3">
        {/* -- heading -- */}
        <Box mt="2" mb="6">
          <Heading
            as="h2"
            size="5"
            weight="bold"
            style={{ color: "var(--gray-12)", letterSpacing: "-0.02em" }}
          >
            why this exists
          </Heading>
          <Text
            as="p"
            size="3"
            mt="2"
            style={{ color: "var(--gray-9)", maxWidth: 560 }}
          >
            job boards are optimized for employers, not for you.
            this pipeline reverses that — it works for the candidate.
          </Text>
        </Box>

        {/* -- feature cards -- */}
        <Grid
          columns={{ initial: "1", md: "3" }}
          gap="4"
          mb="6"
        >
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </Grid>

        {/* -- CTA Improvement 3: post-features conversion block -- */}
        <Box
          py="6"
          px="6"
          mb="6"
          style={{
            border: "1px solid var(--indigo-7)",
            borderRadius: 0,
            background: "rgba(62, 99, 221, 0.04)",
          }}
        >
          <Flex
            direction={{ initial: "column", sm: "row" }}
            align={{ initial: "start", sm: "center" }}
            justify="between"
            gap="4"
          >
            <Box>
              <Text
                as="p"
                size="3"
                weight="bold"
                style={{ color: "var(--gray-12)", letterSpacing: "-0.01em" }}
              >
                ready to find your next role?
              </Text>
              <Text
                as="p"
                size="2"
                mt="1"
                style={{ color: "var(--gray-10)" }}
              >
                27 verified EU-remote positions updated daily. no signup required.
              </Text>
            </Box>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <Link
                href="/jobs"
                className={button({ variant: "solid", size: "md" })}
              >
                browse jobs now
                <ArrowRightIcon width={14} height={14} />
              </Link>
            </div>
          </Flex>
        </Box>

        {/* -- trust improvement 5: architecture-layered tech stack -- */}
        <Box mb="6" id="stack" style={{ scrollMarginTop: 56 }}>
          <Text
            as="p"
            size="1"
            weight="medium"
            mb="3"
            style={{ color: "var(--gray-8)", textTransform: "lowercase" }}
          >
            architecture
          </Text>
          <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="3">
            {ARCHITECTURE_LAYERS.map((layer) => (
              <Box
                key={layer.layer}
                py="3"
                px="4"
                style={{
                  border: "1px solid var(--gray-6)",
                  borderRadius: 0,
                  background: "var(--gray-2)",
                }}
              >
                <Text
                  as="p"
                  size="1"
                  weight="bold"
                  style={{
                    color: "var(--gray-12)",
                    textTransform: "lowercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {layer.layer}
                </Text>
                <Text
                  as="p"
                  size="1"
                  mt="1"
                  style={{
                    color: "var(--gray-9)",
                    fontSize: "10px",
                    letterSpacing: "0.02em",
                    textTransform: "lowercase",
                  }}
                >
                  {layer.role}
                </Text>
                <Flex gap="2" mt="2" wrap="wrap">
                  {layer.techs.map((tech) => (
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
            ))}
          </Grid>
        </Box>

        {/* -- CTA Improvement 5: dual-purpose open source callout -- */}
        <Box
          py="4"
          px="5"
          style={{
            border: "1px solid var(--green-9)",
            borderRadius: 0,
            background: "transparent",
          }}
        >
          <Flex
            direction={{ initial: "column", sm: "row" }}
            align={{ initial: "start", sm: "center" }}
            justify="between"
            gap="3"
          >
            <Text size="2" style={{ color: "var(--gray-11)" }}>
              fully open source — fork it, self-host it, make it yours
            </Text>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <Link
                href="/sign-up"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "0",
                  padding: "6px 16px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#30A46C",
                  background: "rgba(48, 164, 108, 0.08)",
                  border: "1px solid rgba(48, 164, 108, 0.25)",
                  textDecoration: "none",
                  textTransform: "lowercase",
                  letterSpacing: "0.01em",
                  lineHeight: 1,
                  cursor: "pointer",
                  transition: "background 150ms ease, border-color 150ms ease",
                  _hover: {
                    background: "rgba(48, 164, 108, 0.15)",
                    borderColor: "rgba(48, 164, 108, 0.4)",
                  },
                })}
              >
                get started free
              </Link>
              <a
                href="/how-it-works"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--gray-9)",
                  textDecoration: "none",
                  textTransform: "lowercase",
                  letterSpacing: "0.01em",
                  borderBottom: "1px solid var(--gray-7)",
                  paddingBottom: "1px",
                  transition: "color 150ms ease",
                  _hover: {
                    color: "var(--gray-11)",
                  },
                })}
              >
                architecture docs
              </a>
            </div>
          </Flex>
        </Box>
      </Container>
    </Section>
  );
}
