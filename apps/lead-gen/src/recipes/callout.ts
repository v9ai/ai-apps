import { cva } from "styled-system/css";

export const callout = cva({
  base: {
    display: "flex",
    gap: "3",
    padding: "3",
    border: "1px solid",
    borderRadius: "md",
    fontSize: "sm",
    lineHeight: "normal",
  },
  variants: {
    variant: {
      info: {
        bg: "accent.subtle",
        borderColor: "accent.border",
        color: "ui.body",
      },
      success: {
        bg: "status.positiveDim",
        borderColor: "status.positive",
        color: "ui.body",
      },
      warning: {
        bg: "rgba(245, 166, 35, 0.15)",
        borderColor: "rgba(245, 166, 35, 0.3)",
        color: "ui.body",
      },
      error: {
        bg: "rgba(229, 72, 77, 0.15)",
        borderColor: "rgba(229, 72, 77, 0.3)",
        color: "ui.body",
      },
    },
  },
  defaultVariants: {
    variant: "info",
  },
});
