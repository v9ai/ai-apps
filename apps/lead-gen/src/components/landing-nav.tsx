"use client";

import { useEffect, useState, useCallback } from "react";
import { css } from "styled-system/css";
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
import Image from "next/image";

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

  // track scroll position for sticky reveal + progress bar
  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      // show nav after scrolling past 120px
      setVisible(scrollY > 120);

      // progress 0..1
      setScrollProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);

      // detect active section
      const sections = SECTION_ANCHORS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
      let current = "hero";
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100) {
          current = section.id;
        }
      }
      setActiveSection(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
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
          bg: "accent.primary",
          zIndex: 51,
          transition: "opacity 200ms ease",
          pointerEvents: "none",
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
          bg: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid",
          borderBottomColor: "ui.border",
          transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease",
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        })}
        style={{ WebkitBackdropFilter: "blur(12px)" }}
      >
        <div
          className={container({ maxW: "breakpoint-lg" })}
          style={{ padding: "0 16px" }}
        >
          <div
            className={flex({
              align: "center",
              justify: "space-between",
              h: "48px",
            })}
          >
            {/* logo */}
            <Link
              href="/"
              className={flex({ align: "center", gap: "2", flexShrink: 0 })}
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Image src="/logo.svg" alt="Lead-gen" width={100} height={22} priority />
            </Link>

            {/* desktop: section anchors */}
            <nav
              className={flex({
                align: "center",
                gap: "1",
                display: { base: "none", md: "flex" },
              })}
            >
              {SECTION_ANCHORS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={css({
                    bg: "transparent",
                    border: "none",
                    cursor: "pointer",
                    px: "3",
                    py: "1.5",
                    fontSize: "sm",
                    fontWeight: activeSection === id ? "bold" : "medium",
                    color: activeSection === id ? "ui.heading" : "ui.tertiary",
                    letterSpacing: "normal",
                    textTransform: "lowercase",
                    transition: "color 150ms ease",
                    position: "relative",
                    _hover: {
                      color: "ui.secondary",
                    },
                    _after: activeSection === id ? {
                      content: '""',
                      position: "absolute",
                      bottom: "-1px",
                      left: "12px",
                      right: "12px",
                      height: "2px",
                      bg: "accent.primary",
                    } : {},
                  })}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* desktop: site links */}
            <div
              className={flex({
                align: "center",
                gap: "1",
                display: { base: "none", md: "flex" },
              })}
            >
              {SITE_LINKS.slice(0, 3).map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={css({
                    px: "3",
                    py: "1.5",
                    fontSize: "sm",
                    fontWeight: "medium",
                    color: "ui.tertiary",
                    letterSpacing: "normal",
                    textTransform: "lowercase",
                    textDecoration: "none",
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

            {/* mobile: hamburger button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={css({
                display: { base: "flex", md: "none" },
                alignItems: "center",
                justifyContent: "center",
                w: "36px",
                h: "36px",
                bg: "transparent",
                border: "1px solid",
                borderColor: "ui.border",
                cursor: "pointer",
                color: "ui.secondary",
                transition: "color 150ms ease, border-color 150ms ease",
                _hover: {
                  color: "ui.heading",
                  borderColor: "ui.borderHover",
                },
              })}
              aria-label={mobileOpen ? "close menu" : "open menu"}
            >
              {mobileOpen ? (
                <Cross1Icon width={16} height={16} />
              ) : (
                <HamburgerMenuIcon width={16} height={16} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── mobile overlay menu ── */}
      {mobileOpen && (
        <div
          className={css({
            position: "fixed",
            inset: 0,
            zIndex: 49,
            bg: "rgba(10, 10, 15, 0.95)",
            backdropFilter: "blur(16px)",
            display: { base: "flex", md: "none" },
            flexDirection: "column",
            pt: "60px",
            px: "6",
          })}
          style={{ WebkitBackdropFilter: "blur(16px)" }}
        >
          {/* section anchors */}
          <p
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              textTransform: "uppercase",
              letterSpacing: "editorial",
              mb: "3",
              mt: "4",
            })}
          >
            on this page
          </p>
          {SECTION_ANCHORS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "2",
                bg: "transparent",
                border: "none",
                borderBottom: "1px solid",
                borderBottomColor: "ui.border",
                cursor: "pointer",
                py: "3",
                px: "0",
                fontSize: "lg",
                fontWeight: activeSection === id ? "bold" : "normal",
                color: activeSection === id ? "ui.heading" : "ui.secondary",
                textTransform: "lowercase",
                letterSpacing: "snug",
                textAlign: "left",
                width: "100%",
                transition: "color 150ms ease",
              })}
            >
              {activeSection === id && (
                <span
                  className={css({
                    w: "6px",
                    h: "6px",
                    bg: "accent.primary",
                    flexShrink: 0,
                  })}
                />
              )}
              {label}
            </button>
          ))}

          {/* site navigation */}
          <p
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              textTransform: "uppercase",
              letterSpacing: "editorial",
              mb: "3",
              mt: "6",
            })}
          >
            navigate
          </p>
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
                borderBottomColor: "ui.border",
                fontSize: "lg",
                fontWeight: "normal",
                color: "ui.secondary",
                textTransform: "lowercase",
                letterSpacing: "snug",
                textDecoration: "none",
                transition: "color 150ms ease",
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

          {/* github link at bottom */}
          <div className={css({ mt: "auto", pb: "6" })}>
            <a
              href="https://github.com/nicolad/lead-gen"
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
      )}
    </>
  );
}
