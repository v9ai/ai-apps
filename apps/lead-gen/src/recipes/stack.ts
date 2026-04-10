import { cva } from "styled-system/css";

export const stack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
  },
  variants: {
    gap: {
      none: { gap: "0" },
      xs: { gap: "1" },
      sm: { gap: "2" },
      md: { gap: "4" },
      lg: { gap: "6" },
      xl: { gap: "8" },
      "2xl": { gap: "12" },
    },
    align: {
      start: { alignItems: "flex-start" },
      center: { alignItems: "center" },
      end: { alignItems: "flex-end" },
      stretch: { alignItems: "stretch" },
    },
    justify: {
      start: { justifyContent: "flex-start" },
      center: { justifyContent: "center" },
      end: { justifyContent: "flex-end" },
      between: { justifyContent: "space-between" },
    },
  },
  defaultVariants: {
    gap: "md",
    align: "stretch",
  },
});

export const hstack = cva({
  base: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  variants: {
    gap: {
      none: { gap: "0" },
      xs: { gap: "1" },
      sm: { gap: "2" },
      md: { gap: "4" },
      lg: { gap: "6" },
      xl: { gap: "8" },
    },
    justify: {
      start: { justifyContent: "flex-start" },
      center: { justifyContent: "center" },
      end: { justifyContent: "flex-end" },
      between: { justifyContent: "space-between" },
    },
    wrap: {
      true: { flexWrap: "wrap" },
    },
  },
  defaultVariants: {
    gap: "md",
  },
});

export const spacer = cva({
  base: {
    flex: 1,
  },
});

export const center = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  variants: {
    inline: {
      true: { display: "inline-flex" },
    },
  },
});
