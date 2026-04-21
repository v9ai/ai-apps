"use client";

import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import {
  GitHubLogoIcon,
  ArrowUpIcon,
  EnvelopeClosedIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useCallback } from "react";

const FOOTER_SECTIONS = [
  {
    title: "explore",
    links: [
      { href: "/companies", label: "companies" },
      { href: "/contacts", label: "contacts" },
      { href: "/how-it-works", label: "architecture" },
    ],
  },
  {
    title: "pipeline",
    links: [
      { href: "/#pipeline", label: "7 modules" },
      { href: "/#features", label: "features" },
      { href: "/#metrics", label: "benchmarks" },
      { href: "/#research", label: "research" },
    ],
  },
  {
    title: "resources",
    links: [
      { href: "/sign-in", label: "sign in" },
      { href: "/sign-up", label: "sign up" },
      { href: "/settings", label: "settings" },
    ],
  },
] as const;

const BOTTOM_LINKS = [
  { href: "/privacy", label: "privacy" },
  { href: "/terms", label: "terms" },
] as const;

export function LandingFooter() {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <footer
      className={css({
        borderTop: "1px solid",
        borderTopColor: "ui.border",
        pt: { base: "10", lg: "14" },
        pb: { base: "6", lg: "8" },
        mt: { base: "8", lg: "10" },
      })}
    >
      <div className={container({})}>
        {/* ---- Main footer grid ---- */}
        <div
          className={grid({
            columns: { base: 1, sm: 2, md: 5 },
            gap: { base: "8", md: "6" },
          })}
        >
          {/* Brand column — spans 2 on md */}
          <div
            className={css({
              gridColumn: { md: "span 2" },
            })}
          >
            <Link
              href="/"
              className={flex({ align: "center", gap: "2", mb: "3" })}
              style={{ textDecoration: "none" }}
            >
              <span
                className={css({
                  fontSize: "base",
                  fontWeight: "bold",
                  color: "accent.primary",
                  letterSpacing: "tight",
                })}
              >
                agentic lead gen
              </span>
            </Link>
            <p
              className={css({
                fontSize: "2xs",
                fontWeight: "bold",
                color: "ui.dim",
                textTransform: "uppercase",
                letterSpacing: "editorial",
                mb: "3",
              })}
            >
              autonomous B2B lead generation
            </p>
            <p
              className={css({
                fontSize: "sm",
                color: "ui.tertiary",
                lineHeight: "relaxed",
                letterSpacing: "normal",
                maxW: "280px",
              })}
            >
              Open-source, local-first B2B pipeline. Autonomous AI agents handle
              discovery, enrichment, scoring, and outreach on your hardware.
            </p>

            {/* Social / external links */}
            <div className={flex({ gap: "4", mt: "5", align: "center" })}>
              <a
                href="https://github.com/v9ai/ai-apps/tree/main/apps/lead-gen"
                target="_blank"
                rel="noopener noreferrer"
                className={flex({ align: "center", gap: "2" })}
                style={{ textDecoration: "none" }}
              >
                <GitHubLogoIcon
                  width={14}
                  height={14}
                  className={css({ color: "ui.dim" })}
                />
                <span
                  className={css({
                    fontSize: "xs",
                    color: "ui.dim",
                    letterSpacing: "normal",
                    transition: "color 150ms ease",
                    _hover: { color: "ui.secondary" },
                  })}
                >
                  source code
                </span>
              </a>
              <a
                href="mailto:hello@agenticleadgen.com"
                className={flex({ align: "center", gap: "2" })}
                style={{ textDecoration: "none" }}
              >
                <EnvelopeClosedIcon
                  width={12}
                  height={12}
                  className={css({ color: "ui.dim" })}
                />
                <span
                  className={css({
                    fontSize: "xs",
                    color: "ui.dim",
                    letterSpacing: "normal",
                    transition: "color 150ms ease",
                    _hover: { color: "ui.secondary" },
                  })}
                >
                  contact
                </span>
              </a>
            </div>
          </div>

          {/* Sitemap columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <p
                className={css({
                  fontSize: "2xs",
                  fontWeight: "bold",
                  color: "ui.dim",
                  textTransform: "uppercase",
                  letterSpacing: "editorial",
                  mb: "3",
                })}
              >
                {section.title}
              </p>
              <div className={flex({ direction: "column", gap: "2.5" })}>
                {section.links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={css({
                      fontSize: "sm",
                      color: "ui.tertiary",
                      textDecoration: "none",
                      textTransform: "lowercase",
                      letterSpacing: "normal",
                      transition: "color 150ms ease",
                      _hover: {
                        color: "ui.heading",
                      },
                    })}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ---- Manifesto strip ---- */}
        <div
          className={css({
            mt: "10",
            py: "6",
            borderTop: "1px solid",
            borderTopColor: "accent.border",
          })}
        >
          <p
            className={css({
              fontSize: { base: "xs", md: "sm" },
              fontWeight: "normal",
              fontStyle: "italic",
              color: "ui.tertiary",
              lineHeight: "relaxed",
              letterSpacing: "normal",
              maxW: "600px",
            })}
          >
            &ldquo;Built by one person who got tired of paying cloud CRMs
            $10K/year to own their own leads. This is not a startup. There is no
            pricing page. It is a pipeline that does one thing well: generate
            qualified B2B leads on commodity hardware.&rdquo;
          </p>
        </div>

        {/* ---- Bottom bar ---- */}
        <div
          className={flex({
            align: "center",
            justify: "space-between",
            mt: "4",
            pt: "4",
            borderTop: "1px solid",
            borderTopColor: "ui.border",
          })}
        >
          <div
            className={flex({
              align: "center",
              gap: { base: "3", sm: "5" },
              flexWrap: "wrap",
            })}
          >
            <p
              className={css({
                fontSize: "2xs",
                color: "ui.dim",
                letterSpacing: "normal",
              })}
            >
              &copy; {new Date().getFullYear()} agentic lead gen
            </p>
            {BOTTOM_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={css({
                  fontSize: "2xs",
                  color: "ui.dim",
                  textDecoration: "none",
                  letterSpacing: "normal",
                  transition: "color 150ms ease",
                  _hover: { color: "ui.tertiary" },
                })}
              >
                {label}
              </Link>
            ))}
          </div>

          <button
            onClick={scrollToTop}
            aria-label="scroll to top"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              px: "3",
              py: "1.5",
              bg: "transparent",
              border: "1px solid",
              borderColor: "ui.border",
              color: "ui.dim",
              fontSize: "2xs",
              fontWeight: "medium",
              fontFamily: "inherit",
              letterSpacing: "wide",
              textTransform: "lowercase",
              cursor: "pointer",
              transition:
                "color 150ms ease, border-color 150ms ease, background 150ms ease",
              _hover: {
                color: "ui.secondary",
                borderColor: "ui.borderHover",
                bg: "ui.surfaceHover",
              },
              _focusVisible: {
                outline: "2px solid",
                outlineColor: "accent.primary",
                outlineOffset: "2px",
              },
            })}
          >
            <ArrowUpIcon width={11} height={11} />
            back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
