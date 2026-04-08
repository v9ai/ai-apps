"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { button } from "@/recipes/button";
import { cx } from "styled-system/css";

const SECTION_ANCHORS = [
  { id: "hero", label: "home" },
  { id: "pipeline", label: "pipeline" },
  { id: "benchmarks", label: "metrics" },
  { id: "features", label: "features" },
  { id: "research", label: "architecture" },
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
  const navItemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);

  // compute sliding underline position
  const updateIndicator = useCallback(() => {
    const el = navItemsRef.current.get(activeSection);
    if (el) {
      const nav = el.parentElement;
      if (nav) {
        const navRect = nav.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setIndicatorStyle({
          left: elRect.left - navRect.left,
          width: elRect.width,
        });
      }
    }
  }, [activeSection]);

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

  // update indicator when active section or visibility changes
  useEffect(() => {
    updateIndicator();
  }, [activeSection, visible, updateIndicator]);

  // also update indicator on resize
  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

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
      {/* -- scroll progress bar -- */}
      <div
        className={css({
          position: "fixed",
          top: 0,
          left: 0,
          height: "1px",
          zIndex: 52,
          transition: "opacity 200ms ease",
          pointerEvents: "none",
        })}
        style={{
          width: `${scrollProgress * 100}%`,
          opacity: visible ? 1 : 0,
          background: "linear-gradient(90deg, #3E63DD 0%, #30A46C 100%)",
        }}
      />

      {/* -- sticky nav bar -- */}
      <header
        className={css({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          bg: "rgba(10, 10, 15, 0.6)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid",
          borderBottomColor: "rgba(44, 44, 47, 0.5)",
          transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease",
          transform: visible ? "translateY(0)" : "translateY(-100%)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        })}
        style={{ WebkitBackdropFilter: "blur(20px)" }}
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
            {/* logo / wordmark */}
            <Link
              href="/"
              className={flex({ align: "center", gap: "0", flexShrink: 0 })}
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span
                className={css({
                  fontSize: "base",
                  fontWeight: "bold",
                  color: "ui.heading",
                  letterSpacing: "tight",
                  textTransform: "lowercase",
                })}
              >
                agentic
              </span>
              <span
                className={css({
                  fontSize: "base",
                  fontWeight: "normal",
                  color: "ui.dim",
                  letterSpacing: "tight",
                  textTransform: "lowercase",
                  ml: "1.5",
                })}
              >
                lead gen
              </span>
            </Link>

            {/* desktop: section anchors with sliding underline */}
            <nav
              className={css({
                display: { base: "none", md: "flex" },
                alignItems: "center",
                gap: "0",
                position: "relative",
              })}
            >
              {SECTION_ANCHORS.map(({ id, label }) => (
                <button
                  key={id}
                  ref={(el) => {
                    if (el) navItemsRef.current.set(id, el);
                  }}
                  onClick={() => scrollToSection(id)}
                  className={cx(
                    button({ variant: "link" }),
                    css({
                      px: "3",
                      py: "1.5",
                      fontSize: "sm",
                      fontWeight: activeSection === id ? "semibold" : "medium",
                      color: activeSection === id ? "ui.heading" : "ui.tertiary",
                      position: "relative",
                      transition: "color 200ms ease",
                      _hover: { color: "ui.secondary" },
                    })
                  )}
                >
                  {label}
                </button>
              ))}
              {/* sliding underline indicator */}
              {indicatorStyle && (
                <span
                  className={css({
                    position: "absolute",
                    bottom: "-1px",
                    height: "2px",
                    pointerEvents: "none",
                  })}
                  style={{
                    left: `${indicatorStyle.left + 12}px`,
                    width: `${indicatorStyle.width - 24}px`,
                    background: "linear-gradient(90deg, #3E63DD, #30A46C)",
                    transition: "left 300ms cubic-bezier(0.22, 1, 0.36, 1), width 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              )}
            </nav>

            {/* desktop: site links + CTA */}
            <div
              className={flex({
                align: "center",
                gap: "1",
                display: { base: "none", md: "flex" },
              })}
            >
              {SITE_LINKS.slice(0, 2).map(({ href, label }) => (
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
              <Link
                href="/companies"
                className={cx(
                  button({ variant: "solid", size: "sm" }),
                  css({
                    ml: "2",
                    fontSize: "xs",
                    fontWeight: "bold",
                    letterSpacing: "normal",
                    textDecoration: "none",
                  }),
                )}
              >
                get started
                <ArrowRightIcon width={12} height={12} />
              </Link>
            </div>

            {/* mobile: CTA + hamburger */}
            <div
              className={flex({
                align: "center",
                gap: "2",
                display: { base: "flex", md: "none" },
              })}
            >
              <Link
                href="/companies"
                className={cx(
                  button({ variant: "solid", size: "sm" }),
                  css({
                    fontSize: "xs",
                    fontWeight: "bold",
                    letterSpacing: "normal",
                    textDecoration: "none",
                    px: "3",
                    h: "28px",
                  }),
                )}
              >
                get started
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cx(
                  button({ variant: "ghost", size: "sm" }),
                  css({
                    alignItems: "center",
                    justifyContent: "center",
                    w: "36px",
                    h: "36px",
                    px: "0",
                  })
                )}
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
        </div>
      </header>

      {/* -- mobile overlay backdrop -- */}
      <div
        className={css({
          position: "fixed",
          inset: 0,
          zIndex: 48,
          bg: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          display: { base: "block", md: "none" },
          transition: "opacity 300ms ease",
          pointerEvents: mobileOpen ? "auto" : "none",
        })}
        style={{
          opacity: mobileOpen ? 1 : 0,
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={() => setMobileOpen(false)}
      />

      {/* -- mobile slide-in menu -- */}
      <div
        className={css({
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          w: { base: "85vw", sm: "320px" },
          zIndex: 49,
          bg: "rgba(10, 10, 15, 0.95)",
          backdropFilter: "blur(24px)",
          display: { base: "flex", md: "none" },
          flexDirection: "column",
          pt: "60px",
          px: "6",
          borderLeft: "1px solid",
          borderLeftColor: "ui.border",
          transition: "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
          overflowY: "auto",
        })}
        style={{
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* brand header */}
        <div className={css({ mb: "6" })}>
          <p
            className={css({
              fontSize: "xl",
              fontWeight: "bold",
              color: "ui.heading",
              letterSpacing: "tight",
              textTransform: "lowercase",
            })}
          >
            agentic
            <span className={css({ fontWeight: "normal", color: "ui.dim", ml: "2" })}>
              lead gen
            </span>
          </p>
          <p
            className={css({
              fontSize: "2xs",
              color: "ui.dim",
              mt: "1",
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
            mb: "3",
            mt: "4",
          })}
        >
          on this page
        </p>
        {SECTION_ANCHORS.map(({ id, label }, i) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={cx(
              button({ variant: "link" }),
              css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                borderBottom: "1px solid",
                borderBottomColor: "ui.border",
                py: "3.5",
                px: "0",
                fontSize: "lg",
                fontWeight: activeSection === id ? "bold" : "normal",
                color: activeSection === id ? "ui.heading" : "ui.secondary",
                letterSpacing: "snug",
                textAlign: "left",
                width: "100%",
                transition: "color 200ms ease, transform 200ms ease",
              })
            )}
            style={{
              transitionDelay: mobileOpen ? `${50 + i * 40}ms` : "0ms",
              transform: mobileOpen ? "translateX(0)" : "translateX(20px)",
              opacity: mobileOpen ? 1 : 0,
            }}
          >
            {activeSection === id && (
              <span
                className={css({
                  w: "6px",
                  h: "6px",
                  flexShrink: 0,
                })}
                style={{
                  background: "linear-gradient(135deg, #3E63DD, #30A46C)",
                }}
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
        {SITE_LINKS.map(({ href, label, icon }, i) => (
          <Link
            key={href}
            href={href}
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "3",
              py: "3.5",
              borderBottom: "1px solid",
              borderBottomColor: "ui.border",
              fontSize: "lg",
              fontWeight: "normal",
              color: "ui.secondary",
              textTransform: "lowercase",
              letterSpacing: "snug",
              textDecoration: "none",
              transition: "color 150ms ease, transform 200ms ease",
              _hover: {
                color: "ui.heading",
              },
            })}
            style={{
              transitionDelay: mobileOpen ? `${250 + i * 40}ms` : "0ms",
              transform: mobileOpen ? "translateX(0)" : "translateX(20px)",
              opacity: mobileOpen ? 1 : 0,
            }}
            onClick={() => setMobileOpen(false)}
          >
            {icon}
            {label}
          </Link>
        ))}

        {/* mobile CTA */}
        <div className={css({ mt: "8" })}>
          <Link
            href="/companies"
            className={cx(
              button({ variant: "solid", size: "lg" }),
              css({
                justifyContent: "center",
                width: "100%",
                textDecoration: "none",
              }),
            )}
            onClick={() => setMobileOpen(false)}
          >
            get started
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>

        {/* github link at bottom */}
        <div className={css({ mt: "auto", pb: "6", pt: "6" })}>
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
