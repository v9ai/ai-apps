import { cva } from "styled-system/css";

export const navLink = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    textDecoration: "none",
    textTransform: "lowercase",
    fontWeight: "medium",
    letterSpacing: "normal",
    color: "ui.secondary",
    fontSize: "base",
    padding: "5px 8px",
    transition: "color 150ms ease, background 150ms ease",
    _hover: {
      color: "ui.heading",
      bg: "ui.surfaceHover",
    },
  },
  variants: {
    active: {
      true: {
        color: "ui.heading",
        fontWeight: "semibold",
      },
    },
    collapsed: {
      true: {
        justifyContent: "center",
        padding: "5px 0",
      },
    },
  },
});

export const sidebar = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    bg: "ui.surface",
    borderRight: "1px solid",
    borderRightColor: "ui.border",
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    overflowY: "hidden",
    overflowX: "hidden",
    transition: "width 200ms ease, padding 200ms ease",
    zIndex: 10,
    fontSize: "base",
    letterSpacing: "normal",
  },
  variants: {
    collapsed: {
      true: {
        width: "56px",
        padding: "2",
      },
      false: {
        width: "200px",
        padding: "4",
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});
