"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { css } from "styled-system/css";
import {
  getAllPersonalities,
  getAvatarUrl,
  getInitials,
  getCategoryForPersonality,
} from "@/lib/personalities";
import type { Personality } from "@/lib/personalities/types";

/* ── Types ──────────────────────────────────────────────────────── */

type SearchModalProps = {
  open?: boolean;
  onClose?: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
};

type ScoredResult = {
  personality: Personality;
  score: number;
  categoryTitle?: string;
};

/* ── Category color map (inline badges) ─────────────────────────── */

const categoryBadgeColors: Record<string, { bg: string; border: string; text: string }> = {
  "Lab Leaders & Founders":             { bg: "rgba(139,92,246,0.10)",  border: "rgba(139,92,246,0.22)",  text: "#C4B5FD" },
  "Builders & Technical Leaders":       { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.22)",  text: "#93C5FD" },
  "Researchers & Thinkers":             { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.22)",  text: "#6EE7B7" },
  "Podcast Hosts & AI Personalities":   { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.22)",  text: "#FCD34D" },
  "Rising Infrastructure & Product Leaders": { bg: "rgba(244,63,94,0.10)", border: "rgba(244,63,94,0.22)", text: "#FDA4AF" },
  "AI Infrastructure & Inference":      { bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.22)",  text: "#7DD3FC" },
  "Vector Database Founders":           { bg: "rgba(132,204,22,0.10)",  border: "rgba(132,204,22,0.22)",  text: "#BEF264" },
};

const defaultBadgeColor = { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.08)", text: "#ADADB8" };

/* ── Suggested searches ────────────────────────────────────────── */

const SUGGESTED_SEARCHES = [
  { label: "Andrej Karpathy", query: "Karpathy" },
  { label: "Yann LeCun", query: "LeCun" },
  { label: "Jensen Huang", query: "Jensen" },
  { label: "Dario Amodei", query: "Dario" },
  { label: "Ilya Sutskever", query: "Ilya" },
  { label: "Geoffrey Hinton", query: "Hinton" },
];

/* ── Fuzzy scoring ──────────────────────────────────────────────── */

function scoreMatch(query: string, personality: Personality): number {
  const q = query.toLowerCase();
  const fields = [
    { text: personality.name, weight: 4 },
    { text: personality.org, weight: 2 },
    { text: personality.role, weight: 2 },
    { text: personality.knownFor ?? "", weight: 3 },
  ];

  let total = 0;

  for (const { text, weight } of fields) {
    if (!text) continue;
    const lower = text.toLowerCase();

    if (lower === q) {
      // Exact full match
      total += weight * 3;
    } else if (lower.startsWith(q)) {
      // Prefix match
      total += weight * 2;
    } else if (lower.includes(q)) {
      // Substring match
      total += weight;
    }
  }

  return total;
}

const MAX_RESULTS = 8;

/* ── Component ──────────────────────────────────────────────────── */

export function SearchModal({ open: controlledOpen, onClose, triggerRef }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Support both controlled and uncontrolled open state
  const isOpen = controlledOpen ?? internalOpen;

  const close = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose?.();
    setInternalOpen(false);
    // Restore focus to the trigger button that opened the modal
    requestAnimationFrame(() => {
      triggerRef?.current?.focus();
    });
  }, [onClose, triggerRef]);

  const allPersonalities = useMemo(() => getAllPersonalities(), []);

  const results = useMemo<ScoredResult[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return allPersonalities
      .map((p) => {
        const cat = getCategoryForPersonality(p.slug);
        return { personality: p, score: scoreMatch(trimmed, p), categoryTitle: cat?.title };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }, [query, allPersonalities]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          setInternalOpen(true);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay so the DOM is painted first
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Navigate to a personality
  const navigateTo = useCallback(
    (slug: string) => {
      close();
      router.push(`/person/${slug}`);
    },
    [close, router],
  );

  // Focus trap and modal-level Escape handling
  const handleModalKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'input, button, a, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable && focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [close],
  );

  // Keyboard navigation inside the modal
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            navigateTo(results[selectedIndex].personality.slug);
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [results, selectedIndex, navigateTo, close],
  );

  if (!isOpen) return null;

  const hasQuery = query.trim() !== "";

  return (
    <div
      ref={modalRef}
      className={css({ pos: 'fixed', inset: '0', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: 'min(20vh, 10rem)' })}
      role="dialog"
      aria-modal="true"
      aria-label="Search personalities"
      onKeyDown={handleModalKeyDown}
    >
      {/* Backdrop */}
      <div
        className={css({ pos: 'absolute', inset: '0', bg: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' })}
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        className={css({ pos: 'relative', bg: '#141418', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', rounded: '2xl', maxW: 'lg', w: 'full', mx: '4', shadow: '2xl', overflow: 'hidden' })}
        style={{ animation: "search-modal-in 0.15s ease-out both" }}
      >
        {/* Search input row */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '3.5', px: '5', py: '3.5' })}>
          {/* Search icon */}
          <svg
            className={css({ w: '5', h: '5', flexShrink: 0, color: '#7B7B86' })}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search researchers, topics, podcasts..."
            className={css({ flex: '1', bg: 'transparent', color: '#E8E8ED', _placeholder: { color: '#7B7B86' }, fontSize: '0.9375rem', outline: 'none' })}
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />

          {/* Result count indicator */}
          {hasQuery && results.length > 0 && (
            <span className={css({ flexShrink: 0, fontSize: '11px', color: '#55555F', fontWeight: 'medium', whiteSpace: 'nowrap' })}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          )}

          <kbd className={css({
            display: 'none',
            sm: { display: 'inline-flex' },
            alignItems: 'center',
            gap: '0.5',
            px: '6px',
            py: '3px',
            rounded: 'md',
            fontSize: '11px',
            fontWeight: 'medium',
            color: '#7B7B86',
            bg: 'rgba(255,255,255,0.06)',
            borderWidth: '1px',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          })}>
            ESC
          </kbd>
        </div>

        {/* Divider */}
        <div className={css({ h: '1px', bg: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 80%, transparent 100%)' })} />

        {/* Results area */}
        <div
          ref={listRef}
          className={css({ maxH: '26rem', overflowY: 'auto', overscrollBehavior: 'contain', py: '2' })}
        >
          {!hasQuery ? (
            /* ── Empty state with suggested searches ── */
            <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', gap: '5', px: '5', py: '10', textAlign: 'center', userSelect: 'none' })}>
              <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '2.5' })}>
                <svg
                  className={css({ w: '7', h: '7', color: '#3D3D45' })}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <span className={css({ fontSize: 'sm', color: '#55555F' })}>Start typing to search</span>
              </div>

              {/* Suggested searches */}
              <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '2.5', w: 'full' })}>
                <span className={css({ fontSize: '11px', fontWeight: 'medium', color: '#3D3D45', textTransform: 'uppercase', letterSpacing: '0.08em' })}>Popular</span>
                <div className={css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2' })}>
                  {SUGGESTED_SEARCHES.map((s) => (
                    <button
                      key={s.query}
                      type="button"
                      onClick={() => setQuery(s.query)}
                      className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: '10px',
                        py: '4px',
                        rounded: 'full',
                        fontSize: '12px',
                        color: '#9B9BA6',
                        bg: 'rgba(255,255,255,0.04)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        transition: 'all',
                        transitionDuration: '150ms',
                        _hover: {
                          bg: 'rgba(139,92,246,0.08)',
                          borderColor: 'rgba(139,92,246,0.20)',
                          color: '#C4B5FD',
                        },
                      })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            /* ── No results ── */
            <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', gap: '4', px: '4', py: '12', textAlign: 'center', userSelect: 'none' })}>
              <svg
                className={css({ w: '8', h: '8', color: '#3D3D45' })}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '1.5', alignItems: 'center' })}>
                <span className={css({ fontSize: 'sm', color: '#7B7B86' })}>
                  No results for{" "}
                  <span className={css({ color: '#ADADB8', fontWeight: 'medium' })}>&ldquo;{query.trim()}&rdquo;</span>
                </span>
                <span className={css({ fontSize: '12px', color: '#55555F' })}>Try a different name, org, or topic</span>
              </div>
            </div>
          ) : (
            /* ── Results list ── */
            results.map(({ personality, categoryTitle }, idx) => {
              const avatar = getAvatarUrl(personality);
              const isSelected = idx === selectedIndex;
              const badgeColor = categoryTitle ? (categoryBadgeColors[categoryTitle] ?? defaultBadgeColor) : null;

              return (
                <button
                  key={personality.slug}
                  onClick={() => navigateTo(personality.slug)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={css({
                    w: 'full',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3.5',
                    pl: '14px',
                    pr: '5',
                    py: '3',
                    textAlign: 'left',
                    transition: 'all',
                    transitionDuration: '100ms',
                    borderLeftWidth: '3px',
                    ...(isSelected
                      ? { bg: 'rgba(255,255,255,0.08)', borderLeftColor: '#8B5CF6' }
                      : { borderLeftColor: 'transparent', _hover: { bg: 'rgba(255,255,255,0.05)', borderLeftColor: 'rgba(139,92,246,0.4)' } }),
                  })}
                >
                  {/* Avatar with glow on selected */}
                  <div className={css({ pos: 'relative', flexShrink: 0 })}>
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className={css({
                          w: '10',
                          h: '10',
                          rounded: 'full',
                          objectFit: 'cover',
                          ringWidth: '1px',
                          ringColor: 'rgba(255,255,255,0.08)',
                          transition: 'box-shadow 0.25s ease',
                        })}
                        style={isSelected ? { animation: "avatar-glow-pulse 2s ease-in-out infinite" } : undefined}
                      />
                    ) : (
                      <div
                        className={css({
                          w: '10',
                          h: '10',
                          rounded: 'full',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 'xs',
                          fontWeight: 'semibold',
                          background: 'linear-gradient(to bottom right, #8b5cf6, #9333ea)',
                          ringWidth: '1px',
                          ringColor: 'rgba(255,255,255,0.08)',
                          transition: 'box-shadow 0.25s ease',
                        })}
                        style={isSelected ? { animation: "avatar-glow-pulse 2s ease-in-out infinite" } : undefined}
                      >
                        {getInitials(personality.name)}
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className={css({ flex: '1', minW: '0' })}>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' })}>
                      <span className={css({ fontSize: '0.9375rem', fontWeight: 'medium', color: '#E8E8ED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                        {personality.name}
                      </span>
                      {personality.knownFor && (
                        <span className={css({ flexShrink: 0, display: 'inline-flex', alignItems: 'center', fontSize: '11px', px: '2', py: '0.5', rounded: 'full', bg: 'rgba(255,255,255,0.06)', color: '#ADADB8', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' })}>
                          {personality.knownFor}
                        </span>
                      )}
                    </div>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mt: '0.5' })}>
                      <p className={css({ fontSize: 'sm', color: '#7B7B86', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                        {personality.role} · {personality.org}
                      </p>
                      {/* Category badge */}
                      {badgeColor && categoryTitle && (
                        <span className={css({
                          display: 'none',
                          sm: { display: 'inline-flex' },
                          flexShrink: 0,
                          alignItems: 'center',
                          fontSize: '10px',
                          px: '6px',
                          py: '2px',
                          rounded: 'full',
                          borderWidth: '1px',
                        })}
                          style={{
                            background: badgeColor.bg,
                            borderColor: badgeColor.border,
                            color: badgeColor.text,
                          }}
                        >
                          {categoryTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enter hint on selected */}
                  {isSelected && (
                    <kbd className={css({
                      display: 'none',
                      sm: { display: 'inline-flex' },
                      flexShrink: 0,
                      alignItems: 'center',
                      px: '6px',
                      py: '3px',
                      rounded: 'md',
                      fontSize: '11px',
                      fontWeight: 'medium',
                      color: '#7B7B86',
                      bg: 'rgba(255,255,255,0.06)',
                      borderWidth: '1px',
                      borderColor: 'rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    })}>
                      &crarr;
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer keyboard hints */}
        <div className={css({ h: '1px', bg: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 80%, transparent 100%)' })} />
        <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5', px: '4', py: '2.5', fontSize: '11px', color: '#55555F' })}>
          <span className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
            <span className={css({ display: 'inline-flex', gap: '2px' })}>
              <kbd className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', w: '20px', h: '20px', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.15)' })}>&uarr;</kbd>
              <kbd className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', w: '20px', h: '20px', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.15)' })}>&darr;</kbd>
            </span>
            <span className={css({ color: '#4A4A54' })}>Navigate</span>
          </span>
          <span className={css({ color: 'rgba(255,255,255,0.06)' })}>|</span>
          <span className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
            <kbd className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minW: '20px', h: '20px', px: '4px', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.15)' })}>&crarr;</kbd>
            <span className={css({ color: '#4A4A54' })}>Select</span>
          </span>
          <span className={css({ color: 'rgba(255,255,255,0.06)' })}>|</span>
          <span className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
            <kbd className={css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minW: '20px', h: '20px', px: '5px', rounded: 'md', bg: 'rgba(255,255,255,0.05)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.15)' })}>esc</kbd>
            <span className={css({ color: '#4A4A54' })}>Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
