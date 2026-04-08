"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseCountUpOptions {
  /** Animation duration in ms (default 1200) */
  duration?: number;
  /** IntersectionObserver threshold (default 0.3) */
  threshold?: number;
}

/**
 * Scroll-triggered count-up animation.
 *
 * Parses a display value like "50,000+", "92%", "182ms", or "1,500"
 * into a numeric target + suffix, then animates from 0 on scroll-in
 * using a cubic ease-out (1 - (1-t)^3).
 *
 * Returns { ref, display } — attach ref to the container element,
 * render `display` as the visible text.
 */
export function useCountUp(value: string, options?: UseCountUpOptions) {
  const { duration = 1200, threshold = 0.3 } = options ?? {};

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(value);

  const numericMatch = value.replace(/,/g, "").match(/^(\d+)(\D*)$/);
  const target = numericMatch ? parseInt(numericMatch[1], 10) : 0;
  const suffix = numericMatch ? numericMatch[2] : "";
  const hasCommas = value.includes(",");

  /* observe scroll into view */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  /* format number with locale commas when the source value had them */
  const formatNum = useCallback(
    (n: number): string => {
      if (hasCommas) return n.toLocaleString("en-US");
      return String(n);
    },
    [hasCommas],
  );

  /* count-up animation via requestAnimationFrame (respects reduced motion) */
  useEffect(() => {
    if (!visible || !target) return;

    // Skip animation for users who prefer reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplay(formatNum(target) + suffix);
      return;
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      const current = Math.round(eased * target);
      setDisplay(formatNum(current) + suffix);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [visible, target, suffix, duration, formatNum]);

  return { ref, display, visible };
}
