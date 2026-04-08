import { cva } from "styled-system/css";

export const input = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    color: "ui.body",
    borderRadius: "0",
    outline: "none",
    fontSize: "base",
    fontFamily: "inherit",
    transition: "border-color 150ms ease",
    _placeholder: {
      color: "ui.tertiary",
    },
    _focus: {
      borderColor: "accent.primary",
    },
    _disabled: {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  },
  variants: {
    size: {
      sm: {
        padding: "4px 8px",
        fontSize: "sm",
        height: "28px",
      },
      md: {
        padding: "6px 10px",
        fontSize: "base",
        height: "36px",
      },
      lg: {
        padding: "8px 12px",
        fontSize: "lg",
        height: "44px",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const textarea = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    color: "ui.body",
    borderRadius: "0",
    outline: "none",
    fontSize: "base",
    fontFamily: "inherit",
    resize: "vertical",
    minHeight: "80px",
    padding: "8px 10px",
    transition: "border-color 150ms ease",
    _placeholder: {
      color: "ui.tertiary",
    },
    _focus: {
      borderColor: "accent.primary",
    },
  },
});

export const fieldLabel = cva({
  base: {
    fontSize: "sm",
    fontWeight: "medium",
    color: "ui.secondary",
    letterSpacing: "normal",
    display: "block",
    mb: "1",
  },
});
