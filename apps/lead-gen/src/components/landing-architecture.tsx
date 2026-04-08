"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { LayersIcon } from "@radix-ui/react-icons";

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
    <section
      id="research"
      className={css({ py: "6", scrollMarginTop: "56px" })}
    >
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4" })}>
        {/* -- heading -- */}
        <div className={css({ mt: "2", mb: "6" })}>
          <div className={flex({ align: "center", gap: "2", mb: "3" })}>
            <LayersIcon
              width={14}
              height={14}
              className={css({ color: "accent.primary" })}
            />
            <span
              className={css({
                fontSize: "sm",
                fontWeight: "bold",
                color: "ui.secondary",
                textTransform: "lowercase",
                letterSpacing: "0.04em",
              })}
            >
              architecture
            </span>
          </div>
          <p
            className={css({
              fontSize: "base",
              color: "ui.tertiary",
              maxWidth: "560px",
            })}
          >
            Four layers, all local. No cloud dependencies, no API keys for
            scoring.
          </p>
        </div>

        {/* -- architecture layers tech stack -- */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: {
              base: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: "3",
            mb: "6",
          })}
        >
          {ARCHITECTURE_LAYERS.map((layer) => (
            <div
              key={layer.layer}
              className={css({
                py: "3",
                px: "4",
                border: "1px solid",
                borderColor: "ui.border",
                bg: "ui.surfaceRaised",
              })}
            >
              <p
                className={css({
                  fontSize: "xs",
                  fontWeight: "bold",
                  color: "ui.heading",
                  textTransform: "lowercase",
                  letterSpacing: "0.04em",
                })}
              >
                {layer.layer}
              </p>
              <p
                className={css({
                  fontSize: "xs",
                  mt: "1",
                  color: "ui.tertiary",
                  letterSpacing: "0.02em",
                  textTransform: "lowercase",
                })}
                style={{ fontSize: "10px" }}
              >
                {layer.role}
              </p>
              <div className={flex({ gap: "2", mt: "2", wrap: "wrap" })}>
                {layer.techs.map((tech) => (
                  <span
                    key={tech}
                    className={css({
                      fontSize: "xs",
                      fontWeight: "medium",
                      px: "2",
                      py: "1",
                      border: "1px solid",
                      borderColor: "ui.border",
                      color: "ui.secondary",
                      textTransform: "lowercase",
                    })}
                  >
                    {tech.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* -- open source callout -- */}
        <div
          className={css({
            py: "4",
            px: "5",
            border: "1px solid",
            borderColor: "status.positive",
            bg: "transparent",
          })}
        >
          <div
            className={css({
              display: "flex",
              flexDirection: { base: "column", sm: "row" },
              alignItems: { base: "start", sm: "center" },
              justifyContent: "space-between",
              gap: "3",
            })}
          >
            <span className={css({ fontSize: "sm", color: "ui.secondary" })}>
              Fully open source — fork it, self-host it, extend the agents for
              your ICP
            </span>
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
                  color: "ui.tertiary",
                  textDecoration: "none",
                  textTransform: "lowercase",
                  letterSpacing: "0.01em",
                  borderBottom: "1px solid",
                  borderBottomColor: "ui.border",
                  paddingBottom: "1px",
                  transition: "color 150ms ease",
                  _hover: {
                    color: "ui.secondary",
                  },
                })}
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
