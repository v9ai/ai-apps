import { cva } from "styled-system/css";

export const topbar = cva({
  base: {
    height: "36px",
    bg: "accent.primary",
    display: "flex",
    alignItems: "center",
    px: "4",
    fontSize: "xs",
    fontWeight: "bold",
    color: "accent.contrast",
    letterSpacing: "normal",
  },
});
