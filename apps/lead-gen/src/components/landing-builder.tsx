"use client";

import { css, cx } from "styled-system/css";
import { flex, container, grid } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import {
  GitHubLogoIcon,
  LightningBoltIcon,
  RocketIcon,
  CodeIcon,
  CubeIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";

/**
 * TRUST IMPROVEMENT 4: "Built by" human element — redesigned.
 *
 * Professional bio card with mission statement, tech credentials,
 * and a clear connection between builder's background and product value.
 * Positioned between preview (proof) and features (differentiators) to bridge
 * "this works" into "here's why it's built well".
 */

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CREDENTIALS = [
  "AI / ML engineering",
  "distributed systems",
  "full-stack TypeScript",
  "reinforcement learning",
  "NLP pipelines",
  "open source",
] as const;

const HIGHLIGHTS = [
  {
    icon: CodeIcon,
    label: "10+ years",
    detail: "shipping production software",
  },
  {
    icon: CubeIcon,
    label: "AI-native",
    detail: "RL, NER, ensemble scoring, RAG",
  },
  {
    icon: RocketIcon,
    label: "35 papers",
    detail: "cited in the architecture",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LandingBuilder() {
  return (
    <section
      className={css({
        py: { base: "sectionMobile", lg: "section" },
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* section label */}
        <div
          className={flex({
            align: "center",
            gap: "1.5",
            mb: "4",
          })}
        >
          <LightningBoltIcon
            width={12}
            height={12}
            style={{ color: "var(--gray-9)" }}
          />
          <span
            className={css({
              fontSize: "2xs",
              fontWeight: "bold",
              color: "ui.secondary",
              textTransform: "lowercase",
              letterSpacing: "editorial",
            })}
          >
            about the builder
          </span>
        </div>

        {/* ---- main card ---- */}
        <div
          className={css({
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
            overflow: "hidden",
          })}
        >
          {/* top: accent gradient bar */}
          <div
            className={css({
              h: "2px",
              background:
                "linear-gradient(90deg, {colors.accent.primary} 0%, {colors.status.positive} 100%)",
            })}
          />

          <div
            className={css({
              px: { base: "5", md: "8" },
              py: { base: "6", md: "8" },
            })}
          >
            {/* ---- bio header row ---- */}
            <div
              className={flex({
                direction: { base: "column", md: "row" },
                align: { base: "start", md: "start" },
                gap: { base: "5", md: "6" },
              })}
            >
              {/* avatar area */}
              <div
                className={flex({
                  direction: "column",
                  align: "center",
                  gap: "2",
                  flexShrink: 0,
                })}
              >
                <div
                  className={css({
                    w: { base: "64px", md: "72px" },
                    h: { base: "64px", md: "72px" },
                    bg: "whiteAlpha.5",
                    border: "1px solid",
                    borderColor: "accent.border",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: { base: "lg", md: "xl" },
                    fontWeight: "bold",
                    color: "accent.primary",
                    letterSpacing: "tight",
                    position: "relative",
                    overflow: "hidden",
                  })}
                >
                  {/* subtle corner accent */}
                  <div
                    className={css({
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      w: "12px",
                      h: "12px",
                      background:
                        "linear-gradient(135deg, transparent 50%, {colors.accent.primary} 50%)",
                      opacity: 0.3,
                    })}
                  />
                  VN
                </div>
                {/* status dot */}
                <span
                  className={flex({
                    align: "center",
                    gap: "1",
                  })}
                >
                  <span
                    className={css({
                      display: "inline-block",
                      w: "5px",
                      h: "5px",
                      bg: "status.positive",
                      flexShrink: 0,
                      animation: "pulse 2s ease-in-out infinite",
                    })}
                  />
                  <span
                    className={css({
                      fontSize: "2xs",
                      color: "ui.dim",
                      letterSpacing: "wide",
                      textTransform: "lowercase",
                    })}
                  >
                    building
                  </span>
                </span>
              </div>

              {/* name + mission */}
              <div className={css({ flex: 1, minWidth: 0 })}>
                <h3
                  className={css({
                    fontSize: { base: "xl", md: "2xl" },
                    fontWeight: "bold",
                    color: "ui.heading",
                    letterSpacing: "tight",
                    lineHeight: "snug",
                  })}
                >
                  Vadim Nicolai
                </h3>
                <p
                  className={css({
                    fontSize: { base: "sm", md: "base" },
                    color: "ui.tertiary",
                    letterSpacing: "normal",
                    mt: "1",
                  })}
                >
                  AI engineer &middot; open source contributor
                </p>

                {/* mission statement with gradient highlight */}
                <p
                  className={css({
                    fontSize: { base: "base", md: "lg" },
                    color: "ui.secondary",
                    lineHeight: "relaxed",
                    letterSpacing: "snug",
                    mt: { base: "3", md: "4" },
                    maxW: "580px",
                  })}
                >
                  I got tired of paying $10K+/year for cloud CRMs that
                  don&apos;t understand my ICP.{" "}
                  <span
                    className={css({
                      fontWeight: "bold",
                      color: "transparent",
                      backgroundClip: "text",
                      background:
                        "linear-gradient(135deg, {colors.ui.heading} 0%, {colors.accent.primary} 100%)",
                    })}
                  >
                    So I built autonomous agents that do it better
                  </span>
                  {" "}&mdash; crawling, extracting, scoring, and enriching B2B
                  prospects end-to-end, without manual steps or babysitting.
                </p>

                {/* credential pills */}
                <div
                  className={flex({
                    gap: "2",
                    mt: { base: "3", md: "4" },
                    flexWrap: "wrap",
                  })}
                >
                  {CREDENTIALS.map((cred) => (
                    <span
                      key={cred}
                      className={css({
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: "2xs",
                        fontWeight: "medium",
                        color: "ui.tertiary",
                        letterSpacing: "wide",
                        textTransform: "lowercase",
                        lineHeight: "none",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        padding: "3px 8px",
                        border: "1px solid",
                        borderColor: "ui.border",
                        bg: "whiteAlpha.3",
                        transition: "border-color 150ms ease, color 150ms ease",
                        _hover: {
                          borderColor: "ui.borderHover",
                          color: "ui.secondary",
                        },
                      })}
                    >
                      {cred}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- divider ---- */}
            <div
              className={css({
                h: "1px",
                bg: "ui.border",
                my: { base: "5", md: "6" },
              })}
            />

            {/* ---- highlights grid ---- */}
            <div
              className={grid({
                columns: { base: 1, sm: 3 },
                gap: { base: "4", md: "6" },
              })}
            >
              {HIGHLIGHTS.map(({ icon: Icon, label, detail }) => (
                <div
                  key={label}
                  className={flex({
                    align: "start",
                    gap: "3",
                  })}
                >
                  <div
                    className={css({
                      w: "32px",
                      h: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bg: "whiteAlpha.5",
                      border: "1px solid",
                      borderColor: "ui.border",
                      flexShrink: 0,
                      color: "accent.primary",
                    })}
                  >
                    <Icon width={14} height={14} />
                  </div>
                  <div>
                    <span
                      className={css({
                        fontSize: "sm",
                        fontWeight: "bold",
                        color: "ui.heading",
                        letterSpacing: "tight",
                        lineHeight: "none",
                        display: "block",
                      })}
                    >
                      {label}
                    </span>
                    <span
                      className={css({
                        fontSize: "2xs",
                        color: "ui.tertiary",
                        letterSpacing: "normal",
                        lineHeight: "compact",
                        display: "block",
                        mt: "2px",
                      })}
                    >
                      {detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ---- divider ---- */}
            <div
              className={css({
                h: "1px",
                bg: "ui.border",
                my: { base: "5", md: "6" },
              })}
            />

            {/* ---- bottom: connection to product + links ---- */}
            <div
              className={flex({
                direction: { base: "column", md: "row" },
                align: { base: "start", md: "center" },
                justify: "space-between",
                gap: { base: "4", md: "5" },
              })}
            >
              <p
                className={css({
                  fontSize: { base: "sm", md: "base" },
                  color: "ui.dim",
                  letterSpacing: "snug",
                  lineHeight: "relaxed",
                  maxW: { md: "460px" },
                })}
              >
                Every agent in this pipeline reflects real production
                experience &mdash; RL crawlers, ensemble scoring, NER
                extraction. Not a wrapper around an API. Built from research,
                validated against 35 cited papers.
              </p>

              <div
                className={flex({
                  gap: "3",
                  flexShrink: 0,
                  align: "center",
                })}
              >
                <a
                  href="https://github.com/v9ai/ai-apps/tree/main/apps/lead-gen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(
                    badge({ variant: "pipeline", size: "md" }),
                    css({
                      textDecoration: "none",
                      cursor: "pointer",
                      transition:
                        "border-color 150ms ease, color 150ms ease",
                      _hover: {
                        borderColor: "ui.borderHover",
                        color: "ui.heading",
                      },
                    }),
                  )}
                >
                  <GitHubLogoIcon width={12} height={12} />
                  view source
                </a>
                <a
                  href="/architecture"
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "2xs",
                    fontWeight: "medium",
                    color: "ui.dim",
                    textDecoration: "none",
                    textTransform: "lowercase",
                    letterSpacing: "wide",
                    transition: "color 150ms ease",
                    _hover: {
                      color: "ui.secondary",
                    },
                  })}
                >
                  architecture
                  <ArrowRightIcon width={10} height={10} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
