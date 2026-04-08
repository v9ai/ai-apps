"use client";

import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  GitHubLogoIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

/**
 * LANDING HERO — Agentic Lead Gen
 *
 * Conversion-focused hero with:
 * 1. Animated dot grid background for depth
 * 2. Clear value prop headline with cost comparison
 * 3. Social proof strip below CTAs
 * 4. High-contrast primary CTA with glow
 * 5. Terminal-style pipeline preview
 */

/* ── social proof metrics ── */
const PROOF_ITEMS = [
  { value: "50K", label: "pages crawled" },
  { value: "92%", label: "NER F1" },
  { value: "89.7%", label: "scoring precision" },
  { value: "$1,500", label: "/yr total cost" },
] as const;

/* ── terminal pipeline lines ── */
const TERMINAL_LINES = [
  { prefix: "$", cmd: "agentic pipeline run --batch 500", delay: "0s" },
  { prefix: ">", cmd: "discovery    crawling 820 domains...        [====]  3x harvest", delay: "0.6s" },
  { prefix: ">", cmd: "enrichment   NER + spaCy extraction...      [====]  92% F1", delay: "1.2s" },
  { prefix: ">", cmd: "scoring      XGBoost + ensemble...          [====]  89.7% prec", delay: "1.8s" },
  { prefix: ">", cmd: "contacts     decision-maker lookup...       [====]  verified", delay: "2.4s" },
  { prefix: ">", cmd: "outreach     personalized sequences...      [====]  queued", delay: "3.0s" },
  { prefix: "", cmd: "", delay: "3.4s" },
  { prefix: "\u2713", cmd: "300 qualified leads delivered. cost: $0.12/lead", delay: "3.4s" },
] as const;

export function LandingHero() {
  return (
    <section
      id="hero"
      className={cx(
        css({
          pt: { base: "sectionMobile", lg: "section" },
          pb: { base: "sectionMobile", lg: "section" },
          scrollMarginTop: "56px",
          position: "relative",
          overflow: "hidden",
        }),
        "landing-hero-section",
      )}
    >
      {/* ── animated dot grid background ── */}
      <div
        className={cx(
          css({
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
          }),
          "hero-dot-grid",
        )}
      />

      {/* ── radial glow behind headline ── */}
      <div
        className={css({
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          width: "800px",
          height: "600px",
          background:
            "radial-gradient(ellipse at center, rgba(62, 99, 221, 0.08) 0%, rgba(62, 99, 221, 0.03) 40%, transparent 70%)",
          zIndex: 0,
          pointerEvents: "none",
        })}
      />

      <div className={cx(container({ maxW: "breakpoint-lg" }), css({ position: "relative", zIndex: 1 }))}>
        {/* --- eyebrow label --- */}
        <div className={flex({ justify: "center", mb: "4" })}>
          <span
            className={cx(
              css({
                fontSize: "2xs",
                fontWeight: "bold",
                color: "accent.primary",
                textTransform: "uppercase",
                letterSpacing: "editorial",
                display: "inline-flex",
                alignItems: "center",
                gap: "2",
                px: "3",
                py: "1",
                border: "1px solid",
                borderColor: "accent.border",
                bg: "accent.subtle",
              }),
              "badge-scan-animated",
            )}
          >
            <span
              className={css({
                w: "6px",
                h: "6px",
                bg: "status.positive",
                flexShrink: 0,
                animation: "pulse 2s ease-in-out infinite",
              })}
            />
            Autonomous B2B Pipeline
          </span>
        </div>

        {/* --- headline --- */}
        <h1
          className={cx(
            css({
              fontSize: { base: "4xl", md: "5xl", lg: "6xl" },
              fontWeight: "normal",
              color: "ui.heading",
              letterSpacing: "tighter",
              lineHeight: { base: "snug", lg: "tight" },
              textAlign: "center",
              maxW: "840px",
              mx: "auto",
            }),
            "landing-hero-headline",
          )}
        >
          <span className="headline-word">Stop paying </span>
          <span
            className={cx(
              css({
                fontWeight: "bold",
                color: "transparent",
                backgroundClip: "text",
                background:
                  "linear-gradient(135deg, #E5484D 0%, #E5484D 100%)",
                WebkitBackgroundClip: "text",
                textDecoration: "line-through",
                textDecorationColor: "rgba(229, 72, 77, 0.4)",
              }),
              "headline-word",
            )}
          >
            $13,200/yr
          </span>{" "}
          <span className="headline-word">for leads.</span>
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
                animationDelay: "0.5s",
              }),
              "headline-word",
            )}
          >
            AI agents do it for $1,500.
          </span>
        </h1>

        {/* --- subheadline --- */}
        <p
          className={cx(
            css({
              fontSize: { base: "base", md: "lg" },
              color: "ui.secondary",
              textAlign: "center",
              maxW: { base: "100%", md: "580px" },
              px: { base: "4", md: "0" },
              mx: "auto",
              mt: "5",
              lineHeight: "relaxed",
              letterSpacing: "snug",
            }),
            "landing-hero-subheadline",
          )}
        >
          Five autonomous agents discover companies, enrich profiles, find
          decision-makers, and craft personalized outreach — running 24/7 on
          your hardware, no cloud subscriptions.
        </p>

        {/* --- CTA pair --- */}
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
                px: "10",
                fontSize: "lg",
                fontWeight: "bold",
                height: "48px",
                boxShadow:
                  "0 0 20px rgba(62, 99, 221, 0.3), 0 0 60px rgba(62, 99, 221, 0.1)",
                _hover: {
                  boxShadow:
                    "0 0 30px rgba(62, 99, 221, 0.5), 0 0 80px rgba(62, 99, 221, 0.2)",
                },
              }),
              "cta-solid-animated",
            )}
          >
            Deploy for free
            <ArrowRightIcon width={16} height={16} />
          </Link>
          <Link
            href="/how-it-works"
            className={cx(
              button({ variant: "ghost", size: "lg" }),
              css({
                justifyContent: "center",
                width: { base: "100%", sm: "auto" },
                height: "48px",
              }),
              "cta-ghost-animated",
            )}
          >
            <GitHubLogoIcon width={14} height={14} />
            See the pipeline
          </Link>
        </div>

        {/* --- social proof strip --- */}
        <div
          className={cx(
            flex({
              justify: "center",
              gap: { base: "4", md: "8" },
              mt: "8",
              wrap: "wrap",
              px: { base: "4", md: "0" },
            }),
            "stats-row-animated",
          )}
        >
          {PROOF_ITEMS.map((item) => (
            <div
              key={item.label}
              className={flex({
                align: "center",
                gap: "2",
              })}
            >
              <CheckCircledIcon
                width={12}
                height={12}
                className={css({ color: "status.positive", flexShrink: 0 })}
              />
              <span
                className={css({
                  fontSize: "sm",
                  fontWeight: "bold",
                  color: "ui.heading",
                  fontFamily: "mono",
                })}
              >
                {item.value}
              </span>
              <span
                className={css({
                  fontSize: "sm",
                  color: "ui.tertiary",
                })}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* --- terminal preview --- */}
        <div
          className={css({
            mt: { base: "8", lg: "12" },
            mx: "auto",
            maxW: "640px",
            border: "1px solid",
            borderColor: "ui.border",
            bg: "ui.surface",
            overflow: "hidden",
          })}
        >
          {/* terminal title bar */}
          <div
            className={flex({
              align: "center",
              gap: "2",
              px: "3",
              py: "2",
            })}
            style={{
              borderBottom: "1px solid var(--colors-ui-border)",
              background: "var(--colors-ui-surface-raised)",
            }}
          >
            <div className={flex({ gap: "1.5" })}>
              <span
                className={css({
                  w: "8px",
                  h: "8px",
                  bg: "#E5484D",
                  opacity: 0.7,
                })}
                style={{ borderRadius: "50%" }}
              />
              <span
                className={css({
                  w: "8px",
                  h: "8px",
                  bg: "#F5A623",
                  opacity: 0.7,
                })}
                style={{ borderRadius: "50%" }}
              />
              <span
                className={css({
                  w: "8px",
                  h: "8px",
                  bg: "#30A46C",
                  opacity: 0.7,
                })}
                style={{ borderRadius: "50%" }}
              />
            </div>
            <span
              className={css({
                fontSize: "2xs",
                color: "ui.dim",
                fontFamily: "mono",
                ml: "2",
              })}
            >
              agentic-pipeline
            </span>
          </div>

          {/* terminal body */}
          <div
            className={css({
              px: { base: "3", sm: "4" },
              py: "3",
              fontFamily: "mono",
              fontSize: { base: "2xs", sm: "xs" },
              lineHeight: "loose",
              overflowX: "auto",
            })}
          >
            {TERMINAL_LINES.map((line, i) => {
              if (!line.cmd && !line.prefix) return null;
              const isSuccess = line.prefix === "\u2713";
              const isCommand = line.prefix === "$";
              return (
                <div
                  key={i}
                  className={cx(
                    css({
                      display: "flex",
                      gap: "2",
                      whiteSpace: "pre",
                      opacity: 0,
                    }),
                    "terminal-line-animated",
                  )}
                  style={{ animationDelay: line.delay }}
                >
                  <span
                    className={css({
                      color: isSuccess
                        ? "status.positive"
                        : isCommand
                          ? "accent.primary"
                          : "ui.dim",
                      flexShrink: 0,
                      fontWeight: isSuccess ? "bold" : "normal",
                      width: "12px",
                    })}
                  >
                    {line.prefix}
                  </span>
                  <span
                    className={css({
                      color: isSuccess
                        ? "status.positive"
                        : isCommand
                          ? "ui.heading"
                          : "ui.secondary",
                      fontWeight: isSuccess ? "bold" : "normal",
                    })}
                  >
                    {line.cmd}
                  </span>
                </div>
              );
            })}
            {/* blinking cursor */}
            <span
              className={cx(
                css({
                  display: "inline-block",
                  w: "7px",
                  h: "14px",
                  bg: "accent.primary",
                  ml: "18px",
                  mt: "1",
                  opacity: 0,
                }),
                "terminal-cursor",
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
