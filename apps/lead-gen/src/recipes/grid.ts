import { cva } from "styled-system/css";

export const grid = cva({
  base: {
    display: "grid",
    gap: "4",
  },
  variants: {
    columns: {
      1: { gridTemplateColumns: "1fr" },
      2: { gridTemplateColumns: "repeat(2, 1fr)" },
      3: { gridTemplateColumns: "repeat(3, 1fr)" },
      4: { gridTemplateColumns: "repeat(4, 1fr)" },
      5: { gridTemplateColumns: "repeat(5, 1fr)" },
      6: { gridTemplateColumns: "repeat(6, 1fr)" },
      auto: { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" },
      autoSm: { gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" },
      autoLg: { gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" },
    },
    gap: {
      none: { gap: "0" },
      xs: { gap: "1" },
      sm: { gap: "2" },
      md: { gap: "4" },
      lg: { gap: "6" },
      xl: { gap: "8" },
    },
    align: {
      start: { alignItems: "start" },
      center: { alignItems: "center" },
      end: { alignItems: "end" },
      stretch: { alignItems: "stretch" },
    },
  },
  defaultVariants: {
    columns: "auto",
    gap: "md",
    align: "stretch",
  },
});

export const gridItem = cva({
  base: {},
  variants: {
    span: {
      1: { gridColumn: "span 1" },
      2: { gridColumn: "span 2" },
      3: { gridColumn: "span 3" },
      4: { gridColumn: "span 4" },
      full: { gridColumn: "1 / -1" },
    },
    rowSpan: {
      1: { gridRow: "span 1" },
      2: { gridRow: "span 2" },
      3: { gridRow: "span 3" },
    },
  },
});
