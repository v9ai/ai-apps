"use client";

import { useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";

/**
 * Client component: animated stat counter.
 *
 * Extracted from LandingHero so the hero itself can be a server component.
 * This is the ONLY interactive piece — it uses IntersectionObserver to
 * trigger a count-up animation when the stat scrolls into view.
 *
 * JS footprint: ~1.2 KB gzipped (useRef + useState + useEffect + rAF loop).
 */
export function AnimatedStat({
  value,
  label,
  context,
}: {
  value: string;
  label: string;
  context?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(value);

  const numericMatch = value.replace(/,/g, "").match(/^(\d+)(\D*)$/);
  const target = numericMatch ? parseInt(numericMatch[1], 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : "";
  const hasCommas = value.includes(",");

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

  useEffect(() => {
    if (!visible || !target) return;
    const duration = 1200;
    const startTime = performance.now();

    function formatNum(n: number): string {
      if (hasCommas) return n.toLocaleString("en-US");
      return String(n);
    }

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setDisplay(formatNum(current) + suffix);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [visible, target, suffix, hasCommas]);

  return (
    <div
      ref={ref}
      role="group"
      className={flex({ direction: "column", align: "center", gap: "1" })}
    >
      <dd
        className={cx(
          css({
            fontSize: { base: "xl", md: "2xl" },
            fontWeight: "bold",
            color: "ui.heading",
            letterSpacing: "tight",
            lineHeight: "none",
            fontVariantNumeric: "tabular-nums",
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
        })}
      >
        {label}
      </dt>
      {context && (
        <span
          className={css({
            fontSize: "2xs",
            color: "ui.dim",
            textTransform: "lowercase",
            letterSpacing: "normal",
            lineHeight: "normal",
            mt: "1px",
          })}
        >
          {context}
        </span>
      )}
    </div>
  );
}
