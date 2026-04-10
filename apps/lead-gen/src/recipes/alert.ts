import { cva } from "styled-system/css";

export const alert = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "3",
    padding: "4",
    border: "1px solid",
    borderRadius: "lg",
    fontSize: "sm",
    lineHeight: "normal",
  },
  variants: {
    variant: {
      info: {
        bg: "rgba(62, 99, 221, 0.08)",
        borderColor: "rgba(62, 99, 221, 0.20)",
        color: "ui.body",
      },
      success: {
        bg: "rgba(48, 164, 108, 0.08)",
        borderColor: "rgba(48, 164, 108, 0.20)",
        color: "ui.body",
      },
      warning: {
        bg: "rgba(245, 166, 35, 0.08)",
        borderColor: "rgba(245, 166, 35, 0.20)",
        color: "ui.body",
      },
      error: {
        bg: "rgba(229, 72, 77, 0.08)",
        borderColor: "rgba(229, 72, 77, 0.20)",
        color: "ui.body",
      },
    },
    size: {
      sm: { padding: "3", fontSize: "xs" },
      md: { padding: "4", fontSize: "sm" },
      lg: { padding: "5", fontSize: "base" },
    },
  },
  defaultVariants: {
    variant: "info",
    size: "md",
  },
});

export const alertIcon = cva({
  base: {
    flexShrink: 0,
    width: "16px",
    height: "16px",
    mt: "1px",
  },
  variants: {
    variant: {
      info: { color: "status.info" },
      success: { color: "status.positive" },
      warning: { color: "status.warning" },
      error: { color: "status.error" },
    },
  },
});

export const alertTitle = cva({
  base: {
    fontWeight: "semibold",
    color: "ui.heading",
    lineHeight: "compact",
    mb: "1",
  },
});

export const alertDescription = cva({
  base: {
    color: "ui.secondary",
    lineHeight: "normal",
  },
});
