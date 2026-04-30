import { cva } from "styled-system/css";

export const button = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    cursor: "pointer",
    borderRadius: "md",
    boxShadow: "none",
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
      solidRed: {
        background: "status.error",
        color: "accent.contrast",
        border: "1px solid transparent",
        fontWeight: "bold",
        _hover: {
          background: "status.errorHover",
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
      gradient: {
        backgroundImage:
          "linear-gradient(135deg, {colors.accent.primary}, {colors.status.positive})",
        color: "accent.contrast",
        border: "1px solid transparent",
        fontWeight: "bold",
        _hover: {
          opacity: "0.9",
        },
      },
      chip: {
        background: "ui.surface",
        color: "ui.secondary",
        border: "1px solid",
        borderColor: "ui.border",
        fontWeight: "medium",
        _hover: {
          background: "ui.surfaceHover",
          color: "gray.12",
          borderColor: "ui.borderHover",
        },
        '&[aria-pressed="true"]': {
          background: "accent.subtle",
          color: "accent.primary",
          borderColor: "accent.border",
          fontWeight: "semibold",
        },
      },
      secondary: {
        background: "indigo.3",
        color: "indigo.12",
        border: "1px solid",
        borderColor: "indigo.5",
        fontWeight: "semibold",
        _hover: {
          background: "indigo.4",
          borderColor: "indigo.7",
        },
        _disabled: {
          opacity: "1",
          background: "ui.surfaceRaised",
          color: "ui.tertiary",
          borderColor: "ui.border",
          cursor: "not-allowed",
          pointerEvents: "none",
        },
      },
    },
    tone: {
      neutral: {},
      red: {
        '&[aria-pressed="true"]': {
          background: "red.3",
          color: "red.11",
          borderColor: "red.6",
        },
      },
      amber: {
        '&[aria-pressed="true"]': {
          background: "amber.3",
          color: "amber.11",
          borderColor: "amber.6",
        },
      },
      blue: {
        '&[aria-pressed="true"]': {
          background: "blue.3",
          color: "blue.11",
          borderColor: "blue.6",
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
      hero: {
        padding: "14px 40px",
        fontSize: "xl",
        height: "52px",
        fontWeight: "bold",
        letterSpacing: "snug",
      },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
    tone: "neutral",
  },
});
