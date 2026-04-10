import { cva } from "styled-system/css";

export const stepperRoot = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "0",
    width: "100%",
  },
  variants: {
    orientation: {
      horizontal: {
        flexDirection: "row",
      },
      vertical: {
        flexDirection: "column",
        alignItems: "flex-start",
      },
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

export const stepperStep = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    flex: "0 0 auto",
  },
});

export const stepperIndicator = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "full",
    border: "1px solid",
    fontSize: "xs",
    fontWeight: "semibold",
    flexShrink: 0,
    transition:
      "background 150ms ease, border-color 150ms ease, color 150ms ease",
  },
  variants: {
    status: {
      pending: {
        borderColor: "ui.border",
        bg: "transparent",
        color: "ui.tertiary",
      },
      active: {
        borderColor: "accent.primary",
        bg: "accent.primary",
        color: "accent.contrast",
      },
      completed: {
        borderColor: "status.positive",
        bg: "status.positive",
        color: "accent.contrast",
      },
    },
    size: {
      sm: { width: "24px", height: "24px", fontSize: "2xs" },
      md: { width: "28px", height: "28px", fontSize: "xs" },
      lg: { width: "36px", height: "36px", fontSize: "sm" },
    },
  },
  defaultVariants: {
    status: "pending",
    size: "md",
  },
});

export const stepperLabel = cva({
  base: {
    fontSize: "sm",
    fontWeight: "medium",
    lineHeight: "compact",
    textTransform: "lowercase",
    letterSpacing: "normal",
  },
  variants: {
    status: {
      pending: { color: "ui.tertiary" },
      active: { color: "ui.heading" },
      completed: { color: "ui.secondary" },
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

export const stepperConnector = cva({
  base: {
    flex: 1,
    height: "1px",
    bg: "ui.border",
    mx: "2",
    minWidth: "20px",
  },
  variants: {
    completed: {
      true: {
        bg: "status.positive",
      },
    },
  },
});
