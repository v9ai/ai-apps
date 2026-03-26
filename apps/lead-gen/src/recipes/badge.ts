import { cva } from "styled-system/css";

export const badge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "0",
    border: "1px solid",
    borderColor: "ui.border",
    background: "transparent",
    fontWeight: "medium",
    lineHeight: "none",
    whiteSpace: "nowrap",
    userSelect: "none",
  },
  variants: {
    variant: {
      status: {
        color: "status.positive",
        fontSize: "2xs",
        letterSpacing: "editorial",
        textTransform: "uppercase",
        padding: "4px 12px",
      },
      pipeline: {
        color: "ui.tertiary",
        fontSize: "2xs",
        letterSpacing: "wide",
        textTransform: "lowercase",
      },
      accent: {
        color: "accent.primary",
        borderColor: "accent.border",
        background: "accent.subtle",
        fontSize: "2xs",
        letterSpacing: "wide",
        textTransform: "lowercase",
      },
    },
    size: {
      sm: {
        fontSize: "2xs",
        padding: "3px 6px",
        gap: "4px",
      },
      md: {
        fontSize: "2xs",
        padding: "4px 12px",
        gap: "6px",
      },
    },
  },
  defaultVariants: {
    variant: "pipeline",
    size: "sm",
  },
});
