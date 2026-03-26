"use client";

import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import { button } from "@/recipes/button";
import { pipelineCard, iconHolder } from "@/recipes/cards";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  ArrowRightIcon,
  BarChartIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

const STATS = [
  { value: "9,200+", label: "contacts" },
  { value: "460+", label: "companies" },
  { value: "1,800+", label: "jobs tracked" },
  { value: "27", label: "EU-remote matches" },
] as const;

const PIPELINE_STAGES = [
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "signal detection",
    description: "aggregate jobs from Greenhouse, Lever, and Ashby boards",
    badge: "ingest",
  },
  {
    icon: <CubeIcon width={20} height={20} />,
    title: "company enrichment",
    description: "AI-powered company profiling, funding, and stack analysis",
    badge: "enrich",
  },
  {
    icon: <PersonIcon width={20} height={20} />,
    title: "contact discovery",
    description: "find engineering managers and hiring decision makers",
    badge: "discover",
  },
  {
    icon: <EnvelopeClosedIcon width={20} height={20} />,
    title: "smart outreach",
    description: "personalized email generation grounded in company context",
    badge: "outreach",
  },
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

        {/* --- CTA buttons --- */}
        <div className={flex({ justify: "center", gap: "3", mt: "6" })}>
          <Link
            href="/how-it-works"
            className={button({ variant: "solid", size: "lg" })}
          >
            explore pipeline
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/companies"
            className={button({ variant: "ghost", size: "lg" })}
          >
            browse leads
          </Link>
        </div>

        {/* --- stats row --- */}
        <div
          className={grid({
            columns: { base: 2, md: 4 },
            gap: "0",
            mt: "10",
          })}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1",
                py: "5",
                px: "5",
                borderLeft: i === 0 || (i === 2) ? { base: "none", md: i === 0 ? "none" : "1px solid" } : "1px solid",
                borderLeftColor: "ui.border",
                /* first item on each mobile row has no left border */
                _first: { borderLeft: "none" },
                /* top border on mobile second row */
                borderTop: { base: i >= 2 ? "1px solid" : "none", md: "none" },
                borderTopColor: "ui.border",
                position: "relative",
                _before: {
                  content: '""',
                  position: "absolute",
                  top: "0",
                  left: "0",
                  width: "24px",
                  height: "2px",
                  background: i === 0
                    ? "accent.primary"
                    : i === 1
                      ? "status.positive"
                      : i === 2
                        ? "accent.primary"
                        : "status.positive",
                  display: { base: "none", md: "block" },
                },
              })}
            >
              <span
                className={css({
                  fontSize: { base: "2xl", md: "3xl" },
                  fontWeight: "bold",
                  color: "ui.heading",
                  letterSpacing: "tighter",
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
                  mt: "1",
                })}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* --- pipeline visualization --- */}
        <div className={css({ mt: "9" })}>
          {/* section header */}
          <div className={flex({ align: "center", gap: "2", mb: "4" })}>
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
              pipeline stages
            </span>
          </div>

          {/* desktop: horizontal flow with arrow connectors */}
          <div
            className={flex({
              align: "stretch",
              gap: "3",
              display: { base: "none", md: "flex" },
            })}
          >
            {PIPELINE_STAGES.map((stage, i) => (
              <div
                key={stage.title}
                className={flex({
                  align: "stretch",
                  gap: "3",
                  flex: "1",
                  minWidth: "0",
                })}
              >
                {i > 0 && (
                  <div
                    className={flex({
                      align: "center",
                      justify: "center",
                      flexShrink: 0,
                    })}
                  >
                    <ArrowRightIcon
                      width={18}
                      height={18}
                      className={css({ color: "ui.dim" })}
                    />
                  </div>
                )}
                <div className={css({ flex: "1", minWidth: "0" })}>
                  <div className={pipelineCard()}>
                    <div
                      className={flex({
                        align: "center",
                        gap: "2",
                        mb: "3",
                      })}
                    >
                      <div className={iconHolder()}>{stage.icon}</div>
                      <span className={badge({ variant: "pipeline" })}>
                        {stage.badge}
                      </span>
                    </div>
                    <p
                      className={css({
                        fontSize: "sm",
                        fontWeight: "semibold",
                        color: "ui.heading",
                        textTransform: "lowercase",
                        mb: "1",
                      })}
                    >
                      {stage.title}
                    </p>
                    <p
                      className={css({
                        fontSize: "xs",
                        color: "ui.secondary",
                        lineHeight: "normal",
                      })}
                    >
                      {stage.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* mobile: vertical stack */}
          <div
            className={grid({
              columns: 1,
              gap: "3",
              display: { base: "grid", md: "none" },
            })}
          >
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.title}>
                {i > 0 && (
                  <div className={flex({ justify: "center", mb: "3" })}>
                    <ArrowRightIcon
                      width={16}
                      height={16}
                      className={css({
                        color: "ui.dim",
                        transform: "rotate(90deg)",
                      })}
                    />
                  </div>
                )}
                <div className={pipelineCard()}>
                  <div
                    className={flex({ align: "center", gap: "2", mb: "3" })}
                  >
                    <div className={iconHolder()}>{stage.icon}</div>
                    <span className={badge({ variant: "pipeline" })}>
                      {stage.badge}
                    </span>
                  </div>
                  <p
                    className={css({
                      fontSize: "sm",
                      fontWeight: "semibold",
                      color: "ui.heading",
                      textTransform: "lowercase",
                      mb: "1",
                    })}
                  >
                    {stage.title}
                  </p>
                  <p
                    className={css({
                      fontSize: "xs",
                      color: "ui.secondary",
                      lineHeight: "normal",
                    })}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
