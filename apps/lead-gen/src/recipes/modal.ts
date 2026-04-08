import { cva } from "styled-system/css";

export const overlay = cva({
  base: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    bg: "rgba(10, 10, 15, 0.85)",
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});

export const dialog = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "0",
    width: "100%",
    maxHeight: "85vh",
    overflowY: "auto",
    padding: "6",
  },
  variants: {
    size: {
      sm: { maxWidth: "400px" },
      md: { maxWidth: "560px" },
      lg: { maxWidth: "720px" },
      xl: { maxWidth: "960px" },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const dialogHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    pb: "4",
    mb: "4",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
  },
});

export const dialogFooter = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "2",
    pt: "4",
    mt: "4",
    borderTop: "1px solid",
    borderTopColor: "ui.border",
  },
});
