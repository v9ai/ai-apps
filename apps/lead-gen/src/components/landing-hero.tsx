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
import { useEffect, useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";

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
  const { ref, display, visible } = useCountUp(value);

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
      }, 500);
      return () => clearTimeout(timeout);
    }, 5000);
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
          borderRadius: "50%",
          flexShrink: 0,
        })}
      />
      <span
        className={css({
          transition: "opacity 0.5s ease",
          opacity: vis ? 1 : 0,
        })}
      >
        {STATUS_LINES[idx]}
      </span>
    </>
  );
}

const HEADLINE_WORDS = ["Autonomous", "AI", "agents", "that"];

const STATUS_LINES = [
  "discovery agent: scanning 820 domains",
  "enrichment agent: 300 leads qualified",
  "contact agent: 47 emails verified",
  "outreach agent: 12 campaigns live",
  "agentic lead gen: all systems nominal",
] as const;

const STATS = [
  { value: "50,000+", label: "pages discovered", context: "autonomous crawl agents (RL + UCB1)" },
  { value: "300+", label: "leads qualified", context: "multi-agent enrichment pipeline" },
  { value: "92%", label: "contact accuracy", context: "AI-verified email + LinkedIn" },
  { value: "24x7", label: "agent uptime", context: "fully autonomous, zero manual work" },
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
        {/* --- brand lockup above trust badges --- */}
        <div className={flex({ justify: "center", mb: "6" })}>
          <span
            className={css({
              fontSize: { base: "3xl", md: "4xl", lg: "5xl" },
              color: "ui.heading",
              letterSpacing: "tight",
              textTransform: "uppercase",
              fontWeight: "bold",
              lineHeight: "none",
            })}
          >
            Agentic Lead Gen
          </span>
        </div>

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
            href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen"
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
            style={{ animationDelay: "0.5s" }}
          >
            Discover, enrich, and close B2B leads — autonomously.
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
          Five specialized AI agents work autonomously to find companies,
          enrich profiles, discover decision-maker contacts, and craft
          personalized outreach -- end to end, without human intervention.
          Your agents work 24/7 so you don&apos;t have to.
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
            agentic lead gen — agents active
          </span>
        </div>

        {/* --- social proof stats (count-up + stagger entrance) --- */}
        <dl
          aria-label="Agent statistics"
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
            820 domains discovered &rarr; 4,200 companies enriched &rarr; 1,100
            contacts verified &rarr; 300 personalized outreach campaigns
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
            Meet the agents
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
            View documentation
          </Link>
        </div>
      </div>
    </section>
  );
}
