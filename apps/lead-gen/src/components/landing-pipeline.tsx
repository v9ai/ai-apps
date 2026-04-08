"use client";

import { useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import { pipelineCard, iconHolder } from "@/recipes/cards";
import {
  GearIcon,
  MagnifyingGlassIcon,
  ReaderIcon,
  LinkBreak2Icon,
  BarChartIcon,
  FileTextIcon,
  CheckCircledIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StageData {
  icon: React.ReactElement;
  title: string;
  description: string;
  badge: string;
  step: string;
  accentColor: string;
  accentOpacity: number;
  flowIn: string;
  flowOut: string;
}

// ── Pipeline stage definitions ─────────────────────────────────────────────────

const PIPELINE_STAGES: StageData[] = [
  {
    icon: <GearIcon width={20} height={20} />,
    title: "System Overview",
    description:
      "SQLite WAL + LanceDB HNSW + ChromaDB hybrid storage in ~15 GB footprint",
    badge: "orchestrate",
    step: "00",
    accentColor: "#3E63DD",
    accentOpacity: 0.15,
    flowIn: "Config",
    flowOut: "Targets",
  },
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "RL Crawler",
    description:
      "DQN agent with 448-dim state + UCB1 multi-armed bandit explores 820 domains, achieving 3\u00D7 harvest rate",
    badge: "crawl",
    step: "01",
    accentColor: "#3E8FDD",
    accentOpacity: 0.3,
    flowIn: "URLs",
    flowOut: "Pages",
  },
  {
    icon: <ReaderIcon width={20} height={20} />,
    title: "NER Extraction",
    description:
      "BERT-base-cased + spaCy + BERTopic extract entities at 92.3% F1, processing ~100 pages/sec",
    badge: "extract",
    step: "02",
    accentColor: "#30A46C",
    accentOpacity: 0.45,
    flowIn: "Pages",
    flowOut: "Entities",
  },
  {
    icon: <LinkBreak2Icon width={20} height={20} />,
    title: "Entity Resolution",
    description:
      "Siamese 128-dim embeddings with SQLite CTEs deduplicate in <1ms ANN queries",
    badge: "resolve",
    step: "03",
    accentColor: "#F5A623",
    accentOpacity: 0.6,
    flowIn: "Entities",
    flowOut: "Companies",
  },
  {
    icon: <BarChartIcon width={20} height={20} />,
    title: "Lead Scoring",
    description:
      "XGBoost 50% + LogReg 25% + RF 25% ensemble scores leads with 89.7% precision",
    badge: "score",
    step: "04",
    accentColor: "#E5484D",
    accentOpacity: 0.75,
    flowIn: "Companies",
    flowOut: "Scored leads",
  },
  {
    icon: <FileTextIcon width={20} height={20} />,
    title: "Report Generation",
    description:
      "Local LLM agent (Ollama) + SQLite/ChromaDB RAG generates reports with 97% factual accuracy in 10-30s",
    badge: "report",
    step: "05",
    accentColor: "#AB4ABA",
    accentOpacity: 0.9,
    flowIn: "Scored leads",
    flowOut: "Reports",
  },
  {
    icon: <CheckCircledIcon width={20} height={20} />,
    title: "Evaluation",
    description:
      "SHAP explanations + cascade error tracking monitor pipeline health — keeping accuracy at scale (CER ~0.15)",
    badge: "evaluate",
    step: "06",
    accentColor: "#30A46C",
    accentOpacity: 1,
    flowIn: "Reports",
    flowOut: "Insights",
  },
];

// ── Live processing pulse cycle duration ─────────────────────────────────────

const PULSE_CYCLE_MS = 8000; // full cycle through all 7 stages
const PULSE_STAGE_MS = PULSE_CYCLE_MS / PIPELINE_STAGES.length;

// ── Connector arrow SVG (desktop) ────────────────────────────────────────────

function ConnectorArrow({
  accentColor,
  delay,
  direction = "right",
}: {
  accentColor: string;
  delay: number;
  direction?: "right" | "left";
}) {
  return (
    <div
      className={cx(
        css({
          display: { base: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "center",
          flexShrink: 0,
          w: "32px",
          h: "24px",
        }),
        "pipeline-connector",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {direction === "right" ? (
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
          <line
            x1="0"
            y1="12"
            x2="24"
            y2="12"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.6"
          />
          <polygon
            points="24,7 32,12 24,17"
            fill={accentColor}
            fillOpacity="0.5"
          />
        </svg>
      ) : (
        <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
          <line
            x1="8"
            y1="12"
            x2="32"
            y2="12"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.6"
          />
          <polygon
            points="8,7 0,12 8,17"
            fill={accentColor}
            fillOpacity="0.5"
          />
        </svg>
      )}
    </div>
  );
}

// ── Data flow label ──────────────────────────────────────────────────────────

function FlowLabel({
  text,
  position,
  accentColor,
}: {
  text: string;
  position: "in" | "out";
  accentColor: string;
}) {
  return (
    <span
      className={css({
        fontSize: "2xs",
        fontFamily: "mono",
        letterSpacing: "wide",
        lineHeight: "none",
        textTransform: "lowercase",
        whiteSpace: "nowrap",
        px: "1",
        py: "0.5",
      })}
      style={{ color: accentColor, opacity: 0.7 }}
    >
      {position === "in" ? "\u25B6 " : ""}
      {text}
      {position === "out" ? " \u25B6" : ""}
    </span>
  );
}

// ── Pipeline card ─────────────────────────────────────────────────────────────

function PipelineStageCard({
  stage,
  isLive,
}: {
  stage: StageData;
  isLive: boolean;
}) {
  return (
    <div
      className={cx(
        pipelineCard(),
        css({
          position: "relative",
          transition:
            "background 150ms ease, border-color 150ms ease, box-shadow 300ms ease",
          _hover: {
            borderColor: "ui.borderHover",
          },
        }),
        "pipeline-card-hover",
        isLive ? "pipeline-stage-live" : "",
      )}
      style={
        {
          "--stage-accent": `${stage.accentColor}40`,
          borderTop: `2px solid ${stage.accentColor}`,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 0 20px ${stage.accentColor}20, 0 0 40px ${stage.accentColor}10`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Step number watermark */}
      <span
        className={css({
          fontSize: "3xl",
          fontWeight: "bold",
          lineHeight: "none",
          letterSpacing: "tighter",
          position: "absolute",
          top: "3",
          right: "4",
          userSelect: "none",
        })}
        style={{ color: `${stage.accentColor}18` }}
      >
        {stage.step}
      </span>

      {/* Icon + badge row */}
      <div className={flex({ align: "center", gap: "2", mb: "3" })}>
        <div
          className={iconHolder()}
          style={{
            borderColor: `${stage.accentColor}30`,
            color: stage.accentColor,
          }}
        >
          {stage.icon}
        </div>
        <span className={badge({ variant: "pipeline" })}>{stage.badge}</span>
      </div>

      {/* Title */}
      <p
        className={css({
          fontSize: "sm",
          fontWeight: "semibold",
          color: "ui.heading",
          textTransform: "lowercase",
          mb: "1",
        })}
      >
        {stage.title}
      </p>

      {/* Description */}
      <p
        className={css({
          fontSize: "xs",
          color: "ui.secondary",
          lineHeight: "normal",
          mb: "3",
        })}
      >
        {stage.description}
      </p>

      {/* Data flow labels */}
      <div
        className={flex({
          align: "center",
          justify: "space-between",
          gap: "2",
          pt: "2",
          borderTop: "1px solid",
          borderTopColor: "ui.border",
        })}
      >
        <FlowLabel
          text={stage.flowIn}
          position="in"
          accentColor={stage.accentColor}
        />
        <ArrowRightIcon
          width={10}
          height={10}
          className={css({ color: "ui.dim", flexShrink: 0 })}
        />
        <FlowLabel
          text={stage.flowOut}
          position="out"
          accentColor={stage.accentColor}
        />
      </div>
    </div>
  );
}

// ── Inline mobile connector ──────────────────────────────────────────────────

function MobileConnector({
  fromColor,
  toColor,
}: {
  fromColor: string;
  toColor: string;
}) {
  return (
    <div className={flex({ justify: "center", align: "center", py: "1" })}>
      <svg
        width="2"
        height="24"
        viewBox="0 0 2 24"
        fill="none"
        className={cx(
          css({ display: { base: "block", md: "none" } }),
          "pipeline-connector",
        )}
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="18"
          stroke={fromColor}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeOpacity="0.5"
        />
        <polygon
          points="-1.5,18 1,24 3.5,18"
          fill={toColor}
          fillOpacity="0.5"
        />
      </svg>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LandingPipeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [liveStageIndex, setLiveStageIndex] = useState(-1);

  // Observe section visibility
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sequential live-processing pulse
  useEffect(() => {
    if (!isVisible) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    // Start pulse after entrance animations finish
    const startDelay = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        setLiveStageIndex(i % PIPELINE_STAGES.length);
        i++;
      }, PULSE_STAGE_MS);
    }, 1200);

    return () => {
      clearTimeout(startDelay);
      if (interval) clearInterval(interval);
    };
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      id="pipeline"
      className={css({
        pt: { base: "sectionMobile", lg: "section" },
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* ── Section header ── */}
        <div className={css({ mb: { base: "6", md: "8" } })}>
          <div className={flex({ align: "center", gap: "2", mb: "3" })}>
            <div
              className={css({
                w: "6px",
                h: "6px",
                borderRadius: "50%",
                bg: "status.positive",
                animation: "pulse 2s ease-in-out infinite",
              })}
            />
            <span
              className={css({
                fontSize: "2xs",
                fontWeight: "bold",
                color: "status.positive",
                textTransform: "uppercase",
                letterSpacing: "editorial",
              })}
            >
              Live pipeline
            </span>
          </div>

          <h2
            className={css({
              fontSize: { base: "2xl", md: "3xl" },
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tighter",
              lineHeight: "snug",
              mb: "2",
            })}
          >
            Seven autonomous modules.{" "}
            <span className={css({ color: "ui.tertiary" })}>
              Zero cloud dependencies.
            </span>
          </h2>

          <p
            className={css({
              fontSize: { base: "base", md: "lg" },
              color: "ui.secondary",
              lineHeight: "relaxed",
              letterSpacing: "snug",
              maxW: "640px",
            })}
          >
            Raw web pages enter the pipeline. Qualified, scored B2B leads
            with complete reports come out the other side — fully automated,
            running on your hardware.
          </p>
        </div>

        {/* ── Desktop: horizontal flow with connectors ── */}
        <div
          className={css({
            display: { base: "none", md: "block" },
          })}
        >
          {/* Row 1: stages 0-3 */}
          <div
            className={css({
              display: "flex",
              alignItems: "stretch",
              gap: "0",
              mb: "3",
            })}
          >
            {PIPELINE_STAGES.slice(0, 4).map((stage, i) => (
              <div
                key={stage.step}
                className={css({
                  display: "contents",
                })}
              >
                <div
                  className={cx(
                    css({ flex: "1", minW: "0" }),
                    "pipeline-card-animated",
                  )}
                  style={{
                    animationDelay: isVisible ? `${i * 0.12}s` : "0s",
                  }}
                >
                  <PipelineStageCard
                    stage={stage}
                    isLive={liveStageIndex === i}
                  />
                </div>
                {i < 3 && (
                  <ConnectorArrow
                    accentColor={stage.accentColor}
                    delay={0.5 + i * 0.15}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Visual flow turn indicator: row 1 -> row 2 */}
          <div
            className={flex({
              justify: "flex-end",
              pr: "4",
              my: "1",
            })}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              className={cx(
                css({ display: { base: "none", md: "block" } }),
                "pipeline-connector",
              )}
              style={{ animationDelay: "0.9s" }}
            >
              <line
                x1="8"
                y1="0"
                x2="8"
                y2="14"
                stroke={PIPELINE_STAGES[3].accentColor}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />
              <polygon
                points="5,14 8,20 11,14"
                fill={PIPELINE_STAGES[4].accentColor}
                fillOpacity="0.5"
              />
            </svg>
          </div>

          {/* Row 2: stages 4-6 (reverse visual order for serpentine flow) */}
          <div
            className={css({
              display: "flex",
              alignItems: "stretch",
              gap: "0",
            })}
          >
            {PIPELINE_STAGES.slice(4)
              .reverse()
              .map((stage, i, arr) => {
                const realIndex = PIPELINE_STAGES.length - 1 - i;
                // Visual order: [6, 5, 4] — flow goes right-to-left
                return (
                  <div
                    key={stage.step}
                    className={css({
                      display: "contents",
                    })}
                  >
                    <div
                      className={cx(
                        css({ flex: "1", minW: "0" }),
                        "pipeline-card-animated",
                      )}
                      style={{
                        animationDelay: isVisible
                          ? `${(4 + i) * 0.12}s`
                          : "0s",
                      }}
                    >
                      <PipelineStageCard
                        stage={stage}
                        isLive={liveStageIndex === realIndex}
                      />
                    </div>
                    {i < arr.length - 1 && (
                      <ConnectorArrow
                        accentColor={
                          PIPELINE_STAGES[realIndex - 1].accentColor
                        }
                        delay={1.0 + i * 0.15}
                        direction="left"
                      />
                    )}
                  </div>
                );
              })}
            {/* Empty spacer to balance the 4-card top row */}
            <div className={css({ flex: "1", minW: "0" })} />
          </div>
        </div>

        {/* ── Mobile: vertical stack with connectors ── */}
        <div
          className={css({
            display: { base: "flex", md: "none" },
            flexDirection: "column",
            gap: "0",
          })}
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.step}>
              {i > 0 && (
                <MobileConnector
                  fromColor={PIPELINE_STAGES[i - 1].accentColor}
                  toColor={stage.accentColor}
                />
              )}
              <div className="pipeline-card-animated">
                <PipelineStageCard
                  stage={stage}
                  isLive={liveStageIndex === i}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Pipeline summary bar ── */}
        <div
          className={css({
            mt: "6",
            py: "3",
            px: "4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: { base: "3", md: "6" },
            flexWrap: "wrap",
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
          })}
        >
          {[
            { label: "Modules", value: "7" },
            { label: "Latency", value: "182ms" },
            { label: "Precision", value: "89.7%" },
            { label: "Accuracy", value: "97%" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={flex({ align: "baseline", gap: "2" })}
            >
              <span
                className={css({
                  fontSize: "lg",
                  fontWeight: "bold",
                  fontFamily: "mono",
                  color: "accent.primary",
                  letterSpacing: "tight",
                })}
              >
                {stat.value}
              </span>
              <span
                className={css({
                  fontSize: "2xs",
                  fontWeight: "medium",
                  color: "ui.dim",
                  textTransform: "uppercase",
                  letterSpacing: "editorial",
                })}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
