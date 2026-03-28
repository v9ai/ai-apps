"use client";

import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { ArrowRightIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import Link from "next/link";

/**
 * CTA Improvement 2: Final conversion section (page closer).
 *
 * Visitors who scroll to the bottom are high-intent but undecided.
 * This section provides:
 * - A value-restating headline (not "get started" -- too generic)
 * - Primary CTA repeated (consistency with hero)
 * - Email capture for visitors not ready to commit (pipeline research updates)
 * - Creates urgency with cost-comparison language
 */

export function LandingClosing() {
  return (
    <section
      id="stack"
      className={css({
        py: { base: "sectionMobile", lg: "section" },
        borderTop: "1px solid",
        borderTopColor: "ui.border",
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        <div
          className={flex({
            direction: "column",
            align: "center",
            textAlign: "center",
          })}
        >
          {/* restated value prop */}
          <h2
            className={css({
              fontSize: { base: "3xl", md: "4xl" },
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tighter",
              lineHeight: "snug",
              maxW: "560px",
            })}
          >
            stop managing pipelines. let agents do it.
          </h2>
          <p
            className={css({
              fontSize: { base: "base", md: "lg" },
              color: "ui.secondary",
              mt: "3",
              maxW: "440px",
              lineHeight: "relaxed",
              letterSpacing: "snug",
            })}
          >
            300 qualified B2B leads per cycle — extracted, deduplicated, scored,
            and reported. fully local. $1,500/year total cost.
          </p>

          {/* primary CTA repeated */}
          <div className={flex({ justify: "center", gap: "3", mt: "6" })}>
            <Link
              href="/how-it-works"
              className={button({ variant: "solid", size: "lg" })}
            >
              deploy lead-gen locally
              <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>

          {/* email capture for low-commitment visitors */}
          <div
            className={css({
              mt: "8",
              pt: "6",
              borderTop: "1px solid",
              borderTopColor: "ui.border",
              width: "100%",
              maxW: "440px",
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
                className={css({ color: "ui.dim" })}
              />
              <span
                className={css({
                  fontSize: "xs",
                  color: "ui.tertiary",
                  textTransform: "lowercase",
                  letterSpacing: "wide",
                })}
              >
                not ready yet? get pipeline research updates
              </span>
            </div>
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
                aria-label="email address for pipeline research updates"
                className={css({
                  flex: 1,
                  height: "40px",
                  px: "3",
                  bg: "ui.surface",
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRight: "none",
                  color: "ui.heading",
                  fontSize: "sm",
                  letterSpacing: "normal",
                  outline: "none",
                  borderRadius: "0",
                  _placeholder: {
                    color: "ui.dim",
                  },
                  _focusVisible: {
                    borderColor: "accent.primary",
                  },
                })}
              />
              <button
                type="submit"
                className={css({
                  height: "40px",
                  px: "5",
                  bg: "accent.primary",
                  color: "accent.contrast",
                  border: "1px solid transparent",
                  fontWeight: "bold",
                  fontSize: "sm",
                  cursor: "pointer",
                  textTransform: "lowercase",
                  letterSpacing: "normal",
                  whiteSpace: "nowrap",
                  borderRadius: "0",
                  transition: "background 150ms ease",
                  _hover: {
                    bg: "accent.hover",
                  },
                })}
              >
                subscribe
              </button>
            </form>
            <p
              className={css({
                fontSize: "2xs",
                color: "ui.dim",
                mt: "2",
                textAlign: "center",
                letterSpacing: "normal",
              })}
            >
              one email per month. new papers, benchmarks, and module upgrades.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
