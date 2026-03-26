"use client";

import { css, cx } from "styled-system/css";
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
 * Pipeline visualization with micro-interactions:
 *  #1 — Staggered card entrance + scanline glitch on hover (pipeline-card-animated, pipeline-card-hover)
 *  #4 — Arrow sequential pulse showing data flow (pipeline-arrow-flow)
 */

/**
 * IMPROVEMENT 4: Pipeline descriptions rewritten from specs to outcomes.
 *
 * Before: "aggregate jobs from Greenhouse, Lever, and Ashby boards"
 *   (what it does technically -- reads like a spec sheet)
 *
 * After: "catches new roles across 460+ companies before they hit LinkedIn"
 *   (what it means for you -- reads like a benefit)
 */
const PIPELINE_STAGES = [
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "signal detection",
    description:
      "catches new roles across 460+ companies before they hit LinkedIn or Indeed",
    badge: "ingest",
    step: "01",
    accentOpacity: 0.3,
  },
  {
    icon: <CubeIcon width={20} height={20} />,
    title: "company enrichment",
    description:
      "maps stack, funding stage, and remote policy so you skip the guesswork",
    badge: "enrich",
    step: "02",
    accentOpacity: 0.5,
  },
  {
    icon: <PersonIcon width={20} height={20} />,
    title: "contact discovery",
    description:
      "finds the actual hiring manager, not the generic careers@ inbox",
    badge: "discover",
    step: "03",
    accentOpacity: 0.75,
  },
  {
    icon: <EnvelopeClosedIcon width={20} height={20} />,
    title: "smart outreach",
    description:
      "writes emails that reference real company context, not templates",
    badge: "outreach",
    step: "04",
    accentOpacity: 1,
  },
] as const;

export function LandingPipeline() {
  return (
    <section
      id="pipeline"
      className={css({
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
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
          from a new job posting to a personalized email in your outbox. four stages, zero manual work.
        </p>

        {/* --- desktop: horizontal flow (#1: stagger + glitch, #4: arrow pulse) --- */}
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
              className={cx(
                flex({
                  align: "stretch",
                  gap: "3",
                  flex: "1",
                  minWidth: "0",
                }),
                "pipeline-card-animated",
              )}
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
                    className={cx(
                      css({ color: "ui.dim" }),
                      "pipeline-arrow-flow",
                    )}
                    data-pipeline-arrow={i - 1}
                  />
                </div>
              )}
              <div className={css({ flex: "1", minWidth: "0" })}>
                <div
                  className={cx(pipelineCard(), "pipeline-card-hover")}
                  style={{
                    borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
                    position: "relative",
                  }}
                >
                  {/* step number watermark */}
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
            <div key={stage.title} className="pipeline-card-animated">
              {i > 0 && (
                <div className={flex({ justify: "center", mb: "3" })}>
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className={cx(
                      css({
                        color: "ui.dim",
                        transform: "rotate(90deg)",
                      }),
                      "pipeline-arrow-flow",
                    )}
                    data-pipeline-arrow={i - 1}
                  />
                </div>
              )}
              <div
                className={cx(pipelineCard(), "pipeline-card-hover")}
                style={{
                  borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
                  position: "relative",
                }}
              >
                {/* step number watermark */}
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
