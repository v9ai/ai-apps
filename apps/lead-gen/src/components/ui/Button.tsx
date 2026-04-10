import { forwardRef, type ButtonHTMLAttributes } from "react";
import { button } from "@/recipes/button";
import { css, cx } from "styled-system/css";
import { Spinner } from "./Spinner";

type ButtonVariant = "solid" | "ghost" | "outline" | "solidGreen" | "link" | "gradient";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
}

const spinnerSizes: Record<ButtonSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

const loadingStyle = css({
  position: "relative",
  color: "transparent !important",
  pointerEvents: "none",
  "& > *:not([data-button-spinner])": {
    visibility: "hidden",
  },
});

const spinnerOverlay = css({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      size = "md",
      loading = false,
      loadingText,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cx(
          button({ variant, size }),
          loading && !loadingText ? loadingStyle : undefined,
          className
        )}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && !loadingText && (
          <span data-button-spinner="" className={spinnerOverlay}>
            <Spinner size={spinnerSizes[size]} />
          </span>
        )}
        {loading && loadingText ? (
          <>
            <Spinner size={spinnerSizes[size]} />
            {loadingText}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
