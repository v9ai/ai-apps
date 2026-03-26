"use client";

import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import { button } from "@/recipes/button";
import { ArrowRightIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import Link from "next/link";

/**
 * Improvement 1: Focused hero — value proposition + inline social proof.
 *
 * Removed: pipeline visualization (extracted to LandingPipeline),
 *          secondary CTA (moved to LandingClosing).
 * Reordered: stats sit directly beneath subheadline as social proof
 *            instead of being buried below CTAs and a border.
 * Single primary CTA reduces decision fatigue at the top of the page.
 */

const STATS = [
  { value: "9,200+", label: "contacts" },
  { value: "460+", label: "companies" },
  { value: "1,800+", label: "jobs tracked" },
  { value: "27", label: "EU-remote matches" },
] as const;

export function LandingHero() {
  return (
    <section
      className={css({
        pt: { base: "sectionMobile", lg: "section" },
        pb: { base: "sectionMobile", lg: "section" },
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* --- top badge --- */}
        <div className={flex({ justify: "center", mb: "5" })}>
          <span className={badge({ variant: "status", size: "md" })}>
            <LightningBoltIcon width={12} height={12} />
            multi-model AI pipeline
          </span>
        </div>

        {/* --- headline --- */}
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
          turn hiring signals into{" "}
          <span
            className={css({
              fontWeight: "bold",
              color: "transparent",
              backgroundClip: "text",
              background:
                "linear-gradient(135deg, {colors.ui.heading} 0%, {colors.accent.primary} 50%, {colors.status.positive} 100%)",
              WebkitBackgroundClip: "text",
            })}
          >
            qualified leads
          </span>
        </h1>

        {/* --- subheadline --- */}
        <p
          className={css({
            fontSize: { base: "base", md: "lg" },
            color: "ui.secondary",
            textAlign: "center",
            maxW: "520px",
            mx: "auto",
            mt: "5",
            lineHeight: "relaxed",
            letterSpacing: "snug",
          })}
        >
          an AI pipeline that finds who&apos;s hiring before they post on job
          boards — aggregating signals, enriching companies, discovering
          contacts, and generating personalized outreach at scale.
        </p>

        {/* --- social proof stats (directly after value prop) --- */}
        <div
          className={flex({
            justify: "center",
            gap: { base: "5", md: "8" },
            mt: "7",
            flexWrap: "wrap",
          })}
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className={flex({
                direction: "column",
                align: "center",
                gap: "1",
              })}
            >
              <span
                className={css({
                  fontSize: { base: "xl", md: "2xl" },
                  fontWeight: "bold",
                  color: "ui.heading",
                  letterSpacing: "tight",
                  lineHeight: "none",
                  fontVariantNumeric: "tabular-nums",
                })}
              >
                {stat.value}
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  color: "ui.tertiary",
                  textTransform: "lowercase",
                  letterSpacing: "wide",
                  lineHeight: "none",
                })}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* --- single primary CTA --- */}
        <div className={flex({ justify: "center", mt: "7" })}>
          <Link
            href="/how-it-works"
            className={button({ variant: "solid", size: "lg" })}
          >
            explore pipeline
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
