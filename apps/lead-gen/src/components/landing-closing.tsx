"use client";

import { css } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowRightIcon,
  EnvelopeClosedIcon,
  CheckCircledIcon,
  LockClosedIcon,
  RocketIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";

/**
 * Closing section — final conversion for high-intent visitors who scrolled
 * all the way down. Gradient-bordered CTA card with glow, value recap,
 * polished email signup, and trust signals.
 */

const VALUE_POINTS = [
  { icon: LightningBoltIcon, text: "300+ qualified leads per cycle" },
  { icon: RocketIcon, text: "fully autonomous — zero manual enrichment" },
  { icon: LockClosedIcon, text: "runs on your hardware, your data stays local" },
] as const;

const TRUST_SIGNALS = [
  "no credit card",
  "open source",
  "self-hosted",
  "cancel anytime",
] as const;

export function LandingClosing() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section
      id="stack"
      className={css({
        py: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
        position: "relative",
        overflow: "hidden",
      })}
    >
      {/* Ambient glow behind the card */}
      <div
        className={css({
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "400px",
          background:
            "radial-gradient(ellipse at center, rgba(62, 99, 221, 0.12) 0%, rgba(62, 99, 221, 0.04) 40%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        })}
      />

      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* ---- Gradient-bordered CTA card ---- */}
        <div
          className={css({
            position: "relative",
            zIndex: 1,
            p: "1px",
            background:
              "linear-gradient(135deg, rgba(62, 99, 221, 0.5) 0%, rgba(62, 99, 221, 0.15) 50%, rgba(62, 99, 221, 0.5) 100%)",
          })}
        >
          <div
            className={css({
              bg: "ui.surface",
              px: { base: "6", md: "12" },
              py: { base: "10", md: "14" },
            })}
          >
            <div
              className={flex({
                direction: "column",
                align: "center",
                textAlign: "center",
              })}
            >
              {/* Kicker */}
              <span
                className={css({
                  fontSize: "2xs",
                  fontWeight: "bold",
                  color: "accent.primary",
                  textTransform: "uppercase",
                  letterSpacing: "editorial",
                  mb: "4",
                })}
              >
                ready to deploy
              </span>

              {/* Headline */}
              <h2
                className={css({
                  fontSize: { base: "3xl", md: "4xl" },
                  fontWeight: "bold",
                  color: "ui.heading",
                  letterSpacing: "tighter",
                  lineHeight: "snug",
                  maxW: "580px",
                })}
              >
                Stop managing pipelines.
                <br />
                Let agents do it.
              </h2>

              {/* Subheadline */}
              <p
                className={css({
                  fontSize: { base: "base", md: "lg" },
                  color: "ui.secondary",
                  mt: "4",
                  maxW: "480px",
                  lineHeight: "relaxed",
                  letterSpacing: "snug",
                })}
              >
                Deploy once, run forever. Your agents discover, enrich, score,
                and deliver qualified B2B leads around the clock — for{" "}
                <strong
                  className={css({
                    color: "accent.primary",
                    fontWeight: "semibold",
                  })}
                >
                  $1,500/year
                </strong>{" "}
                total cost.
              </p>

              {/* ---- Value proposition recap ---- */}
              <div
                className={flex({
                  direction: { base: "column", sm: "row" },
                  gap: { base: "3", sm: "6" },
                  mt: "6",
                  justify: "center",
                })}
              >
                {VALUE_POINTS.map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className={flex({
                      align: "center",
                      gap: "2",
                    })}
                  >
                    <Icon
                      width={14}
                      height={14}
                      className={css({ color: "accent.primary", flexShrink: 0 })}
                    />
                    <span
                      className={css({
                        fontSize: "sm",
                        color: "ui.tertiary",
                        letterSpacing: "normal",
                      })}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              {/* ---- Primary CTA with glow ---- */}
              <div
                className={flex({
                  direction: "column",
                  align: "center",
                  gap: "4",
                  mt: "8",
                })}
              >
                <Link
                  href="/how-it-works"
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2",
                    px: "8",
                    py: "3",
                    bg: "accent.primary",
                    color: "accent.contrast",
                    fontSize: "lg",
                    fontWeight: "bold",
                    textTransform: "lowercase",
                    letterSpacing: "normal",
                    textDecoration: "none",
                    cursor: "pointer",
                    lineHeight: "none",
                    whiteSpace: "nowrap",
                    border: "none",
                    boxShadow:
                      "0 0 20px rgba(62, 99, 221, 0.4), 0 0 60px rgba(62, 99, 221, 0.15)",
                    transition:
                      "background 150ms ease, box-shadow 200ms ease, transform 150ms ease",
                    _hover: {
                      bg: "accent.hover",
                      boxShadow:
                        "0 0 30px rgba(62, 99, 221, 0.5), 0 0 80px rgba(62, 99, 221, 0.2)",
                      transform: "translateY(-1px)",
                    },
                    _focusVisible: {
                      outline: "2px solid",
                      outlineColor: "accent.primary",
                      outlineOffset: "2px",
                    },
                  })}
                >
                  deploy agentic lead gen locally
                  <ArrowRightIcon width={16} height={16} />
                </Link>

                {/* Trust signals row */}
                <div
                  className={flex({
                    gap: { base: "3", sm: "5" },
                    flexWrap: "wrap",
                    justify: "center",
                  })}
                >
                  {TRUST_SIGNALS.map((signal) => (
                    <div
                      key={signal}
                      className={flex({ align: "center", gap: "1.5" })}
                    >
                      <CheckCircledIcon
                        width={11}
                        height={11}
                        className={css({ color: "status.positive" })}
                      />
                      <span
                        className={css({
                          fontSize: "2xs",
                          color: "ui.dim",
                          letterSpacing: "wide",
                          textTransform: "lowercase",
                        })}
                      >
                        {signal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Email signup for low-commitment visitors ---- */}
              <div
                className={css({
                  mt: "10",
                  pt: "8",
                  borderTop: "1px solid",
                  borderTopColor: "ui.border",
                  width: "100%",
                  maxW: "480px",
                })}
              >
                <div
                  className={flex({
                    align: "center",
                    gap: "2",
                    justify: "center",
                    mb: "4",
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
                    not ready yet? get pipeline updates
                  </span>
                </div>

                {submitted ? (
                  <div
                    className={flex({
                      align: "center",
                      justify: "center",
                      gap: "2",
                      py: "3",
                    })}
                  >
                    <CheckCircledIcon
                      width={14}
                      height={14}
                      className={css({ color: "status.positive" })}
                    />
                    <span
                      className={css({
                        fontSize: "sm",
                        color: "status.positive",
                        fontWeight: "medium",
                      })}
                    >
                      subscribed — check your inbox
                    </span>
                  </div>
                ) : (
                  <form
                    className={flex({ gap: "0", width: "100%" })}
                    onSubmit={(e) => {
                      e.preventDefault();
                      // TODO: wire to newsletter API / Neon table
                      setSubmitted(true);
                    }}
                  >
                    <input
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-label="email address for pipeline updates"
                      className={css({
                        flex: 1,
                        height: "40px",
                        px: "3",
                        bg: "ui.bg",
                        border: "1px solid",
                        borderColor: "ui.border",
                        borderRight: "none",
                        color: "ui.heading",
                        fontSize: "sm",
                        letterSpacing: "normal",
                        outline: "none",
                        borderRadius: "0",
                        transition:
                          "border-color 150ms ease, box-shadow 150ms ease",
                        _placeholder: {
                          color: "ui.dim",
                        },
                        _focusVisible: {
                          borderColor: "accent.primary",
                          boxShadow:
                            "inset 0 0 0 1px rgba(62, 99, 221, 0.3)",
                        },
                      })}
                    />
                    <button
                      type="submit"
                      className={button({ variant: "solid", size: "md" })}
                    >
                      subscribe
                    </button>
                  </form>
                )}

                <p
                  className={css({
                    fontSize: "2xs",
                    color: "ui.dim",
                    mt: "3",
                    textAlign: "center",
                    letterSpacing: "normal",
                    lineHeight: "relaxed",
                  })}
                >
                  one email per month. new agents, benchmarks, and autonomy
                  upgrades. unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
