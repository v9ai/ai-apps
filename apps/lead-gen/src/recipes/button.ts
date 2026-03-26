import { cva } from "styled-system/css";

export const button = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    cursor: "pointer",
    borderRadius: "0",
    boxShadow: "none",
    textTransform: "lowercase",
    letterSpacing: "normal",
    fontFamily: "inherit",
    lineHeight: "none",
    textDecoration: "none",
    transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
    outline: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "accent.primary",
      outlineOffset: "2px",
    },
  },
  variants: {
    variant: {
      solid: {
        background: "accent.primary",
        color: "accent.contrast",
        border: "1px solid transparent",
        fontWeight: "bold",
        _hover: {
          background: "accent.hover",
        },
      },
      ghost: {
        background: "transparent",
        color: "ui.secondary",
        border: "1px solid",
        borderColor: "ui.border",
        fontWeight: "semibold",
        _hover: {
          background: "ui.surfaceHover",
          color: "ui.heading",
        },
      },
      link: {
        background: "transparent",
        color: "accent.primary",
        border: "1px solid transparent",
        fontWeight: "medium",
        padding: "0",
        _hover: {
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        },
      },
    },
    size: {
      sm: {
        padding: "6px 12px",
        fontSize: "sm",
        height: "28px",
      },
      md: {
        padding: "8px 24px",
        fontSize: "base",
        height: "36px",
      },
      lg: {
        padding: "10px 32px",
        fontSize: "lg",
        height: "44px",
      },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
  },
});
