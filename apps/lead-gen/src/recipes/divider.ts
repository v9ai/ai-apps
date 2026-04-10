import { cva } from "styled-system/css";

export const divider = cva({
  base: {
    border: "none",
    flexShrink: 0,
  },
  variants: {
    orientation: {
      horizontal: {
        width: "100%",
        height: "1px",
        bg: "ui.border",
      },
      vertical: {
        width: "1px",
        height: "100%",
        bg: "ui.border",
        alignSelf: "stretch",
      },
    },
    variant: {
      solid: {},
      dashed: {
        bg: "transparent",
        borderStyle: "dashed",
      },
      accent: {
        bg: "accent.border",
      },
      gradient: {
        background:
          "linear-gradient(90deg, transparent, {colors.ui.border}, transparent)",
      },
    },
    spacing: {
      none: {},
      sm: {},
      md: {},
      lg: {},
    },
  },
  compoundVariants: [
    { orientation: "horizontal", spacing: "sm", css: { my: "2" } },
    { orientation: "horizontal", spacing: "md", css: { my: "4" } },
    { orientation: "horizontal", spacing: "lg", css: { my: "8" } },
    { orientation: "vertical", spacing: "sm", css: { mx: "2" } },
    { orientation: "vertical", spacing: "md", css: { mx: "4" } },
    { orientation: "vertical", spacing: "lg", css: { mx: "8" } },
  ],
  defaultVariants: {
    orientation: "horizontal",
    variant: "solid",
    spacing: "none",
  },
});

export const dividerWithLabel = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "3",
    width: "100%",
    color: "ui.tertiary",
    fontSize: "xs",
    fontWeight: "medium",
    letterSpacing: "wide",
    textTransform: "lowercase",
    _before: {
      content: '""',
      flex: 1,
      height: "1px",
      bg: "ui.border",
    },
    _after: {
      content: '""',
      flex: 1,
      height: "1px",
      bg: "ui.border",
    },
  },
});
