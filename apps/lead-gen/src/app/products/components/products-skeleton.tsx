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
      "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
    animation: "shimmer 1.6s linear infinite",
  },
});

function SkeletonCard() {
  return (
    <div
      className={css({
        bg: "ui.surface",
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        p: "5",
        display: "flex",
        flexDirection: "column",
        gap: "3",
      })}
    >
      <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
        <div className={shimmer} style={{ width: 32, height: 32 }} />
        <div className={shimmer} style={{ width: "55%", height: 14 }} />
      </div>
      <div className={shimmer} style={{ width: "35%", height: 12 }} />
      <div className={shimmer} style={{ width: "100%", height: 10 }} />
      <div className={shimmer} style={{ width: "85%", height: 10 }} />
      <div className={css({ display: "flex", gap: "2", mt: "1" })}>
        <div className={shimmer} style={{ width: 76, height: 22 }} />
        <div className={shimmer} style={{ width: 92, height: 22 }} />
        <div className={shimmer} style={{ width: 60, height: 22 }} />
        <div className={shimmer} style={{ width: 76, height: 22 }} />
      </div>
    </div>
  );
}

export function ProductsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
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
