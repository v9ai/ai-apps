import { cva } from "styled-system/css";

export const progressTrack = cva({
  base: {
    width: "100%",
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    overflow: "hidden",
    position: "relative",
  },
  variants: {
    size: {
      xs: { height: "2px", borderRadius: "none" },
      sm: { height: "4px", borderRadius: "xs" },
      md: { height: "8px", borderRadius: "sm" },
      lg: { height: "12px", borderRadius: "md" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const progressBar = cva({
  base: {
    height: "100%",
    transition: "width 300ms cubic-bezier(0.16, 1, 0.30, 1)",
  },
  variants: {
    variant: {
      accent: { bg: "accent.primary" },
      positive: { bg: "status.positive" },
      warning: { bg: "status.warning" },
      error: { bg: "status.error" },
      gradient: {
        backgroundImage: "linear-gradient(90deg, {colors.accent.primary}, {colors.status.positive})",
      },
    },
    indeterminate: {
      true: {
        width: "30% !important",
        animation: "indeterminate 1.5s ease infinite",
      },
    },
  },
  defaultVariants: {
    variant: "accent",
  },
});

export const progressLabel = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    mb: "1",
    fontSize: "sm",
    color: "ui.secondary",
  },
});
