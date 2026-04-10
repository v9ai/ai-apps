import { cva } from "styled-system/css";

export const dropdownContent = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "lg",
    boxShadow: "elevated",
    py: "1",
    minWidth: "180px",
    maxHeight: "320px",
    overflowY: "auto",
    zIndex: 200,
  },
  variants: {
    size: {
      sm: { minWidth: "140px" },
      md: { minWidth: "180px" },
      lg: { minWidth: "240px" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const dropdownItem = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    padding: "6px 12px",
    fontSize: "sm",
    color: "ui.body",
    cursor: "pointer",
    bg: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    letterSpacing: "normal",
    textTransform: "lowercase",
    transition: "background 100ms ease, color 100ms ease",
    outline: "none",
    _hover: {
      bg: "ui.surfaceHover",
      color: "ui.heading",
    },
    _focus: {
      bg: "ui.surfaceHover",
      color: "ui.heading",
    },
    _disabled: {
      opacity: 0.4,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
  },
  variants: {
    variant: {
      default: {},
      danger: {
        color: "status.error",
        _hover: {
          bg: "rgba(229, 72, 77, 0.08)",
          color: "status.error",
        },
      },
    },
    active: {
      true: {
        bg: "accent.subtle",
        color: "accent.primary",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const dropdownSeparator = cva({
  base: {
    height: "1px",
    bg: "ui.border",
    my: "1",
  },
});

export const dropdownLabel = cva({
  base: {
    padding: "6px 12px 4px",
    fontSize: "2xs",
    fontWeight: "medium",
    color: "ui.dim",
    letterSpacing: "editorial",
    textTransform: "uppercase",
    userSelect: "none",
  },
});
