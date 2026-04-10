"use client";

import { useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import {
  GearIcon,
  MagnifyingGlassIcon,
  ReaderIcon,
  LinkBreak2Icon,
  BarChartIcon,
  FileTextIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StageData {
  icon: React.ReactElement;
  title: string;
  description: string;
  badge: string;
  step: string;
  accentHue: number;
}

// ── Pipeline stage definitions ─────────────────────────────────────────────────

const PIPELINE_STAGES: StageData[] = [
  {
    icon: <GearIcon width={22} height={22} />,
    title: "System Overview",
    description:
      "SQLite WAL + LanceDB HNSW + ChromaDB hybrid storage in ~15 GB footprint",
    badge: "orchestrate",
    step: "00",
    accentHue: 230,
  },
  {
    icon: <MagnifyingGlassIcon width={22} height={22} />,
    title: "RL Crawler",
    description:
      "DQN agent with 448-dim state + UCB1 multi-armed bandit explores 820 domains, achieving 3\u00D7 harvest rate",
    badge: "crawl",
    step: "01",
    accentHue: 220,
  },
  {
    icon: <ReaderIcon width={22} height={22} />,
    title: "NER Extraction",
    description:
      "BERT-base-cased + spaCy + BERTopic extract entities at 92.3% F1, processing ~100 pages/sec",
    badge: "extract",
    step: "02",
    accentHue: 210,
  },
  {
    icon: <LinkBreak2Icon width={22} height={22} />,
    title: "Entity Resolution",
    description:
      "Siamese 128-dim embeddings with SQLite CTEs deduplicate in <1ms ANN queries",
    badge: "resolve",
    step: "03",
    accentHue: 200,
  },
  {
    icon: <BarChartIcon width={22} height={22} />,
    title: "Lead Scoring",
    description:
      "XGBoost 50% + LogReg 25% + RF 25% ensemble scores leads with 89.7% precision",
    badge: "score",
    step: "04",
    accentHue: 190,
  },
  {
    icon: <FileTextIcon width={22} height={22} />,
    title: "Report Generation",
    description:
      "Local LLM agent + SQLite/ChromaDB RAG generates reports with 97% factual accuracy in 10-30s",
    badge: "report",
    step: "05",
    accentHue: 170,
  },
  {
    icon: <CheckCircledIcon width={22} height={22} />,
    title: "Evaluation",
    description:
      "SHAP explanations + cascade error tracking monitor pipeline health -- keeping accuracy at scale (CER ~0.15)",
    badge: "evaluate",
    step: "06",
    accentHue: 150,
  },
];

// ── Keyframes (injected once) ──────────────────────────────────────────────────

const keyframesStyle = css.raw({});

const keyframesCSS = `
@keyframes pipelineSlideUp {
  from {
    opacity: 0;
    transform: translateY(32px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pipelineConnectorGrow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@keyframes pipelineConnectorGrowVertical {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}

@keyframes pipelinePulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

@keyframes pipelineDotTravel {
  0% {
    left: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

@keyframes pipelineDotTravelVertical {
  0% {
    top: 0%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

@keyframes pipelineGlowPulse {
  0%, 100% {
    box-shadow: 0 0 8px 2px rgba(62, 99, 221, 0.15);
  }
  50% {
    box-shadow: 0 0 20px 6px rgba(62, 99, 221, 0.3);
  }
}
`;

// ── Hook: intersection observer for entrance ───────────────────────────────────

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ── Stage card ─────────────────────────────────────────────────────────────────

function StageCard({
  stage,
  index,
  visible,
}: {
  stage: StageData;
  index: number;
  visible: boolean;
}) {
  const accentColor = `hsl(${stage.accentHue}, 70%, 55%)`;
  const accentColorDim = `hsla(${stage.accentHue}, 70%, 55%, 0.12)`;
  const accentColorBorder = `hsla(${stage.accentHue}, 70%, 55%, 0.25)`;

  return (
    <div
      className={css({
        position: "relative",
        opacity: 0,
        willChange: "transform, opacity",
      })}
      style={{
        animation: visible
          ? `pipelineSlideUp 0.6s cubic-bezier(0.16, 1, 0.30, 1) ${index * 0.1}s forwards`
          : "none",
      }}
    >
      <div
        className={css({
          position: "relative",
          bg: "ui.surface",
          border: "1px solid",
          borderColor: "ui.border",
          p: "5",
          transition:
            "background 300ms ease, border-color 300ms ease, box-shadow 300ms ease, transform 300ms ease",
          cursor: "default",
          overflow: "hidden",
          _hover: {
            bg: "ui.surfaceHover",
            borderColor: "ui.borderHover",
            transform: "translateY(-2px)",
          },
        })}
        style={{
          borderTopWidth: "2px",
          borderTopColor: accentColorBorder,
        }}
      >
        {/* Accent glow on hover -- via pseudo-element */}
        <div
          className={css({
            position: "absolute",
            inset: 0,
            opacity: 0,
            transition: "opacity 300ms ease",
            pointerEvents: "none",
            zIndex: 0,
          })}
          style={{
            background: `radial-gradient(ellipse at top center, ${accentColorDim} 0%, transparent 70%)`,
          }}
          aria-hidden
        />

        {/* Step number */}
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
            zIndex: 1,
          })}
          style={{ color: accentColorBorder }}
        >
          {stage.step}
        </span>

        {/* Icon + badge row */}
        <div
          className={flex({
            align: "center",
            gap: "3",
            mb: "3",
            position: "relative",
            zIndex: 1,
          })}
        >
          {/* Icon container with accent ring */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              w: "10",
              h: "10",
              border: "1px solid",
              transition:
                "border-color 300ms ease, box-shadow 300ms ease, background 300ms ease",
            })}
            style={{
              borderColor: accentColorBorder,
              background: accentColorDim,
              color: accentColor,
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
            position: "relative",
            zIndex: 1,
          })}
        >
          {stage.title}
        </p>

        {/* Description -- visible by default on mobile, revealed on hover on desktop */}
        <p
          className={css({
            fontSize: "xs",
            color: "ui.secondary",
            lineHeight: "normal",
            position: "relative",
            zIndex: 1,
            // Mobile: always visible
            maxHeight: { base: "100px", md: "0px" },
            overflow: "hidden",
            opacity: { base: 1, md: 0 },
            transition:
              "max-height 400ms cubic-bezier(0.16, 1, 0.30, 1), opacity 300ms ease, margin 300ms ease",
            mt: { base: "1", md: "0" },
          })}
        >
          {stage.description}
        </p>
      </div>

      {/* Inject hover rule for description reveal on desktop via a style tag */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .pipeline-stage-${index}:hover .pipeline-desc-${index} {
            max-height: 100px !important;
            opacity: 1 !important;
            margin-top: 4px !important;
          }
          .pipeline-stage-${index}:hover .pipeline-glow-${index} {
            opacity: 1 !important;
          }
          .pipeline-stage-${index}:hover .pipeline-icon-${index} {
            box-shadow: 0 0 16px 4px ${accentColorDim};
          }
        `,
        }}
      />
    </div>
  );
}

// ── Connector (horizontal for desktop, vertical for mobile) ────────────────────

function Connector({
  index,
  visible,
  direction,
}: {
  index: number;
  visible: boolean;
  direction: "horizontal" | "vertical";
}) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={css({
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      })}
      style={{
        width: isHorizontal ? 40 : "auto",
        height: isHorizontal ? 2 : 28,
        alignSelf: isHorizontal ? "center" : "stretch",
        margin: isHorizontal ? "0" : "0 auto",
      }}
    >
      {/* Line */}
      <div
        className={css({
          position: "absolute",
          transformOrigin: isHorizontal ? "left center" : "top center",
        })}
        style={{
          width: isHorizontal ? "100%" : 2,
          height: isHorizontal ? 2 : "100%",
          background: "linear-gradient(90deg, rgba(62, 99, 221, 0.2), rgba(62, 99, 221, 0.4), rgba(62, 99, 221, 0.2))",
          animation: visible
            ? `${isHorizontal ? "pipelineConnectorGrow" : "pipelineConnectorGrowVertical"} 0.5s cubic-bezier(0.16, 1, 0.30, 1) ${(index + 1) * 0.1 + 0.3}s forwards`
            : "none",
          transform: isHorizontal ? "scaleX(0)" : "scaleY(0)",
        }}
      />

      {/* Traveling dot */}
      <div
        className={css({
          position: "absolute",
          w: "1.5",
          h: "1.5",
          bg: "accent.primary",
          borderRadius: "9999px",
        })}
        style={{
          animation: visible
            ? `${isHorizontal ? "pipelineDotTravel" : "pipelineDotTravelVertical"} 2s ease-in-out ${(index + 1) * 0.1 + 0.8}s infinite`
            : "none",
          boxShadow: "0 0 6px 2px rgba(62, 99, 221, 0.5)",
          [isHorizontal ? "left" : "top"]: "0%",
        }}
      />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LandingPipeline() {
  const { ref: sectionRef, visible } = useScrollReveal(0.1);

  return (
    <section
      id="pipeline"
      ref={sectionRef}
      className={css({
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: keyframesCSS }} />

      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* Section header */}
        <div
          className={css({
            mb: { base: "8", md: "12" },
            maxW: "520px",
            opacity: 0,
          })}
          style={{
            animation: visible
              ? "pipelineSlideUp 0.6s cubic-bezier(0.16, 1, 0.30, 1) 0s forwards"
              : "none",
          }}
        >
          <div className={flex({ align: "center", gap: "2", mb: "3" })}>
            <BarChartIcon
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
              agentic lead gen -- pipeline modules
            </span>
          </div>

          <p
            className={css({
              fontSize: { base: "base", md: "md" },
              color: "ui.tertiary",
              lineHeight: "relaxed",
              letterSpacing: "snug",
            })}
          >
            From raw web pages to qualified B2B leads -- seven autonomous
            modules, zero cloud dependencies. Hover each stage to explore.
          </p>
        </div>

        {/* ── Desktop: horizontal flow ─────────────────────────────── */}
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
              justifyContent: "center",
              mb: "4",
            })}
          >
            {PIPELINE_STAGES.slice(0, 4).map((stage, i) => (
              <div
                key={stage.step}
                className={cx(
                  css({ display: "flex", alignItems: "stretch" }),
                  `pipeline-stage-${i}`,
                )}
              >
                <div
                  className={css({ flex: 1, minW: "180px", maxW: "220px" })}
                >
                  <StageCard stage={stage} index={i} visible={visible} />
                  {/* Re-apply class names for hover interactivity */}
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                      .pipeline-stage-${i} [class*="pipeline-desc"] { }
                    `,
                    }}
                  />
                </div>
                {i < 3 && (
                  <Connector
                    index={i}
                    visible={visible}
                    direction="horizontal"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Vertical connector between rows */}
          <div
            className={css({
              display: "flex",
              justifyContent: "flex-end",
              pr: "calc(110px)",
            })}
          >
            <Connector index={3} visible={visible} direction="vertical" />
          </div>

          {/* Row 2: stages 4-6 (reversed for snaking flow) */}
          <div
            className={css({
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
              mt: "4",
              flexDirection: "row-reverse",
            })}
          >
            {PIPELINE_STAGES.slice(4).map((stage, i) => {
              const globalIndex = i + 4;
              return (
                <div
                  key={stage.step}
                  className={cx(
                    css({ display: "flex", alignItems: "stretch", flexDirection: "row-reverse" }),
                    `pipeline-stage-${globalIndex}`,
                  )}
                >
                  <div
                    className={css({ flex: 1, minW: "180px", maxW: "220px" })}
                  >
                    <StageCard
                      stage={stage}
                      index={globalIndex}
                      visible={visible}
                    />
                  </div>
                  {i < 2 && (
                    <Connector
                      index={globalIndex}
                      visible={visible}
                      direction="horizontal"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: vertical stack ───────────────────────────────── */}
        <div
          className={css({
            display: { base: "flex", md: "none" },
            flexDirection: "column",
            alignItems: "stretch",
          })}
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.step}>
              {i > 0 && (
                <Connector index={i - 1} visible={visible} direction="vertical" />
              )}
              <StageCard stage={stage} index={i} visible={visible} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
