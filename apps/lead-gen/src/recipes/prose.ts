import { cva } from "styled-system/css";

export const prose = cva({
  base: {
    color: "ui.body",
    fontSize: "base",
    lineHeight: "relaxed",
    letterSpacing: "normal",
    maxWidth: "65ch",
    "& h1": {
      fontSize: "3xl",
      fontWeight: "bold",
      color: "ui.heading",
      lineHeight: "tight",
      letterSpacing: "tighter",
      mt: "10",
      mb: "4",
    },
    "& h2": {
      fontSize: "2xl",
      fontWeight: "bold",
      color: "ui.heading",
      lineHeight: "snug",
      letterSpacing: "tight",
      mt: "8",
      mb: "3",
    },
    "& h3": {
      fontSize: "lg",
      fontWeight: "semibold",
      color: "ui.heading",
      lineHeight: "compact",
      mt: "6",
      mb: "2",
    },
    "& h4": {
      fontSize: "base",
      fontWeight: "semibold",
      color: "ui.heading",
      lineHeight: "compact",
      mt: "4",
      mb: "2",
    },
    "& p": {
      mb: "4",
    },
    "& a": {
      color: "accent.primary",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
      _hover: {
        color: "accent.hover",
      },
    },
    "& strong": {
      fontWeight: "semibold",
      color: "ui.heading",
    },
    "& em": {
      fontStyle: "italic",
    },
    "& ul, & ol": {
      pl: "6",
      mb: "4",
    },
    "& li": {
      mb: "1",
    },
    "& ul > li": {
      listStyleType: "disc",
    },
    "& ol > li": {
      listStyleType: "decimal",
    },
    "& blockquote": {
      borderLeft: "2px solid",
      borderLeftColor: "accent.border",
      pl: "4",
      py: "1",
      color: "ui.secondary",
      fontStyle: "italic",
      my: "4",
    },
    "& hr": {
      border: "none",
      borderTop: "1px solid",
      borderTopColor: "ui.border",
      my: "8",
    },
    "& img": {
      maxWidth: "100%",
      height: "auto",
      borderRadius: "lg",
      my: "4",
    },
    "& pre": {
      bg: "ui.surfaceRaised",
      border: "1px solid",
      borderColor: "ui.border",
      borderRadius: "md",
      p: "4",
      overflowX: "auto",
      my: "4",
      fontSize: "sm",
      lineHeight: "normal",
    },
    "& code": {
      fontFamily: "mono",
      fontSize: "sm",
    },
    "& :not(pre) > code": {
      bg: "ui.surfaceRaised",
      border: "1px solid",
      borderColor: "ui.border",
      borderRadius: "xs",
      px: "1.5",
      py: "0.5",
    },
    "& table": {
      width: "100%",
      borderCollapse: "collapse",
      my: "4",
      fontSize: "sm",
    },
    "& th": {
      bg: "ui.surfaceRaised",
      fontWeight: "bold",
      color: "ui.heading",
      border: "1px solid",
      borderColor: "ui.border",
      p: "2",
      textAlign: "left",
      textTransform: "lowercase",
      letterSpacing: "wide",
      fontSize: "xs",
    },
    "& td": {
      border: "1px solid",
      borderColor: "ui.border",
      p: "2",
    },
  },
  variants: {
    size: {
      sm: {
        fontSize: "sm",
        "& h1": { fontSize: "2xl" },
        "& h2": { fontSize: "xl" },
        "& h3": { fontSize: "lg" },
      },
      md: {},
      lg: {
        fontSize: "lg",
        lineHeight: "loose",
        "& h1": { fontSize: "4xl" },
        "& h2": { fontSize: "3xl" },
        "& h3": { fontSize: "xl" },
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
