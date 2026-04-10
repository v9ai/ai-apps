import { cva } from "styled-system/css";

export const sheetOverlay = cva({
  base: {
    position: "fixed",
    inset: 0,
    zIndex: 40,
    bg: "rgba(10, 10, 15, 0.75)",
    backdropFilter: "blur(4px)",
  },
});

export const sheet = cva({
  base: {
    position: "fixed",
    zIndex: 41,
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    display: "flex",
    flexDirection: "column",
    boxShadow: "elevation.4",
    overflowY: "auto",
    transition: "transform 300ms cubic-bezier(0.16, 1, 0.30, 1)",
  },
  variants: {
    side: {
      right: {
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(400px, 90vw)",
        borderLeft: "1px solid",
        borderLeftColor: "ui.border",
        borderRight: "none",
      },
      left: {
        top: 0,
        left: 0,
        bottom: 0,
        width: "min(400px, 90vw)",
        borderRight: "1px solid",
        borderRightColor: "ui.border",
        borderLeft: "none",
      },
      bottom: {
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "85vh",
        borderTop: "1px solid",
        borderTopColor: "ui.border",
        borderBottom: "none",
        borderRadius: "xl xl 0 0",
      },
      top: {
        top: 0,
        left: 0,
        right: 0,
        maxHeight: "85vh",
        borderBottom: "1px solid",
        borderBottomColor: "ui.border",
        borderTop: "none",
      },
    },
    size: {
      sm: {},
      md: {},
      lg: {},
      full: {},
    },
  },
  compoundVariants: [
    { side: "right", size: "sm", css: { width: "min(320px, 90vw)" } },
    { side: "right", size: "md", css: { width: "min(400px, 90vw)" } },
    { side: "right", size: "lg", css: { width: "min(560px, 90vw)" } },
    { side: "right", size: "full", css: { width: "100vw" } },
    { side: "left", size: "sm", css: { width: "min(320px, 90vw)" } },
    { side: "left", size: "md", css: { width: "min(400px, 90vw)" } },
    { side: "left", size: "lg", css: { width: "min(560px, 90vw)" } },
    { side: "left", size: "full", css: { width: "100vw" } },
    { side: "bottom", size: "sm", css: { maxHeight: "40vh" } },
    { side: "bottom", size: "md", css: { maxHeight: "60vh" } },
    { side: "bottom", size: "lg", css: { maxHeight: "85vh" } },
    { side: "bottom", size: "full", css: { maxHeight: "100vh" } },
  ],
  defaultVariants: {
    side: "right",
    size: "md",
  },
});

export const sheetHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    p: "4",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
    flexShrink: 0,
  },
});

export const sheetBody = cva({
  base: {
    flex: 1,
    p: "4",
    overflowY: "auto",
  },
});

export const sheetFooter = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "2",
    p: "4",
    borderTop: "1px solid",
    borderTopColor: "ui.border",
    flexShrink: 0,
  },
});
