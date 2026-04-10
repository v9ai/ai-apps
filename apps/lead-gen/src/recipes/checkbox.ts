import { cva } from "styled-system/css";

export const checkboxRoot = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    cursor: "pointer",
    userSelect: "none",
  },
  variants: {
    disabled: {
      true: {
        opacity: 0.4,
        cursor: "not-allowed",
        pointerEvents: "none",
      },
    },
  },
});

export const checkboxIndicator = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid",
    borderColor: "ui.border",
    bg: "ui.surface",
    borderRadius: "xs",
    transition: "background 150ms ease, border-color 150ms ease",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "accent.primary",
      outlineOffset: "2px",
    },
  },
  variants: {
    checked: {
      true: {
        bg: "accent.primary",
        borderColor: "accent.primary",
        color: "accent.contrast",
      },
      indeterminate: {
        bg: "accent.primary",
        borderColor: "accent.primary",
        color: "accent.contrast",
      },
    },
    size: {
      sm: { width: "14px", height: "14px" },
      md: { width: "16px", height: "16px" },
      lg: { width: "20px", height: "20px" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const checkboxLabel = cva({
  base: {
    fontSize: "base",
    color: "ui.body",
    lineHeight: "compact",
  },
  variants: {
    size: {
      sm: { fontSize: "sm" },
      md: { fontSize: "base" },
      lg: { fontSize: "lg" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
