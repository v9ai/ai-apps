import { cva } from "styled-system/css";

export const container = cva({
  base: {
    width: "100%",
    mx: "auto",
    px: "4",
  },
  variants: {
    size: {
      sm: { maxWidth: "640px" },
      md: { maxWidth: "968px" },
      lg: { maxWidth: "1200px" },
      xl: { maxWidth: "1440px" },
    },
  },
  defaultVariants: {
    size: "lg",
  },
});

export const pageHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    pb: "4",
    mb: "4",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
  },
});

export const panel = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "0",
    padding: "3",
  },
  variants: {
    interactive: {
      true: {
        cursor: "pointer",
        transition: "background 150ms ease, border-color 150ms ease",
        _hover: {
          bg: "ui.surfaceHover",
          borderColor: "ui.borderHover",
        },
      },
    },
    raised: {
      true: {
        bg: "ui.surfaceRaised",
      },
    },
  },
});
