import { cva } from "styled-system/css";

export const navLink = cva({
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
    textDecoration: "none",
    textTransform: "lowercase",
    fontWeight: "medium",
    letterSpacing: "normal",
    color: "ui.secondary",
    fontSize: "base",
    padding: "5px 8px",
    transition: "color 150ms ease, background 150ms ease",
    _hover: {
      color: "ui.heading",
      bg: "ui.surfaceHover",
    },
  },
  variants: {
    active: {
      true: {
        color: "ui.heading",
        fontWeight: "semibold",
      },
    },
    collapsed: {
      true: {
        justifyContent: "center",
        padding: "5px 0",
      },
    },
  },
});

export const sidebar = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    bg: "ui.surface",
    borderRight: "1px solid",
    borderRightColor: "ui.border",
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    overflowY: "hidden",
    overflowX: "hidden",
    transition: "width 200ms ease, padding 200ms ease",
    zIndex: 10,
    fontSize: "base",
    letterSpacing: "normal",
  },
  variants: {
    collapsed: {
      true: {
        width: "56px",
        padding: "2",
      },
      false: {
        width: "200px",
        padding: "4",
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

/* ── Landing nav anchor link ── */
export const navAnchor = cva({
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    px: "3",
    py: "1.5",
    fontSize: "sm",
    fontWeight: "medium",
    color: "ui.tertiary",
    letterSpacing: "normal",
    textTransform: "lowercase",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    fontFamily: "inherit",
    transition: "color 200ms ease",
    _hover: {
      color: "ui.heading",
    },
    /* underline indicator — grows from center on active */
    _after: {
      content: '""',
      position: "absolute",
      bottom: "0",
      left: "50%",
      width: "0",
      height: "1.5px",
      bg: "accent.primary",
      transition: "width 250ms cubic-bezier(0.16, 1, 0.30, 1), left 250ms cubic-bezier(0.16, 1, 0.30, 1)",
    },
  },
  variants: {
    active: {
      true: {
        color: "ui.heading",
        fontWeight: "semibold",
        _after: {
          width: "60%",
          left: "20%",
        },
      },
    },
  },
});

/* ── Mobile slide-out panel ── */
export const mobilePanel = cva({
  base: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: "min(320px, 85vw)",
    zIndex: 49,
    bg: "rgba(10, 10, 15, 0.97)",
    backdropFilter: "blur(24px)",
    display: "flex",
    flexDirection: "column",
    pt: "72px",
    px: "6",
    pb: "6",
    overflowY: "auto",
    transition: "transform 350ms cubic-bezier(0.16, 1, 0.30, 1)",
  },
  variants: {
    open: {
      true: {
        transform: "translateX(0)",
      },
      false: {
        transform: "translateX(100%)",
      },
    },
  },
  defaultVariants: {
    open: false,
  },
});
