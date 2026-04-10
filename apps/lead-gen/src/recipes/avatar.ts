import { cva } from "styled-system/css";

export const avatar = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderRadius: "full",
    overflow: "hidden",
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    color: "ui.secondary",
    fontWeight: "medium",
    textTransform: "uppercase",
    userSelect: "none",
  },
  variants: {
    size: {
      xs: { width: "20px", height: "20px", fontSize: "2xs" },
      sm: { width: "24px", height: "24px", fontSize: "2xs" },
      md: { width: "32px", height: "32px", fontSize: "xs" },
      lg: { width: "40px", height: "40px", fontSize: "sm" },
      xl: { width: "48px", height: "48px", fontSize: "base" },
      "2xl": { width: "64px", height: "64px", fontSize: "xl" },
    },
    variant: {
      default: {},
      accent: {
        bg: "accent.subtle",
        borderColor: "accent.border",
        color: "accent.primary",
      },
      positive: {
        bg: "status.positiveDim",
        borderColor: "rgba(48, 164, 108, 0.30)",
        color: "status.positive",
      },
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
});

export const avatarImage = cva({
  base: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
});

export const avatarGroup = cva({
  base: {
    display: "flex",
    alignItems: "center",
    "& > *:not(:first-child)": {
      marginLeft: "-8px",
    },
    "& > *": {
      border: "2px solid",
      borderColor: "ui.bg",
    },
  },
  variants: {
    size: {
      sm: {
        "& > *:not(:first-child)": { marginLeft: "-6px" },
      },
      md: {
        "& > *:not(:first-child)": { marginLeft: "-8px" },
      },
      lg: {
        "& > *:not(:first-child)": { marginLeft: "-12px" },
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
