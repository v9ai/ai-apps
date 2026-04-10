import { cva } from "styled-system/css";

export const cardGroup = cva({
  base: {
    display: "flex",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "lg",
    overflow: "hidden",
    "& > *": {
      borderRadius: "0",
      borderWidth: "0",
    },
  },
  variants: {
    orientation: {
      horizontal: {
        flexDirection: "row",
        "& > *:not(:last-child)": {
          borderRight: "1px solid",
          borderRightColor: "ui.border",
        },
      },
      vertical: {
        flexDirection: "column",
        "& > *:not(:last-child)": {
          borderBottom: "1px solid",
          borderBottomColor: "ui.border",
        },
      },
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export const surfaceLevel = cva({
  base: {
    transition: "background 150ms ease, box-shadow 150ms ease",
  },
  variants: {
    level: {
      0: {
        bg: "ui.bg",
        boxShadow: "elevation.0",
      },
      1: {
        bg: "ui.surface",
        boxShadow: "elevation.1",
      },
      2: {
        bg: "ui.surfaceRaised",
        boxShadow: "elevation.2",
      },
      3: {
        bg: "ui.surfaceRaised",
        boxShadow: "elevation.3",
      },
      4: {
        bg: "ui.surfaceRaised",
        boxShadow: "elevation.4",
      },
    },
  },
  defaultVariants: {
    level: 1,
  },
});
