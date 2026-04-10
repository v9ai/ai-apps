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

// ── Keyframes injected once via <style> ────────────────────────────────────────

const KEYFRAMES_CSS = `
@keyframes plSlideUp {
  from { opacity: 0; transform: translateY(32px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes plConnectorGrow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes plConnectorGrowV {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes plDotTravel {
  0%   { left: 0%;   opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@keyframes plDotTravelV {
  0%   { top: 0%;    opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: 100%;  opacity: 0; }
}

/* ── Hover-to-reveal description on desktop ── */
@media (min-width: 768px) {
  .pl-card:hover .pl-desc {
    max-height: 120px;
    opacity: 1;
    margin-top: 4px;
  }
  .pl-card:hover .pl-glow {
    opacity: 1;
  }
  .pl-card:hover .pl-icon-ring {
    box-shadow: 0 0 16px 4px currentColor;
  }
}
`;

// ── Hook: intersection observer for scroll-triggered entrance ──────────────────

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
  const accent = `hsl(${stage.accentHue}, 70%, 55%)`;
  const accentDim = `hsla(${stage.accentHue}, 70%, 55%, 0.12)`;
  const accentBorder = `hsla(${stage.accentHue}, 70%, 55%, 0.25)`;

  return (
    <div
      className={css({
        opacity: 0,
        willChange: "transform, opacity",
      })}
      style={{
        animation: visible
          ? `plSlideUp 0.6s cubic-bezier(0.16, 1, 0.30, 1) ${index * 0.1}s forwards`
          : "none",
      }}
    >
      <div
        className={cx(
          "pl-card",
          css({
            position: "relative",
            bg: "ui.surface",
            border: "1px solid",
            borderColor: "ui.border",
            p: "5",
            transition:
              "background 300ms ease, border-color 300ms ease, transform 300ms cubic-bezier(0.16, 1, 0.30, 1)",
            cursor: "default",
            overflow: "hidden",
            _hover: {
              bg: "ui.surfaceHover",
              borderColor: "ui.borderHover",
              transform: "translateY(-2px)",
            },
          }),
        )}
        style={{
          borderTopWidth: "2px",
          borderTopColor: accentBorder,
        }}
      >
        {/* Ambient glow overlay -- revealed on hover via .pl-card:hover .pl-glow */}
        <div
          className={cx(
            "pl-glow",
            css({
              position: "absolute",
              inset: 0,
              opacity: 0,
              transition: "opacity 400ms ease",
              pointerEvents: "none",
              zIndex: 0,
            }),
          )}
          style={{
            background: `radial-gradient(ellipse at top center, ${accentDim} 0%, transparent 70%)`,
          }}
          aria-hidden
        />

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
            zIndex: 1,
          })}
          style={{ color: accentBorder }}
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
          <div
            className={cx(
              "pl-icon-ring",
              css({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                w: "10",
                h: "10",
                border: "1px solid",
                transition:
                  "border-color 300ms ease, box-shadow 400ms ease, background 300ms ease",
              }),
            )}
            style={{
              borderColor: accentBorder,
              background: accentDim,
              color: accent,
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

        {/* Description -- always visible on mobile, hover-revealed on desktop */}
        <p
          className={cx(
            "pl-desc",
            css({
              fontSize: "xs",
              color: "ui.secondary",
              lineHeight: "normal",
              position: "relative",
              zIndex: 1,
              maxHeight: { base: "120px", md: "0px" },
              overflow: "hidden",
              opacity: { base: 1, md: 0 },
              transition:
                "max-height 400ms cubic-bezier(0.16, 1, 0.30, 1), opacity 300ms ease, margin-top 300ms ease",
              mt: { base: "1", md: "0" },
            }),
          )}
        >
          {stage.description}
        </p>
      </div>
    </div>
  );
}

// ── Animated connector between stages ──────────────────────────────────────────

function Connector({
  index,
  visible,
  direction,
}: {
  index: number;
  visible: boolean;
  direction: "horizontal" | "vertical";
}) {
  const h = direction === "horizontal";
  const delay = (index + 1) * 0.1 + 0.3;

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
        width: h ? 40 : "auto",
        height: h ? 2 : 28,
        alignSelf: h ? "center" : "stretch",
        margin: h ? "0" : "0 auto",
      }}
    >
      {/* Gradient line */}
      <div
        className={css({
          position: "absolute",
        })}
        style={{
          width: h ? "100%" : 2,
          height: h ? 2 : "100%",
          transformOrigin: h ? "left center" : "top center",
          background:
            "linear-gradient(90deg, rgba(62,99,221,0.2), rgba(62,99,221,0.4), rgba(62,99,221,0.2))",
          transform: h ? "scaleX(0)" : "scaleY(0)",
          animation: visible
            ? `${h ? "plConnectorGrow" : "plConnectorGrowV"} 0.5s cubic-bezier(0.16,1,0.30,1) ${delay}s forwards`
            : "none",
        }}
      />

      {/* Traveling data dot */}
      <div
        className={css({
          position: "absolute",
          w: "1.5",
          h: "1.5",
          bg: "accent.primary",
          borderRadius: "9999px",
        })}
        style={{
          boxShadow: "0 0 6px 2px rgba(62,99,221,0.5)",
          [h ? "left" : "top"]: "0%",
          animation: visible
            ? `${h ? "plDotTravel" : "plDotTravelV"} 2s ease-in-out ${delay + 0.5}s infinite`
            : "none",
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
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      <div className={container({})}>
        {/* ── Section header ─────────────────────────────────────── */}
        <div
          className={css({
            mb: { base: "8", md: "12" },
            maxW: "520px",
            opacity: 0,
          })}
          style={{
            animation: visible
              ? "plSlideUp 0.6s cubic-bezier(0.16,1,0.30,1) 0s forwards"
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

        {/* ── Desktop: snaking horizontal flow (row 1 L-R, row 2 R-L) ─ */}
        <div
          className={css({
            display: { base: "none", md: "block" },
          })}
        >
          {/* Row 1: stages 0..3, left to right */}
          <div
            className={css({
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
            })}
          >
            {PIPELINE_STAGES.slice(0, 4).map((stage, i) => (
              <div
                key={stage.step}
                className={css({
                  display: "flex",
                  alignItems: "stretch",
                })}
              >
                <div className={css({ flex: 1, minW: "180px", maxW: "220px" })}>
                  <StageCard stage={stage} index={i} visible={visible} />
                </div>
                {i < 3 && (
                  <Connector index={i} visible={visible} direction="horizontal" />
                )}
              </div>
            ))}
          </div>

          {/* Vertical turn connector -- aligns to right end of row 1 */}
          <div
            className={css({
              display: "flex",
              justifyContent: "flex-end",
              pr: "110px",
            })}
          >
            <Connector index={3} visible={visible} direction="vertical" />
          </div>

          {/* Row 2: stages 4..6, right to left (snaking) */}
          <div
            className={css({
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
              flexDirection: "row-reverse",
            })}
          >
            {PIPELINE_STAGES.slice(4).map((stage, i) => {
              const gi = i + 4;
              return (
                <div
                  key={stage.step}
                  className={css({
                    display: "flex",
                    alignItems: "stretch",
                    flexDirection: "row-reverse",
                  })}
                >
                  <div className={css({ flex: 1, minW: "180px", maxW: "220px" })}>
                    <StageCard stage={stage} index={gi} visible={visible} />
                  </div>
                  {i < 2 && (
                    <Connector
                      index={gi}
                      visible={visible}
                      direction="horizontal"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: vertical stack with connectors ───────────────── */}
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
                <Connector
                  index={i - 1}
                  visible={visible}
                  direction="vertical"
                />
              )}
              <StageCard stage={stage} index={i} visible={visible} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
