import { forwardRef, type HTMLAttributes } from "react";
import { cx } from "styled-system/css";
import { text } from "@/recipes/text";

type TextVariant = "body" | "secondary" | "caption" | "label" | "mono";
type TextSize = "xs" | "sm" | "md" | "base" | "lg" | "xl";

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  size?: TextSize;
  as?: "p" | "span" | "div" | "label" | "small" | "em" | "strong";
}

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    { variant = "body", size, as: Component = "span", className, children, ...rest },
    ref
  ) => {
    return (
      <Component
        ref={ref as any}
        className={cx(text({ variant, size }), className)}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);
Text.displayName = "Text";
