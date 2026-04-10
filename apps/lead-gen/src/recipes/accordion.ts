import { cva } from "styled-system/css";

export const accordionRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "lg",
    overflow: "hidden",
  },
  variants: {
    variant: {
      bordered: {},
      ghost: {
        border: "none",
        borderRadius: "none",
      },
    },
  },
  defaultVariants: {
    variant: "bordered",
  },
});

export const accordionItem = cva({
  base: {
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
    _last: {
      borderBottom: "none",
    },
  },
});

export const accordionTrigger = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "4",
    fontSize: "sm",
    fontWeight: "medium",
    color: "ui.heading",
    bg: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "normal",
    textAlign: "left",
    transition: "background 150ms ease",
    _hover: {
      bg: "ui.surfaceHover",
    },
  },
  variants: {
    size: {
      sm: { padding: "3", fontSize: "xs" },
      md: { padding: "4", fontSize: "sm" },
      lg: { padding: "5", fontSize: "base" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const accordionContent = cva({
  base: {
    padding: "0 4 4 4",
    fontSize: "sm",
    color: "ui.secondary",
    lineHeight: "normal",
  },
});

export const accordionIcon = cva({
  base: {
    width: "16px",
    height: "16px",
    color: "ui.tertiary",
    transition: "transform 200ms ease",
    flexShrink: 0,
  },
  variants: {
    open: {
      true: {
        transform: "rotate(180deg)",
      },
    },
  },
});
