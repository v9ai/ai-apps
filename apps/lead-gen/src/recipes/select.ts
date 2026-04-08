import { cva } from "styled-system/css";

export const select = cva({
  base: {
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    color: "ui.body",
    borderRadius: "0",
    outline: "none",
    fontSize: "base",
    fontFamily: "inherit",
    cursor: "pointer",
    appearance: "none",
    padding: "6px 30px 6px 10px",
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 fill=%27none%27%3E%3Cpath d=%27M1 1.5l5 5 5-5%27 stroke=%27%23888%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
    transition: "border-color 150ms ease",
    _focus: {
      borderColor: "accent.primary",
    },
  },
  variants: {
    size: {
      sm: {
        height: "28px",
        fontSize: "sm",
        padding: "4px 28px 4px 8px",
      },
      md: {
        height: "36px",
        fontSize: "base",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
