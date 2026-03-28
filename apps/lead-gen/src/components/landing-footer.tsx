"use client";

import { css } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import Image from "next/image";

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

export function LandingFooter() {
  return (
    <footer
      className={css({
        borderTop: "1px solid",
        borderTopColor: "ui.border",
        pt: { base: "8", lg: "10" },
        pb: { base: "6", lg: "8" },
        mt: { base: "8", lg: "10" },
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        <div
          className={grid({
            columns: { base: 1, sm: 2, md: 4 },
            gap: { base: "6", md: "4" },
          })}
        >
          {/* brand column */}
          <div>
            <Link
              href="/"
              className={flex({ align: "center", gap: "2", mb: "3" })}
              style={{ textDecoration: "none" }}
            >
              <Image src="/logo.svg" alt="Agentic Lead Gen" width={100} height={22} />
            </Link>
            <p
              className={css({
                fontSize: "xs",
                color: "ui.tertiary",
                lineHeight: "relaxed",
                maxW: "200px",
              })}
            >
              agentic B2B lead generation platform. AI agents handle discovery,
              enrichment, scoring, and outreach — end to end.
            </p>
            <a
              href="https://github.com/nicolad/agentic-lead-gen"
              target="_blank"
              rel="noopener noreferrer"
              className={flex({
                align: "center",
                gap: "2",
                mt: "4",
              })}
              style={{
                color: "var(--gray-9)",
                fontSize: "11px",
                textDecoration: "none",
                letterSpacing: "0.02em",
                transition: "color 0.15s",
              }}
            >
              <GitHubLogoIcon width={14} height={14} />
              source code
            </a>
          </div>

          {/* link columns */}
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
              <div className={flex({ direction: "column", gap: "2" })}>
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
                      borderRadius: "0",
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

        {/* brutalist manifesto strip */}
        <div
          className={css({
            mt: "8",
            py: "5",
            borderTop: "2px solid",
            borderTopColor: "accent.primary",
          })}
        >
          <p
            className={css({
              fontSize: { base: "xs", md: "sm" },
              fontWeight: "medium",
              color: "ui.tertiary",
              lineHeight: "relaxed",
              letterSpacing: "snug",
              maxW: "560px",
            })}
          >
            built by one person who got tired of paying cloud CRMs $10K/year to
            own their own leads. this is not a startup. there is no pricing page.
            it is a pipeline that does one thing well: generate qualified B2B
            leads on commodity hardware.
          </p>
        </div>

        {/* bottom bar */}
        <div
          className={flex({
            align: "center",
            justify: "space-between",
            mt: "4",
            pt: "4",
          })}
          style={{ borderTop: "1px solid var(--gray-4)" }}
        >
          <p
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              letterSpacing: "normal",
            })}
          >
            Agentic Lead Gen
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={css({
              bg: "transparent",
              border: "1px solid",
              borderColor: "ui.border",
              color: "ui.tertiary",
              fontSize: "2xs",
              fontWeight: "medium",
              letterSpacing: "wide",
              textTransform: "lowercase",
              borderRadius: "0",
              px: "3",
              py: "1.5",
              cursor: "pointer",
              transition: "color 150ms ease, border-color 150ms ease",
              _hover: {
                color: "ui.heading",
                borderColor: "ui.borderHover",
              },
            })}
          >
            back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
