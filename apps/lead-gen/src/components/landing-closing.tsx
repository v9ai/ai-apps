"use client";

import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  EnvelopeClosedIcon,
  CheckCircledIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

/**
 * CTA Improvement 2: Final conversion section (page closer).
 *
 * Visitors who scroll to the bottom are high-intent but undecided.
 * This section provides:
 * - Gradient background to visually separate from previous content
 * - Urgency-driven headline with cost-comparison
 * - Quick "Agentic vs Traditional" comparison table
 * - Primary CTA repeated (consistency with hero)
 * - Email capture for visitors not ready to commit
 * - Trust signals: open source, tech stack, zero lock-in
 */

const COMPARISON_ROWS = [
  {
    feature: "lead discovery",
    agentic: "automated — RL crawlers 24/7",
    traditional: "manual research + purchased lists",
  },
  {
    feature: "enrichment",
    agentic: "5-agent ensemble, NER + LLM",
    traditional: "single vendor API ($0.30/record)",
  },
  {
    feature: "lead scoring",
    agentic: "ML ensemble — XGBoost + logistic + RF",
    traditional: "rule-based or single model",
  },
  {
    feature: "data ownership",
    agentic: "100% local — your hardware",
    traditional: "vendor-locked cloud silo",
  },
  {
    feature: "annual cost",
    agentic: "$1,500",
    traditional: "$5,400 -- $13,200",
  },
  {
    feature: "setup time",
    agentic: "clone + deploy — 15 minutes",
    traditional: "weeks of onboarding",
  },
] as const;

const TRUST_SIGNALS = [
  "open source — MIT license",
  "Next.js + GraphQL + Drizzle ORM",
  "Neon PostgreSQL — serverless",
  "zero vendor lock-in",
] as const;

export function LandingClosing() {
  return (
    <section
      id="stack"
      className={css({
        py: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
        position: "relative",
        overflow: "hidden",
        /* subtle gradient background to differentiate closing section */
        background:
          "linear-gradient(180deg, {colors.ui.bg} 0%, rgba(62, 99, 221, 0.04) 40%, rgba(48, 164, 108, 0.03) 70%, {colors.ui.bg} 100%)",
      })}
    >
      {/* top gradient border */}
      <div
        className={css({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, {colors.accent.primary}/40 30%, {colors.status.positive}/30 70%, transparent 100%)",
        })}
      />

      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* ---- urgency headline ---- */}
        <div
          className={flex({
            direction: "column",
            align: "center",
            textAlign: "center",
          })}
        >
          <span
            className={css({
              fontSize: "2xs",
              fontWeight: "bold",
              color: "accent.primary",
              textTransform: "uppercase",
              letterSpacing: "editorial",
              mb: "3",
            })}
          >
            start generating leads today
          </span>
          <h2
            className={css({
              fontSize: { base: "3xl", md: "4xl" },
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tighter",
              lineHeight: "snug",
              maxW: "620px",
            })}
          >
            Your competitors are still paying{" "}
            <span className={css({ color: "status.negative" })}>$13K/year</span>{" "}
            for what five agents do for{" "}
            <span className={css({ color: "status.positive" })}>$1,500</span>
          </h2>
          <p
            className={css({
              fontSize: { base: "base", md: "lg" },
              color: "ui.secondary",
              mt: "3",
              maxW: "500px",
              lineHeight: "relaxed",
              letterSpacing: "snug",
            })}
          >
            Clone the repo. Deploy to Vercel. Autonomous agents start discovering,
            enriching, and scoring B2B leads within minutes — not weeks.
          </p>
        </div>

        {/* ---- comparison table: Agentic vs Traditional ---- */}
        <div
          className={css({
            mt: "10",
            maxW: "680px",
            mx: "auto",
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
          })}
        >
          {/* table header */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              borderBottom: "1px solid",
              borderBottomColor: "ui.border",
              bg: "ui.surfaceRaised",
            })}
          >
            <div
              className={css({
                px: { base: "3", md: "4" },
                py: "3",
                fontSize: "2xs",
                fontWeight: "bold",
                color: "ui.dim",
                textTransform: "uppercase",
                letterSpacing: "editorial",
              })}
            >
              feature
            </div>
            <div
              className={css({
                px: { base: "3", md: "4" },
                py: "3",
                fontSize: "2xs",
                fontWeight: "bold",
                color: "accent.primary",
                textTransform: "uppercase",
                letterSpacing: "editorial",
                borderLeft: "1px solid",
                borderLeftColor: "ui.border",
              })}
            >
              agentic lead gen
            </div>
            <div
              className={css({
                px: { base: "3", md: "4" },
                py: "3",
                fontSize: "2xs",
                fontWeight: "bold",
                color: "ui.dim",
                textTransform: "uppercase",
                letterSpacing: "editorial",
                borderLeft: "1px solid",
                borderLeftColor: "ui.border",
              })}
            >
              traditional CRM
            </div>
          </div>

          {/* table rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.feature}
              className={css({
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                borderBottom:
                  i < COMPARISON_ROWS.length - 1 ? "1px solid" : "none",
                borderBottomColor: "ui.border",
                transition: "background 150ms ease",
                _hover: {
                  bg: "whiteAlpha.3",
                },
              })}
            >
              <div
                className={css({
                  px: { base: "3", md: "4" },
                  py: { base: "2", md: "3" },
                  fontSize: { base: "2xs", md: "xs" },
                  fontWeight: "medium",
                  color: "ui.secondary",
                  textTransform: "lowercase",
                  letterSpacing: "normal",
                  display: "flex",
                  alignItems: "center",
                })}
              >
                {row.feature}
              </div>
              <div
                className={css({
                  px: { base: "3", md: "4" },
                  py: { base: "2", md: "3" },
                  fontSize: { base: "2xs", md: "xs" },
                  color: "status.positive",
                  letterSpacing: "normal",
                  borderLeft: "1px solid",
                  borderLeftColor: "ui.border",
                  display: "flex",
                  alignItems: "center",
                  gap: "1",
                })}
              >
                <CheckCircledIcon
                  width={10}
                  height={10}
                  className={css({
                    flexShrink: 0,
                    display: { base: "none", sm: "block" },
                  })}
                />
                {row.agentic}
              </div>
              <div
                className={css({
                  px: { base: "3", md: "4" },
                  py: { base: "2", md: "3" },
                  fontSize: { base: "2xs", md: "xs" },
                  color: "ui.dim",
                  letterSpacing: "normal",
                  borderLeft: "1px solid",
                  borderLeftColor: "ui.border",
                  display: "flex",
                  alignItems: "center",
                })}
              >
                {row.traditional}
              </div>
            </div>
          ))}
        </div>

        {/* ---- primary CTA ---- */}
        <div
          className={flex({
            justify: "center",
            gap: "3",
            mt: "8",
            direction: { base: "column", sm: "row" },
            px: { base: "4", sm: "0" },
          })}
        >
          <Link
            href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen#deploy"
            className={cx(
              button({ variant: "solid", size: "lg" }),
              css({
                justifyContent: "center",
                width: { base: "100%", sm: "auto" },
              }),
            )}
          >
            Clone and deploy
            <ArrowRightIcon width={14} height={14} />
          </Link>
          <Link
            href="/how-it-works"
            className={cx(
              button({ variant: "ghost", size: "lg" }),
              css({
                justifyContent: "center",
                width: { base: "100%", sm: "auto" },
              }),
            )}
          >
            See the architecture
          </Link>
        </div>

        {/* ---- email capture ---- */}
        <div
          className={css({
            mt: "10",
            maxW: "480px",
            mx: "auto",
            px: { base: "4", md: "5" },
            py: "5",
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
          })}
        >
          <div
            className={flex({
              align: "center",
              gap: "2",
              justify: "center",
              mb: "3",
            })}
          >
            <EnvelopeClosedIcon
              width={12}
              height={12}
              className={css({ color: "accent.primary" })}
            />
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "ui.secondary",
                textTransform: "lowercase",
                letterSpacing: "wide",
              })}
            >
              get the benchmark report
            </span>
          </div>
          <p
            className={css({
              fontSize: "xs",
              color: "ui.tertiary",
              textAlign: "center",
              mb: "4",
              letterSpacing: "normal",
              lineHeight: "relaxed",
            })}
          >
            5 agents vs $13K/year CRM — real numbers from production pipeline runs.
            Plus monthly agent performance data.
          </p>
          <form
            className={flex({
              gap: "0",
              width: "100%",
            })}
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: wire to newsletter API / Neon table
            }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              required
              aria-label="email address for Agentic Lead Gen updates"
              className={css({
                flex: 1,
                height: "40px",
                px: "3",
                bg: "ui.surfaceRaised",
                border: "1px solid",
                borderColor: "ui.border",
                borderRight: "none",
                color: "ui.heading",
                fontSize: "sm",
                letterSpacing: "normal",
                outline: "none",
                borderRadius: "0",
                transition:
                  "border-color 150ms ease, background 150ms ease",
                _placeholder: {
                  color: "ui.dim",
                },
                _focusVisible: {
                  borderColor: "accent.primary",
                  bg: "ui.surface",
                },
              })}
            />
            <button
              type="submit"
              className={button({ variant: "solid", size: "md" })}
            >
              send report
            </button>
          </form>
          <div
            className={flex({
              align: "center",
              justify: "center",
              gap: "1",
              mt: "3",
            })}
          >
            <LockClosedIcon
              width={8}
              height={8}
              className={css({ color: "ui.dim" })}
            />
            <p
              className={css({
                fontSize: "2xs",
                color: "ui.dim",
                textAlign: "center",
                letterSpacing: "normal",
              })}
            >
              No spam. Unsubscribe anytime. We respect your inbox.
            </p>
          </div>
        </div>

        {/* ---- trust signals ---- */}
        <div
          className={flex({
            justify: "center",
            gap: { base: "3", md: "5" },
            mt: "8",
            wrap: "wrap",
          })}
        >
          {TRUST_SIGNALS.map((signal) => (
            <div
              key={signal}
              className={flex({
                align: "center",
                gap: "1.5",
              })}
            >
              <CheckCircledIcon
                width={10}
                height={10}
                className={css({ color: "status.positive", flexShrink: 0 })}
              />
              <span
                className={css({
                  fontSize: "2xs",
                  color: "ui.tertiary",
                  letterSpacing: "wide",
                  textTransform: "lowercase",
                  whiteSpace: "nowrap",
                })}
              >
                {signal}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
