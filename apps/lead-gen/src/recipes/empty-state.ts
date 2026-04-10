import { cva } from "styled-system/css";

export const emptyState = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "12",
    gap: "3",
  },
  variants: {
    size: {
      sm: { padding: "6", gap: "2" },
      md: { padding: "12", gap: "3" },
      lg: { padding: "16", gap: "4" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const emptyStateIcon = cva({
  base: {
    color: "ui.dim",
    mb: "2",
  },
  variants: {
    size: {
      sm: { width: "32px", height: "32px" },
      md: { width: "48px", height: "48px" },
      lg: { width: "64px", height: "64px" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const emptyStateTitle = cva({
  base: {
    fontSize: "lg",
    fontWeight: "semibold",
    color: "ui.heading",
    lineHeight: "compact",
  },
});

export const emptyStateDescription = cva({
  base: {
    fontSize: "sm",
    color: "ui.secondary",
    lineHeight: "normal",
    maxWidth: "360px",
  },
});
