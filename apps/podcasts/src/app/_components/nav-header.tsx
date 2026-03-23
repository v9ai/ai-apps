"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { css, cx } from "styled-system/css";
import { SearchTrigger } from "./search-trigger";

type NavHeaderProps = {
  totalPersonalities: number;
  totalPodcasts: number;
};

export default function NavHeader({
  totalPersonalities,
  totalPodcasts,
}: NavHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setMobileOpen(false), []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, close]);

  return (
    <>
      <header
        className={css({
          pos: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          zIndex: 50,
          h: '16',
          bg: 'rgba(11,11,15,0.82)',
          backdropFilter: 'blur(40px)',
          borderBottomWidth: '1px',
          borderColor: 'whiteAlpha.8',
          animation: 'fade-in 0.4s var(--ease-expo-out) 0.05s both',
          _after: {
            content: '""',
            pos: 'absolute',
            bottom: '-1px',
            left: '0',
            right: '0',
            h: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.4) 30%, rgba(167,139,250,0.5) 50%, rgba(167,139,250,0.4) 70%, transparent 100%)',
          },
        })}
      >
        <div
          className={css({
            maxW: '80rem',
            mx: 'auto',
            px: { base: '4', sm: '6', md: '8', lg: '10' },
            h: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <Link
            href="/"
            className={css({
              fontSize: '1.125rem',
              fontWeight: 'semibold',
              color: 'white',
              letterSpacing: '-0.03em',
              transition: 'colors',
              display: 'flex',
              alignItems: 'center',
              gap: '2.5',
              h: 'full',
              _hover: { color: 'white' },
            })}
          >
            {/* Logo mark — abstract neural node */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className={css({ flexShrink: 0 })}
            >
              {/* Central node */}
              <circle cx="11" cy="11" r="3.5" fill="#A78BFA" />
              {/* Outer ring */}
              <circle cx="11" cy="11" r="9" stroke="#A78BFA" strokeWidth="1.2" opacity="0.35" />
              {/* Satellite nodes */}
              <circle cx="11" cy="2" r="1.5" fill="#A78BFA" opacity="0.7" />
              <circle cx="18.36" cy="15.5" r="1.5" fill="#A78BFA" opacity="0.5" />
              <circle cx="3.64" cy="15.5" r="1.5" fill="#A78BFA" opacity="0.5" />
              {/* Connection lines */}
              <line x1="11" y1="3.5" x2="11" y2="7.5" stroke="#A78BFA" strokeWidth="0.8" opacity="0.4" />
              <line x1="14.2" y1="12.8" x2="17.2" y2="14.8" stroke="#A78BFA" strokeWidth="0.8" opacity="0.3" />
              <line x1="7.8" y1="12.8" x2="4.8" y2="14.8" stroke="#A78BFA" strokeWidth="0.8" opacity="0.3" />
            </svg>
            Humans of AI
          </Link>

          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: { base: '2', md: '3' },
              h: 'full',
            })}
          >
            {/* Desktop nav links */}
            <nav
              aria-label="Main navigation"
              className={css({
                display: 'none',
                alignItems: 'center',
                gap: '1.5',
                flex: '1',
                md: { display: 'flex' },
              })}
            >
              <Link
                href="/stats"
                aria-current={pathname === "/stats" ? "page" : undefined}
                className={cx(
                  css({
                    px: '3',
                    py: '1.5',
                    rounded: 'lg',
                    fontSize: '13px',
                    fontWeight: 'medium',
                    transition: 'all',
                    transitionDuration: '150ms',
                  }),
                  pathname === "/stats"
                    ? css({
                        color: 'accent.purple',
                        bg: 'accent.purpleBg',
                        _hover: { bg: 'accent.purpleGlow' },
                      })
                    : css({
                        color: 'ui.faint',
                        _hover: { color: 'ui.body', bg: 'whiteAlpha.7' },
                      })
                )}
              >
                Stats
              </Link>
            </nav>

            {/* Search trigger */}
            <div className={css({ ml: { base: '0', md: '2' } })}>
              <SearchTrigger />
            </div>

            {/* Stats */}
            <div
              className={css({
                display: 'none',
                alignItems: 'center',
                gap: '2',
                ml: '2',
                pl: '4',
                borderLeftWidth: '1px',
                borderColor: 'whiteAlpha.8',
                sm: { display: 'flex' },
              })}
            >
              <span
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'medium',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'ui.secondary',
                })}
              >
                {totalPersonalities} Stories
              </span>
              <span
                aria-hidden="true"
                className={css({
                  fontSize: 'xs',
                  color: 'ui.faint',
                  userSelect: 'none',
                })}
              >
                &middot;
              </span>
              <span
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'medium',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'ui.secondary',
                })}
              >
                {totalPodcasts} Podcasts
              </span>
            </div>

            {/* Hamburger button -- mobile only */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={css({
                pos: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                w: '44px',
                h: '44px',
                rounded: 'lg',
                transition: 'all',
                transitionDuration: '200ms',
                ml: '1',
                borderWidth: '1px',
                borderColor: 'whiteAlpha.10',
                bg: 'whiteAlpha.4',
                md: { display: 'none' },
                _hover: { bg: 'whiteAlpha.8', borderColor: 'whiteAlpha.15' },
              })}
            >
              {/* Three bars that morph into an X */}
              <span
                className={css({
                  pos: 'absolute',
                  display: 'flex',
                  flexDir: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  w: '5',
                  h: '5',
                })}
              >
                <span
                  className={cx(
                    css({
                      display: 'block',
                      h: '2px',
                      w: '18px',
                      rounded: 'full',
                      bg: '#E0E0E6',
                      transition: 'all',
                      transitionDuration: '300ms',
                      transitionTimingFunction: 'ease-in-out',
                    }),
                    mobileOpen
                      ? css({ transform: 'translateY(0px) rotate(45deg)' })
                      : css({ transform: 'translateY(-5px) rotate(0deg)' })
                  )}
                />
                <span
                  className={cx(
                    css({
                      display: 'block',
                      h: '2px',
                      w: '18px',
                      rounded: 'full',
                      bg: '#E0E0E6',
                      transition: 'all',
                      transitionDuration: '300ms',
                      transitionTimingFunction: 'ease-in-out',
                    }),
                    mobileOpen
                      ? css({ opacity: 0, transform: 'scaleX(0)' })
                      : css({ opacity: 1, transform: 'scaleX(1)' })
                  )}
                />
                <span
                  className={cx(
                    css({
                      display: 'block',
                      h: '2px',
                      w: '18px',
                      rounded: 'full',
                      bg: '#E0E0E6',
                      transition: 'all',
                      transitionDuration: '300ms',
                      transitionTimingFunction: 'ease-in-out',
                    }),
                    mobileOpen
                      ? css({ transform: 'translateY(0px) rotate(-45deg)' })
                      : css({ transform: 'translateY(5px) rotate(0deg)' })
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu backdrop */}
      <div
        className={cx(
          css({
            pos: 'fixed',
            inset: '0',
            zIndex: 40,
            bg: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            transition: 'opacity',
            transitionDuration: '300ms',
            md: { display: 'none' },
          }),
          mobileOpen
            ? css({ opacity: 1, pointerEvents: 'auto' })
            : css({ opacity: 0, pointerEvents: 'none' })
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Mobile menu panel */}
      <nav
        aria-label="Mobile navigation"
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
        className={cx(
          css({
            pos: 'fixed',
            top: '16',
            left: '0',
            right: '0',
            zIndex: 40,
            bg: 'rgba(11,11,15,0.98)',
            borderBottomWidth: '1px',
            borderColor: 'card.border',
            shadow: '2xl',
            willChange: 'transform',
            transition: 'all',
            transitionDuration: '300ms',
            md: { display: 'none' },
          }),
          mobileOpen
            ? css({ opacity: 1, transform: 'translateY(0)' })
            : css({ opacity: 0, transform: 'translateY(-0.75rem)', pointerEvents: 'none' })
        )}
      >
        <div
          className={css({
            maxW: '80rem',
            mx: 'auto',
            px: { base: '4', sm: '6' },
            py: '6',
            display: 'flex',
            flexDir: 'column',
            gap: '3',
          })}
        >
          <Link
            href="/stats"
            onClick={close}
            aria-current={pathname === "/stats" ? "page" : undefined}
            className={cx(
              css({
                display: 'flex',
                alignItems: 'center',
                px: '3',
                py: '3',
                rounded: 'lg',
                fontSize: 'sm',
                fontWeight: 'medium',
                transition: 'all',
                transitionDuration: '200ms',
              }),
              pathname === "/stats"
                ? css({
                    color: 'accent.purple',
                    bg: 'accent.purpleBg',
                  })
                : css({
                    color: 'ui.body',
                    _hover: { color: 'white', bg: 'card.border' },
                  })
            )}
          >
            Stats
          </Link>

          {/* Stats summary visible on very small screens */}
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              px: '3',
              pt: '5',
              mt: '3',
              borderTopWidth: '1px',
              borderColor: 'card.border',
              sm: { display: 'none' },
            })}
          >
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'medium',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'ui.secondary',
              })}
            >
              {totalPersonalities} Stories
            </span>
            <span
              aria-hidden="true"
              className={css({
                fontSize: 'xs',
                color: 'ui.faint',
                userSelect: 'none',
              })}
            >
              &middot;
            </span>
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'medium',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'ui.secondary',
              })}
            >
              {totalPodcasts} Podcasts
            </span>
          </div>
        </div>
      </nav>
    </>
  );
}
