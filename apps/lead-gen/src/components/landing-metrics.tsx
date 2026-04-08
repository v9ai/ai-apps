"use client";

import { css, cx } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import {
  BarChartIcon,
  GitHubLogoIcon,
  CheckCircledIcon,
  LightningBoltIcon,
  TargetIcon,
  CubeIcon,
} from "@radix-ui/react-icons";
import { useCountUp } from "@/hooks/use-count-up";

/* ------------------------------------------------------------------ */
/*  Metric data — grouped by category                                  */
/* ------------------------------------------------------------------ */

interface Metric {
  value: string;
  label: string;
  context: string;
  /** Comparison string shown below the main value */
  comparison?: string;
  /** Whether this metric should get the accent glow treatment */
  highlighted?: boolean;
}

interface MetricGroup {
  category: string;
  icon: React.ReactNode;
  metrics: Metric[];
}

const METRIC_GROUPS: MetricGroup[] = [
  {
    category: "performance",
    icon: (
      <LightningBoltIcon
        width={11}
        height={11}
        className={css({ color: "accent.primary" })}
      />
    ),
    metrics: [
      {
        value: "300",
        label: "pages to leads",
        context: "50K pages \u2192 300 leads (99.4% reduction)",
        comparison: "vs 2\u20134% industry conversion",
      },
      {
        value: "15%",
        label: "harvest rate",
        context: "3\u00D7 baseline via RL crawler",
        comparison: "vs 5% typical scraper yield",
      },
      {
        value: "1ms",
        label: "ANN latency",
        context: "siamese 128-dim entity resolution",
        comparison: "vs 50\u2013200ms cloud API",
        highlighted: true,
      },
      {
        value: "182ms",
        label: "per-lead latency",
        context: "end-to-end without LLM step",
        comparison: "vs 2\u20135s cloud pipeline",
      },
    ],
  },
  {
    category: "accuracy",
    icon: (
      <TargetIcon
        width={11}
        height={11}
        className={css({ color: "status.positive" })}
      />
    ),
    metrics: [
      {
        value: "92%",
        label: "NER F1 score",
        context: "BERT-base + spaCy extraction",
        comparison: "vs 85% GPT-3.5 zero-shot",
        highlighted: true,
      },
      {
        value: "89%",
        label: "scoring precision",
        context: "89.7% precision / 86.5% recall",
        comparison: "vs 70\u201380% rule-based",
      },
      {
        value: "97%",
        label: "factual accuracy",
        context: "RAG report generation",
        comparison: "vs 82% vanilla LLM",
        highlighted: true,
      },
    ],
  },
  {
    category: "cost",
    icon: (
      <CubeIcon
        width={11}
        height={11}
        className={css({ color: "accent.primary" })}
      />
    ),
    metrics: [
      {
        value: "1,500",
        label: "annual cost",
        context: "local M-series Mac Mini inference",
        comparison: "vs $13,200/yr cloud",
        highlighted: true,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Animated metric card                                               */
/* ------------------------------------------------------------------ */

function MetricCard({
  value,
  label,
  context,
  comparison,
  highlighted,
}: Metric) {
  const { ref, display, visible } = useCountUp(value);

  return (
    <div
      ref={ref}
      className={cx(
        css({
          border: "1px solid",
          borderColor: highlighted ? "accent.border" : "ui.border",
          bg: highlighted ? "accent.subtle" : "ui.surface",
          p: { base: "4", md: "5" },
          transition:
            "background 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
          position: "relative",
          _hover: {
            bg: "ui.surfaceHover",
            borderColor: highlighted ? "accent.primary" : "ui.borderHover",
          },
        }),
        highlighted ? "metric-glow" : undefined,
        visible ? "metric-card-animate" : undefined,
      )}
    >
      {/* accent top border for highlighted */}
      {highlighted && (
        <div
          className={css({
            position: "absolute",
            top: "-1px",
            left: "-1px",
            right: "-1px",
            h: "2px",
            bg: "accent.primary",
          })}
        />
      )}

      <dd
        className={cx(
          css({
            fontSize: { base: "2xl", md: "3xl" },
            fontWeight: "bold",
            color: highlighted ? "accent.contrast" : "ui.heading",
            letterSpacing: "tight",
            lineHeight: "none",
            fontVariantNumeric: "tabular-nums",
            mb: "1",
          }),
          visible ? "stat-value-inner" : undefined,
        )}
      >
        {label === "annual cost" && (
          <span
            className={css({
              fontSize: { base: "lg", md: "xl" },
              fontWeight: "normal",
              color: "ui.tertiary",
              mr: "1px",
            })}
          >
            $
          </span>
        )}
        {display}
        {label === "annual cost" && (
          <span
            className={css({
              fontSize: { base: "xs", md: "sm" },
              fontWeight: "normal",
              color: "ui.tertiary",
              ml: "2px",
            })}
          >
            /yr
          </span>
        )}
      </dd>

      {/* comparison line */}
      {comparison && (
        <span
          className={css({
            display: "block",
            fontSize: "2xs",
            color: "status.positive",
            letterSpacing: "normal",
            lineHeight: "none",
            mb: "2",
          })}
        >
          {comparison}
        </span>
      )}

      <dt
        className={css({
          fontSize: "xs",
          color: "ui.secondary",
          textTransform: "lowercase",
          letterSpacing: "wide",
          lineHeight: "none",
          mb: "1",
        })}
      >
        {label}
      </dt>
      <span
        className={css({
          fontSize: "2xs",
          color: "ui.dim",
          textTransform: "lowercase",
          letterSpacing: "normal",
          lineHeight: "normal",
        })}
      >
        {context}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category group wrapper                                             */
/* ------------------------------------------------------------------ */

function MetricGroupSection({ category, icon, metrics }: MetricGroup) {
  /* cost group gets a single wide card instead of grid */
  const isCostGroup = category === "cost";

  return (
    <div className={css({ mb: "5" })}>
      {/* category label */}
      <div
        className={flex({
          align: "center",
          gap: "1.5",
          mb: "2",
        })}
      >
        {icon}
        <span
          className={css({
            fontSize: "2xs",
            fontWeight: "bold",
            color: "ui.dim",
            textTransform: "uppercase",
            letterSpacing: "editorial",
          })}
        >
          {category}
        </span>
      </div>

      {/* metric cards */}
      <dl
        aria-label={`${category} metrics`}
        className={cx(
          isCostGroup
            ? grid({
                columns: { base: 1, md: 1 },
                gap: "3",
              })
            : grid({
                columns: {
                  base: 1,
                  sm: 2,
                  md: metrics.length === 3 ? 3 : 4,
                },
                gap: "3",
              }),
          "metric-group-grid",
        )}
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section export                                                     */
/* ------------------------------------------------------------------ */

export function LandingMetrics() {
  return (
    <section
      id="benchmarks"
      className={css({
        pt: { base: "sectionMobile", lg: "section" },
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
        /* subtle background differentiation */
        bg: "ui.surface",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "ui.border",
        position: "relative",
        overflow: "hidden",
      })}
    >
      {/* faint radial glow behind the section */}
      <div
        className={css({
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          w: "800px",
          h: "400px",
          background:
            "radial-gradient(ellipse at center, rgba(62, 99, 221, 0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        })}
      />

      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* --- section header --- */}
        <div className={flex({ align: "center", gap: "2", mb: "2" })}>
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
            agentic lead gen — benchmarks
          </span>
        </div>

        <p
          className={css({
            fontSize: { base: "base", md: "lg" },
            color: "ui.tertiary",
            mb: "6",
            lineHeight: "relaxed",
            letterSpacing: "snug",
            maxW: "560px",
          })}
        >
          Every metric is measured from real pipeline runs, backed by 35 cited
          papers. Comparisons shown against cloud SaaS and industry baselines.
        </p>

        {/* --- grouped metric sections --- */}
        {METRIC_GROUPS.map((group) => (
          <MetricGroupSection key={group.category} {...group} />
        ))}

        <div
          className={css({
            fontSize: "2xs",
            color: "ui.dim",
            mt: "1",
            textAlign: "center",
            letterSpacing: "wide",
            textTransform: "lowercase",
          })}
        >
          All benchmarks from local runs — no cherry-picked cloud numbers.
        </div>

        {/* --- builder attribution --- */}
        <div
          className={css({
            mt: "8",
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surfaceRaised",
            px: { base: "5", md: "6" },
            py: { base: "4", md: "5" },
          })}
        >
          <div
            className={flex({
              direction: { base: "column", md: "row" },
              align: { base: "start", md: "center" },
              gap: { base: "3", md: "5" },
            })}
          >
            <div
              className={css({
                w: "40px",
                h: "40px",
                bg: "accent.subtle",
                border: "1px solid",
                borderColor: "accent.border",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "sm",
                fontWeight: "bold",
                color: "accent.primary",
                letterSpacing: "tight",
              })}
            >
              VN
            </div>
            <div className={css({ flex: 1, minWidth: 0 })}>
              <p
                className={css({
                  fontSize: { base: "sm", md: "base" },
                  color: "ui.heading",
                  lineHeight: "relaxed",
                  letterSpacing: "snug",
                })}
              >
                Built by{" "}
                <span className={css({ fontWeight: "bold" })}>
                  Vadim Nicolai
                </span>{" "}
                &mdash; an AI engineer who got tired of paying $10K+/year for
                cloud CRMs. Autonomous agents crawl, extract, score, and enrich
                B2B prospects end-to-end.
              </p>
              <div
                className={flex({
                  align: "center",
                  gap: "4",
                  mt: "2",
                  flexWrap: "wrap",
                })}
              >
                <span
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "2xs",
                    color: "status.positive",
                    letterSpacing: "wide",
                    textTransform: "lowercase",
                  })}
                >
                  <CheckCircledIcon width={10} height={10} />
                  35 cited papers
                </span>
                <a
                  href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(
                    flex({
                      align: "center",
                      gap: "1.5",
                    }),
                    css({
                      color: "ui.tertiary",
                      fontSize: "2xs",
                      textDecoration: "none",
                      letterSpacing: "wide",
                      textTransform: "lowercase",
                      transition: "color 150ms ease",
                      _hover: { color: "ui.secondary" },
                    }),
                  )}
                >
                  <GitHubLogoIcon width={12} height={12} />
                  view source
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
