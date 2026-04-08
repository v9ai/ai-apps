"use client";

import { css, cx } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { BarChartIcon, GitHubLogoIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { useCountUp } from "@/hooks/use-count-up";

/* ------------------------------------------------------------------ */
/*  Metric data                                                        */
/* ------------------------------------------------------------------ */

interface Metric {
  /** Display value for count-up (numeric portion extracted automatically) */
  value: string;
  /** Primary label below the number */
  label: string;
  /** Tertiary context line */
  context: string;
}

const METRICS: Metric[] = [
  {
    value: "300",
    label: "pages to leads",
    context: "50K pages \u2192 300 leads (99.4% reduction)",
  },
  {
    value: "15%",
    label: "harvest rate",
    context: "3\u00D7 baseline via RL crawler",
  },
  {
    value: "92%",
    label: "NER F1 score",
    context: "BERT-base + spaCy extraction",
  },
  {
    value: "1ms",
    label: "ANN latency",
    context: "siamese 128-dim entity resolution",
  },
  {
    value: "89%",
    label: "scoring precision",
    context: "89.7% precision / 86.5% recall",
  },
  {
    value: "97%",
    label: "factual accuracy",
    context: "RAG report generation via ollama",
  },
  {
    value: "182ms",
    label: "per-lead latency",
    context: "end-to-end without LLM step",
  },
  {
    value: "1,500",
    label: "annual cost",
    context: "$1,500 local vs $13,200 cloud",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Animated metric card: count-up triggered by IntersectionObserver   */
/* ------------------------------------------------------------------ */

function MetricCard({ value, label, context }: Metric) {
  const { ref, display, visible } = useCountUp(value);

  return (
    <div
      ref={ref}
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        bg: "ui.surface",
        p: { base: "4", md: "5" },
        transition: "background 150ms ease, border-color 150ms ease",
        _hover: {
          bg: "ui.surfaceHover",
          borderColor: "ui.borderHover",
        },
      })}
    >
      <dd
        className={cx(
          css({
            fontSize: { base: "2xl", md: "3xl" },
            fontWeight: "bold",
            color: "ui.heading",
            letterSpacing: "tight",
            lineHeight: "none",
            fontVariantNumeric: "tabular-nums",
            mb: "2",
          }),
          visible ? "stat-value-inner" : undefined,
        )}
      >
        {display}
      </dd>
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
      })}
    >
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
            mb: "5",
            lineHeight: "relaxed",
            letterSpacing: "snug",
            maxW: "560px",
          })}
        >
          Every Agentic Lead Gen metric is measured from real pipeline runs,
          backed by 35 cited papers. See BENCHMARKS.md for methodology.
        </p>

        {/* --- metric grid --- */}
        <dl
          aria-label="Pipeline benchmarks"
          className={grid({
            columns: { base: 2, md: 4 },
            gap: "3",
          })}
        >
          {METRICS.map((metric) => (
            <MetricCard
              key={metric.label}
              value={metric.value}
              label={metric.label}
              context={metric.context}
            />
          ))}
        </dl>

        <div
          className={css({
            fontSize: "2xs",
            color: "ui.dim",
            mt: "3",
            textAlign: "center",
            letterSpacing: "wide",
            textTransform: "lowercase",
          })}
        >
          All benchmarks from local runs — no cherry-picked cloud numbers.
        </div>

        {/* --- builder attribution (merged from standalone section) --- */}
        <div
          className={css({
            mt: "8",
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
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
                <span className={css({ fontWeight: "bold" })}>Vadim Nicolai</span>
                {" "}&mdash; an AI engineer who got tired of paying $10K+/year for
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
