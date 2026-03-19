"use client";

import { useEffect, useRef, useState } from "react";

interface ReadingProgressProps {
  showPercentage?: boolean;
}

export function ReadingProgress({ showPercentage = false }: ReadingProgressProps) {
  const [width, setWidth] = useState(0);
  const currentWidth = useRef(0);
  const targetWidth = useRef(0);
  const rafId = useRef(0);
  const animating = useRef(false);

  useEffect(() => {
    const lerp = () => {
      const diff = targetWidth.current - currentWidth.current;
      if (Math.abs(diff) < 0.1) {
        currentWidth.current = targetWidth.current;
        setWidth(targetWidth.current);
        animating.current = false;
        return;
      }
      // Smooth interpolation — fast catch-up, gentle ease-out
      currentWidth.current += diff * 0.15;
      setWidth(currentWidth.current);
      rafId.current = requestAnimationFrame(lerp);
    };

    const update = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      targetWidth.current = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      if (!animating.current) {
        animating.current = true;
        rafId.current = requestAnimationFrame(lerp);
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const rounded = Math.round(width);
  const visible = rounded > 0 && rounded < 100;

  return (
    <>
      <div
        className="reading-progress"
        style={{ width: `${width}%` }}
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />
      {showPercentage && visible && (
        <div className="reading-progress-pct">
          {rounded}%
        </div>
      )}
    </>
  );
}
