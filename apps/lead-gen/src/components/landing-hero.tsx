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
 * Redesigned with:
 *  - CSS gradient headline (indigo -> white)
 *  - Animated background glow (CSS-only radial pulse)
 *  - Clearer visual hierarchy: primary solid + secondary outline CTAs
 *  - Stats row with separator dividers
 *  - Mobile-first responsive layout (base/lg breakpoints)
 */

/* ------------------------------------------------------------------ */
/*  Animated stat counter: counts up from 0 on scroll into view       */
/* ------------------------------------------------------------------ */
function AnimatedStat({
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
            fontSize: { base: "2xl", lg: "3xl" },
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
          mt: "2px",
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

const STATUS_LINES = [
  "discovery agent: scanning 820 domains",
  "enrichment agent: 300 leads qualified",
  "contact agent: 47 emails verified",
  "outreach agent: 12 campaigns live",
  "agentic lead gen: all systems nominal",
] as const;

const STATS = [
  {
    value: "50,000+",
    label: "pages discovered",
    context: "autonomous crawl agents (RL + UCB1)",
  },
  {
    value: "300+",
    label: "leads qualified",
    context: "multi-agent enrichment pipeline",
  },
  {
    value: "92%",
    label: "contact accuracy",
    context: "AI-verified email + LinkedIn",
  },
  {
    value: "24x7",
    label: "agent uptime",
    context: "fully autonomous, zero manual work",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const heroSectionStyle = css({
  position: "relative",
  pt: { base: "sectionMobile", lg: "section" },
  pb: { base: "sectionMobile", lg: "section" },
  scrollMarginTop: "56px",
  overflow: "hidden",
});

const glowStyle = css({
  position: "absolute",
  top: { base: "-120px", lg: "-200px" },
  left: "50%",
  transform: "translateX(-50%)",
  width: { base: "400px", lg: "700px" },
  height: { base: "400px", lg: "700px" },
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(62, 99, 221, 0.15) 0%, rgba(62, 99, 221, 0.05) 40%, transparent 70%)",
  pointerEvents: "none",
  animation: "hero-glow-pulse 6s ease-in-out infinite",
  zIndex: 0,
});

const headlineStyle = css({
  fontSize: { base: "4xl", lg: "6xl" },
  fontWeight: "bold",
  letterSpacing: "tighter",
  lineHeight: { base: "snug", lg: "tight" },
  textAlign: "center",
  maxW: { base: "100%", lg: "820px" },
  mx: "auto",
  px: { base: "4", lg: "0" },
  position: "relative",
  zIndex: 1,
});

const gradientTextStyle = css({
  color: "transparent",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  background:
    "linear-gradient(135deg, {colors.accent.primary} 0%, {colors.ui.heading} 60%, {colors.ui.heading} 100%)",
  display: "inline",
});

const subheadlineStyle = css({
  fontSize: { base: "base", lg: "lg" },
  color: "ui.secondary",
  textAlign: "center",
  maxW: { base: "100%", lg: "600px" },
  px: { base: "4", lg: "0" },
  mx: "auto",
  mt: { base: "4", lg: "6" },
  lineHeight: "relaxed",
  letterSpacing: "snug",
  position: "relative",
  zIndex: 1,
});

const statsDividerStyle = css({
  display: { base: "none", lg: "block" },
  width: "1px",
  height: "40px",
  background: "ui.border",
  flexShrink: 0,
  alignSelf: "center",
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LandingHero() {
  return (
    <section id="hero" className={heroSectionStyle}>
      {/* CSS-only animated background glow */}
      <div className={glowStyle} aria-hidden="true" />

      <div
        className={container({})}
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* --- trust badge row --- */}
        <div
          className={flex({
            justify: "center",
            gap: "2",
            mb: { base: "6", lg: "8" },
            flexWrap: "wrap",
          })}
        >
          {/* open source badge */}
          <a
            href="https://github.com/v9ai/ai-apps/tree/main/apps/lead-gen"
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "4px",
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

          {/* cited papers */}
          <span
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              borderRadius: "4px",
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

        {/* --- headline with gradient text --- */}
        <h1 className={headlineStyle}>
          <span className={gradientTextStyle}>Autonomous AI agents</span>
          <br className={css({ display: { base: "none", lg: "block" } })} />
          <span
            className={css({
              color: "ui.heading",
              fontWeight: "light",
              display: "inline",
            })}
          >
            {" "}
            that discover, enrich, and
          </span>
          <br className={css({ display: { base: "none", lg: "block" } })} />
          <span
            className={css({
              color: "ui.heading",
              fontWeight: "light",
              display: "inline",
            })}
          >
            {" "}
            close B2B leads
          </span>
        </h1>

        {/* --- subheadline --- */}
        <p className={subheadlineStyle}>
          Five specialized AI agents work autonomously to find companies, enrich
          profiles, discover decision-maker contacts, and craft personalized
          outreach. Your agents work 24/7 so you don&apos;t have to.
        </p>

        {/* --- CTA pair --- */}
        <div
          className={flex({
            justify: "center",
            gap: "3",
            mt: { base: "6", lg: "8" },
            direction: { base: "column", sm: "row" },
            px: { base: "4", sm: "0" },
            position: "relative",
            zIndex: 1,
          })}
        >
          <Link
            href="/how-it-works"
            className={cx(
              button({ variant: "solid", size: "lg" }),
              css({
                justifyContent: "center",
                width: { base: "100%", sm: "auto" },
              }),
              "cta-solid-animated",
            )}
          >
            meet the agents
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>

        {/* --- live activity indicator --- */}
        <div
          className={flex({
            justify: "center",
            mt: { base: "8", lg: "10" },
            mb: "2",
          })}
        >
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
            agentic lead gen — agents active
          </span>
        </div>

        {/* --- social proof stats with dividers --- */}
        <dl
          aria-label="Agent statistics"
          className={cx(
            css({
              display: "flex",
              flexDirection: { base: "column", lg: "row" },
              justifyContent: "center",
              alignItems: "center",
              gap: { base: "5", lg: "0" },
              mt: "6",
              px: { base: "4", lg: "0" },
            }),
            "stats-row-animated",
          )}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: { base: "0", lg: "0" },
              })}
            >
              {i > 0 && <div className={statsDividerStyle} style={{ marginLeft: 32, marginRight: 32 }} />}
              <AnimatedStat
                value={stat.value}
                label={stat.label}
                context={stat.context}
              />
            </div>
          ))}
        </dl>

        {/* --- funnel conversion line --- */}
        <div className={flex({ justify: "center", mt: "4" })}>
          <span
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              letterSpacing: "wide",
              textTransform: "lowercase",
              textAlign: "center",
              lineHeight: "relaxed",
              px: { base: "4", lg: "0" },
            })}
          >
            820 domains discovered &rarr; 4,200 companies enriched &rarr; 1,100
            contacts verified &rarr; 300 personalized outreach campaigns
          </span>
        </div>
      </div>
    </section>
  );
}
