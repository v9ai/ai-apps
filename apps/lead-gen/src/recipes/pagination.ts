import { cva } from "styled-system/css";

export const paginationRoot = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "1",
  },
});

export const paginationItem = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "32px",
    height: "32px",
    padding: "0 6px",
    fontSize: "sm",
    fontWeight: "medium",
    color: "ui.secondary",
    bg: "transparent",
    border: "1px solid",
    borderColor: "transparent",
    borderRadius: "md",
    cursor: "pointer",
    transition:
      "color 150ms ease, background 150ms ease, border-color 150ms ease",
    fontFamily: "inherit",
    _hover: {
      bg: "ui.surfaceHover",
      borderColor: "ui.border",
      color: "ui.heading",
    },
    _disabled: {
      opacity: 0.4,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
  },
  variants: {
    active: {
      true: {
        bg: "accent.subtle",
        borderColor: "accent.border",
        color: "accent.primary",
        fontWeight: "semibold",
        _hover: {
          bg: "accent.subtle",
          borderColor: "accent.primary",
        },
      },
    },
    variant: {
      page: {},
      arrow: {
        color: "ui.tertiary",
      },
      ellipsis: {
        cursor: "default",
        color: "ui.dim",
        _hover: {
          bg: "transparent",
          borderColor: "transparent",
          color: "ui.dim",
        },
      },
    },
  },
});

export const paginationInfo = cva({
  base: {
    fontSize: "sm",
    color: "ui.tertiary",
    letterSpacing: "normal",
    mx: "2",
  },
});
