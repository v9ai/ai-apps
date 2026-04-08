import { cva } from "styled-system/css";

export const table = cva({
  base: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: "sm",
  },
});

export const th = cva({
  base: {
    bg: "ui.surfaceRaised",
    fontWeight: "bold",
    color: "ui.heading",
    border: "1px solid",
    borderColor: "ui.border",
    padding: "8px 12px",
    textAlign: "left",
    verticalAlign: "top",
    fontSize: "xs",
    textTransform: "lowercase",
    letterSpacing: "wide",
  },
});

export const td = cva({
  base: {
    border: "1px solid",
    borderColor: "ui.border",
    padding: "8px 12px",
    textAlign: "left",
    verticalAlign: "top",
    fontSize: "sm",
    color: "ui.body",
  },
});
