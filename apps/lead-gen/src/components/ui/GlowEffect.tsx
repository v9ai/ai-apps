import { forwardRef, type HTMLAttributes, type CSSProperties } from "react";
import { css, cx } from "styled-system/css";

type GlowColor = "accent" | "positive" | "purple";
type GlowSize = "sm" | "md" | "lg";

interface GlowEffectProps extends HTMLAttributes<HTMLDivElement> {
  color?: GlowColor;
  size?: GlowSize;
  /** Enable pulsing animation (uses hero-glow-pulse keyframe from globals.css) */
  animate?: boolean;
  /** Position from top (CSS value). Default: "-120px". */
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

const sizeStyles: Record<GlowSize, string> = {
  sm: css({
    width: { base: "200px", lg: "350px" },
    height: { base: "200px", lg: "350px" },
  }),
  md: css({
    width: { base: "400px", lg: "700px" },
    height: { base: "400px", lg: "700px" },
  }),
  lg: css({
    width: { base: "600px", lg: "1000px" },
    height: { base: "600px", lg: "1000px" },
  }),
};

const baseStyle = css({
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  borderRadius: "50%",
  pointerEvents: "none",
  zIndex: 0,
});

const animatedStyle = css({
  animation: "hero-glow-pulse 6s ease-in-out infinite",
});

export const GlowEffect = forwardRef<HTMLDivElement, GlowEffectProps>(
  (
    {
      color = "accent",
      size = "md",
      animate = true,
      top = "-120px",
      className,
      style,
      ...rest
    },
    ref
  ) => {
    const { inner, outer } = colorMap[color];

    const mergedStyle: CSSProperties = {
      top,
      background: `radial-gradient(circle, ${inner} 0%, ${outer} 40%, transparent 70%)`,
      ...style,
    };

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cx(
          baseStyle,
          sizeStyles[size],
          animate ? animatedStyle : undefined,
          className
        )}
        style={mergedStyle}
        {...rest}
      />
    );
  }
);
GlowEffect.displayName = "GlowEffect";
