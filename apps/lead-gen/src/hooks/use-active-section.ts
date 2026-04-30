"use client";

import { useEffect, useState } from "react";

/**
 * useActiveSection — IntersectionObserver-based scroll-spy.
 *
 * Returns the id of the section currently closest to the top of the viewport
 * (after the sticky-nav offset). Sections that are not yet mounted are
 * silently skipped. Pattern adapted from
 * src/app/how-it-works/architecture/architecture-client.tsx.
 */
export function useActiveSection(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const idsKey = ids.join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visibleMap = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleMap.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleMap.delete(entry.target.id);
          }
        }
        if (visibleMap.size > 0) {
          let bestId: string | null = null;
          let bestTop = Number.POSITIVE_INFINITY;
          for (const id of visibleMap.keys()) {
            const el = document.getElementById(id);
            if (!el) continue;
            const top = el.getBoundingClientRect().top;
            if (top >= -120 && top < bestTop) {
              bestTop = top;
              bestId = id;
            }
          }
          if (bestId) setActiveId(bestId);
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.1, 0.5, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return activeId;
}
