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
