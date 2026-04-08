"use client";

import {
  Box,
  Flex,
  Container,
  Text,
  Grid,
  Section,
  Badge,
} from "@radix-ui/themes";
import Link from "next/link";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { LayersIcon } from "@radix-ui/react-icons";

const badgeStyle: React.CSSProperties = {
  borderRadius: 0,
  textTransform: "lowercase" as const,
};

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

export function LandingArchitecture() {
  return (
    <Section size="2" id="research" style={{ scrollMarginTop: 56 }}>
      <Container size="3">
        {/* -- heading -- */}
        <Box mt="2" mb="6">
          <Flex align="center" gap="2" mb="3">
            <LayersIcon
              width={14}
              height={14}
              className={css({ color: "accent.primary" })}
            />
            <Text
              size="2"
              weight="bold"
              style={{
                color: "var(--gray-11)",
                textTransform: "lowercase",
                letterSpacing: "0.04em",
              }}
            >
              architecture
            </Text>
          </Flex>
          <Text
            as="p"
            size="3"
            style={{ color: "var(--gray-9)", maxWidth: 560 }}
          >
            Four layers, all local. No cloud dependencies, no API keys for scoring.
          </Text>
        </Box>

        {/* -- architecture layers tech stack -- */}
        <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="3" mb="6">
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
              Fully open source — fork it, self-host it, extend the agents for your ICP
            </Text>
            <div className={flex({ gap: "3", flexShrink: 0 })}>
              <Link
                href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen"
                className={button({ variant: "solidGreen", size: "sm" })}
              >
                Star on GitHub
              </Link>
              <a
                href="/how-it-works"
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
                How it works
              </a>
            </div>
          </Flex>
        </Box>
      </Container>
    </Section>
  );
}
