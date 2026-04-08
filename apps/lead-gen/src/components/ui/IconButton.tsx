import { forwardRef, type ButtonHTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

type IconButtonVariant = "ghost" | "outline";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
}

const sizeMap: Record<IconButtonSize, { wh: string; fontSize: string }> = {
  sm: { wh: "28px", fontSize: "sm" },
  md: { wh: "36px", fontSize: "base" },
  lg: { wh: "44px", fontSize: "lg" },
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { variant = "ghost", size = "md", label, className, children, ...rest },
    ref
  ) => {
    const s = sizeMap[size];
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cx(
          css({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: s.wh,
            height: s.wh,
            fontSize: s.fontSize,
            borderRadius: "0",
            boxShadow: "none",
            cursor: "pointer",
            transition:
              "background 150ms ease, color 150ms ease, border-color 150ms ease",
            outline: "none",
            _focusVisible: {
              outline: "2px solid",
              outlineColor: "accent.primary",
              outlineOffset: "2px",
            },
            _disabled: {
              opacity: "0.4",
              cursor: "not-allowed",
              pointerEvents: "none",
            },
            ...(variant === "ghost"
              ? {
                  background: "transparent",
                  color: "ui.tertiary",
                  border: "1px solid transparent",
                  _hover: {
                    background: "ui.surfaceHover",
                    color: "ui.secondary",
                  },
                }
              : {
                  background: "transparent",
                  color: "ui.secondary",
                  border: "1px solid",
                  borderColor: "ui.border",
                  _hover: {
                    background: "ui.surfaceHover",
                    borderColor: "ui.borderHover",
                    color: "ui.heading",
                  },
                }),
          }),
          className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
