import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

type GlowColor = "accent" | "positive" | "purple";
type GlowSize = "sm" | "md" | "lg";

interface GlowEffectProps extends HTMLAttributes<HTMLDivElement> {
  color?: GlowColor;
  size?: GlowSize;
  /** Enable pulsing animation (uses hero-glow-pulse keyframe from globals.css) */
  animate?: boolean;
  /** Position from top (CSS value). Default: centered above container. */
  top?: string;
}

const colorMap: Record<GlowColor, { inner: string; outer: string }> = {
  accent: {
    inner: "rgba(62, 99, 221, 0.15)",
    outer: "rgba(62, 99, 221, 0.05)",
  },
  positive: {
    inner: "rgba(48, 164, 108, 0.15)",
    outer: "rgba(48, 164, 108, 0.05)",
  },
  purple: {
    inner: "rgba(124, 58, 237, 0.15)",
    outer: "rgba(124, 58, 237, 0.05)",
  },
};

const sizeMap: Record<GlowSize, { base: string; lg: string }> = {
  sm: { base: "200px", lg: "350px" },
  md: { base: "400px", lg: "700px" },
  lg: { base: "600px", lg: "1000px" },
};

export const GlowEffect = forwardRef<HTMLDivElement, GlowEffectProps>(
  (
    {
      color = "accent",
      size = "md",
      animate = true,
      top,
      className,
      ...rest
    },
    ref
  ) => {
    const { inner, outer } = colorMap[color];
    const dimensions = sizeMap[size];

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cx(
          css({
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            borderRadius: "50%",
            pointerEvents: "none",
            zIndex: 0,
          }),
          animate
            ? css({ animation: "hero-glow-pulse 6s ease-in-out infinite" })
            : undefined,
          className
        )}
        style={{
          top: top ?? "-120px",
          width: dimensions.base,
          height: dimensions.base,
          background: `radial-gradient(circle, ${inner} 0%, ${outer} 40%, transparent 70%)`,
        }}
        {...rest}
      />
    );
  }
);
GlowEffect.displayName = "GlowEffect";
