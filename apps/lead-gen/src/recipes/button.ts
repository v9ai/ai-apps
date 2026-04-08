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
    transition: "background 150ms ease, color 150ms ease, border-color 150ms ease, opacity 150ms ease",
    outline: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
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
      solidGreen: {
        background: "status.positive",
        color: "accent.contrast",
        border: "1px solid transparent",
        fontWeight: "bold",
        _hover: {
          background: "status.positiveHover",
        },
      },
      ghost: {
        background: "transparent",
        color: "ui.tertiary",
        border: "1px solid",
        borderColor: "ui.border",
        fontWeight: "medium",
        _hover: {
          background: "ui.surfaceHover",
          color: "ui.secondary",
          borderColor: "ui.borderHover",
        },
      },
      outline: {
        background: "transparent",
        color: "ui.secondary",
        border: "1px solid",
        borderColor: "accent.border",
        fontWeight: "semibold",
        _hover: {
          background: "accent.subtle",
          color: "accent.primary",
          borderColor: "accent.primary",
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
      glow: {
        background: "accent.primary",
        color: "accent.contrast",
        border: "1px solid transparent",
        fontWeight: "bold",
        boxShadow: "glow",
        _hover: {
          background: "accent.hover",
          boxShadow: "glowStrong",
        },
      },
      gradient: {
        background: "linear-gradient(135deg, #3E63DD 0%, #4D72E5 50%, #30A46C 100%)",
        color: "accent.contrast",
        border: "1px solid transparent",
        fontWeight: "bold",
        backgroundSize: "200% 200%",
        backgroundPosition: "0% 50%",
        transition: "background-position 300ms ease, opacity 150ms ease",
        _hover: {
          backgroundPosition: "100% 50%",
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
