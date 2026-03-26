import { cva } from "styled-system/css";

export const pipelineCard = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    p: "5",
    transition: "background 150ms ease, border-color 150ms ease",
    _hover: {
      bg: "ui.surfaceHover",
      borderColor: "ui.borderHover",
    },
  },
});

export const iconHolder = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    color: "accent.primary",
  },
  variants: {
    size: {
      sm: { w: "6", h: "6" },
      md: { w: "8", h: "8" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
