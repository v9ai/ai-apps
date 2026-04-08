import { cva } from "styled-system/css";

export const tabList = cva({
  base: {
    display: "flex",
    gap: "0",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
  },
});

export const tabTrigger = cva({
  base: {
    px: "4",
    py: "2",
    fontSize: "sm",
    fontWeight: "medium",
    color: "ui.tertiary",
    textTransform: "lowercase",
    letterSpacing: "normal",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    bg: "transparent",
    border: "none",
    transition: "color 150ms ease, border-color 150ms ease",
    _hover: {
      color: "ui.secondary",
    },
  },
  variants: {
    active: {
      true: {
        color: "ui.heading",
        fontWeight: "semibold",
        borderBottomColor: "accent.primary",
      },
    },
  },
});

export const tabContent = cva({
  base: {
    pt: "4",
  },
});
