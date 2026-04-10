import { cva } from "styled-system/css";

export const breadcrumbRoot = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "1",
    fontSize: "sm",
    color: "ui.tertiary",
  },
});

export const breadcrumbItem = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1",
  },
});

export const breadcrumbLink = cva({
  base: {
    color: "ui.tertiary",
    textDecoration: "none",
    textTransform: "lowercase",
    letterSpacing: "normal",
    transition: "color 150ms ease",
    _hover: {
      color: "ui.heading",
    },
  },
  variants: {
    current: {
      true: {
        color: "ui.heading",
        fontWeight: "medium",
        pointerEvents: "none",
      },
    },
  },
});

export const breadcrumbSeparator = cva({
  base: {
    color: "ui.dim",
    fontSize: "xs",
    userSelect: "none",
    mx: "1",
  },
});
