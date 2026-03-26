"use client";

import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

/**
 * TRUST IMPROVEMENT 4: "Built by" human element.
 *
 * Builder attribution strip for Scrapus B2B lead generation pipeline.
 * First-person voice + specific technical detail + mission statement.
 * Positioned between preview (proof) and features (differentiators) to bridge
 * "this works" into "here's why it's built well".
 */

export function LandingBuilder() {
  return (
    <section
      className={css({
        py: { base: "6", lg: "8" },
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        <div
          className={css({
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
            px: { base: "5", md: "6" },
            py: { base: "4", md: "5" },
          })}
        >
          <div
            className={flex({
              direction: { base: "column", md: "row" },
              align: { base: "start", md: "center" },
              gap: { base: "3", md: "5" },
            })}
          >
            {/* avatar placeholder -- monogram */}
            <div
              className={css({
                w: "40px",
                h: "40px",
                bg: "accent.subtle",
                border: "1px solid",
                borderColor: "accent.border",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "sm",
                fontWeight: "bold",
                color: "accent.primary",
                letterSpacing: "tight",
              })}
            >
              VN
            </div>

            {/* attribution text */}
            <div className={css({ flex: 1, minWidth: 0 })}>
              <p
                className={css({
                  fontSize: { base: "sm", md: "base" },
                  color: "ui.heading",
                  lineHeight: "relaxed",
                  letterSpacing: "snug",
                })}
              >
                built by{" "}
                <span className={css({ fontWeight: "bold" })}>vadim nicolai</span>
                {" "}&mdash; an AI engineer who got tired of paying $10K+/year for
                cloud CRMs that don&apos;t understand his ICP. this pipeline runs
                entirely local: RL crawling, BERT extraction, ensemble scoring,
                and LLM-generated reports &mdash; all on a single machine with a
                15 GB footprint.
              </p>
              <div
                className={flex({
                  align: "center",
                  gap: "4",
                  mt: "2",
                  flexWrap: "wrap",
                })}
              >
                <span
                  className={css({
                    fontSize: "2xs",
                    color: "ui.dim",
                    letterSpacing: "wide",
                    textTransform: "lowercase",
                  })}
                >
                  backed by 35 cited papers since 2023
                </span>
                <a
                  href="https://github.com/nicolad/lead-gen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={flex({
                    align: "center",
                    gap: "1.5",
                  })}
                  style={{
                    color: "var(--gray-9)",
                    fontSize: "10px",
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                    textTransform: "lowercase",
                    transition: "color 0.15s",
                  }}
                >
                  <GitHubLogoIcon width={12} height={12} />
                  view source
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
