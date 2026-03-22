"use client";

import Link from "next/link";
import { css } from "styled-system/css";

const GITHUB_URL = "https://github.com/nicolad/ai-apps";

const navLinkStyle = css({
  color: '#9B9BA6',
  fontSize: 'xs',
  pos: 'relative',
  transition: 'color 0.2s ease',
  _hover: { color: '#E8E8ED' },
  _after: {
    content: '""',
    pos: 'absolute',
    bottom: '-2px',
    left: '0',
    w: '0',
    h: '1px',
    bg: 'rgba(138,138,160,0.5)',
    transition: 'width 0.3s ease',
  },
});

const navLinkHoverUnderline = css({
  '&:hover::after': {
    w: '100%',
  },
});

const sectionLabelStyle = css({
  color: '#5A5A66',
  fontSize: '2xs',
  fontWeight: 'semibold',
  letterSpacing: 'wider',
  textTransform: 'uppercase',
  mb: '3',
});

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className={css({
        pos: 'relative',
        bg: '#0B0B0F',
        borderTopWidth: '1px',
        borderColor: 'rgba(255,255,255,0.06)',
        pt: { base: '16', md: '20' },
        pb: { base: '12', md: '14' },
        overflow: 'hidden',
      })}
    >
      {/* Decorative gradient mesh background */}
      <div
        className={css({
          pos: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          opacity: '0.4',
        })}
        style={{
          background: [
            'radial-gradient(ellipse 600px 300px at 10% 80%, rgba(88,28,135,0.08), transparent)',
            'radial-gradient(ellipse 500px 250px at 90% 20%, rgba(30,58,138,0.06), transparent)',
            'radial-gradient(ellipse 400px 200px at 50% 60%, rgba(55,48,107,0.05), transparent)',
          ].join(', '),
        }}
      />

      {/* Dot pattern overlay */}
      <div
        className={css({
          pos: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          opacity: '0.03',
        })}
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Gradient top border */}
      <div
        className={css({
          pos: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          h: '1px',
        })}
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(138,138,200,0.15), transparent)',
        }}
      />

      <div
        className={css({
          pos: 'relative',
          maxW: '7xl',
          mx: 'auto',
          px: { base: '5', sm: '6', md: '8' },
        })}
      >
        {/* Row 1: brand + nav link groups */}
        <div
          className={css({
            display: 'flex',
            flexDir: 'column',
            gap: { base: '10', md: '0' },
            md: {
              flexDir: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            },
          })}
        >
          {/* Brand column */}
          <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
            <Link
              href="/"
              className={css({
                color: '#E8E8ED',
                fontSize: 'sm',
                fontWeight: 'semibold',
                letterSpacing: 'wide',
                transition: 'color 0.2s ease',
                _hover: { color: '#fff' },
              })}
            >
              Humans of AI
            </Link>
            <p
              className={css({
                color: '#5A5A66',
                fontSize: 'xs',
                letterSpacing: '0.01em',
                maxW: '52',
                lineHeight: 'relaxed',
              })}
            >
              Intimate portraits of the minds building AI
            </p>
          </div>

          {/* Nav link groups */}
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: { base: 'repeat(2, 1fr)', sm: 'repeat(3, auto)' },
              gap: { base: '8', sm: '16' },
            })}
          >
            {/* Explore section */}
            <div>
              <p className={sectionLabelStyle}>Explore</p>
              <nav
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  gap: '3',
                })}
              >
                <Link
                  href="/stats"
                  className={`${navLinkStyle} ${navLinkHoverUnderline}`}
                >
                  Stats
                </Link>
                <Link
                  href="/compare"
                  className={`${navLinkStyle} ${navLinkHoverUnderline}`}
                >
                  Compare
                </Link>
              </nav>
            </div>

            {/* Subscribe section */}
            <div>
              <p className={sectionLabelStyle}>Subscribe</p>
              <nav
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  gap: '3',
                })}
              >
                <a
                  href="/feed.xml"
                  className={`${navLinkStyle} ${navLinkHoverUnderline}`}
                >
                  <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1.5' })}>
                    {/* RSS icon */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 11a9 9 0 0 1 9 9" />
                      <path d="M4 4a16 16 0 0 1 16 16" />
                      <circle cx="5" cy="19" r="1" />
                    </svg>
                    RSS Feed
                  </span>
                </a>
                <a
                  href="/feed.json"
                  className={`${navLinkStyle} ${navLinkHoverUnderline}`}
                >
                  <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1.5' })}>
                    {/* JSON icon */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
                      <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
                    </svg>
                    JSON Feed
                  </span>
                </a>
              </nav>
            </div>

            {/* Connect section */}
            <div>
              <p className={sectionLabelStyle}>Connect</p>
              <nav
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  gap: '3',
                })}
              >
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${navLinkStyle} ${navLinkHoverUnderline}`}
                >
                  <span className={css({ display: 'inline-flex', alignItems: 'center', gap: '1.5' })}>
                    {/* GitHub icon */}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </span>
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className={css({
            mt: { base: '12', md: '14' },
            mb: { base: '6', md: '8' },
            h: '1px',
          })}
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
          }}
        />

        {/* Row 2: copyright + back to top */}
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <p
            className={css({
              color: '#5A5A66',
              fontSize: 'xs',
            })}
          >
            &copy; {new Date().getFullYear()} Humans of AI
          </p>

          <button
            onClick={scrollToTop}
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.5',
              color: '#7B7B86',
              fontSize: 'xs',
              cursor: 'pointer',
              bg: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              rounded: 'md',
              px: '3',
              py: '1.5',
              transition: 'all 0.2s ease',
              _hover: {
                color: '#C4C4CC',
                bg: 'rgba(255,255,255,0.07)',
                borderColor: 'rgba(255,255,255,0.12)',
              },
            })}
            aria-label="Back to top"
          >
            {/* Up arrow icon */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
