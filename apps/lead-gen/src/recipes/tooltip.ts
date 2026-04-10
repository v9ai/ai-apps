import { cva } from "styled-system/css";

export const tooltip = cva({
  base: {
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "md",
    px: "3",
    py: "1.5",
    fontSize: "xs",
    color: "ui.body",
    lineHeight: "compact",
    boxShadow: "elevated",
    zIndex: 500,
    maxWidth: "240px",
    pointerEvents: "none",
  },
  variants: {
    variant: {
      default: {},
      accent: {
        bg: "accent.primary",
        borderColor: "accent.primary",
        color: "accent.contrast",
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const tooltipArrow = cva({
  base: {
    width: "8px",
    height: "8px",
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderRight: "none",
    borderBottom: "none",
    transform: "rotate(45deg)",
    position: "absolute",
  },
});
