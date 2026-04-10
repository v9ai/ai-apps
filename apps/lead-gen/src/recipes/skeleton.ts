import { cva } from "styled-system/css";

export const skeleton = cva({
  base: {
    bg: "ui.surfaceRaised",
    borderRadius: "md",
    position: "relative",
    overflow: "hidden",
    _after: {
      content: '""',
      position: "absolute",
      inset: 0,
      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent)",
      animation: "shimmer 2s ease infinite",
    },
  },
  variants: {
    variant: {
      text: {
        height: "14px",
        width: "100%",
        borderRadius: "xs",
      },
      heading: {
        height: "22px",
        width: "60%",
        borderRadius: "xs",
      },
      avatar: {
        borderRadius: "full",
      },
      card: {
        height: "120px",
        width: "100%",
        borderRadius: "lg",
      },
      button: {
        height: "36px",
        width: "100px",
        borderRadius: "md",
      },
    },
    size: {
      sm: {},
      md: {},
      lg: {},
    },
  },
  compoundVariants: [
    { variant: "avatar", size: "sm", css: { width: "24px", height: "24px" } },
    { variant: "avatar", size: "md", css: { width: "32px", height: "32px" } },
    { variant: "avatar", size: "lg", css: { width: "48px", height: "48px" } },
  ],
  defaultVariants: {
    variant: "text",
    size: "md",
  },
});

export const skeletonGroup = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});
