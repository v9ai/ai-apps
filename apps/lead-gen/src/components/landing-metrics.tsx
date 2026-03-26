"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { css, cx } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { BarChartIcon } from "@radix-ui/react-icons";

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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(value);

  /* parse numeric target -- supports "92%", "182ms", "1,500", "1ms" etc. */
  const numericMatch = value.replace(/,/g, "").match(/^(\d+)(\D*)$/);
  const target = numericMatch ? parseInt(numericMatch[1], 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : "";
  const hasCommas = value.includes(",");

  /* observe scroll into view */
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
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* count-up animation */
  const formatNum = useCallback(
    (n: number): string => {
      if (hasCommas) return n.toLocaleString("en-US");
      return String(n);
    },
    [hasCommas],
  );

  useEffect(() => {
    if (!visible || !target) return;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setDisplay(formatNum(current) + suffix);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [visible, target, suffix, formatNum]);

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
            pipeline benchmarks
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
          every number measured, every claim paper-backed. see BENCHMARKS.md for
          methodology.
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
      </div>
    </section>
  );
}
