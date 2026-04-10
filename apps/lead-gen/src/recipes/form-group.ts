import { cva } from "styled-system/css";

export const formGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "1",
  },
  variants: {
    size: {
      sm: { gap: "0.5" },
      md: { gap: "1" },
      lg: { gap: "1.5" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const formLabel = cva({
  base: {
    fontSize: "sm",
    fontWeight: "medium",
    color: "ui.secondary",
    letterSpacing: "normal",
    display: "block",
  },
  variants: {
    required: {
      true: {
        _after: {
          content: '"*"',
          color: "status.error",
          ml: "0.5",
        },
      },
    },
  },
});

export const formHelperText = cva({
  base: {
    fontSize: "xs",
    color: "ui.tertiary",
    lineHeight: "normal",
  },
});

export const formErrorText = cva({
  base: {
    fontSize: "xs",
    color: "status.error",
    lineHeight: "normal",
    fontWeight: "medium",
  },
});
