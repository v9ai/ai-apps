import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

type BadgeColor = "accent" | "positive" | "warning" | "neutral" | "orange" | "green" | "default";
type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  size?: BadgeSize;
  /** @deprecated Use `color` instead. Kept for backward compatibility. */
  variant?: "default" | "orange" | "green";
}

const baseStyle = css({
  display: "inline-flex",
  alignItems: "center",
  fontWeight: "medium",
  letterSpacing: "normal",
  borderRadius: "editorial",
  border: "1px solid",
  whiteSpace: "nowrap",
  lineHeight: "none",
});

const sizeStyles: Record<BadgeSize, string> = {
  sm: css({
    fontSize: "2xs",
    padding: "2px 6px",
    height: "18px",
  }),
  md: css({
    fontSize: "xs",
    padding: "3px 8px",
    height: "22px",
  }),
};

const colorStyles: Record<BadgeColor, string> = {
  accent: css({
    color: "accent.primary",
    borderColor: "accent.border",
    background: "accent.subtle",
  }),
  positive: css({
    color: "status.positive",
    borderColor: "rgba(48, 164, 108, 0.30)",
    background: "status.positiveDim",
  }),
  warning: css({
    color: "#E5A336",
    borderColor: "rgba(229, 163, 54, 0.30)",
    background: "rgba(229, 163, 54, 0.10)",
  }),
  neutral: css({
    color: "ui.secondary",
    borderColor: "ui.border",
    background: "whiteAlpha.5",
  }),
  // Legacy aliases for backward compatibility
  default: css({
    color: "ui.secondary",
    borderColor: "ui.border",
    background: "whiteAlpha.5",
  }),
  orange: css({
    color: "#E5A336",
    borderColor: "rgba(229, 163, 54, 0.30)",
    background: "rgba(229, 163, 54, 0.10)",
  }),
  green: css({
    color: "status.positive",
    borderColor: "rgba(48, 164, 108, 0.30)",
    background: "status.positiveDim",
  }),
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ color, variant, size = "md", className, children, ...rest }, ref) => {
    // Resolve color: prefer `color` prop, fall back to legacy `variant` prop
    const resolvedColor = color ?? variant ?? "neutral";

    return (
      <span
        ref={ref}
        className={cx(
          baseStyle,
          sizeStyles[size],
          colorStyles[resolvedColor],
          className
        )}
        {...rest}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";
