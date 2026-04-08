"use client";

import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  GitHubLogoIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

/**
 * LANDING HERO — Agentic Lead Gen
 *
 * Simplified 4-element hero: eyebrow > headline > subheadline > CTAs.
 * Stats, funnel line, activity indicator, and rotating status moved to
 * dedicated sections below where they have better context.
 */

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
        {/* --- eyebrow label --- */}
        <div className={flex({ justify: "center", mb: "4" })}>
          <span
            className={css({
              fontSize: "2xs",
              fontWeight: "bold",
              color: "accent.primary",
              textTransform: "uppercase",
              letterSpacing: "editorial",
            })}
          >
            Agentic Lead Gen
          </span>
        </div>

        {/* --- headline --- */}
        <h1
          className={css({
            fontSize: { base: "4xl", md: "5xl", lg: "6xl" },
            fontWeight: "normal",
            color: "ui.heading",
            letterSpacing: "tighter",
            lineHeight: { base: "snug", lg: "tight" },
            textAlign: "center",
            maxW: "780px",
            mx: "auto",
          })}
        >
          <span className="headline-word">Autonomous AI agents that </span>
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
            discover, enrich, and close B2B leads.
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
          End-to-end B2B pipeline that runs 24/7 without human intervention.
          Open source, local-first, $1,500/year.
        </p>

        {/* --- CTA pair --- */}
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
            href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen#deploy"
            className={cx(
              button({ variant: "solid", size: "lg" }),
              css({ justifyContent: "center", width: { base: "100%", sm: "auto" } }),
              "cta-solid-animated",
            )}
          >
            Clone and deploy
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/how-it-works"
            className={cx(
              button({ variant: "ghost", size: "lg" }),
              css({ justifyContent: "center", width: { base: "100%", sm: "auto" } }),
              "cta-ghost-animated",
            )}
          >
            <GitHubLogoIcon width={14} height={14} />
            See the pipeline
          </Link>
        </div>
      </div>
    </section>
  );
}
