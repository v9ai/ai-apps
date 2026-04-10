"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { BarChartIcon } from "@radix-ui/react-icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Metric {
  /** Display value for count-up (numeric portion extracted automatically) */
  value: string;
  /** Primary label below the number */
  label: string;
  /** Tertiary context line */
  context: string;
  /** Accent color override (defaults to accent.primary) */
  accent?: string;
  /** Whether this is a "hero" metric that spans 2 columns */
  hero?: boolean;
}

interface ComparisonBar {
  ours: number;
  theirs: number;
  oursLabel: string;
  theirsLabel: string;
}

interface MetricWithComparison extends Metric {
  comparison?: ComparisonBar;
}

/* ------------------------------------------------------------------ */
/*  Metric data                                                        */
/* ------------------------------------------------------------------ */

const METRICS: MetricWithComparison[] = [
  {
    value: "$1,500",
    label: "annual cost",
    context: "local inference — no cloud GPU bills",
    accent: "#30A46C",
    hero: true,
    comparison: {
      ours: 1500,
      theirs: 13200,
      oursLabel: "$1,500 local",
      theirsLabel: "$13,200 cloud",
    },
  },
  {
    value: "92%",
    label: "NER F1 score",
    context: "BERT-base + spaCy extraction",
    accent: "#3E63DD",
    hero: true,
  },
  {
    value: "300",
    label: "pages to leads",
    context: "50K pages → 300 leads (99.4% reduction)",
  },
  {
    value: "15%",
    label: "harvest rate",
    context: "3× baseline via RL crawler",
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
] as const;

/* ------------------------------------------------------------------ */
/*  Easing: custom ease-out-expo for a satisfying deceleration         */
/* ------------------------------------------------------------------ */

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/* ------------------------------------------------------------------ */
/*  useInView — reusable intersection observer hook                    */
/* ------------------------------------------------------------------ */

function useInView(threshold = 0.25) {
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

/* ------------------------------------------------------------------ */
/*  Comparison bar: visual cost comparison                             */
/* ------------------------------------------------------------------ */

function ComparisonBarVisual({
  comparison,
  visible,
}: {
  comparison: ComparisonBar;
  visible: boolean;
}) {
  const maxVal = Math.max(comparison.ours, comparison.theirs);
  const oursPct = (comparison.ours / maxVal) * 100;
  const theirsPct = (comparison.theirs / maxVal) * 100;

  return (
    <div
      className={css({
        mt: "4",
        display: "flex",
        flexDirection: "column",
        gap: "2",
      })}
    >
      {/* Ours */}
      <div>
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            mb: "1",
          })}
        >
          <span
            className={css({
              fontSize: "2xs",
              color: "status.positive",
              fontWeight: "semibold",
              letterSpacing: "wide",
              textTransform: "lowercase",
            })}
          >
            {comparison.oursLabel}
          </span>
        </div>
        <div
          className={css({
            h: "6px",
            bg: "whiteAlpha.5",
            overflow: "hidden",
          })}
        >
          <div
            className={css({
              h: "100%",
              bg: "status.positive",
              transition: "width 1.2s cubic-bezier(0.16, 1, 0.30, 1)",
            })}
            style={{ width: visible ? `${oursPct}%` : "0%" }}
          />
        </div>
      </div>

      {/* Theirs */}
      <div>
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            mb: "1",
          })}
        >
          <span
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              fontWeight: "normal",
              letterSpacing: "wide",
              textTransform: "lowercase",
            })}
          >
            {comparison.theirsLabel}
          </span>
        </div>
        <div
          className={css({
            h: "6px",
            bg: "whiteAlpha.5",
            overflow: "hidden",
          })}
        >
          <div
            className={css({
              h: "100%",
              bg: "whiteAlpha.15",
              transition: "width 1.6s cubic-bezier(0.16, 1, 0.30, 1)",
            })}
            style={{
              width: visible ? `${theirsPct}%` : "0%",
              transitionDelay: "0.2s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated metric card: count-up + reveal + optional comparison      */
/* ------------------------------------------------------------------ */

function MetricCard({
  metric,
  index,
}: {
  metric: MetricWithComparison;
  index: number;
}) {
  const { ref, visible } = useInView(0.2);
  const [display, setDisplay] = useState(metric.value);

  const { value, label, context, accent, hero, comparison } = metric;

  /* parse numeric target -- supports "92%", "182ms", "$1,500", "1ms" etc. */
  const numericMatch = value.replace(/[$,]/g, "").match(/^(\d+)(\D*)$/);
  const target = numericMatch ? parseInt(numericMatch[1], 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : "";
  const prefix = value.startsWith("$") ? "$" : "";
  const hasCommas = value.replace(/^\$/, "").includes(",");

  /* format number with commas if needed */
  const formatNum = useCallback(
    (n: number): string => {
      if (hasCommas) return n.toLocaleString("en-US");
      return String(n);
    },
    [hasCommas],
  );

  /* count-up animation with expo easing */
  useEffect(() => {
    if (!visible || !target) return;
    const duration = hero ? 1800 : 1400;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = Math.round(eased * target);
      setDisplay(prefix + formatNum(current) + suffix);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [visible, target, suffix, prefix, formatNum, hero]);

  const accentColor = accent || "#3E63DD";
  const staggerDelay = `${index * 0.08}s`;

  return (
    <div
      ref={ref}
      className={css({
        position: "relative",
        border: "1px solid",
        borderColor: "ui.border",
        bg: "ui.surface",
        p: { base: "5", md: hero ? "7" : "6" },
        transition:
          "background 200ms ease, border-color 200ms ease, box-shadow 200ms ease, opacity 0.5s cubic-bezier(0.16, 1, 0.30, 1), transform 0.5s cubic-bezier(0.16, 1, 0.30, 1)",
        _hover: {
          bg: "ui.surfaceHover",
          borderColor: "ui.borderHover",
        },
        /* stagger reveal */
        opacity: 0,
        transform: "translateY(16px)",
      })}
      style={{
        ...(visible
          ? { opacity: 1, transform: "translateY(0)" }
          : {}),
        transitionDelay: visible ? staggerDelay : "0s",
        /* subtle glow on hover via box-shadow */
        ...(hero
          ? {}
          : {}),
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 24px ${accentColor}15, 0 0 0 1px ${accentColor}20`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Accent top-line indicator */}
      <div
        className={css({
          position: "absolute",
          top: 0,
          left: 0,
          h: "2px",
          transition: "width 0.8s cubic-bezier(0.16, 1, 0.30, 1)",
        })}
        style={{
          background: accentColor,
          width: visible ? "100%" : "0%",
          transitionDelay: `${index * 0.08 + 0.2}s`,
        }}
      />

      {/* Metric number */}
      <dd
        className={css({
          fontSize: hero
            ? { base: "4xl", md: "5xl" }
            : { base: "3xl", md: "4xl" },
          fontWeight: "bold",
          letterSpacing: "tighter",
          lineHeight: "none",
          fontVariantNumeric: "tabular-nums",
          mb: "2",
        })}
        style={{ color: accentColor }}
      >
        {display}
      </dd>

      {/* Label */}
      <dt
        className={css({
          fontSize: hero ? "sm" : "xs",
          color: "ui.secondary",
          textTransform: "lowercase",
          letterSpacing: "wide",
          lineHeight: "none",
          mb: "2",
          fontWeight: "medium",
        })}
      >
        {label}
      </dt>

      {/* Context */}
      <span
        className={css({
          fontSize: "2xs",
          color: "ui.dim",
          textTransform: "lowercase",
          letterSpacing: "normal",
          lineHeight: "compact",
          display: "block",
        })}
      >
        {context}
      </span>

      {/* Optional comparison bar */}
      {comparison && (
        <ComparisonBarVisual comparison={comparison} visible={visible} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section export                                                     */
/* ------------------------------------------------------------------ */

export function LandingMetrics() {
  const { ref: sectionRef, visible: sectionVisible } = useInView(0.1);

  return (
    <section
      id="benchmarks"
      ref={sectionRef}
      className={css({
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* --- section header --- */}
        <div
          className={flex({ align: "center", gap: "2", mb: "2" })}
          style={{
            opacity: sectionVisible ? 1 : 0,
            transform: sectionVisible
              ? "translateY(0)"
              : "translateY(12px)",
            transition:
              "opacity 0.5s cubic-bezier(0.16, 1, 0.30, 1), transform 0.5s cubic-bezier(0.16, 1, 0.30, 1)",
          }}
        >
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
          style={{
            opacity: sectionVisible ? 1 : 0,
            transform: sectionVisible
              ? "translateY(0)"
              : "translateY(12px)",
            transition:
              "opacity 0.5s cubic-bezier(0.16, 1, 0.30, 1) 0.06s, transform 0.5s cubic-bezier(0.16, 1, 0.30, 1) 0.06s",
          }}
        >
          Every Agentic Lead Gen metric is measured from real pipeline runs,
          backed by 35 cited papers. See BENCHMARKS.md for methodology.
        </p>

        {/* --- hero metrics row (2 emphasized cards) --- */}
        <dl
          aria-label="Key pipeline benchmarks"
          className={grid({
            columns: { base: 1, md: 2 },
            gap: "3",
          })}
          style={{ marginBottom: "12px" }}
        >
          {METRICS.filter((m) => m.hero).map((metric, i) => (
            <MetricCard key={metric.label} metric={metric} index={i} />
          ))}
        </dl>

        {/* --- secondary metrics grid --- */}
        <dl
          aria-label="Pipeline benchmarks"
          className={grid({
            columns: { base: 2, sm: 3, md: 6 },
            gap: "3",
          })}
        >
          {METRICS.filter((m) => !m.hero).map((metric, i) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              index={i + 2}
            />
          ))}
        </dl>

        <div
          className={css({
            fontSize: "2xs",
            color: "ui.dim",
            mt: "4",
            textAlign: "center",
            letterSpacing: "wide",
            textTransform: "lowercase",
          })}
          style={{
            opacity: sectionVisible ? 1 : 0,
            transition: "opacity 0.6s ease 0.8s",
          }}
        >
          All benchmarks from local Agentic Lead Gen runs — no cherry-picked
          cloud numbers.
        </div>
      </div>
    </section>
  );
}
