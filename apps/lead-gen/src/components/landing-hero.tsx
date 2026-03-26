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
            fontWeight: "bold",
            color: "ui.heading",
            letterSpacing: "tighter",
            lineHeight: { base: "snug", lg: "tight" },
            textAlign: "center",
            maxW: "780px",
            mx: "auto",
          })}
        >
          turn hiring signals into qualified leads
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
          className={flex({
            justify: "center",
            gap: "6",
            mt: "8",
            pt: "6",
            flexWrap: "wrap",
            borderTop: "1px solid",
            borderColor: "ui.border",
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
