import { cva } from "styled-system/css";

export const row = cva({
  base: {
    display: "flex",
    alignItems: "center",
    minHeight: "64px",
    px: "3",
    py: "2",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
    bg: "ui.surface",
    transition: "background 100ms ease",
    textDecoration: "none",
    color: "inherit",
    cursor: "pointer",
    _hover: {
      bg: "ui.surfaceHover",
    },
  },
  variants: {
    interactive: {
      false: {
        cursor: "default",
        _hover: {
          bg: "ui.surface",
        },
      },
    },
    compact: {
      true: {
        minHeight: "48px",
        py: "1",
      },
    },
  },
});

export const rowTitle = cva({
  base: {
    fontSize: "md",
    fontWeight: "semibold",
    lineHeight: "compact",
    color: "ui.heading",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

export const rowMeta = cva({
  base: {
    fontSize: "sm",
    fontWeight: "normal",
    lineHeight: "normal",
    letterSpacing: "normal",
    color: "ui.secondary",
    whiteSpace: "nowrap",
  },
});
