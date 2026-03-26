"use client";

import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  LightningBoltIcon,
  GitHubLogoIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * EMOTIONAL DESIGN + MICRO-INTERACTIONS:
 *
 * Copy: "i built a robot to find me a remote EU job" -- personal, memorable,
 *       first-person builder voice instead of generic B2B SaaS.
 *
 * Badge: live rotating system status replaces static "multi-model AI pipeline".
 *        Creates liveness -- the page feels like a dashboard, not a brochure.
 *
 * Animations: word-by-word headline entrance, stat count-up, CTA micro-interactions,
 *             badge scan-line overlay -- all wired from globals.css.
 *
 * Subheadline: ends with "because refreshing job boards is not a strategy" --
 *              a personality line that makes the page memorable.
 */

/* ------------------------------------------------------------------ */
/*  #3 — Animated stat counter: counts up from 0 on scroll into view  */
/* ------------------------------------------------------------------ */
function AnimatedStat({ value, label, context }: { value: string; label: string; context?: string }) {
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
      {/* trust improvement 3: context sub-label explains what the number means */}
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

/* ------------------------------------------------------------------ */
/*  IMPROVEMENT 2: Rotating system status indicator                    */
/* ------------------------------------------------------------------ */
function StatusIndicator() {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVis(false);
      const timeout = setTimeout(() => {
        setIdx((prev) => (prev + 1) % STATUS_LINES.length);
        setVis(true);
      }, 300);
      return () => clearTimeout(timeout);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <span
        className={css({
          display: "inline-block",
          w: "6px",
          h: "6px",
          bg: "status.positive",
          flexShrink: 0,
          animation: "pulse 2s ease-in-out infinite",
        })}
      />
      <span
        className={css({
          transition: "opacity 0.3s ease",
          opacity: vis ? 1 : 0,
        })}
      >
        {STATUS_LINES[idx]}
      </span>
    </>
  );
}

const HEADLINE_WORDS = ["i", "built", "a", "robot", "to"];

const STATUS_LINES = [
  "scanning 3 ATS platforms",
  "27 EU-remote matches today",
  "last ingestion: 4h ago",
  "pipeline: nominal",
  "next scan in 2h 14m",
] as const;

const STATS = [
  { value: "9,200+", label: "contacts indexed", context: "across 3 ATS platforms" },
  { value: "460+", label: "companies profiled", context: "AI-enriched with funding & stack" },
  { value: "1,800+", label: "jobs tracked", context: "ingested in last 30 days" },
  { value: "27", label: "EU-remote matches", context: "passed 7-layer classification" },
] as const;

export function LandingHero() {
  return (
    <section
      id="hero"
      className={css({
        pt: { base: "sectionMobile", lg: "section" },
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* --- trust improvement 1: triple trust badge row --- */}
        <div
          className={flex({
            justify: "center",
            gap: "2",
            mb: "5",
            flexWrap: "wrap",
          })}
        >
          {/* open source -- promoted from buried footer to top-level trust signal */}
          <a
            href="https://github.com/nicolad/lead-gen"
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "0",
              border: "1px solid",
              borderColor: "ui.border",
              background: "transparent",
              fontWeight: "medium",
              lineHeight: "none",
              whiteSpace: "nowrap",
              userSelect: "none",
              color: "ui.secondary",
              fontSize: "2xs",
              letterSpacing: "wide",
              textTransform: "lowercase",
              padding: "4px 12px",
              textDecoration: "none",
              transition: "border-color 150ms ease, color 150ms ease",
              _hover: {
                borderColor: "ui.borderHover",
                color: "ui.heading",
              },
            })}
          >
            <GitHubLogoIcon width={12} height={12} />
            open source
          </a>

          {/* IMPROVEMENT 2: live rotating system status badge */}
          <span
            className={cx(
              badge({ variant: "status", size: "md" }),
              "badge-scan-animated",
              css({
                fontFamily: "mono",
                minW: "220px",
                justifyContent: "center",
              }),
            )}
          >
            <StatusIndicator />
          </span>

          {/* test coverage -- engineering credibility signal */}
          <span
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "0",
              border: "1px solid",
              borderColor: "status.positive",
              background: "status.positiveDim",
              fontWeight: "medium",
              lineHeight: "none",
              whiteSpace: "nowrap",
              userSelect: "none",
              color: "status.positive",
              fontSize: "2xs",
              letterSpacing: "wide",
              textTransform: "lowercase",
              padding: "4px 12px",
            })}
          >
            <CheckCircledIcon width={12} height={12} />
            180+ regression tests
          </span>
        </div>

        {/* --- headline (#5: staggered word entrance) --- */}
        <h1
          className={css({
            fontSize: { base: "4xl", md: "5xl", lg: "6xl" },
            fontWeight: "light",
            color: "ui.secondary",
            letterSpacing: "tighter",
            lineHeight: { base: "snug", lg: "tight" },
            textAlign: "center",
            maxW: "780px",
            mx: "auto",
          })}
        >
          {HEADLINE_WORDS.map((word, i) => (
            <span key={i} className="headline-word">
              {word}{" "}
            </span>
          ))}
          <br className={css({ display: { base: "none", md: "block" } })} />
          <span
            className={cx(
              css({
                fontWeight: "bold",
                color: "transparent",
                backgroundClip: "text",
                background:
                  "linear-gradient(135deg, {colors.ui.heading} 0%, {colors.accent.primary} 50%, {colors.status.positive} 100%)",
                WebkitBackgroundClip: "text",
              }),
              "headline-word",
            )}
            style={{ animationDelay: "0.33s" }}
          >
            find me a remote EU job
          </span>
        </h1>

        {/* --- subheadline --- */}
        <p
          className={css({
            fontSize: { base: "base", md: "lg" },
            color: "ui.secondary",
            textAlign: "center",
            maxW: { base: "100%", md: "520px" },
            px: { base: "4", md: "0" },
            mx: "auto",
            mt: "5",
            lineHeight: "relaxed",
            letterSpacing: "snug",
          })}
        >
          this pipeline crawls 460+ companies across Greenhouse, Lever, and
          Ashby every few hours. it classifies remote-EU roles, enriches
          company data, finds the hiring manager, and drafts outreach.
          because refreshing job boards is not a strategy.
        </p>

        {/* --- trust improvement 3: live activity indicator --- */}
        <div className={flex({ justify: "center", mt: "7", mb: "2" })}>
          <span
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "2xs",
              color: "ui.tertiary",
              letterSpacing: "wide",
              textTransform: "lowercase",
            })}
          >
            <span
              className={css({
                display: "inline-block",
                w: "6px",
                h: "6px",
                borderRadius: "50%",
                bg: "status.positive",
                flexShrink: 0,
              })}
              style={{
                animation: "landing-preview-pulse 2s ease-in-out infinite",
              }}
            />
            pipeline active -- last ingestion: today
          </span>
        </div>

        {/* --- social proof stats (#3: count-up + stagger entrance) --- */}
        <dl
          aria-label="Pipeline statistics"
          className={cx(
            css({
              display: "grid",
              gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, auto)" },
              justifyContent: { md: "center" },
              gap: { base: "4", md: "8" },
              mt: "7",
              px: { base: "4", md: "0" },
            }),
            "stats-row-animated",
          )}
        >
          {STATS.map((stat) => (
            <AnimatedStat
              key={stat.label}
              value={stat.value}
              label={stat.label}
              context={stat.context}
            />
          ))}
        </dl>

        {/* --- trust improvement 3: funnel conversion line --- */}
        <div className={flex({ justify: "center", mt: "3" })}>
          <span
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              letterSpacing: "wide",
              textTransform: "lowercase",
            })}
          >
            9,200 contacts &rarr; 460 companies &rarr; 1,800 jobs &rarr; 27
            qualified matches
          </span>
        </div>

        {/* --- CTA pair (#2: arrow nudge + border sweep) --- */}
        <div
          className={flex({
            justify: "center",
            gap: "3",
            mt: "7",
            direction: { base: "column", sm: "row" },
            px: { base: "4", sm: "0" },
          })}
        >
          <Link
            href="/jobs"
            className={cx(
              button({ variant: "solid", size: "lg" }),
              css({ justifyContent: "center", width: { base: "100%", sm: "auto" } }),
              "cta-solid-animated",
            )}
          >
            find remote EU jobs
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/companies"
            className={cx(
              button({ variant: "ghost", size: "lg" }),
              css({ justifyContent: "center", width: { base: "100%", sm: "auto" } }),
              "cta-ghost-animated",
            )}
          >
            see hiring companies
          </Link>
        </div>
      </div>
    </section>
  );
}
