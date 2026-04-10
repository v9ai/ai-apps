import { cva } from "styled-system/css";

export const tag = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "sm",
    border: "1px solid",
    fontWeight: "medium",
    lineHeight: "none",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "background 150ms ease, border-color 150ms ease",
  },
  variants: {
    variant: {
      subtle: {
        bg: "ui.surfaceRaised",
        borderColor: "ui.border",
        color: "ui.secondary",
      },
      outline: {
        bg: "transparent",
        borderColor: "ui.border",
        color: "ui.secondary",
      },
      accent: {
        bg: "accent.subtle",
        borderColor: "accent.border",
        color: "accent.primary",
      },
      positive: {
        bg: "status.positiveDim",
        borderColor: "rgba(48, 164, 108, 0.30)",
        color: "status.positive",
      },
      warning: {
        bg: "rgba(245, 166, 35, 0.08)",
        borderColor: "rgba(245, 166, 35, 0.20)",
        color: "status.warning",
      },
      error: {
        bg: "rgba(229, 72, 77, 0.08)",
        borderColor: "rgba(229, 72, 77, 0.20)",
        color: "status.error",
      },
    },
    size: {
      sm: {
        fontSize: "2xs",
        padding: "2px 6px",
        letterSpacing: "wide",
      },
      md: {
        fontSize: "xs",
        padding: "3px 8px",
        letterSpacing: "normal",
      },
      lg: {
        fontSize: "sm",
        padding: "4px 10px",
        letterSpacing: "normal",
      },
    },
    interactive: {
      true: {
        cursor: "pointer",
        _hover: {
          borderColor: "ui.borderHover",
        },
      },
    },
  },
  defaultVariants: {
    variant: "subtle",
    size: "sm",
  },
});

export const tagClose = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    bg: "transparent",
    border: "none",
    color: "inherit",
    opacity: 0.6,
    borderRadius: "xs",
    padding: "0",
    transition: "opacity 150ms ease",
    _hover: {
      opacity: 1,
    },
  },
  variants: {
    size: {
      sm: { width: "12px", height: "12px" },
      md: { width: "14px", height: "14px" },
      lg: { width: "16px", height: "16px" },
    },
  },
  defaultVariants: {
    size: "sm",
  },
});
