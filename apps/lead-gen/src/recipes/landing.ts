import { cva } from "styled-system/css";

/**
 * Section header — consistent title + subtitle block for landing page sections.
 * Handles alignment variants and responsive sizing.
 */
export const sectionHeader = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
    maxWidth: "720px",
  },
  variants: {
    align: {
      left: {
        alignItems: "flex-start",
        textAlign: "left",
      },
      center: {
        alignItems: "center",
        textAlign: "center",
        mx: "auto",
      },
      right: {
        alignItems: "flex-end",
        textAlign: "right",
        ml: "auto",
      },
    },
    spacing: {
      compact: {
        mb: "6",
      },
      default: {
        mb: "10",
      },
      loose: {
        mb: "16",
      },
    },
  },
  defaultVariants: {
    align: "center",
    spacing: "default",
  },
});

/**
 * Stat card — metric display with large value, label, and optional comparison text.
 * Used for KPI sections on the landing page.
 */
export const statCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    padding: "5",
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "0",
    transition: "background 150ms ease, border-color 150ms ease",
    _hover: {
      bg: "ui.surfaceHover",
      borderColor: "ui.borderHover",
    },
  },
  variants: {
    variant: {
      default: {},
      highlighted: {
        borderColor: "accent.border",
        bg: "accent.subtle",
        _hover: {
          borderColor: "accent.primary",
          bg: "accent.subtle",
        },
      },
      positive: {
        borderColor: "rgba(48, 164, 108, 0.30)",
        bg: "status.positiveDim",
        _hover: {
          borderColor: "status.positive",
          bg: "status.positiveDim",
        },
      },
    },
    size: {
      sm: {
        padding: "3",
        gap: "1",
      },
      md: {
        padding: "5",
        gap: "2",
      },
      lg: {
        padding: "6",
        gap: "3",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

/**
 * Trust badge — compact trust signal for logos, certifications, social proof.
 * Minimal chrome, designed to sit in a row of peer badges.
 */
export const trustBadge = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2",
    padding: "2 3",
    bg: "whiteAlpha.5",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "0",
    fontSize: "xs",
    fontWeight: "medium",
    color: "ui.secondary",
    letterSpacing: "wide",
    textTransform: "lowercase",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
    _hover: {
      bg: "whiteAlpha.8",
      borderColor: "ui.borderHover",
      color: "ui.body",
    },
  },
  variants: {
    variant: {
      default: {},
      accent: {
        borderColor: "accent.border",
        color: "accent.primary",
        bg: "accent.subtle",
        _hover: {
          borderColor: "accent.primary",
          bg: "accent.subtle",
        },
      },
      muted: {
        borderColor: "transparent",
        bg: "whiteAlpha.3",
        color: "ui.tertiary",
        _hover: {
          bg: "whiteAlpha.6",
          color: "ui.secondary",
        },
      },
    },
    size: {
      sm: {
        padding: "1 2",
        fontSize: "2xs",
        gap: "1",
      },
      md: {
        padding: "2 3",
        fontSize: "xs",
        gap: "2",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

/**
 * Comparison row — "us vs them" layout for feature comparison tables.
 * Each row shows a feature label and two value columns.
 */
export const comparisonRow = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    alignItems: "center",
    gap: "3",
    padding: "3 4",
    borderBottom: "1px solid",
    borderBottomColor: "ui.border",
    fontSize: "sm",
    lineHeight: "compact",
    transition: "background 150ms ease",
    _hover: {
      bg: "whiteAlpha.3",
    },
    _last: {
      borderBottom: "none",
    },
  },
  variants: {
    variant: {
      default: {},
      header: {
        fontSize: "2xs",
        fontWeight: "medium",
        color: "ui.dim",
        letterSpacing: "editorial",
        textTransform: "uppercase",
        borderBottomColor: "ui.borderHover",
        bg: "whiteAlpha.3",
        _hover: {
          bg: "whiteAlpha.3",
        },
      },
      winner: {
        bg: "status.positiveDim",
        _hover: {
          bg: "status.positiveDim",
        },
      },
    },
    highlight: {
      ours: {
        "& > :nth-child(2)": {
          color: "status.positive",
          fontWeight: "semibold",
        },
      },
      theirs: {
        "& > :nth-child(3)": {
          color: "status.positive",
          fontWeight: "semibold",
        },
      },
      none: {},
    },
  },
  defaultVariants: {
    variant: "default",
    highlight: "ours",
  },
});
