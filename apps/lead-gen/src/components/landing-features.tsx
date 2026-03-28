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

const features: FeatureCardProps[] = [
  {
    title: "reinforcement learning finds what keyword crawlers miss",
    description:
      "DQN with 448-dimensional state space and UCB1 multi-armed bandit learns which domains yield the best leads. 3\u00d7 harvest rate over baseline random crawling.",
    details: [
      "448-dim state encodes page structure, link density, and domain history",
      "UCB1 bandit balances exploration vs exploitation across 820 domains",
      "you get 3\u00d7 more relevant pages per crawl cycle, automatically",
    ],
  },
  {
    title: "ML ensemble, not a single model",
    description:
      "XGBoost handles 50% of scoring weight, logistic regression 25%, random forest 25%. each model catches what the others miss \u2014 89.7% precision, 86.5% recall.",
    details: [
      "ensemble outperforms any single model by 4-7% on precision-recall AUC",
      "SHAP explanations show why each lead scored high or low",
      "conformal prediction gives calibrated confidence intervals on every score",
    ],
  },
  {
    title: "local-first — your data, your pipeline, your control",
    description:
      "SQLite graph + LanceDB vectors + ChromaDB embeddings \u2014 all local. no API calls to score leads — Agentic Lead Gen runs entirely on commodity hardware. $1,500/year total cost vs $5,400-13,200 for cloud alternatives.",
    details: [
      "~15 GB footprint for the entire pipeline with all indexes",
      "182ms per-lead end-to-end latency without LLM generation",
      "64-89% cost savings: commodity hardware vs cloud CRM subscriptions",
    ],
  },
];

const ARCHITECTURE_LAYERS = [
  {
    layer: "storage",
    techs: ["SQLite WAL", "LanceDB HNSW", "ChromaDB"],
    role: "hybrid graph + vector + document store",
  },
  {
    layer: "ML / RL",
    techs: ["DQN", "UCB1", "XGBoost", "BERT NER", "Siamese"],
    role: "RL crawling + ensemble scoring",
  },
  {
    layer: "generation",
    techs: ["Ollama", "RAG", "BERTopic"],
    role: "local LLM report generation",
  },
  {
    layer: "evaluation",
    techs: ["SHAP", "Evidently"],
    role: "cascade error tracking + drift detection",
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
            why Agentic Lead Gen
          </Heading>
          <Text
            as="p"
            size="3"
            mt="2"
            style={{ color: "var(--gray-9)", maxWidth: 560 }}
          >
            cloud CRMs are optimized for their margins, not your pipeline.
            Agentic Lead Gen reverses that — autonomous agents on your hardware, working 24/7.
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

        {/* -- post-features CTA block -- */}
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
                ready to deploy Agentic Lead Gen?
              </Text>
              <Text
                as="p"
                size="2"
                mt="1"
                style={{ color: "var(--gray-10)" }}
              >
                autonomous agents. 300 qualified leads per cycle. fully local. 35 cited papers.
              </Text>
            </Box>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <a
                href="https://doi.org/10.5281/zenodo.lead-gen"
                target="_blank"
                rel="noopener noreferrer"
                className={button({ variant: "solid", size: "md" })}
              >
                read the paper
                <ArrowRightIcon width={14} height={14} />
              </a>
            </div>
          </Flex>
        </Box>

        {/* -- architecture layers tech stack -- */}
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

        {/* -- open source callout -- */}
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
              Agentic Lead Gen is fully open source — fork it, self-host it, extend the agents for your ICP
            </Text>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <Link
                href="/deploy"
                className={button({ variant: "solidGreen", size: "sm" })}
              >
                deploy locally
              </Link>
              <a
                href="/architecture"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: "base",
                  fontWeight: "medium",
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
