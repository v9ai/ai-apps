import { cva } from "styled-system/css";

export const toast = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    padding: "4",
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "lg",
    boxShadow: "elevated",
    minWidth: "300px",
    maxWidth: "420px",
    fontSize: "sm",
    color: "ui.body",
    position: "relative",
  },
  variants: {
    variant: {
      info: {
        borderLeftWidth: "3px",
        borderLeftColor: "status.info",
      },
      success: {
        borderLeftWidth: "3px",
        borderLeftColor: "status.positive",
      },
      warning: {
        borderLeftWidth: "3px",
        borderLeftColor: "status.warning",
      },
      error: {
        borderLeftWidth: "3px",
        borderLeftColor: "status.error",
      },
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export const toastTitle = cva({
  base: {
    fontSize: "sm",
    fontWeight: "semibold",
    color: "ui.heading",
    lineHeight: "compact",
  },
});

export const toastDescription = cva({
  base: {
    fontSize: "sm",
    color: "ui.secondary",
    lineHeight: "normal",
  },
});

export const toastClose = cva({
  base: {
    position: "absolute",
    top: "3",
    right: "3",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    color: "ui.tertiary",
    cursor: "pointer",
    bg: "transparent",
    border: "none",
    borderRadius: "xs",
    transition: "color 150ms ease, background 150ms ease",
    _hover: {
      color: "ui.secondary",
      bg: "ui.surfaceHover",
    },
  },
});
