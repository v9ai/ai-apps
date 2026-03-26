"use client";

import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import { pipelineCard, iconHolder } from "@/recipes/cards";
import {
  MagnifyingGlassIcon,
  CubeIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  ArrowRightIcon,
  BarChartIcon,
} from "@radix-ui/react-icons";

/**
 * Improvement 2: Pipeline visualization as its own narrative section.
 *
 * Extracted from the hero to create a clear "how it works" beat in the
 * page flow. Sits between hero (the promise) and preview (the proof).
 * Has its own section heading and a short introductory sentence so
 * users understand what they are looking at without context from above.
 */

const PIPELINE_STAGES = [
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "signal detection",
    description: "aggregate jobs from Greenhouse, Lever, and Ashby boards",
    badge: "ingest",
    step: "01",
    accentOpacity: 0.3,
  },
  {
    icon: <CubeIcon width={20} height={20} />,
    title: "company enrichment",
    description: "AI-powered company profiling, funding, and stack analysis",
    badge: "enrich",
    step: "02",
    accentOpacity: 0.5,
  },
  {
    icon: <PersonIcon width={20} height={20} />,
    title: "contact discovery",
    description: "find engineering managers and hiring decision makers",
    badge: "discover",
    step: "03",
    accentOpacity: 0.75,
  },
  {
    icon: <EnvelopeClosedIcon width={20} height={20} />,
    title: "smart outreach",
    description: "personalized email generation grounded in company context",
    badge: "outreach",
    step: "04",
    accentOpacity: 1,
  },
] as const;

export function LandingPipeline() {
  return (
    <section
      className={css({
        pb: { base: "sectionMobile", lg: "section" },
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
            pipeline stages
          </span>
        </div>

        <p
          className={css({
            fontSize: { base: "base", md: "lg" },
            color: "ui.tertiary",
            mb: "5",
            lineHeight: "relaxed",
            letterSpacing: "snug",
            maxW: "480px",
          })}
        >
          four stages transform raw job postings into personalized outreach.
        </p>

        {/* --- desktop: horizontal flow with arrow connectors --- */}
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
                <div
                  className={pipelineCard()}
                  style={{
                    borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
                    position: "relative",
                  }}
                >
                  {/* step number */}
                  <span
                    className={css({
                      fontSize: "3xl",
                      fontWeight: "bold",
                      lineHeight: "none",
                      letterSpacing: "tighter",
                      color: "ui.border",
                      position: "absolute",
                      top: "3",
                      right: "4",
                      userSelect: "none",
                    })}
                  >
                    {stage.step}
                  </span>
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

        {/* --- mobile: vertical stack --- */}
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
              <div
                className={pipelineCard()}
                style={{
                  borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
                  position: "relative",
                }}
              >
                {/* step number */}
                <span
                  className={css({
                    fontSize: "3xl",
                    fontWeight: "bold",
                    lineHeight: "none",
                    letterSpacing: "tighter",
                    color: "ui.border",
                    position: "absolute",
                    top: "3",
                    right: "4",
                    userSelect: "none",
                  })}
                >
                  {stage.step}
                </span>
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
    </section>
  );
}
