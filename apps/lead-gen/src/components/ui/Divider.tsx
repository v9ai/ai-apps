import { forwardRef, type HTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Vertical spacing around the divider */
  spacing?: "sm" | "md" | "lg" | "xl";
}

const baseStyle = css({
  width: "100%",
  height: "1px",
  background:
    "linear-gradient(90deg, transparent 0%, {colors.ui.border} 30%, {colors.accent.primary}/30 50%, {colors.ui.border} 70%, transparent 100%)",
});

const spacingStyles: Record<NonNullable<DividerProps["spacing"]>, string> = {
  sm: css({ my: "4" }),
  md: css({ my: "8" }),
  lg: css({ my: { base: "10", lg: "10" } }),
  xl: css({ my: { base: "10", lg: "14" } }),
};

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ spacing = "lg", className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cx(baseStyle, spacingStyles[spacing], className)}
        {...rest}
      />
    );
  }
);
Divider.displayName = "Divider";
