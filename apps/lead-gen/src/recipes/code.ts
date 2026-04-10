import { cva } from "styled-system/css";

export const codeBlock = cva({
  base: {
    fontFamily: "mono",
    fontSize: "sm",
    lineHeight: "normal",
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "md",
    p: "4",
    overflowX: "auto",
    color: "ui.body",
    whiteSpace: "pre",
    position: "relative",
  },
  variants: {
    variant: {
      default: {},
      numbered: {
        counterReset: "line",
        "& .line": {
          counterIncrement: "line",
          _before: {
            content: "counter(line)",
            display: "inline-block",
            width: "3ch",
            mr: "4",
            color: "ui.dim",
            textAlign: "right",
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export const inlineCode = cva({
  base: {
    fontFamily: "mono",
    fontSize: "0.9em",
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "xs",
    px: "1.5",
    py: "0.5",
    color: "accent.primary",
    whiteSpace: "nowrap",
  },
});

export const kbd = cva({
  base: {
    fontFamily: "mono",
    fontSize: "xs",
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderBottom: "2px solid",
    borderBottomColor: "ui.border",
    borderRadius: "xs",
    px: "1.5",
    py: "0.5",
    color: "ui.secondary",
    lineHeight: "none",
    display: "inline-flex",
    alignItems: "center",
  },
});
