"use client";

import { useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";
import { SearchModal } from "./search-modal";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  // Cmd+K / Ctrl+K — always active because this component is always mounted
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            // Record the appropriate trigger for focus restoration
            lastTriggerRef.current = desktopTriggerRef.current ?? mobileTriggerRef.current;
          }
          return !v;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobile: icon-only button */}
      <button
        ref={mobileTriggerRef}
        type="button"
        aria-label="Search"
        onClick={() => { lastTriggerRef.current = mobileTriggerRef.current; setOpen(true); }}
        className={css({
          display: 'inline-flex',
          md: { display: 'none' },
          alignItems: 'center',
          justifyContent: 'center',
          w: '44px',
          h: '44px',
          rounded: 'lg',
          borderWidth: '1px',
          borderColor: 'whiteAlpha.8',
          bg: 'transparent',
          color: 'ui.dim',
          transition: 'colors',
          transitionDuration: '200ms',
          _hover: { bg: 'whiteAlpha.5', borderColor: 'whiteAlpha.12', color: '#ADADB8' },
          _focusVisible: { outline: '2px solid rgba(139,92,246,0.6)', outlineOffset: '2px' },
        })}
      >
        <svg
          className={css({ w: '4', h: '4' })}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </button>

      {/* Desktop: search pill — wider with gradient border glow and shimmer */}
      <button
        ref={desktopTriggerRef}
        type="button"
        onClick={() => { lastTriggerRef.current = desktopTriggerRef.current; setOpen(true); }}
        className={css({
          display: 'none',
          md: { display: 'inline-flex' },
          pos: 'relative',
          alignItems: 'center',
          gap: '2.5',
          h: '36px',
          pl: '14px',
          pr: '10px',
          minW: '220px',
          rounded: 'full',
          borderWidth: '1px',
          borderColor: 'rgba(139,92,246,0.2)',
          bg: 'whiteAlpha.3',
          color: 'ui.secondary',
          cursor: 'pointer',
          transition: 'all',
          transitionDuration: '250ms',
          animation: 'search-border-glow 4s ease-in-out infinite',
          _hover: {
            bg: 'rgba(139,92,246,0.06)',
            borderColor: 'rgba(139,92,246,0.35)',
            color: 'ui.body',
            boxShadow: '0 0 20px rgba(139,92,246,0.12)',
          },
          _focusVisible: { outline: '2px solid rgba(139,92,246,0.6)', outlineOffset: '2px' },
        })}
      >
        {/* Shimmer overlay */}
        <span
          className={css({
            pos: 'absolute',
            inset: '0',
            rounded: 'full',
            overflow: 'hidden',
            pointerEvents: 'none',
          })}
          aria-hidden="true"
        >
          <span
            className={css({
              pos: 'absolute',
              inset: '0',
              background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.06) 40%, rgba(139,92,246,0.12) 50%, rgba(139,92,246,0.06) 60%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'search-shimmer 4s ease-in-out infinite',
            })}
          />
        </span>

        <svg
          className={css({ w: '3.5', h: '3.5', flexShrink: 0, pos: 'relative' })}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>

        <span className={css({ fontSize: '13px', lineHeight: 'none', pos: 'relative' })}>Search people...</span>

        {/* Keyboard shortcut badge */}
        <kbd
          className={css({
            pos: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            px: '6px',
            py: '3px',
            rounded: 'md',
            fontSize: '11px',
            fontWeight: 'medium',
            bg: 'rgba(139,92,246,0.10)',
            borderWidth: '1px',
            borderColor: 'rgba(139,92,246,0.20)',
            color: 'accent.purple',
            ml: 'auto',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.2)',
          })}
        >
          <span className={css({ fontSize: '10px', lineHeight: 'none' })}>&#8984;</span>
          <span className={css({ lineHeight: 'none' })}>K</span>
        </kbd>
      </button>

      <SearchModal open={open} onClose={() => setOpen(false)} triggerRef={lastTriggerRef} />
    </>
  );
}
