"use client";

import { useState } from "react";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  LayersIcon,
  ArrowDownIcon,
  StackIcon,
  CubeIcon,
  LightningBoltIcon,
  ActivityLogIcon,
} from "@radix-ui/react-icons";

// ── Layer data ────────────────────────────────────────────────────────────────

interface ArchitectureLayer {
  id: string;
  label: string;
  icon: React.ReactElement;
  techs: string[];
  annotation: string;
  flowLabel: string;
}

const ARCHITECTURE_LAYERS: ArchitectureLayer[] = [
  {
    id: "evaluation",
    label: "evaluation",
    icon: <ActivityLogIcon width={16} height={16} />,
    techs: ["SHAP", "Evidently", "Conformal Prediction"],
    annotation:
      "Cascade error tracking and drift detection ensure pipeline accuracy stays calibrated at scale.",
    flowLabel: "scores + explanations",
  },
  {
    id: "generation",
    label: "generation",
    icon: <LightningBoltIcon width={16} height={16} />,
    techs: ["Ollama", "RAG", "BERTopic"],
    annotation:
      "Local LLM agents generate structured reports from enriched lead data with 97% factual accuracy.",
    flowLabel: "enriched entities",
  },
  {
    id: "ml-rl",
    label: "ML / RL",
    icon: <CubeIcon width={16} height={16} />,
    techs: ["DQN", "UCB1", "XGBoost", "BERT NER", "Siamese"],
    annotation:
      "Reinforcement learning crawlers and ensemble scoring models extract and rank leads at 89.7% precision.",
    flowLabel: "raw documents",
  },
  {
    id: "storage",
    label: "storage",
    icon: <StackIcon width={16} height={16} />,
    techs: ["SQLite WAL", "LanceDB HNSW", "ChromaDB"],
    annotation:
      "Hybrid graph + vector + document store in ~15 GB footprint. All local, zero cloud dependencies.",
    flowLabel: "",
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = "#3E63DD";
const ACCENT_DIM = "rgba(62, 99, 221, 0.15)";
const ACCENT_BORDER = "rgba(62, 99, 221, 0.3)";

const layerBaseStyle = css({
  position: "relative",
  border: "1px solid",
  borderColor: "ui.border",
  bg: "ui.surface",
  px: { base: "5", md: "6" },
  py: { base: "4", md: "5" },
  transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "default",
  zIndex: 1,
});

const layerActiveStyle = css({
  borderColor: "accent.border",
  bg: "accent.subtle",
  boxShadow: "0 0 0 1px rgba(62, 99, 221, 0.15), 0 4px 24px rgba(62, 99, 221, 0.08)",
  zIndex: 2,
});

const layerDimmedStyle = css({
  opacity: 0.35,
  filter: "saturate(0.5)",
});

const techPillStyle = css({
  display: "inline-flex",
  alignItems: "center",
  fontSize: "2xs",
  fontWeight: "medium",
  letterSpacing: "wide",
  textTransform: "lowercase",
  color: "ui.secondary",
  border: "1px solid",
  borderColor: "ui.border",
  bg: "transparent",
  px: "2.5",
  py: "1",
  lineHeight: "none",
  whiteSpace: "nowrap",
  transition: "all 300ms ease",
});

const techPillActiveStyle = css({
  borderColor: "accent.border",
  color: "accent.primary",
  bg: "accent.subtle",
});

const connectorStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0",
  py: "1",
  position: "relative",
  zIndex: 0,
});

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingArchitecture() {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  return (
    <section
      id="research"
      className={css({
        pt: { base: "sectionMobile", lg: "section" },
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* -- heading -- */}
        <div className={css({ mb: "6" })}>
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
                letterSpacing: "wide",
              })}
            >
              architecture
            </span>
          </div>
          <h2
            className={css({
              fontSize: "xl",
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tight",
              mb: "2",
            })}
          >
            Four layers, all local
          </h2>
          <p
            className={css({
              fontSize: "base",
              color: "ui.tertiary",
              maxWidth: "620px",
              lineHeight: "relaxed",
              letterSpacing: "snug",
            })}
          >
            Each layer feeds the one above it. Data flows upward from storage
            through ML scoring to generation and evaluation — no cloud
            dependencies, no API keys for scoring. Hover any layer to see how it
            connects.
          </p>
        </div>

        {/* -- stacked architecture layers -- */}
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            maxWidth: "720px",
            mx: "auto",
            mb: "6",
          })}
          onMouseLeave={() => setHoveredLayer(null)}
        >
          {ARCHITECTURE_LAYERS.map((layer, i) => {
            const isHovered = hoveredLayer === layer.id;
            const isDimmed = hoveredLayer !== null && !isHovered;

            return (
              <div key={layer.id}>
                {/* -- layer card -- */}
                <div
                  className={cx(
                    layerBaseStyle,
                    isHovered && layerActiveStyle,
                    isDimmed && layerDimmedStyle,
                  )}
                  onMouseEnter={() => setHoveredLayer(layer.id)}
                  style={{
                    borderLeft: `3px solid ${isHovered ? ACCENT : "transparent"}`,
                  }}
                >
                  {/* layer number + label */}
                  <div
                    className={flex({
                      align: "center",
                      justify: "space-between",
                      mb: "3",
                    })}
                  >
                    <div className={flex({ align: "center", gap: "2.5" })}>
                      <div
                        className={css({
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          w: "28px",
                          h: "28px",
                          border: "1px solid",
                          borderColor: isHovered
                            ? "accent.border"
                            : "ui.border",
                          bg: isHovered ? "accent.subtle" : "transparent",
                          color: isHovered ? "accent.primary" : "ui.dim",
                          transition: "all 300ms ease",
                          flexShrink: 0,
                        })}
                      >
                        {layer.icon}
                      </div>
                      <span
                        className={css({
                          fontSize: "sm",
                          fontWeight: "bold",
                          color: isHovered ? "accent.primary" : "ui.heading",
                          textTransform: "lowercase",
                          letterSpacing: "0.04em",
                          transition: "color 300ms ease",
                        })}
                      >
                        {layer.label}
                      </span>
                    </div>
                    <span
                      className={css({
                        fontSize: "2xs",
                        fontWeight: "bold",
                        color: "ui.dim",
                        letterSpacing: "editorial",
                        textTransform: "uppercase",
                        userSelect: "none",
                      })}
                    >
                      L{ARCHITECTURE_LAYERS.length - i}
                    </span>
                  </div>

                  {/* annotation */}
                  <p
                    className={css({
                      fontSize: "xs",
                      color: isHovered ? "ui.secondary" : "ui.tertiary",
                      lineHeight: "relaxed",
                      letterSpacing: "snug",
                      mb: "3",
                      transition: "color 300ms ease",
                    })}
                  >
                    {layer.annotation}
                  </p>

                  {/* tech pills */}
                  <div className={flex({ gap: "2", wrap: "wrap" })}>
                    {layer.techs.map((tech) => (
                      <span
                        key={tech}
                        className={cx(
                          techPillStyle,
                          isHovered && techPillActiveStyle,
                        )}
                      >
                        {tech.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* -- connector between layers -- */}
                {i < ARCHITECTURE_LAYERS.length - 1 && (
                  <div className={connectorStyle}>
                    {/* vertical line */}
                    <div
                      className={css({
                        w: "1px",
                        h: "12px",
                        transition: "background 300ms ease",
                      })}
                      style={{
                        background:
                          hoveredLayer === layer.id ||
                          hoveredLayer === ARCHITECTURE_LAYERS[i + 1]?.id
                            ? ACCENT
                            : "rgba(255,255,255,0.1)",
                      }}
                    />
                    {/* arrow + flow label */}
                    <div
                      className={flex({
                        align: "center",
                        gap: "2",
                      })}
                    >
                      <ArrowDownIcon
                        width={12}
                        height={12}
                        className={css({
                          transition: "color 300ms ease",
                        })}
                        style={{
                          color:
                            hoveredLayer === layer.id ||
                            hoveredLayer === ARCHITECTURE_LAYERS[i + 1]?.id
                              ? ACCENT
                              : "rgba(255,255,255,0.15)",
                          transform: "rotate(180deg)",
                        }}
                      />
                      <span
                        className={css({
                          fontSize: "2xs",
                          letterSpacing: "wide",
                          textTransform: "lowercase",
                          transition: "color 300ms ease, opacity 300ms ease",
                        })}
                        style={{
                          color:
                            hoveredLayer === layer.id ||
                            hoveredLayer === ARCHITECTURE_LAYERS[i + 1]?.id
                              ? ACCENT
                              : "rgba(255,255,255,0.25)",
                        }}
                      >
                        {ARCHITECTURE_LAYERS[i + 1]?.flowLabel}
                      </span>
                    </div>
                    {/* vertical line */}
                    <div
                      className={css({
                        w: "1px",
                        h: "12px",
                        transition: "background 300ms ease",
                      })}
                      style={{
                        background:
                          hoveredLayer === layer.id ||
                          hoveredLayer === ARCHITECTURE_LAYERS[i + 1]?.id
                            ? ACCENT
                            : "rgba(255,255,255,0.1)",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* -- open source callout -- */}
        <div
          className={css({
            py: "4",
            px: "5",
            border: "1px solid",
            borderColor: "status.positive",
            bg: "transparent",
            maxWidth: "720px",
            mx: "auto",
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
