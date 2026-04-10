import { cva } from "styled-system/css";

export const heading = cva({
  base: {
    fontWeight: "bold",
    color: "ui.heading",
    lineHeight: "tight",
    letterSpacing: "tight",
  },
  variants: {
    level: {
      1: {
        fontSize: { base: "3xl", md: "4xl" },
        letterSpacing: "tighter",
        lineHeight: "tight",
      },
      2: {
        fontSize: { base: "xl", md: "2xl" },
        lineHeight: "snug",
      },
      3: {
        fontSize: "lg",
        fontWeight: "semibold",
        lineHeight: "compact",
        letterSpacing: "snug",
      },
      4: {
        fontSize: "base",
        fontWeight: "semibold",
        lineHeight: "compact",
      },
      display: {
        fontSize: { base: "4xl", md: "5xl", lg: "6xl" },
        letterSpacing: "tighter",
        lineHeight: "none",
        fontWeight: "bold",
      },
    },
  },
  defaultVariants: {
    level: 2,
  },
});

export const text = cva({
  base: {
    lineHeight: "normal",
    letterSpacing: "normal",
  },
  variants: {
    variant: {
      body: {
        fontSize: "base",
        color: "ui.body",
        fontWeight: "normal",
      },
      secondary: {
        fontSize: "sm",
        color: "ui.secondary",
        fontWeight: "normal",
      },
      caption: {
        fontSize: "xs",
        color: "ui.tertiary",
        fontWeight: "normal",
      },
      label: {
        fontSize: "2xs",
        color: "ui.dim",
        fontWeight: "medium",
        letterSpacing: "editorial",
        textTransform: "uppercase",
      },
      mono: {
        fontFamily: "mono",
        fontSize: "sm",
      },
    },
    size: {
      xs: { fontSize: "xs" },
      sm: { fontSize: "sm" },
      md: { fontSize: "md" },
      base: { fontSize: "base" },
      lg: { fontSize: "lg" },
      xl: { fontSize: "xl" },
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

export const truncate = cva({
  base: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  variants: {
    lines: {
      1: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      2: {
        display: "-webkit-box",
        WebkitLineClamp: "2",
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        whiteSpace: "normal",
      },
      3: {
        display: "-webkit-box",
        WebkitLineClamp: "3",
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        whiteSpace: "normal",
      },
      4: {
        display: "-webkit-box",
        WebkitLineClamp: "4",
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        whiteSpace: "normal",
      },
    },
  },
  defaultVariants: {
    lines: 1,
  },
});
