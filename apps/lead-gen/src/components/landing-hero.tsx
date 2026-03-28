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
 * LANDING HERO — Agentic Lead Gen
 *
 * Copy: "autonomous AI agents that discover, enrich, and close B2B leads"
 *       -- agentic autonomy voice, agents-do-the-work manifesto.
 *
 * Badge: live rotating agent status replaces static copy.
 *        Creates liveness -- the page feels like a mission control, not a brochure.
 *
 * Animations: word-by-word headline entrance, stat count-up, CTA micro-interactions,
 *             badge scan-line overlay -- all wired from globals.css.
 *
 * Subheadline: ends with "your agents work 24/7 so you don't have to"
 *              -- a personality line that makes the page memorable.
 */

/* ------------------------------------------------------------------ */
/*  Animated stat counter: counts up from 0 on scroll into view       */
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
/*  Rotating system status indicator                                   */
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

const HEADLINE_WORDS = ["autonomous", "AI", "agents", "that"];

const STATUS_LINES = [
  "crawling 820 domains",
  "300 qualified leads today",
  "last crawl: 2h ago",
  "pipeline: nominal",
  "next crawl in 45m",
] as const;

const STATS = [
  { value: "50,000+", label: "pages crawled", context: "RL-powered exploration (DQN + UCB1)" },
  { value: "300+", label: "leads generated", context: "99.4% funnel reduction" },
  { value: "92%", label: "NER accuracy", context: "BERT extraction F1 score" },
  { value: "89%", label: "cost savings", context: "$1,500/yr vs $5,400-13,200 cloud" },
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
        {/* --- trust badge row --- */}
        <div
          className={flex({
            justify: "center",
            gap: "2",
            mb: "5",
            flexWrap: "wrap",
          })}
        >
          {/* open source badge */}
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

          {/* live rotating system status badge */}
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

          {/* cited papers -- research credibility signal */}
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
            35 cited papers
          </span>
        </div>

        {/* --- headline (staggered word entrance) --- */}
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
            style={{ animationDelay: "0.46s" }}
          >
            generate B2B leads without the cloud
          </span>
        </h1>

        {/* --- subheadline --- */}
        <p
          className={css({
            fontSize: { base: "base", md: "lg" },
            color: "ui.secondary",
            textAlign: "center",
            maxW: { base: "100%", md: "580px" },
            px: { base: "4", md: "0" },
            mx: "auto",
            mt: "5",
            lineHeight: "relaxed",
            letterSpacing: "snug",
          })}
        >
          this pipeline crawls 820+ domains with RL-powered exploration,
          extracts entities with 92.3% F1, resolves duplicates in &lt;1ms,
          and scores leads with an XGBoost ensemble. because paying $13K/year
          for a cloud CRM is not a strategy.
        </p>

        {/* --- live activity indicator --- */}
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
            pipeline active -- last crawl: today
          </span>
        </div>

        {/* --- social proof stats (count-up + stagger entrance) --- */}
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

        {/* --- funnel conversion line --- */}
        <div className={flex({ justify: "center", mt: "3" })}>
          <span
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              letterSpacing: "wide",
              textTransform: "lowercase",
            })}
          >
            50,000 pages &rarr; 4,200 entities &rarr; 1,100 resolved &rarr; 300
            qualified leads
          </span>
        </div>

        {/* --- CTA pair (arrow nudge + border sweep) --- */}
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
            href="/how-it-works"
            className={cx(
              button({ variant: "solid", size: "lg" }),
              css({ justifyContent: "center", width: { base: "100%", sm: "auto" } }),
              "cta-solid-animated",
            )}
          >
            explore the pipeline
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/docs"
            className={cx(
              button({ variant: "ghost", size: "lg" }),
              css({ justifyContent: "center", width: { base: "100%", sm: "auto" } }),
              "cta-ghost-animated",
            )}
          >
            view documentation
          </Link>
        </div>
      </div>
    </section>
  );
}
