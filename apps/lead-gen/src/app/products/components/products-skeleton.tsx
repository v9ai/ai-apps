"use client";

import { css } from "styled-system/css";

const shimmer = css({
  position: "relative",
  overflow: "hidden",
  bg: "ui.surfaceRaised",
  borderRadius: "sm",
  _before: {
    content: '""',
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(90deg, transparent, token(colors.whiteAlpha.3), transparent)",
    animation: "shimmer 1.6s linear infinite",
  },
});

function SkeletonCard() {
  return (
    <div
      className={css({
        position: "relative",
        bg: "ui.surface",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        p: "5",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "4",
      })}
    >
      {/* Top accent rule (shimmer) */}
      <div
        aria-hidden="true"
        className={css({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          h: "2px",
          bg: "ui.borderHover",
          opacity: 0.6,
        })}
      />

      {/* Header row: 40x40 favicon, title, domain+freshness sub-row */}
      <div className={css({ display: "flex", alignItems: "flex-start", gap: "3" })}>
        <div className={shimmer} style={{ width: 40, height: 40, borderRadius: 6 }} />
        <div className={css({ flex: 1, display: "flex", flexDirection: "column", gap: "2", minWidth: 0 })}>
          <div className={shimmer} style={{ width: "55%", height: 18 }} />
          <div className={css({ display: "flex", gap: "3" })}>
            <div className={shimmer} style={{ width: 110, height: 10 }} />
            <div className={shimmer} style={{ width: 130, height: 10 }} />
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div className={shimmer} style={{ width: "85%", height: 12 }} />

      {/* Progress label + 4-segment bar (6px) */}
      <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
        <div className={shimmer} style={{ width: "40%", height: 12 }} />
        <div className={css({ display: "flex", gap: "4px" })}>
          <div className={shimmer} style={{ flex: 1, height: 6, borderRadius: 999 }} />
          <div className={shimmer} style={{ flex: 1, height: 6, borderRadius: 999 }} />
          <div className={shimmer} style={{ flex: 1, height: 6, borderRadius: 999 }} />
          <div className={shimmer} style={{ flex: 1, height: 6, borderRadius: 999 }} />
        </div>
        <div className={shimmer} style={{ width: "60%", height: 10 }} />
      </div>

      {/* Footer: two chips + a CTA-sized button */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "3",
          pt: "4",
          borderTop: "1px solid",
          borderColor: "ui.border",
        })}
      >
        <div className={css({ display: "flex", gap: "2" })}>
          <div className={shimmer} style={{ width: 76, height: 22 }} />
          <div className={shimmer} style={{ width: 92, height: 22 }} />
        </div>
        <div className={shimmer} style={{ width: 132, height: 36, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function ProductsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "3",
      })}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
