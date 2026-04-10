import { cva } from "styled-system/css";

export const switchRoot = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    cursor: "pointer",
    userSelect: "none",
  },
  variants: {
    disabled: {
      true: {
        opacity: 0.4,
        cursor: "not-allowed",
        pointerEvents: "none",
      },
    },
  },
});

export const switchTrack = cva({
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    bg: "ui.surfaceRaised",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "full",
    transition: "background 150ms ease, border-color 150ms ease",
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "accent.primary",
      outlineOffset: "2px",
    },
  },
  variants: {
    checked: {
      true: {
        bg: "accent.primary",
        borderColor: "accent.primary",
      },
    },
    size: {
      sm: { width: "28px", height: "16px" },
      md: { width: "36px", height: "20px" },
      lg: { width: "44px", height: "24px" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const switchThumb = cva({
  base: {
    display: "block",
    bg: "ui.heading",
    borderRadius: "full",
    transition: "transform 150ms cubic-bezier(0.16, 1, 0.30, 1)",
    willChange: "transform",
  },
  variants: {
    checked: {
      true: {},
      false: {},
    },
    size: {
      sm: { width: "12px", height: "12px" },
      md: { width: "16px", height: "16px" },
      lg: { width: "20px", height: "20px" },
    },
  },
  compoundVariants: [
    { checked: false, size: "sm", css: { transform: "translateX(1px)" } },
    { checked: true, size: "sm", css: { transform: "translateX(13px)" } },
    { checked: false, size: "md", css: { transform: "translateX(1px)" } },
    { checked: true, size: "md", css: { transform: "translateX(17px)" } },
    { checked: false, size: "lg", css: { transform: "translateX(1px)" } },
    { checked: true, size: "lg", css: { transform: "translateX(21px)" } },
  ],
  defaultVariants: {
    size: "md",
    checked: false,
  },
});

export const switchLabel = cva({
  base: {
    fontSize: "base",
    color: "ui.body",
    lineHeight: "compact",
  },
});
