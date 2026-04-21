"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Grid,
  Section,
  Badge,
} from "@radix-ui/themes";
import Link from "next/link";
import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  LightningBoltIcon,
  MixerHorizontalIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";

/* ------------------------------------------------------------------ */
/*  Feature data                                                       */
/* ------------------------------------------------------------------ */

interface FeatureItem {
  icon: React.ReactElement;
  title: string;
  tagline: string;
  description: string;
  keyBenefit: string;
  details: string[];
  accent: string;
  accentDim: string;
  glowColor: string;
}

const features: FeatureItem[] = [
  {
    icon: <LightningBoltIcon width={20} height={20} />,
    title: "RL-powered crawling",
    tagline: "3x harvest rate",
    description:
      "DQN with 448-dimensional state space and UCB1 multi-armed bandit learns which domains yield the best leads. Not keyword matching -- reinforcement learning that gets smarter every cycle.",
    keyBenefit: "3x more relevant pages per crawl cycle vs. random baseline",
    details: [
      "448-dim state encodes page structure, link density, and domain history",
      "UCB1 bandit balances exploration vs exploitation across 820 domains",
    ],
    accent: "#3E63DD",
    accentDim: "rgba(62, 99, 221, 0.08)",
    glowColor: "rgba(62, 99, 221, 0.35)",
  },
  {
    icon: <MixerHorizontalIcon width={20} height={20} />,
    title: "Ensemble scoring",
    tagline: "89.7% precision",
    description:
      "XGBoost 50%, logistic regression 25%, random forest 25%. Each model catches what the others miss -- with SHAP explanations and conformal prediction on every score.",
    keyBenefit: "4-7% higher precision-recall AUC than any single model",
    details: [
      "SHAP explanations show why each lead scored high or low",
      "Conformal prediction gives calibrated confidence intervals",
    ],
    accent: "#30A46C",
    accentDim: "rgba(48, 164, 108, 0.08)",
    glowColor: "rgba(48, 164, 108, 0.35)",
  },
  {
    icon: <LockClosedIcon width={20} height={20} />,
    title: "Local-first privacy",
    tagline: "64-89% cost savings",
    description:
      "SQLite graph + LanceDB vectors + ChromaDB embeddings -- all local. No API calls to score leads. Runs entirely on commodity hardware at $1,500/year vs $5,400-13,200 for cloud.",
    keyBenefit: "182ms per-lead latency, ~15 GB total footprint",
    details: [
      "Zero data leaves your infrastructure during scoring",
      "Full pipeline with all indexes in ~15 GB footprint",
    ],
    accent: "#E5484D",
    accentDim: "rgba(229, 72, 77, 0.08)",
    glowColor: "rgba(229, 72, 77, 0.35)",
  },
];

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const badgeStyle: React.CSSProperties = {
  borderRadius: 4,
  textTransform: "lowercase" as const,
};

const cardBase = css({
  position: "relative",
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  p: { base: "5", md: "6" },
  transition:
    "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), border-color 300ms ease, box-shadow 300ms ease",
  cursor: "default",
  _hover: {
    transform: "translateY(-4px)",
    borderColor: "ui.borderHover",
  },
});

const iconBox = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: "10",
  h: "10",
  flexShrink: 0,
  border: "1px solid",
  borderColor: "ui.border",
  transition: "border-color 300ms ease, background 300ms ease",
});

const benefitPill = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  px: "3",
  py: "1",
  fontSize: "xs",
  fontWeight: "bold",
  letterSpacing: "wide",
  textTransform: "lowercase",
  lineHeight: "none",
  mt: "4",
});

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */

function FeatureCard({ feature }: { feature: FeatureItem }) {
  return (
    <div
      className={cardBase}
      style={
        {
          "--card-accent": feature.accent,
          "--card-glow": feature.glowColor,
          borderTop: `2px solid ${feature.accent}`,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = `0 8px 32px -8px ${feature.glowColor}, 0 0 0 1px ${feature.accent}40`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "none";
      }}
    >
      {/* icon + tagline row */}
      <Flex align="center" justify="between" mb="4">
        <div
          className={iconBox}
          style={{
            background: feature.accentDim,
            color: feature.accent,
          }}
        >
          {feature.icon}
        </div>
        <span
          className={css({
            fontSize: "2xs",
            fontWeight: "bold",
            letterSpacing: "wide",
            textTransform: "lowercase",
            lineHeight: "none",
          })}
          style={{ color: feature.accent }}
        >
          {feature.tagline}
        </span>
      </Flex>

      {/* title */}
      <Heading
        as="h3"
        size="4"
        weight="bold"
        style={{
          color: "var(--gray-12)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
        mb="2"
      >
        {feature.title}
      </Heading>

      {/* description */}
      <Text
        as="p"
        size="2"
        style={{ color: "var(--gray-11)", lineHeight: 1.65 }}
      >
        {feature.description}
      </Text>

      {/* key benefit pill */}
      <div
        className={benefitPill}
        style={{
          background: feature.accentDim,
          color: feature.accent,
          border: `1px solid ${feature.accent}30`,
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
        {feature.keyBenefit}
      </div>

      {/* detail bullets */}
      <Flex direction="column" gap="2" mt="4">
        {feature.details.map((detail) => (
          <Flex key={detail} align="baseline" gap="2">
            <Box
              style={{
                width: 4,
                height: 4,
                background: feature.accent,
                flexShrink: 0,
                marginTop: 6,
                opacity: 0.5,
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Architecture layers                                                */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Export                                                              */
/* ------------------------------------------------------------------ */

export function LandingFeatures() {
  return (
    <Section size="2" id="features" style={{ scrollMarginTop: 56 }}>
      <div className={container({})}>
        {/* -- section heading -- */}
        <Box mt="2" mb="7">
          <Text
            as="p"
            size="1"
            weight="bold"
            mb="3"
            style={{
              color: "var(--indigo-9)",
              textTransform: "lowercase",
              letterSpacing: "0.08em",
            }}
          >
            core capabilities
          </Text>
          <Heading
            as="h2"
            size="6"
            weight="bold"
            style={{
              color: "var(--gray-12)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              maxWidth: 520,
            }}
          >
            Three systems that make cloud CRMs obsolete
          </Heading>
          <Text
            as="p"
            size="3"
            mt="3"
            style={{
              color: "var(--gray-9)",
              maxWidth: 560,
              lineHeight: 1.6,
            }}
          >
            Cloud CRMs are optimized for their margins, not your pipeline.
            Agentic Lead Gen reverses that -- autonomous agents on your hardware,
            working 24/7.
          </Text>
        </Box>

        {/* -- feature cards grid -- */}
        <Grid
          columns={{ initial: "1", md: "3" }}
          gap="5"
          mb="7"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </Grid>

        {/* -- post-features CTA block -- */}
        <Box
          py="6"
          px="6"
          mb="6"
          style={{
            border: "1px solid var(--indigo-7)",
            borderRadius: 8,
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
                Ready to deploy Agentic Lead Gen?
              </Text>
              <Text
                as="p"
                size="2"
                mt="1"
                style={{ color: "var(--gray-10)" }}
              >
                Autonomous agents. 300 qualified leads per cycle. Fully local. 35 cited papers.
              </Text>
            </Box>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <a
                href="https://doi.org/10.5281/zenodo.lead-gen"
                target="_blank"
                rel="noopener noreferrer"
                className={button({ variant: "solid", size: "md" })}
              >
                Read the paper
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
                  borderRadius: 6,
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
            borderRadius: 8,
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
              Agentic Lead Gen is fully open source -- fork it, self-host it, extend the agents for your ICP
            </Text>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <Link
                href="/deploy"
                className={button({ variant: "solidGreen", size: "sm" })}
              >
                Deploy locally
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
                Architecture docs
              </a>
            </div>
          </Flex>
        </Box>
      </div>
    </Section>
  );
}
