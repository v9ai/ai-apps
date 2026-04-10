"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { css, cx } from "styled-system/css";
import { flex, container } from "styled-system/patterns";
import {
  HamburgerMenuIcon,
  Cross1Icon,
  CubeIcon,
  PersonIcon,
  BarChartIcon,
  LayersIcon,
  GitHubLogoIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { button } from "@/recipes/button";
import { navAnchor, mobilePanel } from "@/recipes/nav";

const SECTION_ANCHORS = [
  { id: "hero", label: "home" },
  { id: "pipeline", label: "pipeline" },
  { id: "metrics", label: "metrics" },
  { id: "features", label: "features" },
  { id: "research", label: "research" },
] as const;

const SITE_LINKS = [
  { href: "/companies", label: "companies", icon: <CubeIcon width={14} height={14} /> },
  { href: "/contacts", label: "contacts", icon: <PersonIcon width={14} height={14} /> },
  { href: "/architecture", label: "architecture", icon: <LayersIcon width={14} height={14} /> },
  { href: "/benchmarks", label: "benchmarks", icon: <BarChartIcon width={14} height={14} /> },
] as const;

export function LandingNav() {
  const [visible, setVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number>(0);

  /* ── scroll tracking with rAF throttle ── */
  useEffect(() => {
    let ticking = false;

    function update() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      setVisible(scrollY > 80);
      setScrollProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);

      /* detect active section — last one whose top crossed threshold */
      const sections = SECTION_ANCHORS
        .map(({ id }) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[];
      let current = "hero";
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 120) {
          current = section.id;
        }
      }
      setActiveSection(current);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── escape to close mobile menu ── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── lock body scroll when mobile menu is open ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileOpen(false);
    }
  }, []);

  return (
    <>
      {/* ── scroll progress bar ── */}
      <div
        className={css({
          position: "fixed",
          top: 0,
          left: 0,
          height: "2px",
          zIndex: 52,
          pointerEvents: "none",
          transition: "opacity 300ms ease",
          background: "linear-gradient(90deg, token(colors.accent.primary), token(colors.status.positive))",
        })}
        style={{
          width: `${scrollProgress * 100}%`,
          opacity: visible ? 1 : 0,
        }}
      />

      {/* ── sticky nav bar ── */}
      <header
        className={css({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "transform 400ms cubic-bezier(0.16, 1, 0.30, 1), opacity 300ms ease",
          pointerEvents: visible ? "auto" : "none",
        })}
        style={{
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          opacity: visible ? 1 : 0,
        }}
      >
        {/* glass layer */}
        <div
          className={css({
            bg: "rgba(10, 10, 15, 0.60)",
            backdropFilter: "blur(20px) saturate(1.4)",
            borderBottom: "1px solid",
            borderBottomColor: "whiteAlpha.8",
          })}
          style={{ WebkitBackdropFilter: "blur(20px) saturate(1.4)" }}
        >
          <div
            className={container({})}
            style={{ padding: "0 20px" }}
          >
            <div
              className={flex({
                align: "center",
                justify: "space-between",
                h: "52px",
              })}
            >
              {/* ── brand / logo ── */}
              <Link
                href="/"
                className={flex({ align: "center", gap: "2.5", flexShrink: 0 })}
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {/* logo mark */}
                <span
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    w: "24px",
                    h: "24px",
                    bg: "accent.primary",
                    color: "accent.contrast",
                    fontSize: "2xs",
                    fontWeight: "bold",
                    letterSpacing: "tight",
                    lineHeight: "none",
                    flexShrink: 0,
                  })}
                >
                  AL
                </span>
                <span
                  className={css({
                    fontSize: "sm",
                    fontWeight: "semibold",
                    color: "ui.heading",
                    letterSpacing: "tight",
                    textTransform: "lowercase",
                  })}
                >
                  agentic lead gen
                </span>
              </Link>

              {/* ── desktop: section anchors (center) ── */}
              <nav
                className={flex({
                  align: "center",
                  gap: "0.5",
                  display: { base: "none", md: "flex" },
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                })}
              >
                {SECTION_ANCHORS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={navAnchor({ active: activeSection === id })}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* ── desktop: site links (right) ── */}
              <div
                className={flex({
                  align: "center",
                  gap: "0.5",
                  display: { base: "none", md: "flex" },
                })}
              >
                {SITE_LINKS.slice(0, 3).map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={css({
                      px: "2.5",
                      py: "1.5",
                      fontSize: "sm",
                      fontWeight: "medium",
                      color: "ui.tertiary",
                      letterSpacing: "normal",
                      textTransform: "lowercase",
                      textDecoration: "none",
                      transition: "color 200ms ease",
                      _hover: {
                        color: "ui.heading",
                      },
                    })}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* ── mobile: hamburger button ── */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cx(
                  button({ variant: "ghost", size: "sm" }),
                  css({
                    display: { base: "flex", md: "none" },
                    alignItems: "center",
                    justifyContent: "center",
                    w: "36px",
                    h: "36px",
                    px: "0",
                    borderColor: mobileOpen ? "ui.borderHover" : "ui.border",
                    transition: "border-color 200ms ease, transform 200ms ease",
                  })
                )}
                aria-label={mobileOpen ? "close menu" : "open menu"}
              >
                {mobileOpen ? (
                  <Cross1Icon width={15} height={15} />
                ) : (
                  <HamburgerMenuIcon width={15} height={15} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── mobile backdrop overlay ── */}
      <div
        className={css({
          position: "fixed",
          inset: 0,
          zIndex: 48,
          bg: "rgba(0, 0, 0, 0.50)",
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
          display: { base: "block", md: "none" },
        })}
        style={{ opacity: mobileOpen ? 1 : 0 }}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── mobile slide-out panel ── */}
      <div
        className={mobilePanel({ open: mobileOpen })}
        style={{ WebkitBackdropFilter: "blur(24px)" }}
      >
        {/* brand header */}
        <div className={css({ mb: "8" })}>
          <div className={flex({ align: "center", gap: "2.5", mb: "2" })}>
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                w: "28px",
                h: "28px",
                bg: "accent.primary",
                color: "accent.contrast",
                fontSize: "xs",
                fontWeight: "bold",
                letterSpacing: "tight",
                lineHeight: "none",
                flexShrink: 0,
              })}
            >
              AL
            </span>
            <p
              className={css({
                fontSize: "xl",
                fontWeight: "bold",
                color: "ui.heading",
                letterSpacing: "snug",
              })}
            >
              Agentic Lead Gen
            </p>
          </div>
          <p
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              mt: "1",
              pl: "40px",
            })}
          >
            Autonomous B2B lead generation
          </p>
        </div>

        {/* section anchors */}
        <p
          className={css({
            fontSize: "2xs",
            color: "ui.dim",
            textTransform: "uppercase",
            letterSpacing: "editorial",
            mb: "2",
          })}
        >
          on this page
        </p>
        <div className={css({ mb: "6" })}>
          {SECTION_ANCHORS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                width: "100%",
                py: "3",
                px: "0",
                borderBottom: "1px solid",
                borderBottomColor: "whiteAlpha.6",
                fontSize: "lg",
                fontWeight: activeSection === id ? "semibold" : "normal",
                color: activeSection === id ? "ui.heading" : "ui.secondary",
                letterSpacing: "snug",
                textAlign: "left",
                textTransform: "lowercase",
                background: "transparent",
                border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: "1px",
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "color 200ms ease",
                _hover: {
                  color: "ui.heading",
                },
              })}
            >
              {/* active dot indicator */}
              <span
                className={css({
                  w: "5px",
                  h: "5px",
                  bg: activeSection === id ? "accent.primary" : "transparent",
                  borderRadius: "50%",
                  flexShrink: 0,
                  transition: "background 250ms ease",
                })}
              />
              {label}
            </button>
          ))}
        </div>

        {/* site navigation */}
        <p
          className={css({
            fontSize: "2xs",
            color: "ui.dim",
            textTransform: "uppercase",
            letterSpacing: "editorial",
            mb: "2",
          })}
        >
          navigate
        </p>
        <div className={css({ mb: "6" })}>
          {SITE_LINKS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                py: "3",
                borderBottom: "1px solid",
                borderBottomColor: "whiteAlpha.6",
                fontSize: "lg",
                fontWeight: "normal",
                color: "ui.secondary",
                textTransform: "lowercase",
                letterSpacing: "snug",
                textDecoration: "none",
                transition: "color 200ms ease",
                _hover: {
                  color: "ui.heading",
                },
              })}
              onClick={() => setMobileOpen(false)}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>

        {/* github link pinned to bottom */}
        <div className={css({ mt: "auto", pb: "2" })}>
          <a
            href="https://github.com/nicolad/ai-apps/tree/main/apps/lead-gen"
            target="_blank"
            rel="noopener noreferrer"
            className={flex({
              align: "center",
              gap: "2",
            })}
            style={{
              color: "var(--gray-9)",
              fontSize: "12px",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            <GitHubLogoIcon width={14} height={14} />
            source code
          </a>
        </div>
      </div>
    </>
  );
}
