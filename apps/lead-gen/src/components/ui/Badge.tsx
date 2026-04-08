import { forwardRef, type HTMLAttributes } from "react";
import { cx } from "styled-system/css";
import { badge } from "@/recipes/badge";

type BadgeVariant = "default" | "orange" | "green" | "accent" | "status" | "pipeline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", size = "sm", className, children, ...rest }, ref) => {
    // Map legacy color-based variants to recipe variants
    const recipeVariant =
      variant === "default" || variant === "orange" || variant === "green"
        ? "pipeline"
        : variant;

    return (
      <span
        ref={ref}
        className={cx(
          badge({ variant: recipeVariant as "pipeline" | "accent" | "status", size }),
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
