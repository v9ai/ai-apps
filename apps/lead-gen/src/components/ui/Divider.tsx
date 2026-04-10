import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Vertical spacing around the divider */
  spacing?: "sm" | "md" | "lg" | "xl";
}

const spacingMap: Record<NonNullable<DividerProps["spacing"]>, string> = {
  sm: "4",
  md: "8",
  lg: "10",
  xl: "14",
};

const baseStyle = (spacing: NonNullable<DividerProps["spacing"]>) =>
  css({
    width: "100%",
    height: "1px",
    background:
      "linear-gradient(90deg, transparent 0%, {colors.ui.border} 30%, {colors.accent.primary}/30 50%, {colors.ui.border} 70%, transparent 100%)",
    my: { base: spacingMap[spacing], lg: spacing === "xl" ? "14" : spacingMap[spacing] },
  });

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ spacing = "lg", className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cx(baseStyle(spacing), className)}
        {...rest}
      />
    );
  }
);
Divider.displayName = "Divider";
