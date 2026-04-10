import { cva } from "styled-system/css";

export const radioGroup = cva({
  base: {
    display: "flex",
    gap: "3",
  },
  variants: {
    orientation: {
      horizontal: { flexDirection: "row" },
      vertical: { flexDirection: "column" },
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export const radioRoot = cva({
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

export const radioIndicator = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "16px",
    height: "16px",
    border: "1px solid",
    borderColor: "ui.border",
    bg: "ui.surface",
    borderRadius: "full",
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
        borderColor: "accent.primary",
        _after: {
          content: '""',
          display: "block",
          width: "8px",
          height: "8px",
          borderRadius: "full",
          bg: "accent.primary",
        },
      },
    },
    size: {
      sm: {
        width: "14px",
        height: "14px",
      },
      md: {
        width: "16px",
        height: "16px",
      },
      lg: {
        width: "20px",
        height: "20px",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const radioLabel = cva({
  base: {
    fontSize: "base",
    color: "ui.body",
    lineHeight: "compact",
  },
});
